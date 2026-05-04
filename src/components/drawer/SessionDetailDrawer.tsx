// ============================================================
// src/components/drawer/SessionDetailDrawer.tsx
// Shows full session detail with edit (XP diff) and delete (XP reversal)
// ============================================================
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { refreshAppData } from '@/lib/refreshAppData';
import { getLevelFromXP, XP_PER_MINUTE, LEGACY_RATE, SKILL_SHARE, STAT_SHARE, MASTER_SHARE } from '@/services/xpService';

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const dim = 'hsl(var(--text-dim))';
const adim = 'hsl(var(--accent-dim))';
const bgS = 'hsl(var(--bg-secondary))';
const bgT = 'hsl(var(--bg-tertiary))';
const red = '#ff4400';
const green = '#44ff88';

const levelCase = (col: string) => `
  CASE
    WHEN ${col} >= 438000 THEN (60 + FLOOR((${col} - 438000) / 13200) + 1)::int
    WHEN ${col} >= 424800 THEN 59 WHEN ${col} >= 411800 THEN 58
    WHEN ${col} >= 399000 THEN 57 WHEN ${col} >= 386400 THEN 56
    WHEN ${col} >= 374000 THEN 55 WHEN ${col} >= 361800 THEN 54
    WHEN ${col} >= 349800 THEN 53 WHEN ${col} >= 338000 THEN 52
    WHEN ${col} >= 326400 THEN 51 WHEN ${col} >= 315000 THEN 50
    WHEN ${col} >= 303800 THEN 49 WHEN ${col} >= 292800 THEN 48
    WHEN ${col} >= 282000 THEN 47 WHEN ${col} >= 271400 THEN 46
    WHEN ${col} >= 261000 THEN 45 WHEN ${col} >= 250800 THEN 44
    WHEN ${col} >= 240800 THEN 43 WHEN ${col} >= 231000 THEN 42
    WHEN ${col} >= 221400 THEN 41 WHEN ${col} >= 212000 THEN 40
    WHEN ${col} >= 202800 THEN 39 WHEN ${col} >= 193800 THEN 38
    WHEN ${col} >= 185000 THEN 37 WHEN ${col} >= 176400 THEN 36
    WHEN ${col} >= 168000 THEN 35 WHEN ${col} >= 159800 THEN 34
    WHEN ${col} >= 151800 THEN 33 WHEN ${col} >= 144000 THEN 32
    WHEN ${col} >= 136400 THEN 31 WHEN ${col} >= 129000 THEN 30
    WHEN ${col} >= 121800 THEN 29 WHEN ${col} >= 114800 THEN 28
    WHEN ${col} >= 108000 THEN 27 WHEN ${col} >= 101400 THEN 26
    WHEN ${col} >= 95000 THEN 25  WHEN ${col} >= 88800 THEN 24
    WHEN ${col} >= 82800 THEN 23  WHEN ${col} >= 77000 THEN 22
    WHEN ${col} >= 71400 THEN 21  WHEN ${col} >= 66000 THEN 20
    WHEN ${col} >= 60800 THEN 19  WHEN ${col} >= 55800 THEN 18
    WHEN ${col} >= 51000 THEN 17  WHEN ${col} >= 46400 THEN 16
    WHEN ${col} >= 42000 THEN 15  WHEN ${col} >= 37800 THEN 14
    WHEN ${col} >= 33800 THEN 13  WHEN ${col} >= 30000 THEN 12
    WHEN ${col} >= 26400 THEN 11  WHEN ${col} >= 23000 THEN 10
    WHEN ${col} >= 19800 THEN 9   WHEN ${col} >= 16800 THEN 8
    WHEN ${col} >= 14000 THEN 7   WHEN ${col} >= 11400 THEN 6
    WHEN ${col} >= 9000 THEN 5    WHEN ${col} >= 6800 THEN 4
    WHEN ${col} >= 4800 THEN 3    WHEN ${col} >= 3000 THEN 2
    WHEN ${col} >= 1400 THEN 1    ELSE 0
  END`;

interface SessionData {
  id: string;
  skill_id: string;
  skill_name: string;
  duration_minutes: number;
  stat_split: { stat: string; percent: number }[];
  notes: string | null;
  is_legacy: boolean;
  logged_at: string;
  skill_xp: number;
  master_xp: number;
  tool_ids: string[];
  total_tool_xp: number;
  augment_ids: string[];
  total_augment_xp: number;
  course_id: string | null;
  media_id: string | null;
  project_id: string | null;
  toolNames: string[];
  augmentNames: string[];
  courseName: string | null;
  mediaName: string | null;
  projectName: string | null;
  bonusXP: BonusXPEntry[];
}

interface XPLogRow {
  id: string;
  tier: string;
  entity_id: string;
  amount: number;
}

interface BonusXPEntry {
  source: string;
  source_id: string;
  amount: number;
  notes: string | null;
  tier: string;
  entity_id: string;
}

function getBonusLabel(entry: BonusXPEntry): string {
  if (entry.tier === 'skill') {
    const skillName = entry.notes?.replace(/\s*\[SKILL\]\s*$/, '') || 'SKILL';
    return `${skillName.toUpperCase()} (SKILL)`;
  }
  if (entry.tier === 'stat') {
    const baseName = entry.notes?.replace(/\s*\[STAT\]\s*$/, '') || 'STAT';
    return `${baseName.toUpperCase()} (STAT)`;
  }
  if (entry.tier === 'master') {
    return 'MASTER (BONUS)';
  }
  const labels: Record<string, string> = {
    'book_complete': 'BOOK COMPLETE',
    'comic_complete': 'COMIC COMPLETE',
    'film_complete': 'FILM COMPLETE',
    'documentary_complete': 'DOCUMENTARY COMPLETE',
    'tv_complete': 'TV COMPLETE',
    'album_complete': 'ALBUM COMPLETE',
    'game_complete': 'GAME COMPLETE',
    'course_section': 'MODULE COMPLETE',
    'course_complete': 'COURSE COMPLETE',
  };
  return labels[entry.source] ?? entry.source.toUpperCase().replace(/_/g, ' ');
}

// ── XP reversal helper ────────────────────────────────────────
async function reverseXPEntry(db: Awaited<ReturnType<typeof getDB>>, log: XPLogRow) {
  const amt = Number(log.amount);
  if (amt <= 0) return;

  if (log.tier === 'skill') {
    await db.exec(`
      UPDATE skills SET xp = GREATEST(0, xp - ${amt}), level = ${levelCase(`GREATEST(0, xp - ${amt})`)} WHERE id = '${log.entity_id}';
    `);
  } else if (log.tier === 'stat') {
    await db.exec(`
      UPDATE stats SET xp = GREATEST(0, xp - ${amt}), level = ${levelCase(`GREATEST(0, xp - ${amt})`)} WHERE stat_key = '${log.entity_id}';
    `);
  } else if (log.tier === 'master') {
    await db.exec(`
      UPDATE master_progress SET total_xp = GREATEST(0, total_xp - ${amt}), level = ${levelCase(`GREATEST(0, total_xp - ${amt})`)} WHERE id = 1;
    `);
  } else if (log.tier === 'tool') {
    await db.exec(`
      UPDATE tools SET xp = GREATEST(0, xp - ${amt}), level = ${levelCase(`GREATEST(0, xp - ${amt})`)} WHERE id = '${log.entity_id}';
      UPDATE tool_progress SET total_xp = GREATEST(0, total_xp - ${amt}), level = ${levelCase(`GREATEST(0, total_xp - ${amt})`)} WHERE id = 1;
    `);
  } else if (log.tier === 'augment') {
    await db.exec(`
      UPDATE augments SET xp = GREATEST(0, xp - ${amt}), level = ${levelCase(`GREATEST(0, xp - ${amt})`)} WHERE id = '${log.entity_id}';
      UPDATE augment_progress SET total_xp = GREATEST(0, total_xp - ${amt}), level = ${levelCase(`GREATEST(0, total_xp - ${amt})`)} WHERE id = 1;
    `);
  }
}

async function reverseSessionXP(db: Awaited<ReturnType<typeof getDB>>, sessionId: string) {
  const sessionRes = await db.query<{ course_id: string | null; media_id: string | null }>(
    `SELECT course_id, media_id FROM sessions WHERE id = $1;`,
    [sessionId]
  );

  const logs = await db.query<XPLogRow>(
    `SELECT id, tier, entity_id, amount FROM xp_log WHERE source_id = $1 AND source = 'session';`,
    [sessionId]
  );
  for (const log of logs.rows) {
    await reverseXPEntry(db, log);
  }

  if (sessionRes.rows[0]?.course_id) {
    const courseId = sessionRes.rows[0].course_id;
    const sectionsRes = await db.query<{ id: string }>(
      `SELECT id FROM course_sections WHERE course_id = $1;`, [courseId]
    );
    const sectionIds = sectionsRes.rows.map(s => `'${s.id}'`).join(',');

    if (sectionIds) {
      const sectionLogs = await db.query<XPLogRow>(
        `SELECT id, tier, entity_id, amount FROM xp_log WHERE source_id IN (${sectionIds}) AND source IN ('course_section','course_complete');`
      );
      for (const log of sectionLogs.rows) {
        await reverseXPEntry(db, log);
      }
    }

    const courseLogs = await db.query<XPLogRow>(
      `SELECT id, tier, entity_id, amount FROM xp_log WHERE source_id = $1 AND source = 'course_complete';`,
      [courseId]
    );
    for (const log of courseLogs.rows) {
      await reverseXPEntry(db, log);
    }
  }

  if (sessionRes.rows[0]?.media_id) {
    const mediaId = sessionRes.rows[0].media_id;
    const mediaLogs = await db.query<XPLogRow>(
      `SELECT id, tier, entity_id, amount FROM xp_log WHERE source_id = $1 AND source IN ('book_complete','comic_complete','film_complete','documentary_complete','tv_complete','album_complete','game_complete');`,
      [mediaId]
    );
    for (const log of mediaLogs.rows) {
      await reverseXPEntry(db, log);
    }
  }

  await db.exec(`DELETE FROM xp_log WHERE source_id = '${sessionId}' AND source = 'session';`);
}

// ── Award new XP helper ───────────────────────────────────────
async function awardNewSessionXP(
  db: Awaited<ReturnType<typeof getDB>>,
  session: SessionData,
  newDuration: number,
  newNotes: string | null,
  newLegacy: boolean
) {
  const factor = newLegacy ? LEGACY_RATE : 1.0;
  const base = newDuration * XP_PER_MINUTE * factor;
  const skillXP = Math.floor(base * SKILL_SHARE);
  const statBase = Math.floor(base * STAT_SHARE);
  const masterXP = Math.floor(base * MASTER_SHARE);
  const statXPMap = session.stat_split.map(s => ({
    stat: s.stat,
    amount: Math.floor(statBase * s.percent / 100),
  }));
  const toolCount = session.tool_ids.length;
  const augCount = session.augment_ids.length;
  const perTool = toolCount > 0 ? Math.floor(base / toolCount) : 0;
  const perAug = augCount > 0 ? Math.floor(base / augCount) : 0;
  const now = new Date().toISOString();
  const uid = () => crypto.randomUUID();

  // Skill
  await db.exec(`UPDATE skills SET xp = xp + ${skillXP}, level = ${levelCase(`xp + ${skillXP}`)} WHERE id = '${session.skill_id}';`);

  // Stats
  for (const { stat, amount } of statXPMap) {
    if (amount > 0) await db.exec(`UPDATE stats SET xp = xp + ${amount}, level = ${levelCase(`xp + ${amount}`)}, dormant = false WHERE stat_key = '${stat}';`);
  }

  // Master
  await db.exec(`UPDATE master_progress SET total_xp = total_xp + ${masterXP}, level = ${levelCase(`total_xp + ${masterXP}`)} WHERE id = 1;`);

  // Tools
  for (const toolId of session.tool_ids) {
    if (perTool > 0) {
      await db.exec(`
        UPDATE tools SET xp = xp + ${perTool}, level = ${levelCase(`xp + ${perTool}`)} WHERE id = '${toolId}';
        UPDATE tool_progress SET total_xp = total_xp + ${perTool}, level = ${levelCase(`total_xp + ${perTool}`)} WHERE id = 1;
      `);
    }
  }

  // Augments
  for (const augId of session.augment_ids) {
    if (perAug > 0) {
      await db.exec(`
        UPDATE augments SET xp = xp + ${perAug}, level = ${levelCase(`xp + ${perAug}`)} WHERE id = '${augId}';
        UPDATE augment_progress SET total_xp = total_xp + ${perAug}, level = ${levelCase(`total_xp + ${perAug}`)} WHERE id = 1;
      `);
    }
  }

  // Update session record
  const totalToolXP = perTool * toolCount;
  const totalAugXP = perAug * augCount;
  await db.query(
    `UPDATE sessions SET duration_minutes=$1, skill_xp=$2, master_xp=$3,
     total_tool_xp=$4, total_augment_xp=$5, notes=$6, is_legacy=$7
     WHERE id=$8`,
    [newDuration, skillXP, masterXP, totalToolXP, totalAugXP, newNotes, newLegacy, session.id]
  );

  // New XP log entries
  const logEntries = [
    `('${uid()}', 'session', '${session.id}', 'skill',  '${session.skill_id}', ${skillXP}, '${now}')`,
    `('${uid()}', 'session', '${session.id}', 'master', 'master',              ${masterXP}, '${now}')`,
    ...statXPMap.filter(s => s.amount > 0).map(s =>
      `('${uid()}', 'session', '${session.id}', 'stat', '${s.stat}', ${s.amount}, '${now}')`),
    ...session.tool_ids.filter(() => perTool > 0).map(id =>
      `('${uid()}', 'session', '${session.id}', 'tool', '${id}', ${perTool}, '${now}')`),
    ...session.augment_ids.filter(() => perAug > 0).map(id =>
      `('${uid()}', 'session', '${session.id}', 'augment', '${id}', ${perAug}, '${now}')`),
  ];

  if (logEntries.length > 0) {
    await db.exec(`INSERT INTO xp_log (id, source, source_id, tier, entity_id, amount, logged_at) VALUES ${logEntries.join(',')};`);
  }
}

// ── Component ─────────────────────────────────────────────────

interface Props {
  sessionId: string;
  onDeleted?: () => void;
  onClose?: () => void;
}

export default function SessionDetailDrawer({ sessionId, onDeleted, onClose }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editDuration, setEditDuration] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLegacy, setEditLegacy] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const { data: session, isLoading } = useQuery({
    queryKey: ['session-detail', sessionId],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{
        id: string; skill_id: string; skill_name: string;
        duration_minutes: number; stat_split: string;
        notes: string | null; is_legacy: boolean; logged_at: string;
        skill_xp: number; master_xp: number;
        tool_ids: string; total_tool_xp: number;
        augment_ids: string; total_augment_xp: number;
        course_id: string | null; media_id: string | null; project_id: string | null;
      }>(
        `SELECT id, skill_id, skill_name, duration_minutes, stat_split,
                notes, is_legacy, logged_at, skill_xp, master_xp,
                tool_ids, total_tool_xp, augment_ids, total_augment_xp,
                course_id, media_id, project_id
         FROM sessions WHERE id = $1;`,
        [sessionId]
      );
      if (!res.rows[0]) return null;
      const r = res.rows[0];

      const sessionData = {
        ...r,
        stat_split: typeof r.stat_split === 'string' ? JSON.parse(r.stat_split) : (r.stat_split ?? []),
        tool_ids: typeof r.tool_ids === 'string' ? JSON.parse(r.tool_ids) : (r.tool_ids ?? []),
        augment_ids: typeof r.augment_ids === 'string' ? JSON.parse(r.augment_ids) : (r.augment_ids ?? []),
      } as SessionData;

      const bonusXP: BonusXPEntry[] = [];

      if (r.media_id) {
        const mediaBonusRes = await db.query<BonusXPEntry>(
          `SELECT source, source_id, tier, entity_id, amount, notes FROM xp_log
           WHERE source_id = $1 AND source IN ('book_complete','comic_complete','film_complete','documentary_complete','tv_complete','album_complete','game_complete')
           ORDER BY logged_at;`,
          [r.media_id]
        );
        bonusXP.push(...mediaBonusRes.rows);
      }

      if (r.course_id) {
        const sectionsRes = await db.query<{ id: string }>(
          `SELECT id FROM course_sections WHERE course_id = $1;`,
          [r.course_id]
        );
        const sectionIds = sectionsRes.rows.map(s => `'${s.id}'`).join(',');
        if (sectionIds) {
          const sectionBonusRes = await db.query<BonusXPEntry>(
            `SELECT source, source_id, tier, entity_id, amount, notes FROM xp_log
             WHERE source_id IN (${sectionIds}) AND source IN ('course_section','course_complete')
             ORDER BY logged_at;`
          );
          bonusXP.push(...sectionBonusRes.rows);
        }
        const courseBonusRes = await db.query<BonusXPEntry>(
          `SELECT source, source_id, tier, entity_id, amount, notes FROM xp_log
           WHERE source_id = $1 AND source = 'course_complete'
           ORDER BY logged_at;`,
          [r.course_id]
        );
        bonusXP.push(...courseBonusRes.rows);
      }

      let toolNames: string[] = [];
      let augmentNames: string[] = [];
      let courseName: string | null = null;
      let mediaName: string | null = null;
      let projectName: string | null = null;

      if (sessionData.tool_ids.length > 0) {
        const tr = await db.query<{ name: string }>(`SELECT name FROM tools WHERE id = ANY($1::text[])`, [sessionData.tool_ids]);
        toolNames = tr.rows.map(r => r.name);
      }
      if (sessionData.augment_ids.length > 0) {
        const ar = await db.query<{ name: string }>(`SELECT name FROM augments WHERE id = ANY($1::text[])`, [sessionData.augment_ids]);
        augmentNames = ar.rows.map(r => r.name);
      }
      if (sessionData.course_id) {
        const cr = await db.query<{ name: string }>(`SELECT name FROM courses WHERE id = $1`, [sessionData.course_id]);
        courseName = cr.rows[0]?.name || null;
      }
      if (sessionData.media_id) {
        const mr = await db.query<{ title: string }>(`SELECT title FROM media WHERE id = $1`, [sessionData.media_id]);
        mediaName = mr.rows[0]?.title || null;
      }
      if (sessionData.project_id) {
        const pr = await db.query<{ name: string }>(`SELECT name FROM projects WHERE id = $1`, [sessionData.project_id]);
        projectName = pr.rows[0]?.name || null;
      }

      return { ...sessionData, bonusXP, toolNames, augmentNames, courseName, mediaName, projectName };
    },
  });

  const startEdit = () => {
    if (!session) return;
    setEditDuration(String(session.duration_minutes));
    setEditNotes(session.notes ?? '');
    setEditLegacy(session.is_legacy);
    setEditing(true);
  };

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!session) return;
      const newDuration = parseInt(editDuration);
      if (!newDuration || newDuration <= 0) throw new Error('Invalid duration');
      const db = await getDB();
      // 1. Reverse old XP
      await reverseSessionXP(db, session.id);
      // 2. Award new XP
      await awardNewSessionXP(db, session, newDuration, editNotes.trim() || null, editLegacy);
    },
    onSuccess: async () => {
      await refreshAppData(queryClient);
      setEditing(false);
    },
  });

  const deleteSession = useMutation({
    mutationFn: async () => {
      if (!session) return;
      const db = await getDB();
      // 1. Reverse all XP
      await reverseSessionXP(db, session.id);
      // 2. Delete session record
      await db.exec(`DELETE FROM sessions WHERE id = '${session.id}';`);
    },
    onSuccess: async () => {
      await refreshAppData(queryClient);
      onDeleted?.();
    },
  });

  if (isLoading) return (
    <div style={{ padding: 24, color: dim, fontFamily: mono, fontSize: 11 }}>Loading...</div>
  );
  if (!session) return (
    <div style={{ padding: 24, color: dim, fontFamily: mono, fontSize: 11 }}>Session not found.</div>
  );

  const date = new Date(session.logged_at).toLocaleDateString('en-CA');
  const time = new Date(session.logged_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const hrs = Math.floor(session.duration_minutes / 60);
  const mins = session.duration_minutes % 60;
  const durLabel = hrs > 0 ? (mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`) : `${mins}m`;

  const totalMainXP = session.skill_xp + session.master_xp;
  const perToolXP = session.tool_ids.length > 0 ? Math.floor(session.total_tool_xp / session.tool_ids.length) : 0;
  const perAugXP = session.augment_ids.length > 0 ? Math.floor(session.total_augment_xp / session.augment_ids.length) : 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: bgS, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid rgba(153,104,0,0.3)`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}>
          <div style={{ fontFamily: vt, fontSize: 22, color: acc, flex: 1, minWidth: 0 }}>
            {session.skill_name.toUpperCase()}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: `1px solid ${adim}`,
                color: adim,
                fontFamily: mono,
                fontSize: 10,
                padding: '3px 10px',
                cursor: 'pointer',
                letterSpacing: 1,
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = acc;
                e.currentTarget.style.color = acc;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = adim;
                e.currentTarget.style.color = adim;
              }}
            >
              CLOSE
            </button>
          )}
        </div>
        <div style={{ fontFamily: mono, fontSize: 9, color: dim, letterSpacing: 1 }}>
          {date}  {time}  ·  {durLabel}
          {session.is_legacy && <span style={{ color: '#ffaa00', marginLeft: 8 }}>[LEGACY]</span>}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: showDelete ? 10 : 16 }}>
          <button onClick={editing ? () => setEditing(false) : startEdit}
            style={{ flex: 1, height: 32, border: `1px solid ${editing ? acc : adim}`, background: 'transparent', color: editing ? acc : adim, fontFamily: mono, fontSize: 9, cursor: 'pointer', letterSpacing: 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = acc; e.currentTarget.style.color = acc; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = editing ? acc : adim; e.currentTarget.style.color = editing ? acc : adim; }}>
            {editing ? '[ CANCEL ]' : '[ EDIT ]'}
          </button>
          <button onClick={() => setShowDelete(v => !v)}
            style={{ flex: 1, height: 32, border: `1px solid rgba(153,104,0,0.4)`, background: 'transparent', color: dim, fontFamily: mono, fontSize: 9, cursor: 'pointer', letterSpacing: 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = red; e.currentTarget.style.color = red; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)'; e.currentTarget.style.color = dim; }}>
            [ DELETE ]
          </button>
        </div>

        {showDelete && (
          <div style={{ border: `1px solid ${red}`, padding: '10px 12px', background: 'rgba(255,68,0,0.06)', marginBottom: 16 }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: red, marginBottom: 8 }}>
              DELETE SESSION? All XP will be reversed. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => deleteSession.mutate()} disabled={deleteSession.isPending}
                style={{ flex: 1, height: 28, background: 'transparent', border: `1px solid ${red}`, color: red, fontFamily: mono, fontSize: 9, cursor: 'pointer' }}>
                {deleteSession.isPending ? 'DELETING...' : '[ CONFIRM DELETE ]'}
              </button>
              <button onClick={() => setShowDelete(false)}
                style={{ flex: 1, height: 28, background: 'transparent', border: `1px solid ${adim}`, color: dim, fontFamily: mono, fontSize: 9, cursor: 'pointer' }}>
                [ CANCEL ]
              </button>
            </div>
          </div>
        )}

        {/* TAGGED ITEMS */}
        {(session.toolNames.length > 0 || session.augmentNames.length > 0 || session.courseName || session.mediaName || session.projectName) && (
          <>
            <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8, marginTop: showDelete ? 0 : 4 }}>// TAGGED</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
              {session.toolNames.map(name => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 10 }}>
                  <span style={{ color: dim }}>TOOL</span>
                  <span style={{ color: acc }}>{name.toUpperCase()}</span>
                </div>
              ))}
              {session.augmentNames.map(name => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 10 }}>
                  <span style={{ color: dim }}>AUGMENT</span>
                  <span style={{ color: acc }}>{name.toUpperCase()}</span>
                </div>
              ))}
              {session.courseName && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 10 }}>
                  <span style={{ color: dim }}>COURSE</span>
                  <span style={{ color: acc }}>{session.courseName.toUpperCase()}</span>
                </div>
              )}
              {session.mediaName && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 10 }}>
                  <span style={{ color: dim }}>MEDIA</span>
                  <span style={{ color: acc }}>{session.mediaName.toUpperCase()}</span>
                </div>
              )}
              {session.projectName && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 10 }}>
                  <span style={{ color: dim }}>PROJECT</span>
                  <span style={{ color: acc }}>{session.projectName.toUpperCase()}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* XP breakdown */}
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>// XP AWARDED</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 10 }}>
            <span style={{ color: dim }}>SKILL XP</span>
            <span style={{ color: green }}>+{session.skill_xp}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 10 }}>
            <span style={{ color: dim }}>MASTER XP</span>
            <span style={{ color: green }}>+{session.master_xp}</span>
          </div>
          {session.stat_split.map(s => (
            <div key={s.stat} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 10 }}>
              <span style={{ color: dim }}>{s.stat.toUpperCase()} STAT  ({s.percent}%)</span>
              <span style={{ color: green }}>+{Math.floor(session.master_xp * s.percent / 100)}</span>
            </div>
          ))}
          {session.tool_ids.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 10 }}>
              <span style={{ color: dim }}>TOOL XP (×{session.tool_ids.length})</span>
              <span style={{ color: '#4af' }}>+{perToolXP} each</span>
            </div>
          )}
          {session.augment_ids.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 10 }}>
              <span style={{ color: dim }}>AUGMENT XP (×{session.augment_ids.length})</span>
              <span style={{ color: '#a4f' }}>+{perAugXP} each</span>
            </div>
          )}
          {session.bonusXP && session.bonusXP.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid rgba(153,104,0,0.3)` }}>
              <div style={{ fontSize: 9, color: green, marginBottom: 4 }}>COMPLETION BONUS</div>
              {session.bonusXP.map((bonus, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 10 }}>
                  <span style={{ color: bonus.tier === 'skill' ? '#4af' : bonus.tier === 'master' ? '#a4f' : dim }}>{getBonusLabel(bonus)}</span>
                  <span style={{ color: green }}>+{bonus.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {session.notes && !editing && (
          <>
            <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>// NOTES</div>
            <div style={{ fontFamily: mono, fontSize: 10, color: dim, marginBottom: 16, lineHeight: 1.6 }}>
              {session.notes}
            </div>
          </>
        )}

        {/* Edit form */}
        {editing && (
          <div style={{ border: `1px solid ${adim}`, padding: 12, marginBottom: 12, background: bgT }}>
            <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 10 }}>// EDIT SESSION</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              <div>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 4 }}>DURATION (minutes)</div>
                <input
                  type="number" min="1" value={editDuration}
                  onChange={e => setEditDuration(e.target.value)}
                  style={{ width: '100%', padding: '5px 8px', fontSize: 11, background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }}
                />
                <div style={{ fontSize: 9, color: adim, marginTop: 4 }}>
                  Changing duration recalculates ALL XP for this session.
                </div>
              </div>

              <div>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 4 }}>NOTES</div>
                <textarea
                  value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3}
                  style={{ width: '100%', padding: '5px 8px', fontSize: 10, background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 9, color: editLegacy ? '#ffaa00' : adim, letterSpacing: 1 }}>
                <span onClick={() => setEditLegacy(v => !v)} style={{ width: 13, height: 13, border: `1px solid ${editLegacy ? '#ffaa00' : adim}`, background: editLegacy ? 'rgba(255,170,0,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>
                  {editLegacy ? '✓' : ''}
                </span>
                LEGACY ENTRY (50% XP)
              </label>

              <div style={{ fontSize: 9, color: '#ffaa00', padding: '6px 8px', border: '1px solid rgba(255,170,0,0.3)', background: 'rgba(255,170,0,0.05)' }}>
                ⚠ Old XP will be reversed, new XP awarded based on updated duration.
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending}
                  style={{ flex: 1, padding: '7px', fontSize: 9, border: `1px solid ${acc}`, background: 'transparent', color: acc, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>
                  {saveEdit.isPending ? 'SAVING...' : '✓ SAVE CHANGES'}
                </button>
                <button onClick={() => setEditing(false)}
                  style={{ flex: 1, padding: '7px', fontSize: 9, border: `1px solid ${adim}`, background: 'transparent', color: dim, fontFamily: mono, cursor: 'pointer' }}>
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
