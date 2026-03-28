// ============================================================
// src/components/drawer/SkillDetailDrawer.tsx
// ============================================================
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STAT_META, StatKey, getStatLevel } from '@/types';
import { getXPDisplayValues } from '@/services/xpService';
import { getDB } from '@/lib/db';
import { toast } from '@/hooks/use-toast';

interface Skill {
  id: string;
  name: string;
  stat_keys: string[];
  default_split: number[];
  icon: string;
  level: number;
  xp: number;
  notes: string | null;
  active: boolean;
  lifepath_id: string | null;
  created_at: string;
}

interface SessionRow {
  id: string;
  duration_minutes: number;
  logged_at: string;
  notes: string | null;
  skill_xp_awarded: number;
}

interface LifepathOption {
  id: string;
  name: string;
  category: string;
}

interface Props {
  skillId: string;
  onClose?: () => void;
  onOpenLog?: () => void;
}

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const accent = 'hsl(var(--accent))';
const accentDim = 'hsl(var(--accent-dim))';
const dimText = 'hsl(var(--text-dim))';
const bgSec = 'hsl(var(--bg-secondary))';
const bgTer = 'hsl(var(--bg-tertiary))';
const green = '#44ff88';
const STAT_KEYS: StatKey[] = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontFamily: mono, fontSize: 9,
      color: accentDim, letterSpacing: 2,
      display: 'flex', alignItems: 'center', gap: 8,
      margin: '16px 0 8px',
    }}>
      {label}
      <div style={{ flex: 1, height: 1, background: 'rgba(153,104,0,0.3)' }} />
    </div>
  );
}

function XPBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: bgTer, border: '1px solid hsl(var(--accent-dim))', height: 6, flex: 1 }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        background: accent,
        boxShadow: '0 0 6px rgba(255,176,0,0.4)',
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      border: '1px solid #ff3300', padding: '10px 12px',
      background: 'rgba(255,51,0,0.06)', marginTop: 8,
    }}>
      <div style={{ fontFamily: mono, fontSize: 10, color: '#ff4400', marginBottom: 8 }}>
        DELETE SKILL? This cannot be undone. All sessions will be preserved in XP log.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onConfirm} style={{
          flex: 1, height: 30, background: 'transparent',
          border: '1px solid #ff4400', color: '#ff4400',
          fontFamily: mono, fontSize: 10, cursor: 'pointer',
        }}>[ CONFIRM DELETE ]</button>
        <button onClick={onCancel} style={{
          flex: 1, height: 30, background: 'transparent',
          border: '1px solid hsl(var(--accent-dim))', color: dimText,
          fontFamily: mono, fontSize: 10, cursor: 'pointer',
        }}>[ CANCEL ]</button>
      </div>
    </div>
  );
}

export default function SkillDetailDrawer({ skillId, onClose, onOpenLog }: Props) {
  const queryClient = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPrimary, setEditPrimary] = useState<StatKey>('body');
  const [editSecondary, setEditSecondary] = useState<StatKey | ''>('');
  const [editSplit, setEditSplit] = useState(50);
  const [editLifepathId, setEditLifepathId] = useState('');

  const { data: skill, isLoading } = useQuery({
    queryKey: ['skill', skillId],
    enabled: !!skillId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('id', skillId)
        .single();
      if (error) throw error;
      return data as Skill;
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ['skill-sessions', skillId],
    enabled: !!skillId,
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<SessionRow>(
        `SELECT id, duration_minutes, logged_at, notes, skill_xp as skill_xp_awarded
         FROM sessions WHERE skill_id = $1 ORDER BY logged_at DESC LIMIT 20;`,
        [skillId]
      );
      return res.rows;
    },
  });

  const { data: lifepaths = [] } = useQuery({
    queryKey: ['lifepaths-for-skill-edit'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<LifepathOption>(`SELECT id, name, category FROM lifepaths ORDER BY category, name;`);
      return res.rows;
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const db = await getDB();
      await db.exec(`DELETE FROM sessions WHERE id = '${sessionId}'`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-sessions', skillId] });
    },
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      const name = editName.trim();
      if (!name) throw new Error('Skill name is required.');

      const duplicate = await db.query<{ id: string }>(
        `SELECT id FROM skills WHERE LOWER(name) = LOWER($1) AND id <> $2 LIMIT 1;`,
        [name, skillId]
      );
      if (duplicate.rows.length > 0) throw new Error(`"${name}" already exists.`);

      const statKeys = editSecondary ? [editPrimary, editSecondary] : [editPrimary];
      const defaultSplit = editSecondary ? [editSplit, 100 - editSplit] : [100];

      await db.query(
        `UPDATE skills
         SET name = $1,
             icon = $2,
             notes = $3,
             stat_keys = $4,
             default_split = $5,
             lifepath_id = $6
         WHERE id = $7;`,
        [
          name,
          editIcon.trim() || 'o',
          editNotes.trim() || null,
          JSON.stringify(statKeys),
          JSON.stringify(defaultSplit),
          editLifepathId || null,
          skillId,
        ]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setEditing(false);
      toast({ title: 'SKILL UPDATED' });
    },
    onError: (error) => {
      toast({ title: 'ERROR', description: error instanceof Error ? error.message : String(error) });
    },
  });

  const deleteSkill = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('skills').delete().eq('id', skillId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      onClose?.();
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (active: boolean) => {
      const db = await getDB();
      await db.exec(`UPDATE skills SET active = ${active} WHERE id = '${skillId}';`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  if (isLoading) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dimText }}>LOADING...</div>;
  if (!skill) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dimText }}>SKILL NOT FOUND</div>;

  const statKeys = (skill.stat_keys ?? []) as StatKey[];
  const split = skill.default_split ?? [];
  const { xpInLevel, xpForLevel } = getStatLevel(skill.xp);
  const xpPct = xpForLevel > 0 ? Math.min(100, Math.round((xpInLevel / xpForLevel) * 100)) : 100;
  const selectedLifepath = lifepaths.find((lp) => lp.id === skill.lifepath_id) ?? null;

  const startEdit = () => {
    const currentKeys = (skill.stat_keys ?? []) as StatKey[];
    setEditName(skill.name);
    setEditIcon(skill.icon ?? '');
    setEditNotes(skill.notes ?? '');
    setEditPrimary(currentKeys[0] ?? 'body');
    setEditSecondary(currentKeys[1] ?? '');
    setEditSplit(skill.default_split?.[0] ?? 50);
    setEditLifepathId(skill.lifepath_id ?? '');
    setEditing(true);
  };

  const editingLifepath = lifepaths.find((lp) => lp.id === editLifepathId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: '1px solid hsl(var(--accent-dim))',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 9, color: accentDim, letterSpacing: 2, marginBottom: 6 }}>// SKILL</div>
        <div style={{
          fontFamily: vt, fontSize: 24, color: accent,
          textShadow: '0 0 10px rgba(255,176,0,0.3)',
          lineHeight: 1.1, marginBottom: 4,
        }}>
          {skill.icon} {skill.name}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
          {statKeys.map((k, i) => (
            <span key={k} style={{
              fontSize: 9, color: accentDim,
              border: '1px solid hsl(var(--accent-dim))',
              padding: '1px 6px', letterSpacing: 1,
            }}>
              {STAT_META[k]?.icon} {k.toUpperCase()}{split[i] != null ? ` ${split[i]}%` : ''}
            </span>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => toggleActive.mutate(!skill.active)}
            style={{
              padding: '2px 10px', fontSize: 9, letterSpacing: 1,
              border: `1px solid ${skill.active ? green : accentDim}`,
              background: skill.active ? 'rgba(68,255,136,0.1)' : 'transparent',
              color: skill.active ? green : dimText,
              fontFamily: mono, cursor: 'pointer',
            }}
          >{skill.active ? '● ACTIVE' : '○ INACTIVE'}</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: vt, fontSize: 16, color: accent, flexShrink: 0 }}>LVL {skill.level}</span>
          <XPBar value={xpInLevel} max={xpForLevel} />
          <span style={{ fontSize: 10, color: dimText, flexShrink: 0 }}>{xpPct}%</span>
        </div>
        <div style={{ fontSize: 9, color: accentDim }}>
          {getXPDisplayValues(skill.xp).totalXP.toLocaleString()} / {getXPDisplayValues(skill.xp).totalXPToNextLevel.toLocaleString()} XP to LVL {skill.level + 1}
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '4px 20px 20px',
        scrollbarWidth: 'thin',
        scrollbarColor: `${accentDim} ${bgSec}`,
      }}>
        {editing ? (
          <>
            <SectionLabel label="EDIT SKILL" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: bgSec, border: `1px solid ${accentDim}`, padding: 14 }}>
              <div>
                <div style={{ fontSize: 9, color: accentDim, letterSpacing: 1, marginBottom: 4 }}>NAME</div>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: 11, boxSizing: 'border-box', background: bgTer, border: `1px solid ${accentDim}`, color: accent, fontFamily: mono, outline: 'none' }}
                />
              </div>

              <div>
                <div style={{ fontSize: 9, color: accentDim, letterSpacing: 1, marginBottom: 4 }}>ICON</div>
                <input
                  value={editIcon}
                  onChange={e => setEditIcon(e.target.value)}
                  maxLength={8}
                  style={{ width: '100%', padding: '6px 10px', fontSize: 11, boxSizing: 'border-box', background: bgTer, border: `1px solid ${accentDim}`, color: accent, fontFamily: mono, outline: 'none' }}
                />
              </div>

              <div>
                <div style={{ fontSize: 9, color: accentDim, letterSpacing: 1, marginBottom: 6 }}>PRIMARY STAT</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {STAT_KEYS.map(k => (
                    <button key={k} className="topbar-btn" onClick={() => { setEditPrimary(k); if (editSecondary === k) setEditSecondary(''); }} style={{
                      border: `1px solid ${editPrimary === k ? accent : accentDim}`,
                      color: editPrimary === k ? 'hsl(var(--accent-bright))' : dimText,
                      boxShadow: editPrimary === k ? '0 0 6px rgba(255,176,0,0.3)' : 'none',
                    }}>{STAT_META[k].icon} {STAT_META[k].name}</button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 9, color: accentDim, letterSpacing: 1, marginBottom: 6 }}>SECONDARY STAT</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <button className="topbar-btn" onClick={() => setEditSecondary('')} style={{
                    border: `1px solid ${editSecondary === '' ? accent : accentDim}`,
                    color: editSecondary === '' ? 'hsl(var(--accent-bright))' : dimText,
                  }}>NONE</button>
                  {STAT_KEYS.filter(k => k !== editPrimary).map(k => (
                    <button key={k} className="topbar-btn" onClick={() => setEditSecondary(k)} style={{
                      border: `1px solid ${editSecondary === k ? accent : accentDim}`,
                      color: editSecondary === k ? 'hsl(var(--accent-bright))' : dimText,
                      boxShadow: editSecondary === k ? '0 0 6px rgba(255,176,0,0.3)' : 'none',
                    }}>{STAT_META[k].icon} {STAT_META[k].name}</button>
                  ))}
                </div>
              </div>

              {editSecondary && (
                <div>
                  <div style={{ fontSize: 9, color: accentDim, letterSpacing: 1, marginBottom: 6 }}>
                    DEFAULT SPLIT: {STAT_META[editSecondary].name} {100 - editSplit}% / {STAT_META[editPrimary].name} {editSplit}%
                  </div>
                  <input
                    type="range"
                    className="ql-split-slider"
                    min={10}
                    max={90}
                    step={5}
                    value={editSplit}
                    onChange={e => setEditSplit(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              <div>
                <div style={{ fontSize: 9, color: accentDim, letterSpacing: 1, marginBottom: 4 }}>LIFEPATH</div>
                <select
                  value={editLifepathId}
                  onChange={e => setEditLifepathId(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: 11, boxSizing: 'border-box', background: bgTer, border: `1px solid ${accentDim}`, color: accent, fontFamily: mono, outline: 'none' }}
                >
                  <option value="">UNLINKED</option>
                  {lifepaths.map(lp => (
                    <option key={lp.id} value={lp.id}>
                      {lp.category} - {lp.name}
                    </option>
                  ))}
                </select>
                {editingLifepath && (
                  <div style={{ fontSize: 9, color: dimText, marginTop: 4 }}>
                    Linked to {editingLifepath.category} / {editingLifepath.name}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 9, color: accentDim, letterSpacing: 1, marginBottom: 4 }}>NOTES</div>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={4}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 11, boxSizing: 'border-box', background: bgTer, border: `1px solid ${accentDim}`, color: dimText, fontFamily: mono, outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending} style={{ flex: 1, padding: '6px', fontSize: 9, border: `1px solid ${accent}`, background: 'transparent', color: accent, fontFamily: mono, cursor: 'pointer' }}>
                  {saveEdit.isPending ? 'SAVING...' : '✓ SAVE'}
                </button>
                <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '6px', fontSize: 9, border: `1px solid ${accentDim}`, background: 'transparent', color: dimText, fontFamily: mono, cursor: 'pointer' }}>
                  CANCEL
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {selectedLifepath && (
              <>
                <SectionLabel label="LIFEPATH" />
                <div style={{ fontSize: 10, color: dimText }}>
                  {selectedLifepath.category} / <span style={{ color: accent }}>{selectedLifepath.name}</span>
                </div>
              </>
            )}
            {skill.notes && (
              <>
                <SectionLabel label="NOTES" />
                <div style={{ fontSize: 10, color: dimText, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{skill.notes}</div>
              </>
            )}
          </>
        )}

        <SectionLabel label="LOG SESSION" />
        <button
          onClick={() => {
            onOpenLog?.();
            onClose?.();
          }}
          style={{
            width: '100%', height: 36,
            border: `1px solid ${accent}`,
            background: 'transparent', color: accent,
            fontFamily: mono, fontSize: 11,
            cursor: 'pointer', marginBottom: 4, letterSpacing: 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = accent; e.currentTarget.style.color = 'hsl(var(--bg-primary))'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = accent; }}
        >
          [ &gt;&gt; LOG SESSION ]
        </button>

        <SectionLabel label="RECENT SESSIONS" />
        {!sessions || sessions.length === 0 ? (
          <div style={{ fontSize: 10, color: dimText, opacity: 0.5 }}>No sessions logged yet.</div>
        ) : (
          sessions.map(s => {
            const date = new Date(s.logged_at).toLocaleDateString('en-CA').replace(/-/g, '.');
            const time = new Date(s.logged_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
            return (
              <div
                key={s.id}
                style={{ display: 'flex', gap: 8, fontFamily: mono, fontSize: 10, marginBottom: 6, alignItems: 'center', padding: '4px 6px', background: 'rgba(153,104,0,0.06)', border: '1px solid rgba(153,104,0,0.2)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(153,104,0,0.2)'}
              >
                <span style={{ color: accentDim, flexShrink: 0 }}>›</span>
                <span style={{ color: dimText, flexShrink: 0, width: 72 }}>{date}</span>
                <span style={{ color: dimText, flexShrink: 0, width: 44, fontSize: 9, opacity: 0.6 }}>{time}</span>
                <span style={{ color: accent, flexShrink: 0 }}>{s.duration_minutes}m</span>
                {s.notes ? <span style={{ color: dimText, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 9 }}>{s.notes}</span> : <span style={{ flex: 1 }} />}
                <span style={{ color: green, flexShrink: 0 }}>+{s.skill_xp_awarded}</span>
                <span
                  onClick={() => { if (window.confirm('Delete this session? XP already awarded will not be reversed.')) deleteSession.mutate(s.id); }}
                  style={{ fontSize: 9, color: 'rgba(153,104,0,0.4)', cursor: 'pointer', flexShrink: 0, padding: '0 2px' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ff4400'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(153,104,0,0.4)'}
                >×</span>
              </div>
            );
          })
        )}

        <div style={{ height: 1, background: 'rgba(153,104,0,0.3)', margin: '20px 0 16px' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={startEdit}
            style={{ flex: 1, height: 32, border: `1px solid ${accentDim}`, background: 'transparent', color: accentDim, fontFamily: mono, fontSize: 10, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = accentDim; e.currentTarget.style.color = accentDim; }}
          >[ EDIT ]</button>
          <button
            onClick={() => toggleActive.mutate(!skill.active)}
            style={{ flex: 1, height: 32, border: `1px solid ${skill.active ? 'rgba(255,60,60,0.4)' : green}`, background: 'transparent', color: skill.active ? 'hsl(0,80%,55%)' : green, fontFamily: mono, fontSize: 10, cursor: 'pointer' }}
          >{skill.active ? '[ DEACTIVATE ]' : '[ ACTIVATE ]'}</button>
          <button
            onClick={() => setShowDelete(v => !v)}
            style={{
              flex: 1, height: 32,
              border: '1px solid rgba(153,104,0,0.4)',
              background: 'transparent', color: dimText,
              fontFamily: mono, fontSize: 10, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4400'; e.currentTarget.style.color = '#ff4400'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)'; e.currentTarget.style.color = dimText; }}
          >[ DELETE ]</button>
        </div>

        {showDelete && (
          <DeleteConfirm
            onConfirm={() => deleteSkill.mutate()}
            onCancel={() => setShowDelete(false)}
          />
        )}
      </div>
    </div>
  );
}
