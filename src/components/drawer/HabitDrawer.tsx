// ============================================================
// src/components/drawer/HabitDrawer.tsx
// ============================================================
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { getLevelFromXP } from '@/services/xpService';
import { getNextDueDateLabel, normalizeHabitDate, todayStr, calcCheckInXP, MAX_SHIELDS } from '@/services/habitService';
import { useOperator } from '@/hooks/useOperator';
import { Habit, StatKey } from '@/types';

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const dim  = 'hsl(var(--text-dim))';
const adim = 'hsl(var(--accent-dim))';
const bgS  = 'hsl(var(--bg-secondary))';
const bgT  = 'hsl(var(--bg-tertiary))';
const green = '#44ff88';

const STATS = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'] as const;
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const STAT_META: Record<string, { icon: string }> = {
  body: { icon: '⚡' }, wire: { icon: '🔌' }, mind: { icon: '🧠' },
  cool: { icon: '😎' }, grit: { icon: '💪' }, flow: { icon: '🌊' }, ghost: { icon: '👻' },
};

type StatKey = 'body' | 'wire' | 'mind' | 'cool' | 'grit' | 'flow' | 'ghost';

interface Props {
  habitId: string;
  onClose: () => void;
}

export default function HabitDrawer({ habitId, onClose }: Props) {
  // All useState calls FIRST - exactly like ToolDetailDrawer
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pauseDate, setPauseDate] = useState('');
  const [showPause, setShowPause] = useState(false);
  const [quantityValue, setQuantityValue] = useState<number | ''>('');
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editStatKey, setEditStatKey] = useState<string>('body');
  const [editFreqType, setEditFreqType] = useState<'DAILY' | 'INTERVAL' | 'SPECIFIC_DAYS'>('DAILY');
  const [editIntervalDays, setEditIntervalDays] = useState(2);
  const [editSpecificDays, setEditSpecificDays] = useState<number[]>([]);
  const [editTargetType, setEditTargetType] = useState<'BINARY' | 'QUANTITATIVE'>('BINARY');
  const [editTargetValue, setEditTargetValue] = useState<number | ''>(8);
  const [editReminder, setEditReminder] = useState('');
  const [editStreakGoal, setEditStreakGoal] = useState<number | ''>(21);
  const [editStreakReward, setEditStreakReward] = useState<number | ''>(100);

  // Reset edit/delete states when habitId changes - exactly like ToolDetailDrawer
  useEffect(() => {
    setEditing(false);
    setConfirmDelete(false);
    setShowPause(false);
    setPauseDate('');
    setQuantityValue('');
  }, [habitId]);

  const { data: operator } = useOperator();
  const cutoffTime = operator?.habitCutoffTime;
  const queryClient = useQueryClient();

  // useQuery for habit data - same pattern as ToolDetailDrawer
  const { data: habit, isLoading } = useQuery({
    queryKey: ['habit', habitId],
    enabled: !!habitId,
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query(
        `SELECT * FROM habits WHERE id = $1 LIMIT 1`,
        [habitId]
      );
      return res.rows[0] ?? null;
    },
  });

  // useQuery for habit logs
  const { data: logs = [] } = useQuery({
    queryKey: ['habit-logs', habitId],
    enabled: !!habitId,
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query(
        `SELECT * FROM habit_logs WHERE habit_id=$1 ORDER BY logged_for_date DESC LIMIT 90`,
        [habitId]
      );
      return res.rows;
    },
  });

  // useQuery for today's completion status
  const { data: todayMap = {} } = useQuery({
    queryKey: ['habit-logs-today-map', cutoffTime],
    queryFn: async () => {
      const db = await getDB();
      const today = todayStr(cutoffTime);
      const res = await db.query<{ habit_id: string; completed: boolean; value: number }>(
        `SELECT habit_id, completed, COALESCE(value, 0) as value FROM habit_logs WHERE logged_for_date=$1`,
        [today]
      );
      // Sum multiple logs and check if ANY log completed
      const map: Record<string, { completed: boolean; value: number }> = {};
      for (const row of res.rows) {
        if (!map[row.habit_id]) {
          map[row.habit_id] = { completed: false, value: 0 };
        }
        map[row.habit_id].value += row.value;
        if (row.completed) {
          map[row.habit_id].completed = true;
        }
      }
      return map;
    },
  });

  const isDoneToday = habit ? (todayMap[habit.id]?.completed ?? false) : false;

  const checkInMutation = useMutation({
    mutationFn: async ({ habit, value, cutoffTime }: { habit: Habit; value?: number; cutoffTime?: string | null }) => {
      const db = await getDB();
      const today = todayStr(cutoffTime);

      const existingLogs = await db.query<{ id: string; value: number; completed: boolean }>(
        `SELECT id, value, completed FROM habit_logs WHERE habit_id=$1 AND logged_for_date=$2`,
        [habit.id, today]
      );

      const currentValue = existingLogs.rows.reduce((sum, log) => sum + (log.value || 0), 0);
      const newValue = (value ?? 1);
      const cumulativeValue = currentValue + newValue;

      let isCompleted = false;
      if (habit.target_type === 'BINARY') {
        isCompleted = true;
      } else if (habit.target_type === 'QUANTITATIVE' && habit.target_value) {
        isCompleted = cumulativeValue >= habit.target_value;
      }

      await db.query(`
        INSERT INTO habit_logs (habit_id, logged_for_date, logged_date, completed, value, xp_awarded)
        VALUES ($1, $2, $3, $4, $5, 0)
      `, [habit.id, today, today, isCompleted, newValue]);

      if (isCompleted && !existingLogs.rows.some(l => l.completed)) {
        const newStreak = habit.current_streak + 1;
        const { statXp, masterXp, bonuses } = calcCheckInXP(habit, newStreak);
        const totalXp = statXp + masterXp + bonuses.reduce((s, b) => s + b.amount, 0);

        const newShields = newStreak % 7 === 0
          ? Math.min(habit.shields + 1, MAX_SHIELDS)
          : habit.shields;

        await db.query(`
          UPDATE habits
          SET current_streak=$1, longest_streak=GREATEST(longest_streak,$1), shields=$2
          WHERE id=$3
        `, [newStreak, newShields, habit.id]);

        const statLevelCase = getLevelFromXP(0);
        await db.exec(`
          UPDATE stats SET xp=xp+${statXp}, level=${statLevelCase.level}, dormant=false
          WHERE stat_key='${habit.stat_key}';
          UPDATE master_progress SET total_xp=total_xp+${masterXp} WHERE id=1;
        `);

        const statRow = await db.query<{ xp: number }>(`SELECT xp FROM stats WHERE stat_key='${habit.stat_key}'`);
        const statNewLevel = getLevelFromXP(statRow.rows[0]?.xp ?? 0).level;
        await db.exec(`UPDATE stats SET level=${statNewLevel} WHERE stat_key='${habit.stat_key}'`);

        const masterRow = await db.query<{ total_xp: number }>(`SELECT total_xp FROM master_progress WHERE id=1`);
        const masterNewLevel = getLevelFromXP(masterRow.rows[0]?.total_xp ?? 0).level;
        await db.exec(`UPDATE master_progress SET level=${masterNewLevel} WHERE id=1`);

        for (const bonus of bonuses) {
          const half = Math.floor(bonus.amount / 2);
          await db.exec(`
            UPDATE stats SET xp=xp+${half} WHERE stat_key='${habit.stat_key}';
            UPDATE master_progress SET total_xp=total_xp+${bonus.amount - half} WHERE id=1;
          `);
        }

        await db.query(`
          INSERT INTO xp_log (id, source, source_id, tier, entity_id, amount, notes, logged_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [crypto.randomUUID(), 'habit', habit.id, 'stat', habit.stat_key, totalXp, `Habit streak: ${newStreak}`]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit', habitId] });
      queryClient.invalidateQueries({ queryKey: ['habit-logs', habitId] });
      queryClient.invalidateQueries({ queryKey: ['habit-logs-today-map'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Habit> & { id: string }) => {
      const db = await getDB();
      const sets: string[] = [];
      const values: any[] = [];
      let idx = 1;
      if (updates.name !== undefined) { sets.push(`name=$${idx++}`); values.push(updates.name); }
      if (updates.stat_key !== undefined) { sets.push(`stat_key=$${idx++}`); values.push(updates.stat_key); }
      if (updates.frequency_type !== undefined) { sets.push(`frequency_type=$${idx++}`); values.push(updates.frequency_type); }
      if (updates.interval_days !== undefined) { sets.push(`interval_days=$${idx++}`); values.push(updates.interval_days); }
      if (updates.specific_days !== undefined) { sets.push(`specific_days=$${idx++}::jsonb`); values.push(JSON.stringify(updates.specific_days)); }
      if (updates.target_type !== undefined) { sets.push(`target_type=$${idx++}`); values.push(updates.target_type); }
      if (updates.target_value !== undefined) { sets.push(`target_value=$${idx++}`); values.push(updates.target_value); }
      if (updates.reminder_time !== undefined) { sets.push(`reminder_time=$${idx++}`); values.push(updates.reminder_time); }
      if (updates.streak_goal !== undefined) { sets.push(`streak_goal=$${idx++}`); values.push(updates.streak_goal); }
      if (updates.streak_reward !== undefined) { sets.push(`streak_reward=$${idx++}`); values.push(updates.streak_reward); }
      if (sets.length === 0) return;
      values.push(updates.id);
      await db.query(`UPDATE habits SET ${sets.join(', ')} WHERE id=$${idx}`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit', habitId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const db = await getDB();
      await db.query(`DELETE FROM habits WHERE id=$1`, [habitId]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });

  const retireMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const db = await getDB();
      await db.query(`UPDATE habits SET status='RETIRED' WHERE id=$1`, [habitId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit', habitId] });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const db = await getDB();
      await db.query(`UPDATE habits SET status='ACTIVE' WHERE id=$1`, [habitId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit', habitId] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async ({ habitId, until }: { habitId: string; until: string }) => {
      const db = await getDB();
      await db.query(`UPDATE habits SET status='PAUSED', paused_until=$1 WHERE id=$2`, [until, habitId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit', habitId] });
    },
  });

  const unpauseMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const db = await getDB();
      await db.query(`UPDATE habits SET status='ACTIVE', paused_until=NULL WHERE id=$1`, [habitId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit', habitId] });
    },
  });

  // CONDITIONAL RETURNS AFTER ALL HOOKS - exactly like ToolDetailDrawer
  if (isLoading) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>LOADING...</div>;
  if (!habit) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>HABIT NOT FOUND</div>;

  const startEdit = () => {
    setEditName(habit.name);
    setEditStatKey(habit.stat_key as StatKey);
    setEditFreqType(habit.frequency_type);
    setEditIntervalDays(habit.interval_days ?? 2);
    setEditSpecificDays(habit.specific_days ?? []);
    setEditTargetType(habit.target_type);
    setEditTargetValue(habit.target_value ?? 8);
    setEditReminder(habit.reminder_time ?? '');
    setEditStreakGoal(habit.streak_goal ?? 21);
    setEditStreakReward(habit.streak_reward ?? 100);
    setEditing(true);
  };

  const handleUpdate = async () => {
    await updateMutation.mutateAsync({
      id: habit.id,
      name: editName.trim(),
      stat_key: editStatKey,
      frequency_type: editFreqType,
      interval_days: editFreqType === 'INTERVAL' ? editIntervalDays : null,
      specific_days: editFreqType === 'SPECIFIC_DAYS' && editSpecificDays.length > 0 ? editSpecificDays : null,
      target_type: editTargetType,
      target_value: editTargetType === 'QUANTITATIVE' ? (Number(editTargetValue) || 1) : null,
      reminder_time: editReminder || null,
      streak_goal: Number(editStreakGoal) || null,
      streak_reward: Number(editStreakReward) || 100,
    });
    setEditing(false);
  };

  const handleRetire = async () => {
    await retireMutation.mutateAsync(habit.id);
    onClose();
  };

  const handleCheckIn = async () => {
    if (habit.status !== 'ACTIVE' || isDoneToday) return;
    
    const value = habit.target_type === 'QUANTITATIVE' && habit.target_value
      ? (Number(quantityValue) || 1)
      : undefined;
    
    try {
      await checkInMutation.mutateAsync({ habit, value, cutoffTime });
      setQuantityValue('');
    } catch (e) {
      console.error('Check-in failed:', e);
    }
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(habit.id);
    onClose();
  };

  const handlePause = async () => {
    if (!pauseDate) return;
    await pauseMutation.mutateAsync({ habitId: habit.id, until: new Date(pauseDate).toISOString() });
    onClose();
  };

  const handleUnpause = async () => {
    await unpauseMutation.mutateAsync(habit.id);
    onClose();
  };

  const handleReactivate = async () => {
    await reactivateMutation.mutateAsync(habit.id);
    onClose();
  };

  const toggleDay = (d: number) => {
    setEditSpecificDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const recent = logs.slice(0, 14);

  // Mini calendar: last 28 days - aggregate all logs per day to check completion
  const last28 = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const dayLogs = logs.filter(l => l.logged_for_date === ds);
    const completed = dayLogs.some(l => l.completed);
    return { ds, completed };
  });

  const freqLabel = habit.frequency_type === 'DAILY' ? 'Every day'
    : habit.frequency_type === 'INTERVAL' ? `Every ${habit.interval_days} days`
    : (['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].filter((_, i) => habit.specific_days?.includes(i))).join(' / ');
  const createdLabel = habit.created_at ? normalizeHabitDate(habit.created_at as string | Date) : '—';
  const dueDateLabel = getNextDueDateLabel(habit, isDoneToday);

  const segBtn = (active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{
      padding: '4px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer',
      background: active ? 'rgba(255,176,0,0.12)' : 'transparent',
      border: `1px solid ${active ? acc : adim}`,
      color: active ? acc : dim, transition: 'all 150ms',
    }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = acc; e.currentTarget.style.color = acc; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = adim; e.currentTarget.style.color = dim; } }}
    />
  );

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'transparent' }} />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 9200,
        width: 380, background: 'hsl(var(--bg-primary))',
        borderLeft: `1px solid ${acc}`,
        boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
        fontFamily: mono,
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${adim}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {editing ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                style={{
                  flex: 1, fontFamily: vt, fontSize: 20, color: acc,
                  background: bgT, border: `1px solid ${acc}`, padding: '4px 8px',
                  outline: 'none',
                }}
              />
            ) : (
              <div>
                <div style={{ fontFamily: vt, fontSize: 22, color: acc, letterSpacing: 1 }}>{habit.name}</div>
                <div style={{ fontSize: 9, color: adim, marginTop: 2 }}>
                  {STAT_META[habit.stat_key as StatKey]?.icon} {habit.stat_key.toUpperCase()} &nbsp;·&nbsp; {freqLabel}
                </div>
              </div>
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: dim, fontSize: 18, cursor: 'pointer' }}>×</button>
          </div>

          {/* Status badge */}
          <div style={{ marginTop: 8 }}>
            {habit.status === 'ACTIVE'  && <span style={{ fontSize: 8, color: green, border: `1px solid ${green}44`, padding: '2px 8px' }}>ACTIVE</span>}
            {habit.status === 'RETIRED' && <span style={{ fontSize: 8, color: dim,   border: `1px solid ${adim}`, padding: '2px 8px' }}>RETIRED</span>}
            {habit.status === 'PAUSED'  && <span style={{ fontSize: 8, color: '#ffaa00', border: `1px solid #ffaa00`, padding: '2px 8px' }}>PAUSED</span>}
          </div>

          {/* Prominent Check-in Button */}
          {habit.status === 'ACTIVE' && !isDoneToday && (
            <div style={{ marginTop: 12 }}>
              {habit.target_type === 'QUANTITATIVE' && habit.target_value ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 9, color: dim }}>LOG:</span>
                  <input
                    type="number"
                    min={1}
                    value={quantityValue}
                    onChange={e => setQuantityValue(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={`Target: ${habit.target_value}`}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: 14,
                      fontFamily: vt,
                      background: bgT,
                      border: `1px solid ${acc}`,
                      color: acc,
                      textAlign: 'center',
                    }}
                  />
                  <span style={{ fontSize: 9, color: adim }}>/ {habit.target_value}</span>
                </div>
              ) : null}
              
              <button
                onClick={handleCheckIn}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 14,
                  fontFamily: vt,
                  letterSpacing: 2,
                  background: 'rgba(68,255,136,0.15)',
                  border: `2px solid ${green}`,
                  color: green,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(68,255,136,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(68,255,136,0.15)'; }}
              >
                {habit.target_type === 'QUANTITATIVE' ? '[ LOG PROGRESS ]' : '[ COMPLETE HABIT ]'}
              </button>
            </div>
          )}

          {habit.status === 'ACTIVE' && isDoneToday && (
            <div style={{
              marginTop: 12,
              width: '100%',
              padding: '12px 16px',
              fontSize: 14,
              fontFamily: vt,
              letterSpacing: 2,
              background: 'rgba(255,176,0,0.08)',
              border: `1px solid ${adim}`,
              color: dim,
              textAlign: 'center',
            }}>
              ✓ COMPLETED TODAY
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, flexShrink: 0 }}>
          {[
            { label: 'STREAK', value: `${habit.current_streak}d` },
            { label: 'BEST',   value: `${habit.longest_streak}d` },
            { label: 'SHIELDS', value: `${'🛡'.repeat(habit.shields) || '—'}` },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '12px 10px', background: bgT, textAlign: 'center' }}>
              <div style={{ fontFamily: vt, fontSize: 22, color: acc }}>{value}</div>
              <div style={{ fontSize: 8, color: dim }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Today's Progress for QUANTITATIVE habits */}
        {habit.target_type === 'QUANTITATIVE' && habit.target_value && (() => {
          const currentVal = todayMap[habit.id]?.value ?? 0;
          const targetVal = habit.target_value;
          const excess = currentVal > targetVal ? currentVal - targetVal : 0;
          const isOver = excess > 0;
          return (
            <div style={{ padding: 14, background: bgT, border: `1px solid ${adim}`, marginTop: 10 }}>
              <div style={{ fontSize: 10, color: acc, fontFamily: vt, letterSpacing: 1, marginBottom: 8 }}>
                // TODAY'S PROGRESS
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ 
                  flex: 1, 
                  height: 8, 
                  background: 'hsl(var(--bg-primary))', 
                  border: `1px solid ${adim}`,
                  position: 'relative',
                }}>
                  <div style={{ 
                    width: `${Math.min(100, currentVal / targetVal * 100)}%`, 
                    height: '100%', 
                    background: (todayMap[habit.id]?.completed ?? false) ? green : acc,
                  }} />
                </div>
                <span style={{ 
                  fontFamily: vt, 
                  fontSize: 18, 
                  color: (todayMap[habit.id]?.completed ?? false) || isOver ? green : acc,
                }}>
                  {currentVal} / {targetVal}
                  {isOver && <span style={{ fontSize: 12, color: green }}> (+{excess})</span>}
                </span>
              </div>
              <div style={{ fontSize: 9, color: dim, marginTop: 6, textAlign: 'center' }}>
                {(todayMap[habit.id]?.completed ?? false) 
                  ? (isOver ? `+${excess} over goal!` : '✓ GOAL REACHED') 
                  : `${targetVal - currentVal} remaining to goal`}
              </div>
            </div>
          );
        })()}

        {editing ? (
          /* Inline Edit Form */
          <div style={{ padding: 16, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Stat */}
            <div>
              <div style={{ fontSize: 9, color: adim, marginBottom: 6, letterSpacing: 1 }}>STAT</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {STATS.map(s => segBtn(editStatKey === s, () => setEditStatKey(s)))}
              </div>
            </div>

            {/* Frequency */}
            <div>
              <div style={{ fontSize: 9, color: adim, marginBottom: 6, letterSpacing: 1 }}>FREQUENCY</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                <button onClick={() => setEditFreqType('DAILY')} style={{ ...segBtnStyles, ...(editFreqType === 'DAILY' ? activeBtnStyles : {}) }}>DAILY</button>
                <button onClick={() => setEditFreqType('SPECIFIC_DAYS')} style={{ ...segBtnStyles, ...(editFreqType === 'SPECIFIC_DAYS' ? activeBtnStyles : {}) }}>SET DAYS</button>
                <button onClick={() => setEditFreqType('INTERVAL')} style={{ ...segBtnStyles, ...(editFreqType === 'INTERVAL' ? activeBtnStyles : {}) }}>INTERVAL</button>
              </div>
              {editFreqType === 'INTERVAL' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9, color: dim }}>Every</span>
                  <input type="number" min={2} max={30} value={editIntervalDays}
                    onChange={e => setEditIntervalDays(Number(e.target.value))}
                    style={{ width: 50, padding: '4px', fontSize: 10, background: bgT, border: `1px solid ${adim}`, color: acc, fontFamily: mono }}
                  />
                  <span style={{ fontSize: 9, color: dim }}>days</span>
                </div>
              )}
              {editFreqType === 'SPECIFIC_DAYS' && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {DAYS.map((d, i) => (
                    <button key={d} onClick={() => toggleDay(i)} style={{
                      ...segBtnStyles,
                      padding: '4px 6px',
                      ...(editSpecificDays.includes(i) ? activeBtnStyles : {}),
                    }}>{d.slice(0, 3)}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Target */}
            <div>
              <div style={{ fontSize: 9, color: adim, marginBottom: 6, letterSpacing: 1 }}>TARGET</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                <button onClick={() => setEditTargetType('BINARY')} style={{ ...segBtnStyles, ...(editTargetType === 'BINARY' ? activeBtnStyles : {}) }}>BINARY</button>
                <button onClick={() => setEditTargetType('QUANTITATIVE')} style={{ ...segBtnStyles, ...(editTargetType === 'QUANTITATIVE' ? activeBtnStyles : {}) }}>QUANTITY</button>
              </div>
              {editTargetType === 'QUANTITATIVE' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9, color: dim }}>Target:</span>
                  <input type="number" min={1} value={editTargetValue}
                    onChange={e => setEditTargetValue(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{ width: 60, padding: '4px', fontSize: 10, background: bgT, border: `1px solid ${adim}`, color: acc, fontFamily: mono }}
                  />
                </div>
              )}
            </div>

            {/* Reminder */}
            <div>
              <div style={{ fontSize: 9, color: adim, marginBottom: 6, letterSpacing: 1 }}>REMINDER</div>
              <input type="time" value={editReminder} onChange={e => setEditReminder(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 10, background: bgT, border: `1px solid ${adim}`, color: acc, fontFamily: mono }}
              />
            </div>

            {/* Streak Goal */}
            <div>
              <div style={{ fontSize: 9, color: adim, marginBottom: 6, letterSpacing: 1 }}>STREAK GOAL (OPTIONAL)</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, color: dim }}>Goal:</span>
                  <input type="number" min={1} value={editStreakGoal}
                    onChange={e => setEditStreakGoal(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{ width: 50, padding: '4px', fontSize: 10, background: bgT, border: `1px solid ${adim}`, color: acc, fontFamily: mono }}
                  />
                  <span style={{ fontSize: 9, color: dim }}>days</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, color: dim }}>XP:</span>
                  <input type="number" min={0} value={editStreakReward}
                    onChange={e => setEditStreakReward(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{ width: 60, padding: '4px', fontSize: 10, background: bgT, border: `1px solid ${adim}`, color: acc, fontFamily: mono }}
                  />
                </div>
              </div>
            </div>

            {/* Save/Cancel */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={handleUpdate} style={{ flex: 1, padding: '8px', fontSize: 10, border: `1px solid ${acc}`, background: 'rgba(255,176,0,0.1)', color: acc, fontFamily: mono, cursor: 'pointer' }}>✓ SAVE CHANGES</button>
              <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '8px', fontSize: 10, border: `1px solid ${adim}`, background: 'transparent', color: dim, fontFamily: mono, cursor: 'pointer' }}>CANCEL</button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <>
            {/* Details */}
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, borderBottom: `1px solid ${adim}` }}>
              <div style={{ fontSize: 10, color: acc, fontFamily: vt, letterSpacing: 1, marginBottom: 4 }}>// PARAMETERS</div>
              {[
                ['TARGET',   habit.target_type === 'BINARY' ? 'Complete (YES/NO)' : `${habit.target_value ?? '—'} units`],
                ['REMINDER', habit.reminder_time || '—'],
                ['GOAL',     habit.streak_goal ? `${habit.streak_goal} days (+${habit.streak_reward} XP)` : '—'],
                ['CREATED',  habit.created_at ? (typeof habit.created_at === 'string' ? habit.created_at.slice(0, 10) : new Date(habit.created_at).toISOString().slice(0, 10)) : '—'],
                ['DUE DATE', dueDateLabel],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                  <span style={{ color: adim }}>{k}:</span>
                  <span style={{ color: acc }}>{v}</span>
                </div>
              ))}
            </div>

            {/* 28-day heatmap */}
            <div style={{ padding: 16, flexShrink: 0, borderBottom: `1px solid ${adim}` }}>
              <div style={{ fontSize: 10, color: acc, fontFamily: vt, letterSpacing: 1, marginBottom: 10 }}>// 28-DAY HISTORY</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                {last28.map(({ ds, completed }) => (
                  <div key={ds} title={ds} style={{
                    height: 18,
                    background: completed ? 'rgba(68,255,136,0.35)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${completed ? 'rgba(68,255,136,0.5)' : adim}`,
                    borderRadius: 2,
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 8, color: dim }}>
                <span>28 days ago</span><span>today</span>
              </div>
            </div>

            {/* Recent logs */}
            <div style={{ padding: 16, flex: 1, minHeight: 0, overflow: 'auto' }}>
              <div style={{ fontSize: 10, color: acc, fontFamily: vt, letterSpacing: 1, marginBottom: 10 }}>// RECENT SESSIONS</div>
              {recent.length === 0 && <div style={{ fontSize: 9, color: dim }}>No logs yet.</div>}
              {recent.map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 6, color: dim }}>
                  <span>{log.logged_for_date}</span>
                  <span style={{ color: log.completed ? green : adim }}>{log.completed ? '✓ DONE' : '— MISSED'}</span>
                  {log.xp_awarded > 0 && <span style={{ color: acc }}>+{log.xp_awarded} XP</span>}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ padding: 16, borderTop: `1px solid ${adim}`, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              {habit.status === 'ACTIVE' && (
                <>
                  <button onClick={startEdit} style={{ ...actionBtnStyle }}>[ EDIT HABIT ]</button>

                  {showPause ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="date" value={pauseDate} onChange={e => setPauseDate(e.target.value)}
                        style={{ flex: 1, padding: '6px', fontSize: 10, background: bgT, border: `1px solid ${adim}`, color: acc, fontFamily: mono }} />
                      <button onClick={handlePause} style={{ ...actionBtnStyle, flex: 'none', padding: '6px 12px' }}>PAUSE</button>
                      <button onClick={() => setShowPause(false)} style={{ background: 'transparent', border: 'none', color: dim, cursor: 'pointer', fontSize: 12 }}>×</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowPause(true)} style={actionBtnStyle}>[ VACATION MODE ]</button>
                  )}

                  <button onClick={handleRetire} style={actionBtnStyle}>[ RETIRE HABIT ]</button>
                </>
              )}

              {habit.status === 'PAUSED' && (
                <>
                  <button onClick={handleUnpause} style={actionBtnStyle}>[ CANCEL VACATION ]</button>
                  <button onClick={handleRetire} style={actionBtnStyle}>[ RETIRE HABIT ]</button>
                </>
              )}

              {habit.status === 'RETIRED' && (
                <>
                  <button onClick={handleReactivate} style={actionBtnStyle}>[ UNRETIRE HABIT ]</button>
                </>
              )}

              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} style={{ ...actionBtnStyle, color: '#ff6666', borderColor: '#ff444444' }}>[ DELETE HABIT ]</button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleDelete} style={{ flex: 1, ...actionBtnStyle, background: '#ff444422', borderColor: '#ff4444', color: '#ff4444' }}>CONFIRM DELETE</button>
                  <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, ...actionBtnStyle }}>CANCEL</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

const actionBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${adim}`,
  color: dim,
  fontFamily: mono,
  fontSize: 10,
  padding: '8px',
  cursor: 'pointer',
};

const segBtnStyles: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 9,
  fontFamily: mono,
  cursor: 'pointer',
  background: 'transparent',
  border: `1px solid ${adim}`,
  color: dim,
};

const activeBtnStyles: React.CSSProperties = {
  background: 'rgba(255,176,0,0.12)',
  border: `1px solid ${acc}`,
  color: acc,
};
