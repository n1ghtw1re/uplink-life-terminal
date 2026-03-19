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

const THRESHOLDS = [0, 500, 1200, 2500, 4500, 7500, 12000, 18000, 26000, 36000, 48000, 62000, 78000, 96000, 116000];

export function getLevelFromXP(xp: number) {
  let level = 1;
  for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= THRESHOLDS[i]) { level = i + 1; break; }
  }
  const xpInLevel  = xp - (THRESHOLDS[level - 1] ?? 0);
  const xpForLevel = level < THRESHOLDS.length
    ? (THRESHOLDS[level] ?? 0) - (THRESHOLDS[level - 1] ?? 0)
    : 50000;
  return { level, xpInLevel, xpForLevel };
}

const levelCase = (col: string) => `
  CASE
    WHEN ${col} >= 116000 THEN 15 WHEN ${col} >= 96000 THEN 14
    WHEN ${col} >= 78000  THEN 13 WHEN ${col} >= 62000 THEN 12
    WHEN ${col} >= 48000  THEN 11 WHEN ${col} >= 36000 THEN 10
    WHEN ${col} >= 26000  THEN 9  WHEN ${col} >= 18000 THEN 8
    WHEN ${col} >= 12000  THEN 7  WHEN ${col} >= 7500  THEN 6
    WHEN ${col} >= 4500   THEN 5  WHEN ${col} >= 2500  THEN 4
    WHEN ${col} >= 1200   THEN 3  WHEN ${col} >= 500   THEN 2
    ELSE 1
  END`;

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
  durationMinutes: number;
  statSplit: { stat: string; percent: number }[];
  toolIds: string[];
  augmentIds: string[];
  isLegacy?: boolean;
}) {
  const db = await getDB();
  const { sessionId, skillId, durationMinutes, statSplit, toolIds, augmentIds, isLegacy = false } = params;
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
    if (amount > 0) await db.exec(`UPDATE stats SET xp = xp + ${amount}, level = ${levelCase('xp + ' + amount)}, dormant = 0 WHERE stat_key = '${stat}';`);
  }

  // Master
  if (masterXP > 0) await db.exec(`UPDATE master_progress SET total_xp = total_xp + ${masterXP}, level = ${levelCase('total_xp + ' + masterXP)} WHERE id = 1;`);

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
  const logEntries = [
    `('${uid()}', 'session', '${sessionId}', 'skill',  '${skillId}', ${skillXP}, '${now}')`,
    `('${uid()}', 'session', '${sessionId}', 'master', 'master',     ${masterXP}, '${now}')`,
    ...statXPMap.filter(s => s.amount > 0).map(s => `('${uid()}', 'session', '${sessionId}', 'stat', '${s.stat}', ${s.amount}, '${now}')`),
    ...toolIds.filter(() => perTool > 0).map(id => `('${uid()}', 'session', '${sessionId}', 'tool', '${id}', ${perTool}, '${now}')`),
    ...augmentIds.filter(() => perAug > 0).map(id => `('${uid()}', 'session', '${sessionId}', 'augment', '${id}', ${perAug}, '${now}')`),
  ];

  if (logEntries.length > 0) {
    await db.exec(`INSERT INTO xp_log (id, source, source_id, tier, entity_id, amount, logged_at) VALUES ${logEntries.join(',')};`);
  }

  return { skillXP, statXPMap, masterXP, perToolXP: perTool, perAugmentXP: perAug };
}

export async function awardBonusXP(params: {
  source: string; sourceId: string; skillId?: string;
  statKey?: string; amount: number; notes?: string;
}) {
  const db  = await getDB();
  const { source, sourceId, skillId, statKey, amount, notes } = params;
  const now = new Date().toISOString();
  const tier = skillId ? 'skill' : statKey ? 'stat' : 'master';
  const entityId = skillId ?? statKey ?? 'master';

  if (skillId) await db.exec(`UPDATE skills SET xp = xp + ${amount} WHERE id = '${skillId}';`);
  if (statKey) await db.exec(`UPDATE stats  SET xp = xp + ${amount} WHERE stat_key = '${statKey}';`);
  await db.exec(`UPDATE master_progress SET total_xp = total_xp + ${amount} WHERE id = 1;`);
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
      await db.exec(`UPDATE stats SET xp = xp + ${amount}, dormant = 0 WHERE stat_key = '${stat}';`);
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