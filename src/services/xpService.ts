// ============================================================
// src/services/xpService.ts
// Simplified 3-track XP: mainXP, toolXP, augmentXP
// 10 XP per minute, split 50/25/25 for mainXP
// ============================================================

import { getDB } from '@/lib/db';

export const XP_PER_MINUTE = 10;
export const LEGACY_RATE   = 0.5;
export const SKILL_SHARE   = 0.50;
export const STAT_SHARE    = 0.25;
export const MASTER_SHARE  = 0.25;

const THRESHOLDS = [0, 1400, 3000, 4800, 6800, 9000, 11400, 14000, 16800, 19800, 23000, 26400, 30000, 33800, 37800, 42000, 46400, 51000, 55800, 60800, 66000, 71400, 77000, 82800, 88800, 95000, 101400, 108000, 114800, 121800, 129000, 136400, 144000, 151800, 159800, 168000, 176400, 185000, 193800, 202800, 212000, 221400, 231000, 240800, 250800, 261000, 271400, 282000, 292800, 303800, 315000, 326400, 338000, 349800, 361800, 374000, 386400, 399000, 411800, 424800, 438000];
const FLAT_COST  = 13200; // cost per level above 60

export function getLevelFromXP(xp: number) {
  const totalXP = Math.max(0, xp);
  if (totalXP >= THRESHOLDS[60]) {
    // Above level 60 — flat 13200 per level
    const above   = totalXP - THRESHOLDS[60];
    const level   = 60 + Math.floor(above / FLAT_COST) + 1;
    const xpInLevel  = above % FLAT_COST;
    const xpForLevel = FLAT_COST;
    return { level, xpInLevel, xpForLevel };
  }
  let level = 0;
  for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= THRESHOLDS[i]) { level = i; break; }
  }
  const xpInLevel  = totalXP - THRESHOLDS[level];
  const xpForLevel = level < THRESHOLDS.length - 1
    ? THRESHOLDS[level + 1] - THRESHOLDS[level]
    : FLAT_COST;
  return { level, xpInLevel, xpForLevel };
}


// Returns values for the "X / Y XP" display label
// totalXP = raw XP, totalXPToNextLevel = cumulative XP threshold for next level
export function getXPDisplayValues(xp: number) {
  const totalXP = Math.max(0, xp);
  if (totalXP >= THRESHOLDS[60]) {
    const above = totalXP - THRESHOLDS[60];
    const levelsAbove = Math.floor(above / FLAT_COST);
    const totalXPToNextLevel = THRESHOLDS[60] + (levelsAbove + 1) * FLAT_COST;
    return { totalXP, totalXPToNextLevel };
  }
  let level = 0;
  for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= THRESHOLDS[i]) { level = i; break; }
  }
  const totalXPToNextLevel = level < THRESHOLDS.length - 1 ? THRESHOLDS[level + 1] : THRESHOLDS[60] + FLAT_COST;
  return { totalXP, totalXPToNextLevel };
}

const levelCase = (col: string) => `
  CASE
    WHEN ${col} >= 438000 THEN (60 + FLOOR((${col} - 438000) / 13200) + 1)::int
    WHEN ${col} >= 424800 THEN 59
    WHEN ${col} >= 411800 THEN 58
    WHEN ${col} >= 399000 THEN 57
    WHEN ${col} >= 386400 THEN 56
    WHEN ${col} >= 374000 THEN 55
    WHEN ${col} >= 361800 THEN 54
    WHEN ${col} >= 349800 THEN 53
    WHEN ${col} >= 338000 THEN 52
    WHEN ${col} >= 326400 THEN 51
    WHEN ${col} >= 315000 THEN 50
    WHEN ${col} >= 303800 THEN 49
    WHEN ${col} >= 292800 THEN 48
    WHEN ${col} >= 282000 THEN 47
    WHEN ${col} >= 271400 THEN 46
    WHEN ${col} >= 261000 THEN 45
    WHEN ${col} >= 250800 THEN 44
    WHEN ${col} >= 240800 THEN 43
    WHEN ${col} >= 231000 THEN 42
    WHEN ${col} >= 221400 THEN 41
    WHEN ${col} >= 212000 THEN 40
    WHEN ${col} >= 202800 THEN 39
    WHEN ${col} >= 193800 THEN 38
    WHEN ${col} >= 185000 THEN 37
    WHEN ${col} >= 176400 THEN 36
    WHEN ${col} >= 168000 THEN 35
    WHEN ${col} >= 159800 THEN 34
    WHEN ${col} >= 151800 THEN 33
    WHEN ${col} >= 144000 THEN 32
    WHEN ${col} >= 136400 THEN 31
    WHEN ${col} >= 129000 THEN 30
    WHEN ${col} >= 121800 THEN 29
    WHEN ${col} >= 114800 THEN 28
    WHEN ${col} >= 108000 THEN 27
    WHEN ${col} >= 101400 THEN 26
    WHEN ${col} >= 95000 THEN 25
    WHEN ${col} >= 88800 THEN 24
    WHEN ${col} >= 82800 THEN 23
    WHEN ${col} >= 77000 THEN 22
    WHEN ${col} >= 71400 THEN 21
    WHEN ${col} >= 66000 THEN 20
    WHEN ${col} >= 60800 THEN 19
    WHEN ${col} >= 55800 THEN 18
    WHEN ${col} >= 51000 THEN 17
    WHEN ${col} >= 46400 THEN 16
    WHEN ${col} >= 42000 THEN 15
    WHEN ${col} >= 37800 THEN 14
    WHEN ${col} >= 33800 THEN 13
    WHEN ${col} >= 30000 THEN 12
    WHEN ${col} >= 26400 THEN 11
    WHEN ${col} >= 23000 THEN 10
    WHEN ${col} >= 19800 THEN 9
    WHEN ${col} >= 16800 THEN 8
    WHEN ${col} >= 14000 THEN 7
    WHEN ${col} >= 11400 THEN 6
    WHEN ${col} >= 9000 THEN 5
    WHEN ${col} >= 6800 THEN 4
    WHEN ${col} >= 4800 THEN 3
    WHEN ${col} >= 3000 THEN 2
    WHEN ${col} >= 1400 THEN 1
    ELSE 0
  END`

export function previewXP(params: {
  durationMinutes: number;
  statSplit: { stat: string; percent: number }[];
  toolIds: string[];
  augmentIds: string[];
  isLegacy?: boolean;
}) {
  const { durationMinutes, statSplit, toolIds, augmentIds, isLegacy = false } = params;
  const factor  = isLegacy ? LEGACY_RATE : 1.0;
  const base    = durationMinutes * XP_PER_MINUTE * factor;
  const skillXP = Math.floor(base * SKILL_SHARE);
  const statBase= Math.floor(base * STAT_SHARE);
  const masterXP= Math.floor(base * MASTER_SHARE);
  const statXP  = statSplit.map(s => ({ stat: s.stat, amount: Math.floor(statBase * s.percent / 100) }));
  const perTool = toolIds.length > 0 ? Math.floor(base / toolIds.length) : 0;
  const perAug  = augmentIds.length > 0 ? Math.floor(base / augmentIds.length) : 0;
  return { skillXP, statXP, masterXP, perToolXP: perTool, totalToolXP: perTool * toolIds.length, perAugmentXP: perAug, totalAugmentXP: perAug * augmentIds.length };
}

const uid = () => crypto.randomUUID();

export async function awardSessionXP(params: {
  sessionId: string;
  skillId: string;
  skillName?: string;
  durationMinutes: number;
  statSplit: { stat: string; percent: number }[];
  toolIds: string[];
  augmentIds: string[];
  isLegacy?: boolean;
}) {
  const db = await getDB();
  const { sessionId, skillId, skillName = '', durationMinutes, statSplit, toolIds, augmentIds, isLegacy = false } = params;
  const factor   = isLegacy ? LEGACY_RATE : 1.0;
  const base     = durationMinutes * XP_PER_MINUTE * factor;
  const skillXP  = Math.floor(base * SKILL_SHARE);
  const statBase = Math.floor(base * STAT_SHARE);
  const masterXP = Math.floor(base * MASTER_SHARE);
  const statXPMap = statSplit.map(s => ({ stat: s.stat, amount: Math.floor(statBase * s.percent / 100) }));
  const perTool   = toolIds.length > 0 ? Math.floor(base / toolIds.length) : 0;
  const perAug    = augmentIds.length > 0 ? Math.floor(base / augmentIds.length) : 0;
  const now       = new Date().toISOString();

  // Skill
  await db.exec(`UPDATE skills SET xp = xp + ${skillXP}, level = ${levelCase('xp + ' + skillXP)} WHERE id = '${skillId}';`);

  // Stats
  for (const { stat, amount } of statXPMap) {
    if (amount > 0) await db.exec(`UPDATE stats SET xp = xp + ${amount}, level = ${levelCase('xp + ' + amount)}, dormant = false WHERE stat_key = '${stat}';`);
  }

  // Master — detect level up
  const beforeMaster = await db.query<{ level: number }>(`SELECT level FROM master_progress WHERE id = 1;`);
  const prevMasterLevel = Number(beforeMaster.rows[0]?.level ?? 0);
  if (masterXP > 0) await db.exec(`UPDATE master_progress SET total_xp = total_xp + ${masterXP}, level = ${levelCase('total_xp + ' + masterXP)} WHERE id = 1;`);
  const afterMaster = await db.query<{ level: number; total_xp: number }>(`SELECT level, total_xp FROM master_progress WHERE id = 1;`);
  const newMasterLevel = Number(afterMaster.rows[0]?.level ?? 0);
  const masterLeveledUp = newMasterLevel > prevMasterLevel;
  const masterTotalXP   = Number(afterMaster.rows[0]?.total_xp ?? 0);

  // Tools
  for (const toolId of toolIds) {
    if (perTool > 0) {
      await db.exec(`
        UPDATE tools SET xp = xp + ${perTool}, level = ${levelCase('xp + ' + perTool)} WHERE id = '${toolId}';
        UPDATE tool_progress SET total_xp = total_xp + ${perTool}, level = ${levelCase('total_xp + ' + perTool)} WHERE id = 1;
      `);
    }
  }

  // Augments
  for (const augId of augmentIds) {
    if (perAug > 0) {
      await db.exec(`
        UPDATE augments SET xp = xp + ${perAug}, level = ${levelCase('xp + ' + perAug)} WHERE id = '${augId}';
        UPDATE augment_progress SET total_xp = total_xp + ${perAug}, level = ${levelCase('total_xp + ' + perAug)} WHERE id = 1;
      `);
    }
  }

  // XP log
  const notesSQL = skillName ? `'${skillName.replace(/'/g, "''")}'` : 'NULL';
  
  const logEntries = [
    `('${uid()}', 'session', '${sessionId}', 'skill',  '${skillId}', ${skillXP}, ${notesSQL}, '${now}')`,
    `('${uid()}', 'session', '${sessionId}', 'master', 'master',     ${masterXP}, ${notesSQL}, '${now}')`,
    ...statXPMap.filter(s => s.amount > 0).map(s => `('${uid()}', 'session', '${sessionId}', 'stat', '${s.stat}', ${s.amount}, ${notesSQL}, '${now}')`),
    ...toolIds.filter(() => perTool > 0).map(id => `('${uid()}', 'session', '${sessionId}', 'tool', '${id}', ${perTool}, ${notesSQL}, '${now}')`),
    ...augmentIds.filter(() => perAug > 0).map(id => `('${uid()}', 'session', '${sessionId}', 'augment', '${id}', ${perAug}, ${notesSQL}, '${now}')`),
  ];

  if (logEntries.length > 0) {
    await db.exec(`INSERT INTO xp_log (id, source, source_id, tier, entity_id, amount, notes, logged_at) VALUES ${logEntries.join(',')};`);
  }

  return { skillXP, statXPMap, masterXP, perToolXP: perTool, perAugmentXP: perAug, masterLeveledUp, newMasterLevel, masterTotalXP };
}

export async function awardBonusXP(params: {
  source: string; sourceId: string; skillId?: string;
  statKey?: string; amount: number; notes?: string; tier?: 'skill' | 'stat' | 'master';
}) {
  const db  = await getDB();
  const { source, sourceId, skillId, statKey, amount, notes, tier: forcedTier } = params;
  const now = new Date().toISOString();
  const tier = forcedTier ?? (skillId ? 'skill' : statKey ? 'stat' : 'master');
  const entityId = skillId ?? statKey ?? 'master';

  if (skillId) await db.exec(`UPDATE skills SET xp = xp + ${amount} WHERE id = '${skillId}';`);
  if (statKey) await db.exec(`UPDATE stats  SET xp = xp + ${amount} WHERE stat_key = '${statKey}';`);
  if (tier === 'master' || forcedTier) await db.exec(`UPDATE master_progress SET total_xp = total_xp + ${amount} WHERE id = 1;`);
  await db.exec(`
    INSERT INTO xp_log (id, source, source_id, tier, entity_id, amount, notes, logged_at)
    VALUES ('${uid()}', '${source}', '${sourceId}', '${tier}', '${entityId}', ${amount}, ${notes ? `'${notes.replace(/'/g, "''")}'` : 'NULL'}, '${now}');
  `);
}

// ── Compatibility shims ───────────────────────────────────────
// Keep old components compiling during migration.
// These will be removed once CourseDetailDrawer, MediaDetailDrawer,
// AddMediaModal and sessionService are rebuilt for the new system.

export const XP_VALUES = {
  COURSE_LESSON:    15,
  COURSE_QUIZ_PASS: 30,
  COURSE_ASSIGNMENT: 75,
  COURSE_SECTION:   50,
  COURSE_COMPLETE:  100,
  BOOK_COMPLETE:    75,
  COMIC_COMPLETE:   50,
  FILM_WATCHED:     25,
  DOCUMENTARY_WATCHED: 35,
  TV_SERIES_COMPLETE: 60,
  ALBUM_LISTENED:   20,
  CERT_EARNED:      200,
  PROJECT_MILESTONE: 50,
  PROJECT_COMPLETE: 150,
  RESOURCE_READ:    10,
  TOOL_ADDED:       15,
  WEEKLY_CHALLENGE: 100,
};

// Legacy awardXP shim — used by CourseDetailDrawer, MediaDetailDrawer etc.
// Routes flat bonus XP through the DB directly without going through awardSessionXP
export async function awardXP(params: {
  userId?: string;
  source: string;
  sourceId?: string;
  baseAmount: number;
  skillId?: string;
  statKeys?: string[];
  statSplit?: { stat: string; percent: number }[];
  isLegacy?: boolean;
  notes?: string;
}): Promise<{ skillXP: number; statXP: Record<string, number>; masterXP: number; multiplier: number }> {
  const db = await getDB();
  const { source, sourceId = '', baseAmount, skillId, statKeys = [], statSplit = [], notes } = params;
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();
  const notesSQL = notes ? `'${notes.replace(/'/g, "''")}'` : 'NULL';

  if (skillId) {
    await db.exec(`UPDATE skills SET xp = xp + ${baseAmount} WHERE id = '${skillId}';`);
    await db.exec(`INSERT INTO xp_log (id, source, source_id, tier, entity_id, amount, notes, logged_at) VALUES ('${id}s', '${source}', '${sourceId}', 'skill', '${skillId}', ${baseAmount}, ${notesSQL}, '${now}');`);
  }

  const statXP: Record<string, number> = {};
  const split = statSplit.length > 0 ? statSplit : statKeys.map(s => ({ stat: s, percent: Math.floor(100 / Math.max(statKeys.length, 1)) }));
  for (const entry of split) {
    const stat   = entry.stat;
    const amount = Math.floor(baseAmount * 0.6 * ((entry.percent ?? 100) / 100));
    if (amount > 0) {
      statXP[stat] = amount;
      await db.exec(`UPDATE stats SET xp = xp + ${amount}, dormant = false WHERE stat_key = '${stat}';`);
      await db.exec(`INSERT INTO xp_log (id, source, source_id, tier, entity_id, amount, notes, logged_at) VALUES ('${id}t${stat}', '${source}', '${sourceId}', 'stat', '${stat}', ${amount}, ${notesSQL}, '${now}');`);
    }
  }

  const masterXP = Math.floor(baseAmount * 0.3);
  if (masterXP > 0) {
    await db.exec(`UPDATE master_progress SET total_xp = total_xp + ${masterXP} WHERE id = 1;`);
    await db.exec(`INSERT INTO xp_log (id, source, source_id, tier, entity_id, amount, notes, logged_at) VALUES ('${id}m', '${source}', '${sourceId}', 'master', 'master', ${masterXP}, ${notesSQL}, '${now}');`);
  }

  return { skillXP: baseAmount, statXP, masterXP, multiplier: 1.0 };
}