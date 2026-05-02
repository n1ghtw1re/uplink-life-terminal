import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { STAT_META, StatKey, getStatLevel } from '@/types';
import { EXERCISE_CATEGORY_MAP, ExerciseCategoryId } from '@/features/exercise/config';
import { getXPDisplayValues } from '@/services/xpService';

interface Props {
  exerciseId: string;
  onClose?: () => void;
}

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgTer = 'hsl(var(--bg-tertiary))';

function XPBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: bgTer, border: `1px solid ${adim}`, height: 6, flex: 1 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: acc, boxShadow: '0 0 6px rgba(255,176,0,0.4)' }} />
    </div>
  );
}

export default function ExerciseDetailDrawer({ exerciseId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editName, setEditName] = useState('');
  const [editQuantityType, setEditQuantityType] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrimary, setEditPrimary] = useState<StatKey>('body');
  const [editSecondary, setEditSecondary] = useState<StatKey>('grit');
  const [editPrimaryPct, setEditPrimaryPct] = useState(50);

  useEffect(() => {
    setEditing(false);
    setShowDelete(false);
  }, [exerciseId]);

  const { data: exercise, isLoading } = useQuery({
    queryKey: ['exercise', exerciseId],
    enabled: !!exerciseId,
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<any>(`SELECT * FROM exercises WHERE id = $1 LIMIT 1;`, [exerciseId]);
      return res.rows[0] ?? null;
    },
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['exercise-output-logs', exerciseId],
    enabled: !!exerciseId,
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<any>(
        `SELECT ole.id, ole.xp_awarded, ole.details_json, ol.created_at
         FROM output_log_exercises ole
         JOIN output_logs ol ON ol.id = ole.output_log_id
         WHERE ole.exercise_id = $1
         ORDER BY ol.created_at DESC
         LIMIT 20;`,
        [exerciseId]
      );
      return res.rows;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      const name = editName.trim();
      if (!name) throw new Error('Name is required.');
      if (editPrimary === editSecondary) throw new Error('Primary and secondary stats must be different.');
      const dup = await db.query(`SELECT id FROM exercises WHERE LOWER(name)=LOWER($1) AND id <> $2 LIMIT 1;`, [name, exerciseId]);
      if (dup.rows.length > 0) throw new Error('Exercise name already exists.');
      await db.query(
        `UPDATE exercises
         SET name = $1, quantity_type = $2, description = $3,
             primary_stat = $4, secondary_stat = $5, primary_pct = $6, secondary_pct = $7
         WHERE id = $8;`,
        [name, editQuantityType.trim() || 'reps', editDescription.trim() || null, editPrimary, editSecondary, editPrimaryPct, 100 - editPrimaryPct, exerciseId]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setEditing(false);
      toast({ title: 'EXERCISE UPDATED' });
    },
    onError: (e) => toast({ title: 'ERROR', description: String(e) }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      await db.query(`DELETE FROM exercises WHERE id = $1;`, [exerciseId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      onClose?.();
    },
  });

  if (isLoading) return <div style={{ padding: 20, color: dim, fontFamily: mono, fontSize: 11 }}>LOADING...</div>;
  if (!exercise) return <div style={{ padding: 20, color: dim, fontFamily: mono, fontSize: 11 }}>EXERCISE NOT FOUND</div>;

  const level = getStatLevel(exercise.xp ?? 0);
  const category = EXERCISE_CATEGORY_MAP[exercise.category_id as ExerciseCategoryId];

  const startEdit = () => {
    setEditName(exercise.name);
    setEditQuantityType(exercise.quantity_type);
    setEditDescription(exercise.description ?? '');
    setEditPrimary(exercise.primary_stat);
    setEditSecondary(exercise.secondary_stat);
    setEditPrimaryPct(exercise.primary_pct);
    setEditing(true);
  };

  const prSample = 'Best: 5 x 20 reps (sample)';
  const xpDisplay = getXPDisplayValues(exercise.xp ?? 0);
  const xpPct = level.xpForLevel > 0 ? Math.min(100, Math.round((level.xpInLevel / level.xpForLevel) * 100)) : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${adim}` }}>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2 }}>// EXERCISE</div>
        <div style={{ fontFamily: vt, fontSize: 24, color: acc, lineHeight: 1.1 }}>{exercise.name}</div>
        <div style={{ fontSize: 10, color: dim, marginBottom: 8 }}>{category?.label ?? exercise.category_id} | {exercise.quantity_type}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: vt, fontSize: 16, color: acc, flexShrink: 0 }}>LVL {level.level}</span>
          <XPBar value={level.xpInLevel} max={level.xpForLevel} />
          <span style={{ fontSize: 10, color: dim, width: 34, textAlign: 'right' }}>{xpPct}%</span>
        </div>
        <div style={{ fontSize: 9, color: adim, marginTop: 4 }}>
          {xpDisplay.totalXP.toLocaleString()} / {xpDisplay.totalXPToNextLevel.toLocaleString()} XP to LVL {level.level + 1}
        </div>
        <div style={{ fontSize: 10, color: adim, marginTop: 6 }}>
          {STAT_META[exercise.primary_stat as StatKey].name} {exercise.primary_pct}% / {STAT_META[exercise.secondary_stat as StatKey].name} {exercise.secondary_pct}%
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>// PR</div>
        <div style={{ fontSize: 10, color: acc, marginBottom: 14 }}>{prSample}</div>

        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>// RECENT LOGS</div>
        {recentLogs.length === 0 && (
          <div style={{ fontSize: 10, color: dim, marginBottom: 14 }}>No output logs yet.</div>
        )}
        {recentLogs.map((log: any) => {
          const date = new Date(log.created_at).toLocaleDateString('en-CA').replace(/-/g, '.');
          const details = typeof log.details_json === 'string' ? JSON.parse(log.details_json) : (log.details_json ?? {});
          const totals = details.totals ?? {};
          const sets = Array.isArray(details.sets) ? details.sets.length : totals.setCount ?? 0;
          const summary = totals.totalReps != null
            ? `${sets} sets | reps ${totals.totalReps ?? 0} | weight ${totals.totalWeight ?? 0}`
            : `${sets} sets | total ${totals.total ?? 0}`;
          return (
            <div key={log.id} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 10, padding: '6px 8px', border: `1px solid rgba(153,104,0,0.25)` }}>
              <span style={{ color: adim, width: 72, flexShrink: 0 }}>{date}</span>
              <span style={{ color: dim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>
              <span style={{ color: acc, flexShrink: 0 }}>+{log.xp_awarded} XP</span>
            </div>
          );
        })}

        {editing ? (
          <div style={{ border: `1px solid ${adim}`, padding: 12, display: 'grid', gap: 8 }}>
            <input className="crt-input" value={editName} onChange={e => setEditName(e.target.value)} />
            <input className="crt-input" value={editQuantityType} onChange={e => setEditQuantityType(e.target.value)} />
            <textarea className="crt-input" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'] as StatKey[]).map(k => (
                <button key={k} className="topbar-btn" onClick={() => setEditPrimary(k)} style={{ border: `1px solid ${editPrimary === k ? acc : adim}`, color: editPrimary === k ? acc : dim }}>
                  P: {STAT_META[k].name}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'] as StatKey[]).filter(k => k !== editPrimary).map(k => (
                <button key={k} className="topbar-btn" onClick={() => setEditSecondary(k)} style={{ border: `1px solid ${editSecondary === k ? acc : adim}`, color: editSecondary === k ? acc : dim }}>
                  S: {STAT_META[k].name}
                </button>
              ))}
            </div>
            <input type="range" min={10} max={90} step={5} value={editPrimaryPct} onChange={e => setEditPrimaryPct(Number(e.target.value))} />
            <div style={{ fontSize: 9, color: dim }}>{STAT_META[editPrimary].name} {editPrimaryPct}% / {STAT_META[editSecondary].name} {100 - editPrimaryPct}%</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="topbar-btn" onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? 'SAVING...' : 'SAVE'}</button>
              <button className="topbar-btn" onClick={() => setEditing(false)}>CANCEL</button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            {exercise.description && <div style={{ fontSize: 10, color: dim, marginBottom: 10 }}>{exercise.description}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="topbar-btn" onClick={startEdit}>EDIT</button>
              <button className="topbar-btn" onClick={() => setShowDelete(v => !v)}>DELETE</button>
            </div>
            {showDelete && (
              <div style={{ border: '1px solid #ff4400', padding: 10, marginTop: 8 }}>
                <div style={{ fontSize: 10, color: '#ff4400', marginBottom: 6 }}>Delete this exercise?</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="topbar-btn" onClick={() => deleteMutation.mutate()}>{deleteMutation.isPending ? 'DELETING...' : 'CONFIRM'}</button>
                  <button className="topbar-btn" onClick={() => setShowDelete(false)}>CANCEL</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
