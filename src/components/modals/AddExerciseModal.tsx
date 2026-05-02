import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { STAT_META, StatKey } from '@/types';
import { EXERCISE_CATEGORIES, EXERCISE_CATEGORY_MAP, ExerciseCategoryId } from '@/features/exercise/config';

const STAT_KEYS: StatKey[] = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];
const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';

interface AddExerciseModalProps {
  onClose: () => void;
}

export default function AddExerciseModal({ onClose }: AddExerciseModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<ExerciseCategoryId>('strength');
  const [quantityType, setQuantityType] = useState('reps');
  const [description, setDescription] = useState('');
  const [primaryStat, setPrimaryStat] = useState<StatKey>('body');
  const [secondaryStat, setSecondaryStat] = useState<StatKey>('grit');
  const [primaryPct, setPrimaryPct] = useState(70);
  const [saving, setSaving] = useState(false);

  const category = useMemo(() => EXERCISE_CATEGORY_MAP[categoryId], [categoryId]);

  useEffect(() => {
    const [nextPrimary, nextSecondary] = category.defaultStats;
    setPrimaryStat(nextPrimary);
    setSecondaryStat(nextSecondary);
    setPrimaryPct(category.defaultStatSplit[0]);
    if (category.defaultMetricType === 'distance') setQuantityType('miles');
    if (category.defaultMetricType === 'reps') setQuantityType('reps');
    if (category.defaultMetricType === 'weight_reps') setQuantityType('weight + reps');
    if (category.defaultMetricType === 'cycles') setQuantityType('cycles');
    if (category.defaultMetricType === 'rounds_points_time') setQuantityType('rounds');
    if (category.defaultMetricType === 'depth_1_5') setQuantityType('depth');
  }, [categoryId]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (primaryStat === secondaryStat) {
      toast({ title: 'INVALID STATS', description: 'Primary and secondary stats must be different.' });
      return;
    }

    setSaving(true);
    try {
      const db = await getDB();
      const existing = await db.query(`SELECT id FROM exercises WHERE LOWER(name) = LOWER($1) LIMIT 1;`, [name.trim()]);
      if (existing.rows.length > 0) {
        toast({ title: 'DUPLICATE EXERCISE', description: `"${name.trim()}" already exists.` });
        setSaving(false);
        return;
      }

      await db.query(
        `INSERT INTO exercises (
          name, category_id, quantity_type, description,
          primary_stat, secondary_stat, primary_pct, secondary_pct,
          metric_type, xp, level, active
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,0,TRUE);`,
        [
          name.trim(),
          categoryId,
          quantityType.trim() || 'reps',
          description.trim() || null,
          primaryStat,
          secondaryStat,
          primaryPct,
          100 - primaryPct,
          category.defaultMetricType,
        ]
      );

      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['terminal-exercises-list'] });
      toast({ title: 'EXERCISE ADDED', description: name.trim() });
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
        <div style={{ color: dim, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>EXERCISE NAME *</div>
        <input className="crt-input" style={{ width: '100%' }} value={name} onChange={e => setName(e.target.value)} maxLength={80} />
      </div>
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>CATEGORY *</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EXERCISE_CATEGORIES.map(c => (
            <button
              key={c.id}
              className="topbar-btn"
              onClick={() => setCategoryId(c.id)}
              style={{
                border: `1px solid ${categoryId === c.id ? acc : adim}`,
                color: categoryId === c.id ? 'hsl(var(--accent-bright))' : dim,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>QUANTITY TYPE *</div>
        <input className="crt-input" style={{ width: '100%' }} value={quantityType} onChange={e => setQuantityType(e.target.value)} maxLength={40} />
      </div>
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>PRIMARY / SECONDARY STAT *</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {STAT_KEYS.map(k => (
            <button key={`primary-${k}`} className="topbar-btn" onClick={() => setPrimaryStat(k)} style={{ border: `1px solid ${primaryStat === k ? acc : adim}`, color: primaryStat === k ? acc : dim }}>
              P: {STAT_META[k].name}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STAT_KEYS.filter(k => k !== primaryStat).map(k => (
            <button key={`secondary-${k}`} className="topbar-btn" onClick={() => setSecondaryStat(k)} style={{ border: `1px solid ${secondaryStat === k ? acc : adim}`, color: secondaryStat === k ? acc : dim }}>
              S: {STAT_META[k].name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 8, letterSpacing: 1 }}>DEFAULT STAT SPLIT</div>
        <input type="range" className="ql-split-slider" min={10} max={90} step={5} value={primaryPct} onChange={e => setPrimaryPct(Number(e.target.value))} style={{ width: '100%' }} />
        <div style={{ fontSize: 9, color: dim, marginTop: 4 }}>
          {STAT_META[primaryStat].name}: {primaryPct}% | {STAT_META[secondaryStat].name}: {100 - primaryPct}%
        </div>
      </div>
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>DESCRIPTION (optional)</div>
        <textarea className="crt-input" style={{ width: '100%', minHeight: 70 }} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div style={{ borderTop: `1px solid ${adim}`, paddingTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '6px 16px', fontFamily: mono, fontSize: 10, border: `1px solid ${adim}`, background: 'transparent', color: dim }}>CANCEL</button>
        <button disabled={!name.trim() || saving} onClick={handleSubmit} style={{ padding: '6px 16px', fontFamily: mono, fontSize: 10, border: `1px solid ${acc}`, background: 'transparent', color: acc }}>
          {saving ? 'SAVING...' : 'ADD EXERCISE'}
        </button>
      </div>
    </div>
  );
}
