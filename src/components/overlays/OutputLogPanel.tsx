import { useMemo, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { XP_PER_MINUTE, LEGACY_RATE, SKILL_SHARE, STAT_SHARE, MASTER_SHARE, getLevelFromXP, awardBonusXP } from '@/services/xpService';
import { STAT_META, StatKey } from '@/types';
import { triggerXPFloat } from '@/components/effects/XPFloatLayer';
import { triggerLevelUp } from '@/components/effects/LevelUpAnimation';
import { refreshAppData } from '@/lib/refreshAppData';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgS = 'hsl(var(--bg-secondary))';
const bgT = 'hsl(var(--bg-tertiary))';
const bgP = 'hsl(var(--bg-primary))';
const green = '#44ff88';
const cyan = '#00cfff';
const purple = '#cc88ff';
const teal = '#44ffaa';

type TargetType = 'exercise' | 'workout';

interface Props {
  onClose: () => void;
}

interface SetRow {
  weight?: string;
  value?: string;
  reps?: string;
}

interface RowInputState {
  entryIntensity: number;
  sets: SetRow[];
}

interface TaggedTool     { id: string; name: string; type: string; }
interface TaggedAugment  { id: string; name: string; category: string; }
interface TaggedMedia    { id: string; title: string; type: string; status: string; pages?: number; page_current?: number; }
interface TaggedCourse   { id: string; name: string; sections: { id: string; title: string; completed_at: string | null }[]; linked_skill_id?: string; linked_skill_name?: string; linked_stats?: string[]; }
interface TaggedProject  { id: string; name: string; objectives: { id: string; title: string; completed_at: string | null }[]; }

function isStrengthMetric(metric: string): boolean {
  const m = String(metric || '').toLowerCase();
  return m.includes('weight') || m.includes('kg') || m.includes('lbs') || m.includes('weight_reps');
}

// ── AutoSearch component ──────────────────────────────────
function AutoSearch<T extends { id: string; name: string; sub?: string }>({
  placeholder, onSelect, items, selectedIds = [], color = acc,
}: {
  placeholder: string;
  onSelect: (item: T) => void;
  items: T[];
  selectedIds?: string[];
  color?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 12);
    return items.filter(i => i.name.toLowerCase().includes(query.toLowerCase())).slice(0, 12);
  }, [query, items]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '6px 10px', fontSize: 10, background: bgS, border: `1px solid ${open ? color : adim}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: bgS, border: `1px solid ${adim}`, zIndex: 200, maxHeight: 160, overflowY: 'auto' as const, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          {filtered.map(item => {
            const isSel = selectedIds.includes(item.id);
            return (
              <div key={item.id} onMouseDown={() => { onSelect(item); setQuery(''); setOpen(false); }}
                style={{ padding: '6px 10px', fontSize: 10, cursor: 'pointer', color: isSel ? color : dim, background: isSel ? 'rgba(255,176,0,0.06)' : 'transparent', display: 'flex', justifyContent: 'space-between', fontFamily: mono, borderBottom: `1px solid rgba(153,104,0,0.15)` }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,176,0,0.08)'}
                onMouseLeave={e => { e.currentTarget.style.background = isSel ? 'rgba(255,176,0,0.06)' : 'transparent'; }}>
                <span>{item.name}</span>
                {item.sub && <span style={{ fontSize: 9, opacity: 0.5 }}>{item.sub}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tag chip ──────────────────────────────────────────
function Tag({ label, color, onRemove }: { label: string; color: string; onRemove: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, color, border: `1px solid ${color}`, padding: '2px 8px', fontFamily: mono, marginRight: 4, marginBottom: 4 }}>
      {label}
      <span onClick={onRemove} style={{ cursor: 'pointer', opacity: 0.6 }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>×</span>
    </span>
  );
}

// ── Collapsible tag section ───────────────────────────
function TagSection({ label, color, hasItems, children }: { label: string; color: string; hasItems: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 6 }}>
      <button onClick={() => setOpen(v => !v)} style={{
        background: 'transparent', border: `1px solid ${hasItems ? color : adim}`,
        color: hasItems ? color : adim, fontFamily: mono, fontSize: 9, cursor: 'pointer',
        padding: '3px 10px', letterSpacing: 1, width: '100%', textAlign: 'left',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{hasItems ? '●' : '○'} {label}</span>
        <span>{open ? '▴' : '▾'}</span>
      </button>
      {open && <div style={{ border: `1px solid rgba(153,104,0,0.3)`, borderTop: 'none', padding: '10px 12px', background: bgS }}>{children}</div>}
    </div>
  );
}

export default function OutputLogPanel({ onClose }: Props) {
  const queryClient = useQueryClient();
  const [targetType, setTargetType] = useState<TargetType>('exercise');
  const [targetId, setTargetId] = useState('');
  const [duration, setDuration] = useState(60);
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [customDuration, setCustomDuration] = useState('');
  const [intensity, setIntensity] = useState(5);
  const [isLegacy, setIsLegacy] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [primaryPct, setPrimaryPct] = useState(50);
  const [primaryStat, setPrimaryStat] = useState<StatKey>('body');
  const [secondaryStat, setSecondaryStat] = useState<StatKey>('grit');
  const [rowInputs, setRowInputs] = useState<Record<string, RowInputState>>({});

  // TAGGED state
  const [tools, setTools] = useState<TaggedTool[]>([]);
  const [augments, setAugments] = useState<TaggedAugment[]>([]);
  const [media, setMedia] = useState<TaggedMedia | null>(null);
  const [mediaPage, setMediaPage] = useState('');
  const [mediaFinished, setMediaFinished] = useState(false);
  const [course, setCourse] = useState<TaggedCourse | null>(null);
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [markCourseComplete, setMarkCourseComplete] = useState(false);
  const [project, setProject] = useState<TaggedProject | null>(null);
  const [completedObjectives, setCompletedObjectives] = useState<string[]>([]);

  // Filter state
  const [toolTypeFilter, setToolTypeFilter] = useState<string | null>(null);
  const [augClusterFilter, setAugClusterFilter] = useState<string | null>(null);

  const { data: exercises = [] } = useQuery({
    queryKey: ['output-exercises'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<any>(`SELECT id, name, quantity_type, metric_type, primary_stat, secondary_stat, primary_pct FROM exercises WHERE active = true ORDER BY name;`);
      return res.rows;
    },
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ['output-workouts'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<any>(`SELECT id, name, primary_stat, secondary_stat, primary_pct FROM workouts WHERE active = true ORDER BY name;`);
      return res.rows;
    },
  });

  const { data: workoutEntries = [] } = useQuery({
    queryKey: ['output-workout-entries', targetId],
    enabled: targetType === 'workout' && !!targetId,
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<any>(
        `SELECT we.exercise_id, we.quantity_label, we.sort_order, e.name AS exercise_name, e.quantity_type, e.metric_type
         FROM workout_exercises we
         JOIN exercises e ON e.id = we.exercise_id
         WHERE we.workout_id = $1
         ORDER BY we.sort_order;`,
        [targetId]
      );
      return res.rows;
    },
  });

  const { data: allTools = [] } = useQuery({
    queryKey: ['output-log-tools'],
    queryFn: async () => {
      const db = await getDB();
      const r = await db.query<{ id: string; name: string; type: string; active: boolean }>(
        `SELECT id, name, type, active FROM tools WHERE active = true ORDER BY name;`
      );
      return r.rows;
    },
  });

  const { data: allAugments = [] } = useQuery({
    queryKey: ['output-log-augments'],
    queryFn: async () => {
      const db = await getDB();
      const r = await db.query<{ id: string; name: string; category: string; active: boolean }>(
        `SELECT id, name, category, active FROM augments WHERE active = true ORDER BY name;`
      );
      return r.rows;
    },
  });

  const { data: allMedia = [] } = useQuery({
    queryKey: ['output-log-media'],
    queryFn: async () => {
      const db = await getDB();
      const r = await db.query<{ id: string; title: string; type: string; status: string; pages: number | null; page_current: number | null }>(
        `SELECT id, title, type, status, pages, page_current FROM media WHERE status != 'FINISHED' ORDER BY title;`
      );
      return r.rows;
    },
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ['output-log-courses'],
    queryFn: async () => {
      const db = await getDB();
      const r = await db.query<{ id: string; name: string; status: string }>(
        `SELECT id, name, status FROM courses WHERE status != 'COMPLETE' ORDER BY name;`
      );
      return r.rows;
    },
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['output-log-projects'],
    queryFn: async () => {
      const db = await getDB();
      const r = await db.query<{ id: string; name: string; status: string }>(
        `SELECT id, name, status FROM projects WHERE status = 'ACTIVE' ORDER BY name;`
      );
      return r.rows;
    },
  });

  const toolTypes = [...new Set(allTools.map(t => t.type))];
  const augClusters = [...new Set(allAugments.map(a => a.category))];

  const filteredTools = toolTypeFilter ? allTools.filter(t => t.type === toolTypeFilter) : allTools;
  const filteredAugments = augClusterFilter ? allAugments.filter(a => a.category === augClusterFilter) : allAugments;

  const options = targetType === 'exercise' ? exercises : workouts;
  const filtered = useMemo(() => {
    if (!search.trim()) return options.slice(0, 20);
    return options.filter((o: any) => String(o.name).toLowerCase().includes(search.toLowerCase())).slice(0, 20);
  }, [options, search]);

  const selected = options.find((o: any) => o.id === targetId);

  const rows = useMemo(() => {
    if (!targetId) return [] as Array<{ key: string; exerciseId: string; exerciseName: string; metric: string; quantityType: string }>;
    if (targetType === 'exercise') {
      const ex = exercises.find((e: any) => e.id === targetId);
      if (!ex) return [];
      return [{
        key: `single-${ex.id}`,
        exerciseId: ex.id,
        exerciseName: ex.name,
        metric: ex.metric_type || ex.quantity_type || 'reps',
        quantityType: ex.quantity_type || 'reps',
      }];
    }
    return workoutEntries.map((entry: any, idx: number) => ({
      key: `workout-${targetId}-${idx}`,
      exerciseId: entry.exercise_id,
      exerciseName: entry.exercise_name || entry.exercise_id,
      metric: entry.metric_type || entry.quantity_type || 'reps',
      quantityType: entry.quantity_label || entry.quantity_type || 'reps',
    }));
  }, [targetId, targetType, exercises, workoutEntries]);

  const expectedXP = useMemo(() => {
    const factor = isLegacy ? LEGACY_RATE : 1;
    const effectiveDuration = useCustomDuration ? (parseInt(customDuration, 10) || 0) : duration;
    const base = Math.floor(effectiveDuration * XP_PER_MINUTE * factor * (intensity / 5));
    return {
      exerciseXP: Math.floor(base * SKILL_SHARE),
      statXP: Math.floor(base * STAT_SHARE),
      masterXP: Math.floor(base * MASTER_SHARE),
    };
  }, [duration, useCustomDuration, customDuration, intensity, isLegacy]);

  const loadDefaultSplit = (item: any) => {
    if (!item) return;
    setPrimaryStat(item.primary_stat);
    setSecondaryStat(item.secondary_stat);
    setPrimaryPct(Number(item.primary_pct ?? 50));
    setRowInputs({});
  };

  const ensureRow = (key: string, strength: boolean): RowInputState => {
    const current = rowInputs[key];
    if (current) return current;
    return { entryIntensity: intensity, sets: [strength ? { weight: '', reps: '' } : { value: '' }] };
  };

  const writeRow = (key: string, next: RowInputState) => {
    setRowInputs(prev => ({ ...prev, [key]: next }));
  };

  const addSet = (rowKey: string, strength: boolean) => {
    const row = ensureRow(rowKey, strength);
    const nextSet = strength ? { weight: '', reps: '' } : { value: '' };
    writeRow(rowKey, { ...row, sets: [...row.sets, nextSet] });
  };

  const removeSet = (rowKey: string, idx: number, strength: boolean) => {
    const row = ensureRow(rowKey, strength);
    const next = row.sets.filter((_, i) => i !== idx);
    writeRow(rowKey, { ...row, sets: next.length > 0 ? next : [strength ? { weight: '', reps: '' } : { value: '' }] });
  };

  const updateSetField = (rowKey: string, idx: number, field: 'weight' | 'reps' | 'value', value: string, strength: boolean) => {
    const row = ensureRow(rowKey, strength);
    const nextSets = row.sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
    writeRow(rowKey, { ...row, sets: nextSets });
  };

  const updateEntryIntensity = (rowKey: string, val: number, strength: boolean) => {
    const row = ensureRow(rowKey, strength);
    writeRow(rowKey, { ...row, entryIntensity: val });
  };

  const computeTotals = (rowKey: string, strength: boolean) => {
    const row = ensureRow(rowKey, strength);
    if (!strength) {
      const total = row.sets.reduce((sum, s) => sum + Number(s.value || 0), 0);
      return { setCount: row.sets.length, total };
    }
    const totalReps = row.sets.reduce((sum, s) => sum + Number(s.reps || 0), 0);
    const totalWeight = row.sets.reduce((sum, s) => sum + Number(s.weight || 0), 0);
    return { setCount: row.sets.length, totalReps, totalWeight };
  };

  const validateRows = () => {
    for (const row of rows) {
      const strength = isStrengthMetric(row.metric);
      const data = ensureRow(row.key, strength);
      for (const set of data.sets) {
        if (!strength) {
          if (!set.value || Number(set.value) <= 0) return `Enter valid ${row.quantityType} for ${row.exerciseName}.`;
        } else {
          if (!set.weight || Number(set.weight) <= 0 || !set.reps || Number(set.reps) <= 0) {
            return `Enter weight and reps for ${row.exerciseName}.`;
          }
        }
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!targetId) return;
    if (targetType === 'workout' && rows.length === 0) {
      toast({ title: 'EMPTY WORKOUT', description: 'Selected workout has no exercise entries.' });
      return;
    }
    const validation = validateRows();
    if (validation) {
      toast({ title: 'MISSING DATA', description: validation });
      return;
    }

    setSaving(true);
    try {
      const db = await getDB();
      const logId = crypto.randomUUID();
      const now = new Date().toISOString();
      const statSplit = [
        { stat: primaryStat, percent: primaryPct },
        { stat: secondaryStat, percent: 100 - primaryPct },
      ];

      const masterBefore = await db.query<{ level: number; total_xp: number }>(
        `SELECT level, total_xp FROM master_progress WHERE id = 1;`
      );
      const prevMasterLevel = Number(masterBefore.rows[0]?.level ?? 0);

      const effectiveDuration = useCustomDuration ? (parseInt(customDuration, 10) || 0) : duration;
      if (effectiveDuration <= 0) {
        toast({ title: 'INVALID DURATION', description: 'Enter duration in minutes.' });
        setSaving(false);
        return;
      }

      await db.query(
        `INSERT INTO output_logs (id, target_type, target_id, duration_minutes, intensity, stat_split, notes, is_legacy, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9);`,
        [logId, targetType, targetId, effectiveDuration, intensity, JSON.stringify(statSplit), notes.trim() || null, isLegacy, now]
      );

      const allocations: Array<{ exerciseId: string; xp: number; details: any }> = [];
      if (targetType === 'exercise') {
        const row = rows[0];
        const strength = isStrengthMetric(row.metric);
        const data = ensureRow(row.key, strength);
        allocations.push({
          exerciseId: row.exerciseId,
          xp: expectedXP.exerciseXP,
          details: {
            quantityType: row.quantityType,
            metric: row.metric,
            entryIntensity: data.entryIntensity,
            sets: data.sets,
            totals: computeTotals(row.key, strength),
          },
        });
      } else {
        const perEntry = Math.floor(expectedXP.exerciseXP / rows.length);
        for (const row of rows) {
          const strength = isStrengthMetric(row.metric);
          const data = ensureRow(row.key, strength);
          allocations.push({
            exerciseId: row.exerciseId,
            xp: perEntry,
            details: {
              quantityType: row.quantityType,
              metric: row.metric,
              entryIntensity: data.entryIntensity,
              sets: data.sets,
              totals: computeTotals(row.key, strength),
            },
          });
        }
        await db.query(`UPDATE workouts SET completed_count = completed_count + 1 WHERE id = $1;`, [targetId]);
      }

      for (const alloc of allocations) {
        const row = await db.query<{ xp: number }>(`SELECT xp FROM exercises WHERE id = $1 LIMIT 1;`, [alloc.exerciseId]);
        const nextXp = Number(row.rows[0]?.xp ?? 0) + alloc.xp;
        const level = getLevelFromXP(nextXp).level;
        await db.query(`UPDATE exercises SET xp = $1, level = $2 WHERE id = $3;`, [nextXp, level, alloc.exerciseId]);
        await db.query(`INSERT INTO output_log_exercises (output_log_id, exercise_id, xp_awarded, details_json) VALUES ($1,$2,$3,$4);`, [logId, alloc.exerciseId, alloc.xp, JSON.stringify(alloc.details)]);
      }

      const primaryAmount = Math.floor(expectedXP.statXP * (primaryPct / 100));
      const secondaryAmount = expectedXP.statXP - primaryAmount;
      for (const award of [{ stat: primaryStat, amount: primaryAmount }, { stat: secondaryStat, amount: secondaryAmount }]) {
        const row = await db.query<{ xp: number }>(`SELECT xp FROM stats WHERE stat_key = $1 LIMIT 1;`, [award.stat]);
        const nextXp = Number(row.rows[0]?.xp ?? 0) + award.amount;
        const level = getLevelFromXP(nextXp).level;
        await db.query(`UPDATE stats SET xp = $1, level = $2, dormant = false WHERE stat_key = $3;`, [nextXp, level, award.stat]);
      }

      const masterRow = await db.query<{ total_xp: number }>(`SELECT total_xp FROM master_progress WHERE id = 1;`);
      const nextMaster = Number(masterRow.rows[0]?.total_xp ?? 0) + expectedXP.masterXP;
      const newMasterLevel = getLevelFromXP(nextMaster).level;
      await db.query(`UPDATE master_progress SET total_xp = $1, level = $2 WHERE id = 1;`, [nextMaster, newMasterLevel]);

      const masterLeveledUp = newMasterLevel > prevMasterLevel;

      await refreshAppData(queryClient);

      // OUTPUT uses same style effect flow as regular skill logs.
      triggerXPFloat(window.innerWidth / 2, window.innerHeight / 2 - 60, expectedXP.exerciseXP, undefined, false);
      if (expectedXP.masterXP > 0) {
        setTimeout(() => triggerXPFloat(window.innerWidth / 2 + 60, window.innerHeight / 2 - 80, expectedXP.masterXP, undefined, false), 200);
      }

      if (masterLeveledUp) {
        setTimeout(() => {
          triggerLevelUp({
            level: newMasterLevel,
            className: 'OPERATOR',
            totalXP: nextMaster,
            unlocks: newMasterLevel === 3  ? ['GREEN PHOSPHOR THEME'] :
                     newMasterLevel === 5  ? ['DOS CLASSIC THEME'] :
                     newMasterLevel === 7  ? ['BLOOD RED THEME'] :
                     newMasterLevel === 9  ? ['ICE BLUE THEME'] :
                     newMasterLevel === 10 ? ['CUSTOM TERMINAL PROMPT'] : [],
          });
        }, 800);
      }

      queryClient.invalidateQueries();
      toast({ title: 'OUTPUT LOGGED', description: `${selected?.name ?? targetId} - ${effectiveDuration}m` });
      onClose();
    } catch (err) {
      toast({ title: 'ERROR', description: String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', minHeight: 420 }}>
      <div style={{ padding: '16px 20px', borderRight: `1px solid ${adim}` }}>
        <div style={{ fontSize: 9, color: adim, marginBottom: 8, letterSpacing: 2 }}>// OUTPUT TARGET</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button className="topbar-btn" onClick={() => { setTargetType('exercise'); setTargetId(''); setRowInputs({}); }} style={{ borderColor: targetType === 'exercise' ? acc : adim, color: targetType === 'exercise' ? acc : dim }}>EXERCISE</button>
          <button className="topbar-btn" onClick={() => { setTargetType('workout'); setTargetId(''); setRowInputs({}); }} style={{ borderColor: targetType === 'workout' ? acc : adim, color: targetType === 'workout' ? acc : dim }}>WORKOUT</button>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${targetType}...`} className="crt-input" style={{ width: '100%', marginBottom: 8 }} />
        <div style={{ border: `1px solid ${adim}`, maxHeight: 130, overflowY: 'auto', marginBottom: 12 }}>
          {filtered.map((item: any) => (
            <div key={item.id} onClick={() => { setTargetId(item.id); loadDefaultSplit(item); }} style={{ padding: '6px 8px', cursor: 'pointer', color: targetId === item.id ? acc : dim, background: targetId === item.id ? 'rgba(255,176,0,0.1)' : 'transparent', borderBottom: `1px solid rgba(153,104,0,0.2)` }}>
              {item.name}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 9, color: adim, marginBottom: 6, letterSpacing: 2 }}>// INPUT DATA</div>
        <div style={{ maxHeight: 340, overflowY: 'auto', border: `1px solid ${adim}`, background: bgS, padding: 10 }}>
          {!targetId && <div style={{ fontSize: 10, color: dim }}>Select an exercise or workout first.</div>}
          {targetId && rows.map((row) => {
            const strength = isStrengthMetric(row.metric);
            const state = ensureRow(row.key, strength);
            const totals: any = computeTotals(row.key, strength);
            return (
              <div key={row.key} style={{ borderBottom: `1px solid rgba(153,104,0,0.2)`, marginBottom: 10, paddingBottom: 10 }}>
                <div style={{ fontSize: 10, color: acc, marginBottom: 4 }}>{row.exerciseName}</div>
                <div style={{ fontSize: 9, color: dim, marginBottom: 6 }}>
                  {strength ? 'Track weight + reps per set.' : `Track ${row.quantityType} per set.`}
                </div>
                {state.sets.map((setRow, idx) => (
                  <div key={`${row.key}-set-${idx}`} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ width: 42, fontSize: 9, color: adim }}>SET {idx + 1}</span>
                    {!strength && (
                      <input
                        className="crt-input"
                        placeholder={row.quantityType}
                        value={setRow.value ?? ''}
                        onChange={e => updateSetField(row.key, idx, 'value', e.target.value.replace(/[^0-9.]/g, ''), strength)}
                        style={{ flex: 1 }}
                      />
                    )}
                    {strength && (
                      <>
                        <input
                          className="crt-input"
                          placeholder="weight"
                          value={setRow.weight ?? ''}
                          onChange={e => updateSetField(row.key, idx, 'weight', e.target.value.replace(/[^0-9.]/g, ''), strength)}
                          style={{ width: 90 }}
                        />
                        <input
                          className="crt-input"
                          placeholder="reps"
                          value={setRow.reps ?? ''}
                          onChange={e => updateSetField(row.key, idx, 'reps', e.target.value.replace(/[^0-9.]/g, ''), strength)}
                          style={{ width: 90 }}
                        />
                      </>
                    )}
                    <button className="topbar-btn" onClick={() => removeSet(row.key, idx, strength)}>X</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <button className="topbar-btn" onClick={() => addSet(row.key, strength)}>+ ADD SET</button>
                  <span style={{ fontSize: 9, color: dim }}>
                    {strength
                      ? `${totals.setCount} sets | total reps ${totals.totalReps} | total weight ${totals.totalWeight}`
                      : `${totals.setCount} sets | total ${row.quantityType} ${totals.total}`}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: adim, marginBottom: 3 }}>Entry intensity ({state.entryIntensity}/10)</div>
                  <input type="range" min={1} max={10} value={state.entryIntensity} onChange={e => updateEntryIntensity(row.key, Number(e.target.value), strength)} style={{ width: '100%' }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 9, color: adim, marginTop: 10, marginBottom: 4 }}>SESSION</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {[15, 30, 45, 60, 90, 120].map(d => (
            <button
              key={d}
              className="topbar-btn"
              onClick={() => { setDuration(d); setUseCustomDuration(false); }}
              style={{ borderColor: !useCustomDuration && duration === d ? acc : adim, color: !useCustomDuration && duration === d ? acc : dim }}
            >
              {d}m
            </button>
          ))}
          <button
            className="topbar-btn"
            onClick={() => setUseCustomDuration(true)}
            style={{ borderColor: useCustomDuration ? acc : adim, color: useCustomDuration ? acc : dim }}
          >
            CUSTOM
          </button>
        </div>
        {useCustomDuration && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <input
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value.replace(/\D/g, ''))}
              placeholder="minutes"
              className="crt-input"
              style={{ width: 90 }}
            />
            <span style={{ fontSize: 10, color: dim }}>minutes</span>
          </div>
        )}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: adim, marginBottom: 4 }}>Global intensity ({intensity}/10)</div>
          <input type="range" min={1} max={10} value={intensity} onChange={e => setIntensity(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="crt-input" style={{ width: '100%', minHeight: 60 }} />
      </div>

      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ border: `1px solid ${adim}`, background: bgS, padding: '10px 10px' }}>
          <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>// XP PREVIEW</div>
          <div style={{ fontSize: 10, color: dim }}>Exercise Share: <span style={{ color: acc }}>+{expectedXP.exerciseXP}</span></div>
          <div style={{ fontSize: 10, color: dim }}>Stat Share: <span style={{ color: acc }}>+{expectedXP.statXP}</span></div>
          <div style={{ fontSize: 10, color: dim }}>Master: <span style={{ color: acc }}>+{expectedXP.masterXP}</span></div>
          {targetType === 'workout' && (
            <div style={{ fontSize: 9, color: dim, marginTop: 6 }}>
              Entries: {rows.length} | per-entry: {rows.length > 0 ? Math.floor(expectedXP.exerciseXP / rows.length) : 0}
            </div>
          )}
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: adim, marginBottom: 4 }}>STAT SPLIT</div>
          <div style={{ fontSize: 9, color: dim, marginBottom: 4 }}>{STAT_META[primaryStat].name} {primaryPct}% / {STAT_META[secondaryStat].name} {100 - primaryPct}%</div>
          <input type="range" min={10} max={90} step={5} value={primaryPct} onChange={e => setPrimaryPct(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: isLegacy ? '#ffaa00' : adim }}>
          <input type="checkbox" checked={isLegacy} onChange={e => setIsLegacy(e.target.checked)} /> LEGACY (50%)
        </label>
        <div style={{ fontSize: 9, color: dim, lineHeight: 1.6 }}>
          Workout rule: workout gets no XP. Exercise share is split across workout entries. Duplicate entries count separately.
        </div>
        <div style={{ marginTop: 'auto' }}>
          <button disabled={!targetId || saving} onClick={handleSubmit} style={{ width: '100%', padding: '8px 10px', fontFamily: mono, fontSize: 10, letterSpacing: 1, border: `1px solid ${targetId ? acc : adim}`, background: targetId ? 'rgba(255,176,0,0.1)' : 'transparent', color: targetId ? acc : dim, cursor: targetId ? 'pointer' : 'not-allowed' }}>
            {saving ? 'LOGGING...' : 'SUBMIT OUTPUT'}
          </button>
        </div>
      </div>
    </div>
  );
}
