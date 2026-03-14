// ============================================================
// UPLINK — XP ENGINE
// src/services/xpService.ts
// All XP flows through here. Do not bypass this.
// ============================================================

import { supabase } from '@/integrations/supabase/client';
import {
  StatKey,
  XPSource,
  XPPreview,
  getStreakTier,
  STREAK_MULTIPLIERS,
  getMasterLevel,
} from '@/types';

// ─── XP RATES ────────────────────────────────────────────────
// These are the tuning knobs. Adjust here, affects everything.

const XP_RATES = {
  SKILL_MULTIPLIER:         1.0,   // 100% of base → skill
  STAT_MULTIPLIER:          0.6,   // 60% of base → stat(s)
  MASTER_MULTIPLIER:        0.3,   // 30% of base → master level
  CLASS_AFFINITY_PRIMARY:   0.10,  // +10% if skill stat = primary class
  CLASS_AFFINITY_SECONDARY: 0.05,  // +5% if skill stat = secondary class
  LEGACY_RATE:              0.50,  // Legacy entries earn 50% of live rate
};

// ─── AWARD XP ────────────────────────────────────────────────
// The single entry point for all XP events.
// Every badge, session, checkin, completion — goes through here.

export async function awardXP(params: {
  userId: string;
  source: XPSource;
  sourceId?: string;
  baseAmount: number;
  skillId?: string;
  statKeys?: StatKey[];
  statSplit?: { stat: StatKey; percent: number }[];
  isLegacy?: boolean;
  notes?: string;
}): Promise<{
  skillXP: number;
  statXP: Partial<Record<StatKey, number>>;
  masterXP: number;
  multiplier: number;
}> {
  const {
    userId,
    source,
    sourceId,
    skillId,
    statKeys = [],
    statSplit = [],
    isLegacy = false,
    notes,
  } = params;

  let { baseAmount } = params;

  // Apply legacy rate reduction
  if (isLegacy) {
    baseAmount = Math.floor(baseAmount * XP_RATES.LEGACY_RATE);
  }

  // Get current streak for multiplier
  const { data: progress } = await supabase
    .from('master_progress')
    .select('streak, shields')
    .eq('user_id', userId)
    .single();

  const streak = progress?.streak ?? 0;
  const streakTier = getStreakTier(streak);
  const multiplier = STREAK_MULTIPLIERS[streakTier];

  // Calculate XP at each tier
  const skillXP  = Math.floor(baseAmount * XP_RATES.SKILL_MULTIPLIER  * multiplier);
  const statBase = Math.floor(baseAmount * XP_RATES.STAT_MULTIPLIER   * multiplier);
  const masterXP = Math.floor(baseAmount * XP_RATES.MASTER_MULTIPLIER * multiplier);

  // Distribute stat XP by split or evenly
  const statXPMap: Partial<Record<StatKey, number>> = {};

  if (statSplit.length > 0) {
    for (const { stat, percent } of statSplit) {
      statXPMap[stat] = Math.floor(statBase * (percent / 100));
    }
  } else if (statKeys.length > 0) {
    const perStat = Math.floor(statBase / statKeys.length);
    for (const stat of statKeys) {
      statXPMap[stat] = perStat;
    }
  }

  // Build XP log entries
  const logEntries: {
    user_id: string; source: string; source_id?: string | null;
    tier: string; amount: number; base_amount: number;
    multiplier?: number; stat_key?: string; skill_id?: string; notes?: string | null;
  }[] = [];

  if (skillId && skillXP > 0) {
    logEntries.push({
      user_id:     userId,
      source,
      source_id:   sourceId ?? null,
      tier:        'skill',
      amount:      skillXP,
      base_amount: baseAmount,
      multiplier,
      skill_id:    skillId,
      notes:       notes ?? null,
    });
  }

  for (const [stat, amount] of Object.entries(statXPMap)) {
    if (amount && amount > 0) {
      logEntries.push({
        user_id:     userId,
        source,
        source_id:   sourceId ?? null,
        tier:        'stat',
        amount,
        base_amount: baseAmount,
        multiplier,
        stat_key:    stat,
        notes:       notes ?? null,
      });
    }
  }

  if (masterXP > 0) {
    logEntries.push({
      user_id:     userId,
      source,
      source_id:   sourceId ?? null,
      tier:        'master',
      amount:      masterXP,
      base_amount: baseAmount,
      multiplier,
      notes:       notes ?? null,
    });
  }

  // Write to immutable XP ledger
  if (logEntries.length > 0) {
    const { error: logError } = await supabase.from('xp_log').insert(logEntries);
    if (logError) throw logError;
  }

  // Update skill XP — direct increment (cumulative, matches getStatLevel)
  if (skillId && skillXP > 0) {
    const { error: updateErr } = await supabase.rpc('increment_skill_xp', {
      p_skill_id: skillId,
      p_amount:   skillXP,
    });
    // Fallback: direct update if RPC fails or isn't deployed
    if (updateErr) {
      const { data: skillRow } = await supabase
        .from('skills').select('xp').eq('id', skillId).single();
      const { error: directErr } = await supabase
        .from('skills')
        .update({ xp: (skillRow?.xp ?? 0) + skillXP })
        .eq('id', skillId);
      if (directErr) throw directErr;
    }
  }

  // Update stat XP rows + sync level column
  for (const [stat, amount] of Object.entries(statXPMap)) {
    if (amount && amount > 0) {
      // Increment XP via RPC
      const { error } = await supabase.rpc('increment_stat_xp', {
        p_user_id:  userId,
        p_stat_key: stat,
        p_amount:   amount,
      });
      if (error) throw error;

      // Read new total XP and sync level column
      const { data: statRow } = await supabase
        .from('stats')
        .select('xp')
        .eq('user_id', userId)
        .eq('stat_key', stat)
        .single();

      if (statRow) {
        // Inline level calc (mirrors getStatLevel — avoid import in service)
        const STAT_LEVEL_XP = [0, 500, 1200, 2500, 4500, 7500, 12000, 18000, 26000, 36000];
        let newLevel = 1;
        for (let i = STAT_LEVEL_XP.length - 1; i >= 0; i--) {
          if ((statRow.xp ?? 0) >= STAT_LEVEL_XP[i]) { newLevel = i + 1; break; }
        }
        await supabase
          .from('stats')
          .update({ level: newLevel })
          .eq('user_id', userId)
          .eq('stat_key', stat);
      }
    }
  }

  // Update master XP
  if (masterXP > 0) {
    const { error } = await supabase.rpc('increment_master_xp', {
      p_user_id: userId,
      p_amount:  masterXP,
    });
    if (error) throw error;
  }

  return { skillXP, statXP: statXPMap, masterXP, multiplier };
}

// ─── PREVIEW XP ──────────────────────────────────────────────
// Client-side calculation for the live XP preview in Quick Log.
// No DB calls — pure math. Keep in sync with awardXP rates above.

export function calculateXPPreview(params: {
  baseAmount: number;
  streak: number;
  statSplit: { stat: StatKey; percent: number }[];
  isLegacy?: boolean;
}): XPPreview {
  const { baseAmount, streak, statSplit, isLegacy = false } = params;

  const effectiveBase = isLegacy
    ? Math.floor(baseAmount * XP_RATES.LEGACY_RATE)
    : baseAmount;

  const streakTier  = getStreakTier(streak);
  const multiplier  = STREAK_MULTIPLIERS[streakTier];

  const skillXP  = Math.floor(effectiveBase * XP_RATES.SKILL_MULTIPLIER  * multiplier);
  const statBase = Math.floor(effectiveBase * XP_RATES.STAT_MULTIPLIER   * multiplier);
  const masterXP = Math.floor(effectiveBase * XP_RATES.MASTER_MULTIPLIER * multiplier);

  const statXP = statSplit.map(({ stat, percent }) => ({
    stat,
    amount: Math.floor(statBase * (percent / 100)),
  }));

  return {
    skillXP,
    statXP,
    masterXP,
    multiplier,
    multiplierTier: streakTier,
    total: skillXP + masterXP,
  };
}

// ─── BASE XP AMOUNTS ─────────────────────────────────────────
// Reference values used by other services when calling awardXP.

export const XP_VALUES = {
  SESSION_PER_HOUR:      100,   // base per hour of session time
  CHECKIN:                20,   // daily check-in per stat checked
  HABIT_STREAK_7:         50,
  HABIT_STREAK_30:       150,
  HABIT_STREAK_100:      500,
  HABIT_STREAK_365:     2000,
  GOAL_SPRINT:           100,
  GOAL_MID:              300,
  GOAL_LIFE:            1000,
  BOOK_COMPLETE:          75,
  COMIC_COMPLETE:         50,
  FILM_WATCHED:           25,
  DOCUMENTARY_WATCHED:    35,
  TV_SEASON:              15,
  TV_SERIES_COMPLETE:     60,
  ALBUM_LISTENED:         20,
  COURSE_LESSON:          15,
  COURSE_QUIZ_PASS:       30,
  COURSE_ASSIGNMENT:      75,
  COURSE_SECTION:         50,
  COURSE_COMPLETE:       100,
  CERT_EARNED:           200,
  PROJECT_MILESTONE:      50,
  PROJECT_COMPLETE:      150,
  RESOURCE_READ:          10,
  TOOL_ADDED:             15,
  WEEKLY_CHALLENGE:      100,
} as const;