import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { Habit, HabitLog } from '@/types';
import { getLevelFromXP } from '@/services/xpService';
import {
  todayStr, isDueToday, calcCheckInXP, getMissedDays,
  MAX_SHIELDS, daysBetween,
} from '@/services/habitService';

// ── Selectors ─────────────────────────────────────────────────

export function useHabits() {
  const queryClient = useQueryClient();

  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async (): Promise<Habit[]> => {
      const db = await getDB();
      const res = await db.query(`SELECT * FROM habits ORDER BY created_at DESC`);
      return res.rows as unknown as Habit[];
    },
  });

  const todaysHabits = habits.filter(isDueToday);

  // ── Create ────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (
      h: Omit<Habit, 'id' | 'created_at' | 'current_streak' | 'longest_streak' | 'shields' | 'status' | 'paused_until'>
    ) => {
      const db = await getDB();
      try {
        console.log('// HABIT_CREATE_REQ:', h);
        await db.query(`
          INSERT INTO habits (
            name, stat_key, frequency_type, interval_days, specific_days,
            target_type, target_value, reminder_time, streak_goal, streak_reward, status
          ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11)
        `, [
          h.name, h.stat_key, h.frequency_type,
          h.interval_days ?? null,
          h.specific_days ? JSON.stringify(h.specific_days) : null,
          h.target_type,
          h.target_value ?? null,
          h.reminder_time ?? null,
          h.streak_goal ?? null,
          h.streak_reward,
          'ACTIVE'
        ]);
        console.log('// HABIT_CREATE_SUCCESS');
      } catch (err) {
        console.error('// HABIT_CREATE_ERR:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-logs-today-map'] });
    },
  });

  // ── Check-In ──────────────────────────────────────────────────
  const checkInMutation = useMutation({
    mutationFn: async ({ habit, value }: { habit: Habit; value?: number }) => {
      const db  = await getDB();
      const today = todayStr();

      // Get existing logs for today
      const existingLogs = await db.query<{ id: string; value: number; completed: boolean }>(
        `SELECT id, value, completed FROM habit_logs WHERE habit_id=$1 AND logged_for_date=$2`,
        [habit.id, today]
      );

      // Sum up current value for today
      const currentValue = existingLogs.rows.reduce((sum, log) => sum + (log.value || 0), 0);
      const newValue = (value ?? 1);
      const cumulativeValue = currentValue + newValue;

      // Determine if completed based on target type
      let isCompleted = false;
      if (habit.target_type === 'BINARY') {
        isCompleted = true;
      } else if (habit.target_type === 'QUANTITATIVE' && habit.target_value) {
        isCompleted = cumulativeValue >= habit.target_value;
      }

      // Insert the log
      await db.query(`
        INSERT INTO habit_logs (habit_id, logged_for_date, logged_date, completed, value, xp_awarded)
        VALUES ($1, $2, $3, $4, $5, 0)
      `, [habit.id, today, today, isCompleted, newValue]);

      // If completed, update streak and award XP
      if (isCompleted && !existingLogs.rows.some(l => l.completed)) {
        const newStreak = habit.current_streak + 1;
        const { statXp, masterXp, bonuses } = calcCheckInXP(habit, newStreak);
        const totalXp = statXp + masterXp + bonuses.reduce((s, b) => s + b.amount, 0);

        // Shield: earn 1 each time streak hits a 7-multiple
        const newShields = newStreak % 7 === 0
          ? Math.min(habit.shields + 1, MAX_SHIELDS)
          : habit.shields;

        // Update habit streak
        await db.query(`
          UPDATE habits
          SET current_streak=$1, longest_streak=GREATEST(longest_streak,$1), shields=$2
          WHERE id=$3
        `, [newStreak, newShields, habit.id]);

        // Award XP: stat
        const statLevelCase = getLevelFromXP(0);
        await db.exec(`
          UPDATE stats SET xp=xp+${statXp}, level=${statLevelCase.level}, dormant=false
          WHERE stat_key='${habit.stat_key}';
          UPDATE master_progress SET total_xp=total_xp+${masterXp} WHERE id=1;
        `);

        // Re-compute levels
        const statRow = await db.query<{ xp: number }>(`SELECT xp FROM stats WHERE stat_key='${habit.stat_key}'`);
        const statNewLevel = getLevelFromXP(statRow.rows[0]?.xp ?? 0).level;
        await db.exec(`UPDATE stats SET level=${statNewLevel} WHERE stat_key='${habit.stat_key}'`);

        const masterRow = await db.query<{ total_xp: number }>(`SELECT total_xp FROM master_progress WHERE id=1`);
        const masterNewLevel = getLevelFromXP(masterRow.rows[0]?.total_xp ?? 0).level;
        await db.exec(`UPDATE master_progress SET level=${masterNewLevel} WHERE id=1`);

        // Bonus XP (streaks / goals)
        for (const bonus of bonuses) {
          const half = Math.floor(bonus.amount / 2);
          await db.exec(`
            UPDATE stats SET xp=xp+${half} WHERE stat_key='${habit.stat_key}';
            UPDATE master_progress SET total_xp=total_xp+${bonus.amount - half} WHERE id=1;
          `);
        }

        // XP log entry
        const logId = crypto.randomUUID();
        const now = new Date().toISOString();
        await db.exec(`
          INSERT INTO xp_log (id, source, source_id, tier, entity_id, amount, notes, logged_at)
          VALUES ('${logId}', 'habit', '${habit.id}', 'stat', '${habit.stat_key}', ${totalXp}, 'habit check-in', '${now}');
        `);

        return { statXp, masterXp, bonuses, newStreak, completed: true };
      }

      return { completed: false, cumulativeValue, targetValue: habit.target_value };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-logs-today-map'] });
      queryClient.invalidateQueries({ queryKey: ['operator'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  // ── Process Missed Days (call on boot) ────────────────────────
  const processMissedMutation = useMutation({
    mutationFn: async (habit: Habit) => {
      const db = await getDB();
      if (habit.status !== 'ACTIVE') return;

      const logs = await db.query<HabitLog>(
        `SELECT * FROM habit_logs WHERE habit_id=$1 ORDER BY logged_for_date DESC LIMIT 60`,
        [habit.id]
      );
      if (!logs || !logs.rows) return;
      const missed = getMissedDays(logs.rows as unknown as HabitLog[]);
      if (missed <= 0) return;

      let shields = habit.shields;
      let streak  = habit.current_streak;

      for (let i = 0; i < missed; i++) {
        if (shields > 0) {
          shields--;
        } else {
          streak = 0;
          break;
        }
      }

      await db.query(`UPDATE habits SET shields=$1, current_streak=$2 WHERE id=$3`, [shields, streak, habit.id]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });

  // ── Retire ────────────────────────────────────────────────────
  const retireMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const db = await getDB();
      await db.query(`UPDATE habits SET status='RETIRED' WHERE id=$1`, [habitId]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });

  // ── Reactivate (unretire) ───────────────────────────────────────
  const reactivateMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const db = await getDB();
      await db.query(`UPDATE habits SET status='ACTIVE' WHERE id=$1`, [habitId]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });

  // ── Pause ─────────────────────────────────────────────────────
  const pauseMutation = useMutation({
    mutationFn: async ({ habitId, until }: { habitId: string; until: string }) => {
      const db = await getDB();
      await db.query(`UPDATE habits SET status='PAUSED', paused_until=$1 WHERE id=$2`, [until, habitId]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });

  // ── Unpause (cancel vacation) ───────────────────────────────────
  const unpauseMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const db = await getDB();
      await db.query(`UPDATE habits SET status='ACTIVE', paused_until=NULL WHERE id=$1`, [habitId]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });

  // ── Update ─────────────────────────────────────────────────────
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });

  // ── Delete ─────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const db = await getDB();
      await db.query(`DELETE FROM habits WHERE id=$1`, [habitId]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });

  return {
    habits,
    todaysHabits,
    isLoading,
    createHabit:      createMutation.mutateAsync,
    checkIn:          checkInMutation.mutateAsync,
    processMissed:    processMissedMutation.mutateAsync,
    retireHabit:      retireMutation.mutateAsync,
    reactivateHabit:  reactivateMutation.mutateAsync,
    pauseHabit:       pauseMutation.mutateAsync,
    unpauseHabit:     unpauseMutation.mutateAsync,
    updateHabit:      updateMutation.mutateAsync,
    deleteHabit:      deleteMutation.mutateAsync,
  };
}

// ── Habit logs for a single habit ─────────────────────────────
export function useHabitLogs(habitId: string | null) {
  return useQuery({
    queryKey: ['habit-logs', habitId],
    enabled: !!habitId,
    queryFn: async (): Promise<HabitLog[]> => {
      const db = await getDB();
      const res = await db.query(
        `SELECT * FROM habit_logs WHERE habit_id=$1 ORDER BY logged_for_date DESC LIMIT 90`,
        [habitId]
      );
      return res.rows as unknown as HabitLog[];
    },
  });
}

// ── Today's completion map  ────────────────────────────────────
export function useTodayLogs() {
  return useQuery({
    queryKey: ['habit-logs-today-map'],
    queryFn: async (): Promise<Record<string, { completed: boolean; value: number }>> => {
      const db  = await getDB();
      const today = todayStr();
      const res = await db.query<{ habit_id: string; completed: boolean; value: number }>(
        `SELECT habit_id, completed, COALESCE(value, 0) as value FROM habit_logs WHERE logged_for_date=$1`,
        [today]
      );
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
}
