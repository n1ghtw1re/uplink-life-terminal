import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { STAT_META, StatKey } from '@/types';
import { EXERCISE_CATEGORIES, EXERCISE_CATEGORY_MAP, ExerciseCategoryId } from '@/features/exercise/config';

const STAT_KEYS: StatKey[] = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];
const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';

interface AddWorkoutModalProps {
  onClose: () => void;
}

export default function AddWorkoutModal({ onClose }: AddWorkoutModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<ExerciseCategoryId>('strength');
  const [description, setDescription] = useState('');
  const [primaryStat, setPrimaryStat] = useState<StatKey>('body');
  const [secondaryStat, setSecondaryStat] = useState<StatKey>('grit');
  const [primaryPct, setPrimaryPct] = useState(70);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<Array<{ exerciseId: string; quantityLabel: string }>>([]);

  const { data: exercises = [] } = useQuery({
    queryKey: ['workout-modal-exercises'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string; quantity_type: string }>(`SELECT id, name, quantity_type FROM exercises WHERE active = true ORDER BY name;`);
      return res.rows;
    },
  });

  const category = useMemo(() => EXERCISE_CATEGORY_MAP[categoryId], [categoryId]);
  const filteredExercises = useMemo(() => {
    if (!search.trim()) return exercises.slice(0, 12);
    return exercises.filter(e => e.name.toLowerCase().includes(search.toLowerCase())).slice(0, 12);
  }, [search, exercises]);

  useEffect(() => {
    const [nextPrimary, nextSecondary] = category.defaultStats;
    setPrimaryStat(nextPrimary);
    setSecondaryStat(nextSecondary);
    setPrimaryPct(category.defaultStatSplit[0]);
  }, [categoryId]);

  const addEntry = (exerciseId: string) => {
    const ex = exercises.find(e => e.id === exerciseId);
    if (!ex) return;
    setEntries(prev => [...prev, { exerciseId, quantityLabel: ex.quantity_type || 'set' }]);
  };

  const removeEntryAt = (idx: number) => setEntries(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (entries.length === 0) {
      toast({ title: 'ADD EXERCISES', description: 'Workout needs at least one exercise entry.' });
      return;
    }
    if (primaryStat === secondaryStat) {
      toast({ title: 'INVALID STATS', description: 'Primary and secondary stats must be different.' });
      return;
    }

    setSaving(true);
    try {
      const db = await getDB();
      const dup = await db.query(`SELECT id FROM workouts WHERE LOWER(name) = LOWER($1) LIMIT 1;`, [name.trim()]);
      if (dup.rows.length > 0) {
        toast({ title: 'DUPLICATE WORKOUT', description: `"${name.trim()}" already exists.` });
        setSaving(false);
        return;
      }

      const inserted = await db.query<{ id: string }>(
        `INSERT INTO workouts (name, category_id, description, primary_stat, secondary_stat, primary_pct, secondary_pct, completed_count, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,0,TRUE)
         RETURNING id;`,
        [name.trim(), categoryId, description.trim() || null, primaryStat, secondaryStat, primaryPct, 100 - primaryPct]
      );
      const workoutId = inserted.rows[0].id;

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        await db.query(
          `INSERT INTO workout_exercises (workout_id, exercise_id, sort_order, quantity_label)
           VALUES ($1,$2,$3,$4);`,
          [workoutId, entry.exerciseId, i, entry.quantityLabel || null]
        );
      }

      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['terminal-workouts-list'] });
      toast({ title: 'WORKOUT ADDED', description: name.trim() });
      onClose();
    } catch (err) {
      toast({ title: 'ERROR', description: String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ fontSize: 11, display: 'grid', gap: 14 }}>
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>WORKOUT NAME *</div>
        <input className="crt-input" style={{ width: '100%' }} value={name} onChange={e => setName(e.target.value)} maxLength={90} />
      </div>
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>CATEGORY *</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EXERCISE_CATEGORIES.map(c => (
            <button key={c.id} className="topbar-btn" onClick={() => setCategoryId(c.id)} style={{ border: `1px solid ${categoryId === c.id ? acc : adim}`, color: categoryId === c.id ? 'hsl(var(--accent-bright))' : dim }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>ADD EXERCISE ENTRIES *</div>
        <input className="crt-input" style={{ width: '100%', marginBottom: 6 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises..." />
        <div style={{ border: `1px solid ${adim}`, maxHeight: 120, overflowY: 'auto' }}>
          {filteredExercises.map(ex => (
            <div key={ex.id} onClick={() => addEntry(ex.id)} style={{ padding: '6px 8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid rgba(153,104,0,0.2)` }}>
              <span style={{ color: acc, fontSize: 10 }}>{ex.name}</span>
              <span style={{ color: dim, fontSize: 9 }}>{ex.quantity_type}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 6, fontSize: 9, color: dim }}>Entries (duplicates allowed and count in XP split):</div>
        <div style={{ marginTop: 4, border: `1px solid ${adim}`, padding: 6, minHeight: 44 }}>
          {entries.length === 0 && <div style={{ fontSize: 9, color: dim }}>No entries yet.</div>}
          {entries.map((entry, idx) => {
            const ex = exercises.find(e => e.id === entry.exerciseId);
            return (
              <div key={`${entry.exerciseId}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: acc }}>{idx + 1}. {ex?.name ?? entry.exerciseId}</span>
                <span onClick={() => removeEntryAt(idx)} style={{ fontSize: 9, color: adim, cursor: 'pointer' }}>X</span>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>PRIMARY / SECONDARY STAT *</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {STAT_KEYS.map(k => (
            <button key={`p-${k}`} className="topbar-btn" onClick={() => setPrimaryStat(k)} style={{ border: `1px solid ${primaryStat === k ? acc : adim}`, color: primaryStat === k ? acc : dim }}>P: {STAT_META[k].name}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STAT_KEYS.filter(k => k !== primaryStat).map(k => (
            <button key={`s-${k}`} className="topbar-btn" onClick={() => setSecondaryStat(k)} style={{ border: `1px solid ${secondaryStat === k ? acc : adim}`, color: secondaryStat === k ? acc : dim }}>S: {STAT_META[k].name}</button>
          ))}
        </div>
      </div>
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 8, letterSpacing: 1 }}>DEFAULT STAT SPLIT</div>
        <input type="range" className="ql-split-slider" min={10} max={90} step={5} value={primaryPct} onChange={e => setPrimaryPct(Number(e.target.value))} style={{ width: '100%' }} />
        <div style={{ fontSize: 9, color: dim, marginTop: 4 }}>{STAT_META[primaryStat].name}: {primaryPct}% | {STAT_META[secondaryStat].name}: {100 - primaryPct}%</div>
      </div>
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>DESCRIPTION (optional)</div>
        <textarea className="crt-input" style={{ width: '100%', minHeight: 70 }} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div style={{ borderTop: `1px solid ${adim}`, paddingTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '6px 16px', fontFamily: mono, fontSize: 10, border: `1px solid ${adim}`, background: 'transparent', color: dim }}>CANCEL</button>
        <button disabled={!name.trim() || saving} onClick={handleSubmit} style={{ padding: '6px 16px', fontFamily: mono, fontSize: 10, border: `1px solid ${acc}`, background: 'transparent', color: acc }}>
          {saving ? 'SAVING...' : 'ADD WORKOUT'}
        </button>
      </div>
    </div>
  );
}
