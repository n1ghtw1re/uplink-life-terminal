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

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px', fontFamily: mono }}>
      <div style={{ height: 1, flex: 1, background: 'rgba(153,104,0,0.3)' }} />
      <span style={{ fontSize: 9, color: adim, letterSpacing: 2 }}>{label}</span>
      <div style={{ height: 1, flex: 1, background: 'rgba(153,104,0,0.3)' }} />
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

  const handleSelectCourse = async (c: { id: string; name: string }) => {
    const db = await getDB();
    const r  = await db.query<{ id: string; title: string; completed_at: string | null }>(
      `SELECT id, title, completed_at FROM course_sections WHERE course_id = $1 ORDER BY sort_order;`, [c.id]
    );
    
    const courseRes = await db.query<{ linked_skill_ids: string; linked_stats: string }>(
      `SELECT linked_skill_ids, linked_stats FROM courses WHERE id = $1;`, [c.id]
    );
    
    let linked_skill_id: string | undefined;
    let linked_skill_name: string | undefined;
    let linked_stats: string[] = [];
    
    if (courseRes.rows[0]?.linked_skill_ids) {
      try {
        const raw = courseRes.rows[0].linked_skill_ids;
        const skillIds = Array.isArray(raw) ? raw : JSON.parse(raw);
        if (skillIds && skillIds.length > 0) {
          linked_skill_id = skillIds[0];
          const skillRes = await db.query<{ name: string }>(
            `SELECT name FROM skills WHERE id = $1;`, [linked_skill_id]
          );
          if (skillRes.rows[0]) {
            linked_skill_name = skillRes.rows[0].name;
          }
        }
      } catch { /* ignore parse errors */ }
    }
    
    if (courseRes.rows[0]?.linked_stats) {
      try {
        const raw = courseRes.rows[0].linked_stats;
        linked_stats = Array.isArray(raw) ? raw : JSON.parse(raw);
      } catch { linked_stats = []; }
    }
    
    setCourse({ id: c.id, name: c.name, sections: r.rows, linked_skill_id, linked_skill_name, linked_stats });
    setCompletedSections([]);
  };

  const handleSelectProject = async (p: { id: string; name: string }) => {
    const db = await getDB();
    const r  = await db.query<{ id: string; title: string; completed_at: string | null }>(
      `SELECT id, title, completed_at FROM project_milestones WHERE project_id = $1 ORDER BY sort_order;`, [p.id]
    );
    setProject({ id: p.id, name: p.name, objectives: r.rows });
    setCompletedObjectives([]);
  };

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

      const factor = isLegacy ? LEGACY_RATE : 1;
      const baseXP = Math.floor(effectiveDuration * XP_PER_MINUTE * factor * (intensity / 5));
      const toolIds = tools.map(t => t.id);
      const augIds = augments.map(a => a.id);
      const perToolXP = toolIds.length > 0 ? Math.floor(baseXP / toolIds.length) : 0;
      const perAugXP = augIds.length > 0 ? Math.floor(baseXP / augIds.length) : 0;

      await db.query(
        `INSERT INTO output_logs (id, target_type, target_id, duration_minutes, intensity, stat_split, notes, is_legacy, created_at, tool_ids, total_tool_xp, augment_ids, total_augment_xp, course_id, media_id, project_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16);`,
        [logId, targetType, targetId, effectiveDuration, intensity, JSON.stringify(statSplit), notes.trim() || null, isLegacy, now, JSON.stringify(toolIds), perToolXP * toolIds.length, JSON.stringify(augIds), perAugXP * augIds.length, course?.id ?? null, media?.id ?? null, project?.id ?? null]
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

      if (toolIds.length > 0 && perToolXP > 0) {
        queryClient.setQueryData(['tools'], (prev: any[] | undefined) =>
          prev?.map((tool) => {
            if (!toolIds.includes(tool.id)) return tool;
            const nextXp = Number(tool.xp ?? 0) + perToolXP;
            const nextLevel = getLevelFromXP(nextXp);
            return { ...tool, xp: nextXp, level: nextLevel.level };
          }) ?? prev
        );
        for (const tid of toolIds) {
          const row = await db.query<{ xp: number }>(`SELECT xp FROM tools WHERE id = $1 LIMIT 1;`, [tid]);
          const nextXp = Number(row.rows[0]?.xp ?? 0) + perToolXP;
          const level = getLevelFromXP(nextXp).level;
          await db.query(`UPDATE tools SET xp = $1, level = $2 WHERE id = $3;`, [nextXp, level, tid]);
        }
      }

      if (augIds.length > 0 && perAugXP > 0) {
        queryClient.setQueryData(['augments'], (prev: any[] | undefined) =>
          prev?.map((augment) => {
            if (!augIds.includes(augment.id)) return augment;
            const nextXp = Number(augment.xp ?? 0) + perAugXP;
            const nextLevel = getLevelFromXP(nextXp);
            return { ...augment, xp: nextXp, level: nextLevel.level };
          }) ?? prev
        );
        for (const aid of augIds) {
          const row = await db.query<{ xp: number }>(`SELECT xp FROM augments WHERE id = $1 LIMIT 1;`, [aid]);
          const nextXp = Number(row.rows[0]?.xp ?? 0) + perAugXP;
          const level = getLevelFromXP(nextXp).level;
          await db.query(`UPDATE augments SET xp = $1, level = $2 WHERE id = $3;`, [nextXp, level, aid]);
        }
      }

      if (media) {
        const updates: string[] = [];
        if (mediaPage && media.type === 'book') updates.push(`page_current = ${parseInt(mediaPage, 10)}`);
        if (mediaFinished) {
          updates.push(`status = 'FINISHED'`, `completed_at = '${now}'`);
        }
        if (updates.length > 0) {
          await db.exec(`UPDATE media SET ${updates.join(', ')} WHERE id = '${media.id}';`);
        }
        if (mediaFinished && statSplit.length > 0) {
          const MEDIA_BONUS: Record<string, number> = { book: 100, comic: 50, film: 40, documentary: 50, tv: 75, album: 30, game: 60 };
          const bonus = Math.floor((MEDIA_BONUS[media.type] ?? 40) * (isLegacy ? LEGACY_RATE : 1));
          await awardBonusXP({ source: `${media.type}_complete`, sourceId: media.id, statKey: statSplit[0].stat, amount: bonus, notes: media.title });
        }
      }

      if (course && completedSections.length > 0) {
        const sectionBonus = Math.floor(100 * (isLegacy ? LEGACY_RATE : 1));
        const hasLinkedSkill = !!course.linked_skill_id;
        const coursePrimaryStat = course.linked_stats?.[0];
        
        for (const secId of completedSections) {
          await db.query(`UPDATE course_sections SET completed_at = $1 WHERE id = $2;`, [now, secId]);
          const sec = course.sections.find(s => s.id === secId);
          
          if (hasLinkedSkill && course.linked_skill_id) {
            const skillBonus = Math.floor(sectionBonus * 0.5);
            const statBonus = Math.floor(sectionBonus * 0.25);
            const masterBonus = Math.floor(sectionBonus * 0.25);
            await awardBonusXP({ source: 'course_section', sourceId: secId, skillId: course.linked_skill_id, amount: skillBonus, notes: `${course.name} — ${sec?.title ?? ''} [SKILL]` });
            if (coursePrimaryStat) await awardBonusXP({ source: 'course_section', sourceId: secId, statKey: coursePrimaryStat as StatKey, amount: statBonus, notes: `${course.name} — ${sec?.title ?? ''} [STAT]` });
            await awardBonusXP({ source: 'course_section', sourceId: secId, amount: masterBonus, notes: `${course.name} — ${sec?.title ?? ''} [MASTER]` });
          } else if (coursePrimaryStat) {
            const statBonus = Math.floor(sectionBonus * 0.5);
            const masterBonus = Math.floor(sectionBonus * 0.5);
            await awardBonusXP({ source: 'course_section', sourceId: secId, statKey: coursePrimaryStat as StatKey, amount: statBonus, notes: `${course.name} — ${sec?.title ?? ''}` });
            await awardBonusXP({ source: 'course_section', sourceId: secId, amount: masterBonus, notes: `${course.name} — ${sec?.title ?? ''}` });
          }
        }
        
        const totalSections = course.sections.length;
        const completedCount = course.sections.filter(s => s.completed_at || completedSections.includes(s.id)).length;
        const newProgress = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;
        await db.exec(`UPDATE courses SET progress = ${newProgress} WHERE id = '${course.id}';`);
      }
      
      if (course && markCourseComplete) {
        await db.exec(`UPDATE courses SET status = 'COMPLETE', progress = 100, completed_at = '${now}' WHERE id = '${course.id}';`);
        const courseBonus = Math.floor(100 * (isLegacy ? LEGACY_RATE : 1));
        const hasLinkedSkill = !!course.linked_skill_id;
        const coursePrimaryStat = course.linked_stats?.[0];
        
        if (hasLinkedSkill && course.linked_skill_id) {
          const skillBonus = Math.floor(courseBonus * 0.5);
          const statBonus = Math.floor(courseBonus * 0.25);
          const masterBonus = Math.floor(courseBonus * 0.25);
          await awardBonusXP({ source: 'course_complete', sourceId: course.id, skillId: course.linked_skill_id, amount: skillBonus, notes: `${course.name} — complete [SKILL]` });
          if (coursePrimaryStat) await awardBonusXP({ source: 'course_complete', sourceId: course.id, statKey: coursePrimaryStat as StatKey, amount: statBonus, notes: `${course.name} — complete [STAT]` });
          await awardBonusXP({ source: 'course_complete', sourceId: course.id, amount: masterBonus, notes: `${course.name} — complete [MASTER]` });
        } else if (coursePrimaryStat) {
          const statBonus = Math.floor(courseBonus * 0.5);
          const masterBonus = Math.floor(courseBonus * 0.5);
          await awardBonusXP({ source: 'course_complete', sourceId: course.id, statKey: coursePrimaryStat as StatKey, amount: statBonus, notes: `${course.name} — complete` });
          await awardBonusXP({ source: 'course_complete', sourceId: course.id, amount: masterBonus, notes: `${course.name} — complete` });
        }
      }

      if (project && completedObjectives.length > 0) {
        for (const objId of completedObjectives) {
          await db.query(`UPDATE project_milestones SET completed_at = $1 WHERE id = $2;`, [now, objId]);
        }
      }

      await refreshAppData(queryClient);

      // OUTPUT uses same style effect flow as regular skill logs.
      triggerXPFloat(window.innerWidth / 2, window.innerHeight / 2 - 60, expectedXP.exerciseXP, undefined, false);
      if (expectedXP.masterXP > 0) {
        setTimeout(() => triggerXPFloat(window.innerWidth / 2 + 60, window.innerHeight / 2 - 80, expectedXP.masterXP, undefined, false), 200);
      }
      if (perToolXP > 0 && toolIds.length > 0) {
        setTimeout(() => triggerXPFloat(window.innerWidth / 2 - 60, window.innerHeight / 2 - 40, perToolXP * toolIds.length, undefined, false), 400);
      }
      if (perAugXP > 0 && augIds.length > 0) {
        setTimeout(() => triggerXPFloat(window.innerWidth / 2 - 120, window.innerHeight / 2 - 60, perAugXP * augIds.length, undefined, false), 600);
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
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          <button onClick={() => { setTargetType('exercise'); setTargetId(''); setRowInputs({}); }} style={{ padding: '3px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${targetType === 'exercise' ? acc : adim}`, background: targetType === 'exercise' ? 'rgba(255,176,0,0.1)' : 'transparent', color: targetType === 'exercise' ? acc : dim }}>EXERCISE</button>
          <button onClick={() => { setTargetType('workout'); setTargetId(''); setRowInputs({}); }} style={{ padding: '3px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${targetType === 'workout' ? acc : adim}`, background: targetType === 'workout' ? 'rgba(255,176,0,0.1)' : 'transparent', color: targetType === 'workout' ? acc : dim }}>WORKOUT</button>
        </div>
        {targetId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: bgS, border: `1px solid ${acc}`, marginBottom: 12 }}>
            <span style={{ flex: 1, fontSize: 11, color: acc }}>{selected?.name ?? targetId}</span>
            <span onClick={() => { setTargetId(''); setRowInputs({}); }} style={{ fontSize: 9, color: adim, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ff4400'}
              onMouseLeave={e => e.currentTarget.style.color = adim}>× CHANGE</span>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <AutoSearch
              placeholder={`Type ${targetType} name...`}
              items={filtered.map((item: any) => ({ id: item.id, name: item.name, sub: item.primary_stat }))}
              onSelect={(item) => {
                const target = filtered.find((x: any) => x.id === item.id);
                if (target) {
                  setTargetId(target.id);
                  loadDefaultSplit(target);
                }
              }}
              color={acc}
            />
          </div>
        )}

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
                        placeholder={row.quantityType}
                        value={setRow.value ?? ''}
                        onChange={e => updateSetField(row.key, idx, 'value', e.target.value.replace(/[^0-9.]/g, ''), strength)}
                        style={{ flex: 1, padding: '4px 6px', fontSize: 10, background: bgT, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }}
                      />
                    )}
                    {strength && (
                      <>
                        <input
                          placeholder="weight"
                          value={setRow.weight ?? ''}
                          onChange={e => updateSetField(row.key, idx, 'weight', e.target.value.replace(/[^0-9.]/g, ''), strength)}
                          style={{ width: 70, padding: '4px 6px', fontSize: 10, background: bgT, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }}
                        />
                        <input
                          placeholder="reps"
                          value={setRow.reps ?? ''}
                          onChange={e => updateSetField(row.key, idx, 'reps', e.target.value.replace(/[^0-9.]/g, ''), strength)}
                          style={{ width: 70, padding: '4px 6px', fontSize: 10, background: bgT, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }}
                        />
                      </>
                    )}
                    <button onClick={() => removeSet(row.key, idx, strength)} style={{ padding: '3px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${adim}`, background: 'transparent', color: dim }}>X</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <button onClick={() => addSet(row.key, strength)} style={{ padding: '3px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${adim}`, background: 'transparent', color: dim }}>+ ADD SET</button>
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
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {[15, 30, 45, 60, 90, 120].map(d => (
            <button key={d} onClick={() => { setDuration(d); setUseCustomDuration(false); }} style={{ padding: '3px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${!useCustomDuration && duration === d ? acc : adim}`, background: !useCustomDuration && duration === d ? 'rgba(255,176,0,0.1)' : 'transparent', color: !useCustomDuration && duration === d ? acc : dim }}>{d}m</button>
          ))}
          <button onClick={() => setUseCustomDuration(true)} style={{ padding: '3px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${useCustomDuration ? acc : adim}`, background: useCustomDuration ? 'rgba(255,176,0,0.1)' : 'transparent', color: useCustomDuration ? acc : dim }}>CUSTOM</button>
        </div>
        {useCustomDuration && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <input
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value.replace(/\D/g, ''))}
              placeholder="minutes"
              autoFocus
              style={{ width: 80, padding: '5px 8px', fontSize: 11, background: bgS, border: `1px solid ${acc}`, color: acc, fontFamily: mono, outline: 'none' }}
            />
            <span style={{ fontSize: 10, color: dim }}>minutes</span>
          </div>
        )}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: adim, marginBottom: 4 }}>Global intensity ({intensity}/10)</div>
          <input type="range" min={1} max={10} value={intensity} onChange={e => setIntensity(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)..." style={{ width: '100%', minHeight: 60, padding: '8px 10px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none', resize: 'vertical' }} />

        <SectionDivider label="TAGGED" />

        {/* Tools */}
        <TagSection label="TOOLS" color={acc} hasItems={tools.length > 0}>
          {tools.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {tools.map(t => <Tag key={t.id} label={t.name} color={acc} onRemove={() => setTools(p => p.filter(x => x.id !== t.id))} />)}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
            {toolTypes.map(type => (
              <button key={type} onClick={() => setToolTypeFilter(toolTypeFilter === type ? null : type)} style={{ padding: '2px 6px', fontSize: 8, fontFamily: mono, cursor: 'pointer', border: `1px solid ${toolTypeFilter === type ? acc : adim}`, background: toolTypeFilter === type ? 'rgba(255,176,0,0.1)' : 'transparent', color: toolTypeFilter === type ? acc : dim }}>{type}</button>
            ))}
          </div>
          <AutoSearch
            placeholder="Search tools..."
            items={filteredTools.map(t => ({ id: t.id, name: t.name, sub: t.type }))}
            selectedIds={tools.map(t => t.id)}
            onSelect={item => { if (!tools.find(t => t.id === item.id)) setTools(p => [...p, { id: item.id, name: item.name, type: item.sub ?? '' }]); }}
            color={acc}
          />
        </TagSection>

        {/* Augments */}
        <TagSection label="AUGMENTS" color={cyan} hasItems={augments.length > 0}>
          {augments.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {augments.map(a => <Tag key={a.id} label={a.name} color={cyan} onRemove={() => setAugments(p => p.filter(x => x.id !== a.id))} />)}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
            {augClusters.map(c => (
              <button key={c} onClick={() => setAugClusterFilter(augClusterFilter === c ? null : c)} style={{ padding: '2px 6px', fontSize: 8, fontFamily: mono, cursor: 'pointer', border: `1px solid ${augClusterFilter === c ? cyan : adim}`, background: augClusterFilter === c ? 'rgba(0,207,255,0.1)' : 'transparent', color: augClusterFilter === c ? cyan : dim }}>{c.split(' ')[0]}</button>
            ))}
          </div>
          <AutoSearch
            placeholder="Search augments..."
            items={filteredAugments.map(a => ({ id: a.id, name: a.name, sub: a.category.split(' ')[0] }))}
            selectedIds={augments.map(a => a.id)}
            onSelect={item => { if (!augments.find(a => a.id === item.id)) setAugments(p => [...p, { id: item.id, name: item.name, category: item.sub ?? '' }]); }}
            color={cyan}
          />
        </TagSection>

        {/* Media */}
        <TagSection label="MEDIA" color={purple} hasItems={!!media}>
          {media ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: purple, flex: 1 }}>{media.title}</span>
                <span onClick={() => { setMedia(null); setMediaPage(''); setMediaFinished(false); }} style={{ fontSize: 9, color: adim, cursor: 'pointer' }}>× REMOVE</span>
              </div>
              {media.type === 'book' && media.pages && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 9, color: adim }}>PAGE:</span>
                  <input value={mediaPage} onChange={e => setMediaPage(e.target.value.replace(/\D/g, ''))} placeholder={String(media.page_current ?? 0)}
                    style={{ width: 60, padding: '3px 6px', fontSize: 10, background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }} />
                  <span style={{ fontSize: 9, color: dim }}>/ {media.pages}</span>
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 9, color: mediaFinished ? green : adim, letterSpacing: 1 }}>
                <span onClick={() => setMediaFinished(v => !v)} style={{ width: 13, height: 13, border: `1px solid ${mediaFinished ? green : adim}`, background: mediaFinished ? 'rgba(68,255,136,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{mediaFinished ? '✓' : ''}</span>
                MARK FINISHED {mediaFinished && '— bonus XP on submit'}
              </label>
            </div>
          ) : (
            <AutoSearch
              placeholder="Search media..."
              items={allMedia.map(m => ({ id: m.id, name: m.title, sub: m.type }))}
              onSelect={item => {
                const m = allMedia.find(x => x.id === item.id);
                if (m) setMedia({ id: m.id, title: m.title, type: m.type, status: m.status, pages: m.pages ?? undefined, page_current: m.page_current ?? undefined });
              }}
              color={purple}
            />
          )}
        </TagSection>

        {/* Course */}
        <TagSection label="COURSE" color={teal} hasItems={!!course}>
          {course ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: teal, flex: 1 }}>{course.name}</span>
                <span onClick={() => { setCourse(null); setCompletedSections([]); setMarkCourseComplete(false); }} style={{ fontSize: 9, color: adim, cursor: 'pointer' }}>× REMOVE</span>
              </div>
              {course.sections.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 5 }}>COMPLETE MODULES:</div>
                  {course.sections.filter(s => !s.completed_at).map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 9, color: completedSections.includes(s.id) ? teal : dim, marginBottom: 4 }}>
                      <span onClick={() => setCompletedSections(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}
                        style={{ width: 13, height: 13, border: `1px solid ${completedSections.includes(s.id) ? teal : adim}`, background: completedSections.includes(s.id) ? 'rgba(68,255,170,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0 }}>
                        {completedSections.includes(s.id) ? '✓' : ''}
                      </span>
                      {s.title}
                    </label>
                  ))}
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 9, color: markCourseComplete ? green : adim, letterSpacing: 1 }}>
                <span onClick={() => setMarkCourseComplete(v => !v)} style={{ width: 13, height: 13, border: `1px solid ${markCourseComplete ? green : adim}`, background: markCourseComplete ? 'rgba(68,255,136,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{markCourseComplete ? '✓' : ''}</span>
                MARK ENTIRE COURSE COMPLETE
              </label>
            </div>
          ) : (
            <AutoSearch
              placeholder="Search courses..."
              items={allCourses.map(c => ({ id: c.id, name: c.name, sub: c.status }))}
              onSelect={item => handleSelectCourse(item)}
              color={teal}
            />
          )}
        </TagSection>

        {/* Project */}
        <TagSection label="PROJECT" color="#ffaa00" hasItems={!!project}>
          {project ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: '#ffaa00', flex: 1 }}>{project.name}</span>
                <span onClick={() => { setProject(null); setCompletedObjectives([]); }} style={{ fontSize: 9, color: adim, cursor: 'pointer' }}>× REMOVE</span>
              </div>
              {project.objectives.filter(o => !o.completed_at).length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 5 }}>COMPLETE OBJECTIVES:</div>
                  {project.objectives.filter(o => !o.completed_at).map(o => (
                    <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 9, color: completedObjectives.includes(o.id) ? '#ffaa00' : dim, marginBottom: 4 }}>
                      <span onClick={() => setCompletedObjectives(p => p.includes(o.id) ? p.filter(x => x !== o.id) : [...p, o.id])}
                        style={{ width: 13, height: 13, border: `1px solid ${completedObjectives.includes(o.id) ? '#ffaa00' : adim}`, background: completedObjectives.includes(o.id) ? 'rgba(255,170,0,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0 }}>
                        {completedObjectives.includes(o.id) ? '✓' : ''}
                      </span>
                      {o.title}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <AutoSearch
              placeholder="Search projects..."
              items={allProjects.map(p => ({ id: p.id, name: p.name, sub: p.status }))}
              onSelect={item => handleSelectProject(item)}
              color="#ffaa00"
            />
          )}
        </TagSection>

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
