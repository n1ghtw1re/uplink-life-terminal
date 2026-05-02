import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { STAT_META, StatKey } from '@/types';
import { EXERCISE_CATEGORY_MAP, ExerciseCategoryId } from '@/features/exercise/config';

interface Props {
  workoutId: string;
  onClose?: () => void;
}

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';

export default function WorkoutDetailDrawer({ workoutId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrimary, setEditPrimary] = useState<StatKey>('body');
  const [editSecondary, setEditSecondary] = useState<StatKey>('grit');
  const [editPrimaryPct, setEditPrimaryPct] = useState(50);

  useEffect(() => {
    setEditing(false);
    setShowDelete(false);
  }, [workoutId]);

  const { data, isLoading } = useQuery({
    queryKey: ['workout', workoutId],
    enabled: !!workoutId,
    queryFn: async () => {
      const db = await getDB();
      const workoutRes = await db.query<any>(`SELECT * FROM workouts WHERE id = $1 LIMIT 1;`, [workoutId]);
      const entriesRes = await db.query<any>(
        `SELECT we.id, we.sort_order, we.quantity_label, e.name AS exercise_name
         FROM workout_exercises we
         JOIN exercises e ON e.id = we.exercise_id
         WHERE we.workout_id = $1
         ORDER BY we.sort_order ASC;`,
        [workoutId]
      );
      return { workout: workoutRes.rows[0] ?? null, entries: entriesRes.rows ?? [] };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      const name = editName.trim();
      if (!name) throw new Error('Name is required.');
      if (editPrimary === editSecondary) throw new Error('Primary and secondary stats must be different.');
      const dup = await db.query(`SELECT id FROM workouts WHERE LOWER(name)=LOWER($1) AND id <> $2 LIMIT 1;`, [name, workoutId]);
      if (dup.rows.length > 0) throw new Error('Workout name already exists.');
      await db.query(
        `UPDATE workouts
         SET name = $1, description = $2, primary_stat = $3, secondary_stat = $4, primary_pct = $5, secondary_pct = $6
         WHERE id = $7;`,
        [name, editDescription.trim() || null, editPrimary, editSecondary, editPrimaryPct, 100 - editPrimaryPct, workoutId]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setEditing(false);
      toast({ title: 'WORKOUT UPDATED' });
    },
    onError: (e) => toast({ title: 'ERROR', description: String(e) }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      await db.query(`DELETE FROM workouts WHERE id = $1;`, [workoutId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      onClose?.();
    },
  });

  if (isLoading) return <div style={{ padding: 20, color: dim, fontFamily: mono, fontSize: 11 }}>LOADING...</div>;
  if (!data?.workout) return <div style={{ padding: 20, color: dim, fontFamily: mono, fontSize: 11 }}>WORKOUT NOT FOUND</div>;

  const workout = data.workout;
  const entries = data.entries as Array<{ id: string; sort_order: number; quantity_label: string | null; exercise_name: string }>;
  const category = EXERCISE_CATEGORY_MAP[workout.category_id as ExerciseCategoryId];

  const startEdit = () => {
    setEditName(workout.name);
    setEditDescription(workout.description ?? '');
    setEditPrimary(workout.primary_stat);
    setEditSecondary(workout.secondary_stat);
    setEditPrimaryPct(workout.primary_pct);
    setEditing(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${adim}` }}>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2 }}>// WORKOUT</div>
        <div style={{ fontSize: 22, color: acc }}>{workout.name}</div>
        <div style={{ fontSize: 10, color: dim }}>{category?.label ?? workout.category_id} | {entries.length} entries</div>
        <div style={{ fontSize: 10, color: adim, marginTop: 6 }}>
          COMPLETIONS {workout.completed_count ?? 0} | {STAT_META[workout.primary_stat as StatKey].name} {workout.primary_pct}% / {STAT_META[workout.secondary_stat as StatKey].name} {workout.secondary_pct}%
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>// EXERCISE ENTRIES</div>
        {entries.length === 0 && <div style={{ fontSize: 10, color: dim, marginBottom: 12 }}>No entries found.</div>}
        {entries.map((entry, idx) => (
          <div key={entry.id} style={{ fontSize: 10, color: acc, marginBottom: 4 }}>
            {idx + 1}. {entry.exercise_name} {entry.quantity_label ? `(${entry.quantity_label})` : ''}
          </div>
        ))}
        <div style={{ fontSize: 9, color: dim, marginTop: 8, marginBottom: 14 }}>
          XP rule: workout gets no XP. Exercise share is split by entry count (duplicates count).
        </div>

        {editing ? (
          <div style={{ border: `1px solid ${adim}`, padding: 12, display: 'grid', gap: 8 }}>
            <input className="crt-input" value={editName} onChange={e => setEditName(e.target.value)} />
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
            {workout.description && <div style={{ fontSize: 10, color: dim, marginBottom: 10 }}>{workout.description}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="topbar-btn" onClick={startEdit}>EDIT</button>
              <button className="topbar-btn" onClick={() => setShowDelete(v => !v)}>DELETE</button>
            </div>
            {showDelete && (
              <div style={{ border: '1px solid #ff4400', padding: 10, marginTop: 8 }}>
                <div style={{ fontSize: 10, color: '#ff4400', marginBottom: 6 }}>Delete this workout?</div>
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
