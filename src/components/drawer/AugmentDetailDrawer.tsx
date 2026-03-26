// src/components/drawer/AugmentDetailDrawer.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { getLevelFromXP, getXPDisplayValues } from '@/services/xpService';
import { toast } from '@/hooks/use-toast';

const mono  = "'IBM Plex Mono', monospace";
const vt    = "'VT323', monospace";
const acc   = 'hsl(var(--accent))';
const adim  = 'hsl(var(--accent-dim))';
const dim   = 'hsl(var(--text-dim))';
const bgS   = 'hsl(var(--bg-secondary))';
const bgT   = 'hsl(var(--bg-tertiary))';
const green = '#44ff88';

const CLUSTERS = [
  'Architecture & Code', 'Core Intelligence', 'Data & Strategy', 'Identity & Safety',
  'Linguistic & Narrative', 'Sonic & Acoustic', 'Visual & Cinematic', 'Workflow & Context',
];

interface Augment {
  id: string; name: string; category: string; xp: number; active: boolean;
  url: string | null; description: string | null; notes: string | null;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 8px' }}>
      {label}<div style={{ flex: 1, height: 1, background: 'rgba(153,104,0,0.3)' }} />
    </div>
  );
}

function XPBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: bgT, border: `1px solid ${adim}`, height: 6, flex: 1 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: acc, boxShadow: '0 0 6px rgba(255,176,0,0.4)', transition: 'width 0.4s ease' }} />
    </div>
  );
}

interface Props { augmentId: string; onClose?: () => void; }

export default function AugmentDetailDrawer({ augmentId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing]       = useState(false);
  const [editName, setEditName]     = useState('');
  const [editCat, setEditCat]       = useState('');
  const [editUrl, setEditUrl]       = useState('');
  const [editDesc, setEditDesc]     = useState('');
  const [editNotes, setEditNotes]   = useState('');
  const [showDelete, setShowDelete] = useState(false);

  const { data: augment, isLoading } = useQuery({
    queryKey: ['augment', augmentId],
    enabled: !!augmentId,
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<Augment>(`SELECT * FROM augments WHERE id = $1 LIMIT 1;`, [augmentId]);
      return res.rows[0] ?? null;
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['augment-sessions', augmentId],
    enabled: !!augmentId,
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<{ id: string; skill_name: string; duration_minutes: number; logged_at: string; aug_xp: number }>(`
        SELECT s.id, s.skill_name, s.duration_minutes, s.logged_at,
               COALESCE(x.amount, 0) as aug_xp
        FROM sessions s
        LEFT JOIN xp_log x ON x.source_id = s.id AND x.tier = 'augment' AND x.entity_id = '${augmentId}'
        WHERE s.augment_ids::text LIKE '%${augmentId}%'
        ORDER BY s.logged_at DESC LIMIT 8;
      `);
      return res.rows;
    },
  });

  const { data: augProgress } = useQuery({
    queryKey: ['augment-progress'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query(`SELECT total_xp, level FROM augment_progress WHERE id = 1;`);
      return res.rows[0] as { total_xp: number; level: number } | undefined;
    },
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      await db.exec(`
        UPDATE augments SET
          name        = '${editName.trim().replace(/'/g,"''")}',
          category    = '${editCat.replace(/'/g,"''")}',
          url         = ${editUrl.trim() ? `'${editUrl.trim().replace(/'/g,"''")}'` : 'NULL'},
          description = ${editDesc.trim() ? `'${editDesc.trim().replace(/'/g,"''")}'` : 'NULL'},
          notes       = ${editNotes.trim() ? `'${editNotes.trim().replace(/'/g,"''")}'` : 'NULL'}
        WHERE id = '${augmentId}';
      `);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setEditing(false);
      toast({ title: '✓ AUGMENT UPDATED' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (active: boolean) => {
      const db = await getDB();
      await db.exec(`UPDATE augments SET active = ${active} WHERE id = '${augmentId}';`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const deleteAugment = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      await db.exec(`DELETE FROM augments WHERE id = '${augmentId}';`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['augments'] });
      onClose?.();
    },
  });

  const startEdit = () => {
    if (!augment) return;
    setEditName(augment.name);
    setEditCat(augment.category);
    setEditUrl(augment.url ?? '');
    setEditDesc(augment.description ?? '');
    setEditNotes(augment.notes ?? '');
    setEditing(true);
  };

  if (isLoading) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>LOADING...</div>;
  if (!augment)  return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>AUGMENT NOT FOUND</div>;

  const { level, xpInLevel, xpForLevel } = getLevelFromXP(augment.xp);
  const xpPct = xpForLevel > 0 ? Math.min(100, Math.round((xpInLevel / xpForLevel) * 100)) : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>

      {/* Header */}
      <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${adim}`, flexShrink: 0 }}>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>// AUGMENT</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <div style={{ fontFamily: vt, fontSize: 24, color: acc, flex: 1, lineHeight: 1.1 }}>
            {augment.name.toUpperCase()}
          </div>
          <button onClick={() => toggleActive.mutate(!augment.active)} style={{
            padding: '2px 10px', fontSize: 9, letterSpacing: 1, flexShrink: 0,
            border: `1px solid ${augment.active ? green : adim}`,
            background: augment.active ? 'rgba(68,255,136,0.1)' : 'transparent',
            color: augment.active ? green : dim, fontFamily: mono, cursor: 'pointer',
          }}>{augment.active ? '● ACTIVE' : '○ INACTIVE'}</button>
        </div>

        <span style={{ fontSize: 9, color: adim, border: `1px solid ${adim}`, padding: '1px 6px', letterSpacing: 1 }}>
          {augment.category}
        </span>

        {/* XP bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: vt, fontSize: 16, color: acc, flexShrink: 0 }}>LVL {level}</span>
          <XPBar value={xpInLevel} max={xpForLevel} />
          <span style={{ fontSize: 10, color: dim, flexShrink: 0 }}>{xpPct}%</span>
        </div>
        <div style={{ fontSize: 9, color: adim }}>
          {getXPDisplayValues(Number(augment.xp)).totalXP.toLocaleString()} / {getXPDisplayValues(Number(augment.xp)).totalXPToNextLevel.toLocaleString()} XP to LVL {level + 1}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>

        {/* Edit form */}
        {editing ? (
          <>
            <SectionLabel label="EDIT AUGMENT" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: bgS, border: `1px solid ${adim}`, padding: 14 }}>
              <div>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 4 }}>NAME</div>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: 11, boxSizing: 'border-box', background: bgT, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 6 }}>CLUSTER</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {CLUSTERS.map(c => (
                    <button key={c} onClick={() => setEditCat(c)} style={{
                      padding: '3px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer',
                      border: `1px solid ${editCat === c ? acc : adim}`,
                      background: editCat === c ? 'rgba(255,176,0,0.1)' : 'transparent',
                      color: editCat === c ? acc : dim,
                    }}>{c}</button>
                  ))}
                </div>
              </div>
              {[['URL', editUrl, setEditUrl], ['DESCRIPTION', editDesc, setEditDesc], ['NOTES', editNotes, setEditNotes]].map(([label, val, setter]) => (
                <div key={label as string}>
                  <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 4 }}>{label as string}</div>
                  <input value={val as string} onChange={e => (setter as any)(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: 11, boxSizing: 'border-box', background: bgT, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending} style={{ flex: 1, padding: '6px', fontSize: 9, border: `1px solid ${acc}`, background: 'transparent', color: acc, fontFamily: mono, cursor: 'pointer' }}>
                  {saveEdit.isPending ? 'SAVING...' : '✓ SAVE'}
                </button>
                <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '6px', fontSize: 9, border: `1px solid ${adim}`, background: 'transparent', color: dim, fontFamily: mono, cursor: 'pointer' }}>
                  CANCEL
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {augment.url && (
              <>
                <SectionLabel label="LINK" />
                <a href={augment.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: acc, wordBreak: 'break-all' }}>{augment.url}</a>
              </>
            )}
            {augment.description && (
              <>
                <SectionLabel label="DESCRIPTION" />
                <div style={{ fontSize: 10, color: dim, lineHeight: 1.6 }}>{augment.description}</div>
              </>
            )}
            {augment.notes && (
              <>
                <SectionLabel label="NOTES" />
                <div style={{ fontSize: 10, color: dim, lineHeight: 1.6 }}>{augment.notes}</div>
              </>
            )}
          </>
        )}

        {/* Recent sessions */}
        <SectionLabel label="RECENT SESSIONS" />
        {sessions.length === 0 ? (
          <div style={{ fontSize: 10, color: dim, opacity: 0.5 }}>No sessions logged with this augment yet.</div>
        ) : sessions.map(s => {
          const date = new Date(s.logged_at).toLocaleDateString('en-CA').replace(/-/g, '.');
          return (
            <div key={s.id} style={{ display: 'flex', gap: 10, fontFamily: mono, fontSize: 10, marginBottom: 5, alignItems: 'center' }}>
              <span style={{ color: adim }}>›</span>
              <span style={{ color: dim, flexShrink: 0, width: 80 }}>{date}</span>
              <span style={{ color: acc, flex: 1 }}>{s.skill_name}</span>
              <span style={{ color: dim, flexShrink: 0 }}>{s.duration_minutes}m</span>
              <span style={{ color: green, flexShrink: 0 }}>+{s.aug_xp} XP</span>
            </div>
          );
        })}

        {/* Actions */}
        <div style={{ height: 1, background: 'rgba(153,104,0,0.3)', margin: '20px 0 16px' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={startEdit} style={{ flex: 1, height: 32, border: `1px solid ${adim}`, background: 'transparent', color: adim, fontFamily: mono, fontSize: 10, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = acc; e.currentTarget.style.color = acc; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = adim; e.currentTarget.style.color = adim; }}
          >[ EDIT ]</button>
          <button onClick={() => toggleActive.mutate(!augment.active)} style={{ flex: 1, height: 32, border: `1px solid ${augment.active ? 'rgba(255,60,60,0.4)' : green}`, background: 'transparent', color: augment.active ? 'hsl(0,80%,55%)' : green, fontFamily: mono, fontSize: 10, cursor: 'pointer' }}>
            {augment.active ? '[ DEACTIVATE ]' : '[ ACTIVATE ]'}
          </button>
          <button onClick={() => setShowDelete(v => !v)} style={{ flex: 1, height: 32, border: '1px solid rgba(153,104,0,0.4)', background: 'transparent', color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4400'; e.currentTarget.style.color = '#ff4400'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)'; e.currentTarget.style.color = dim; }}
          >[ DELETE ]</button>
        </div>
        {showDelete && (
          <div style={{ border: '1px solid #ff3300', padding: '10px 12px', background: 'rgba(255,51,0,0.06)', marginTop: 8 }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: '#ff4400', marginBottom: 8 }}>DELETE AUGMENT? This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => deleteAugment.mutate()} style={{ flex: 1, height: 30, background: 'transparent', border: '1px solid #ff4400', color: '#ff4400', fontFamily: mono, fontSize: 10, cursor: 'pointer' }}>[ CONFIRM ]</button>
              <button onClick={() => setShowDelete(false)} style={{ flex: 1, height: 30, background: 'transparent', border: `1px solid ${adim}`, color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer' }}>[ CANCEL ]</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}