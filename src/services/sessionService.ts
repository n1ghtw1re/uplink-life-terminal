// ============================================================
// src/services/sessionService.ts
// ============================================================
import { supabase } from '@/integrations/supabase/client';
import { Session, StatKey } from '@/types';
import { awardXP } from './xpService';

const BASE_XP_PER_HOUR = 100; // tune this per skill type later

export async function logSession(params: {
  userId: string;
  skillId: string;
  skillName: string;
  durationMinutes: number;
  statSplit: { stat: StatKey; percent: number }[];
  fieldValues?: Record<string, string | number | boolean>;
  notes?: string;
  isLegacy?: boolean;
  loggedAt?: Date;
}): Promise<Session> {
  const { userId, skillId, skillName, durationMinutes, statSplit, isLegacy = false } = params;

  const baseAmount = Math.floor((durationMinutes / 60) * BASE_XP_PER_HOUR);

  const { skillXP, statXP, masterXP } = await awardXP({
    userId,
    source: 'session',
    skillId,
    statKeys: statSplit.map(s => s.stat),
    statSplit,
    baseAmount,
    isLegacy,
  });

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      skill_id: skillId,
      skill_name: skillName,
      duration_minutes: durationMinutes,
      stat_split: statSplit,
      field_values: params.fieldValues ?? null,
      notes: params.notes ?? null,
      is_legacy: isLegacy,
      logged_at: params.loggedAt?.toISOString() ?? new Date().toISOString(),
      skill_xp_awarded: skillXP,
      stat_xp_awarded: Object.entries(statXP).map(([stat, amount]) => ({ stat, amount })),
      master_xp_awarded: masterXP,
    })
    .select()
    .single();

  if (error) throw error;

  const statXpAwarded = Array.isArray(data.stat_xp_awarded)
    ? data.stat_xp_awarded
        .filter(
          (entry): entry is { stat: StatKey; amount: number } =>
            typeof entry === 'object' &&
            entry !== null &&
            'stat' in entry &&
            'amount' in entry
        )
        .map((entry) => ({
          stat: entry.stat,
          amount: entry.amount,
        }))
    : [];

  const fieldValues = Array.isArray(data.field_values)
    ? data.field_values
        .filter(
          (entry): entry is { fieldId: string; label: string; value: string | number | boolean } =>
            typeof entry === 'object' &&
            entry !== null &&
            'fieldId' in entry &&
            'label' in entry &&
            'value' in entry
        )
        .map((entry) => ({
          fieldId: entry.fieldId,
          label: entry.label,
          value: entry.value,
        }))
    : [];

  return {
    id: data.id,
    userId: data.user_id,
    skillId: data.skill_id,
    skillName: data.skill_name,
    durationMinutes: data.duration_minutes,
    statSplit: data.stat_split as { stat: StatKey; percent: number }[],
    fieldValues,
    notes: data.notes,
    isLegacy: data.is_legacy,
    loggedAt: data.logged_at,
    createdAt: data.created_at,
    skillXpAwarded: data.skill_xp_awarded,
    statXpAwarded,
    masterXpAwarded: data.master_xp_awarded,
    multiplierApplied: data.multiplier_applied,
  };
}