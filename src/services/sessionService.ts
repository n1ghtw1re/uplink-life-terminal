// ============================================================
// src/services/sessionService.ts
// ============================================================
import { getDB } from '@/lib/db';
import { awardSessionXP } from './xpService';

const BASE_XP_PER_HOUR = 100;

export async function logSession(params: {
  userId?: string;
  skillId: string;
  skillName: string;
  durationMinutes: number;
  statSplit: { stat: string; percent: number }[];
  toolIds?: string[];
  augmentIds?: string[];
  fieldValues?: Record<string, string | number | boolean>;
  notes?: string;
  isLegacy?: boolean;
  loggedAt?: Date;
  courseId?: string;
  mediaId?: string;
  projectId?: string;
}) {
  const db = await getDB();
  const {
    skillId, skillName, durationMinutes, statSplit,
    toolIds = [], augmentIds = [],
    notes, isLegacy = false, loggedAt,
    courseId, mediaId, projectId,
  } = params;

  const id  = crypto.randomUUID();
  const now = (loggedAt ?? new Date()).toISOString();

  // Award XP first
  const xpResult = await awardSessionXP({
    sessionId: id,
    skillId,
    durationMinutes,
    statSplit,
    toolIds,
    augmentIds,
    isLegacy,
  });

  // Insert session record
  await db.exec(`
    INSERT INTO sessions (
      id, skill_id, skill_name, duration_minutes,
      stat_split, notes, is_legacy, logged_at,
      skill_xp, stat_xp, master_xp,
      tool_ids, total_tool_xp,
      augment_ids, total_augment_xp,
      course_id, media_id, project_id
    ) VALUES (
      '${id}',
      '${skillId}',
      '${skillName.replace(/'/g, "''")}',
      ${durationMinutes},
      '${JSON.stringify(statSplit)}',
      ${notes ? `'${notes.replace(/'/g, "''")}'` : 'NULL'},
      ${isLegacy ? 1 : 0},
      '${now}',
      ${xpResult.skillXP},
      '${JSON.stringify(xpResult.statXPMap)}',
      ${xpResult.masterXP},
      '${JSON.stringify(toolIds)}',
      ${xpResult.perToolXP * toolIds.length},
      '${JSON.stringify(augmentIds)}',
      ${xpResult.perAugmentXP * augmentIds.length},
      ${courseId ? `'${courseId}'` : 'NULL'},
      ${mediaId  ? `'${mediaId}'`  : 'NULL'},
      ${projectId? `'${projectId}'`: 'NULL'}
    );
  `);

  return {
    id,
    skillXpAwarded:   xpResult.skillXP,
    masterXpAwarded:  xpResult.masterXP,
    statXpAwarded:    xpResult.statXPMap,
    perToolXP:        xpResult.perToolXP,
    perAugmentXP:     xpResult.perAugmentXP,
  };
}