import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import type { RecoverySettings, SleepSession } from '@/types';
import {
  groupSleepSessionsByAnchorDate,
  normalizeRecoverySettingsRow,
  normalizeSleepSessionRow,
  sanitizeSleepSessionInput,
  type SleepSessionInput,
} from '@/services/recoveryService';

async function getSleepSessions(): Promise<SleepSession[]> {
  const db = await getDB();
  const res = await db.query(`SELECT * FROM sleep_sessions ORDER BY end_time DESC`);
  return res.rows.map((row) => normalizeSleepSessionRow(row as unknown as Record<string, unknown>));
}

async function getRecoverySettings(): Promise<RecoverySettings> {
  const db = await getDB();
  const res = await db.query(`SELECT * FROM recovery_settings WHERE id = 1 LIMIT 1`);
  return normalizeRecoverySettingsRow(res.rows[0] as Record<string, unknown> | undefined);
}

export function useSleepSessions() {
  const query = useQuery({
    queryKey: ['sleep-sessions'],
    queryFn: getSleepSessions,
  });
  return {
    sessions: query.data ?? [],
    isLoading: query.isLoading,
  };
}

export function useRecoverySettings() {
  const query = useQuery({
    queryKey: ['recovery-settings'],
    queryFn: getRecoverySettings,
  });
  return {
    settings: query.data ?? { id: 1, daily_goal_minutes: 480 },
    isLoading: query.isLoading,
  };
}

export function useSleepDays() {
  const { sessions, isLoading } = useSleepSessions();
  return {
    days: groupSleepSessionsByAnchorDate(sessions),
    sessions,
    isLoading,
  };
}

export function useSleepDay(anchorDate: string | null) {
  const { days, isLoading } = useSleepDays();
  return {
    day: anchorDate ? days.find((summary) => summary.anchor_date === anchorDate) ?? null : null,
    isLoading,
  };
}

export function useRecoveryActions() {
  const queryClient = useQueryClient();

  const invalidateRecovery = async () => {
    await queryClient.invalidateQueries({ queryKey: ['sleep-sessions'] });
    await queryClient.invalidateQueries({ queryKey: ['recovery-settings'] });
  };

  const createSleepSession = useMutation({
    mutationFn: async (input: SleepSessionInput) => {
      const db = await getDB();
      const sanitized = sanitizeSleepSessionInput(input);
      await db.query(
        `INSERT INTO sleep_sessions (start_time, end_time, duration_minutes, quality, notes, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [sanitized.start_time, sanitized.end_time, sanitized.duration_minutes, sanitized.quality, sanitized.notes],
      );
    },
    onSuccess: invalidateRecovery,
  });

  const updateSleepSession = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: SleepSessionInput }) => {
      const db = await getDB();
      const sanitized = sanitizeSleepSessionInput(input);
      await db.query(
        `UPDATE sleep_sessions
         SET start_time=$1, end_time=$2, duration_minutes=$3, quality=$4, notes=$5, updated_at=NOW()
         WHERE id=$6`,
        [sanitized.start_time, sanitized.end_time, sanitized.duration_minutes, sanitized.quality, sanitized.notes, id],
      );
    },
    onSuccess: invalidateRecovery,
  });

  const deleteSleepSession = useMutation({
    mutationFn: async (id: string) => {
      const db = await getDB();
      await db.query(`DELETE FROM sleep_sessions WHERE id=$1`, [id]);
    },
    onSuccess: invalidateRecovery,
  });

  const updateDailyGoal = useMutation({
    mutationFn: async (dailyGoalMinutes: number) => {
      const db = await getDB();
      await db.query(
        `INSERT INTO recovery_settings (id, daily_goal_minutes)
         VALUES (1, $1)
         ON CONFLICT (id) DO UPDATE SET daily_goal_minutes = EXCLUDED.daily_goal_minutes`,
        [dailyGoalMinutes],
      );
    },
    onSuccess: invalidateRecovery,
  });

  return {
    createSleepSession,
    updateSleepSession,
    deleteSleepSession,
    updateDailyGoal,
  };
}
