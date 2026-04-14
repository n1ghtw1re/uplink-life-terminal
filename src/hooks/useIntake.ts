import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { refreshAppData } from '@/lib/refreshAppData';
import type { IntakeLog, IntakeSettings } from '@/types';
import {
  buildIntakeDaySummaries,
  calculateIntakeStreak,
  compareIntakeLogs,
  normalizeIntakeLogRow,
  normalizeIntakeSettingsRow,
  sanitizeIntakeLogInput,
  sanitizeIntakeSettingsInput,
  type IntakeLogInput,
  type IntakeSettingsInput,
} from '@/services/intakeService';

async function getIntakeSettings(): Promise<IntakeSettings> {
  const db = await getDB();
  const res = await db.query(`SELECT * FROM intake_settings WHERE id = 1 LIMIT 1`);
  return normalizeIntakeSettingsRow(res.rows[0] as Record<string, unknown> | undefined);
}

async function getIntakeLogs(): Promise<IntakeLog[]> {
  const db = await getDB();
  const res = await db.query(`SELECT * FROM intake_logs ORDER BY logged_at DESC`);
  return res.rows.map((row) => normalizeIntakeLogRow(row as unknown as Record<string, unknown>)).sort(compareIntakeLogs);
}

export function useIntakeSettings() {
  const query = useQuery({
    queryKey: ['intake-settings'],
    queryFn: getIntakeSettings,
  });

  return {
    settings: query.data ?? normalizeIntakeSettingsRow(undefined),
    isLoading: query.isLoading,
  };
}

export function useIntakeLogs() {
  const query = useQuery({
    queryKey: ['intake-logs'],
    queryFn: getIntakeLogs,
  });

  return {
    logs: query.data ?? [],
    isLoading: query.isLoading,
  };
}

export function useIntakeDays() {
  const { logs, isLoading: logsLoading } = useIntakeLogs();
  const { settings, isLoading: settingsLoading } = useIntakeSettings();
  const days = buildIntakeDaySummaries(logs, settings);

  return {
    logs,
    days,
    settings,
    streak: calculateIntakeStreak(days),
    isLoading: logsLoading || settingsLoading,
  };
}

export function useIntakeDay(anchorDate: string | null) {
  const { days, settings, isLoading, streak } = useIntakeDays();
  return {
    day: anchorDate ? days.find((summary) => summary.anchor_date === anchorDate) ?? null : null,
    days,
    settings,
    streak,
    isLoading,
  };
}

export function useIntakeLog(logId: string | null) {
  const { logs, isLoading } = useIntakeLogs();
  return {
    log: logId ? logs.find((entry) => entry.id === logId) ?? null : null,
    isLoading,
  };
}

export function useTodayIntake() {
  const { days, settings, streak, isLoading } = useIntakeDays();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return {
    day: days.find((summary) => summary.anchor_date === todayKey) ?? null,
    settings,
    streak,
    isLoading,
  };
}

export function useIntakeActions() {
  const queryClient = useQueryClient();

  const invalidateIntake = async () => {
    await queryClient.invalidateQueries({ queryKey: ['intake-settings'] });
    await queryClient.invalidateQueries({ queryKey: ['intake-logs'] });
    await refreshAppData(queryClient);
  };

  const updateSettings = useMutation({
    mutationFn: async (input: IntakeSettingsInput) => {
      const db = await getDB();
      const sanitized = sanitizeIntakeSettingsInput(input);
      await db.query(
        `INSERT INTO intake_settings (id, daily_calorie_goal, protein_percent, carbs_percent, fat_percent, updated_at)
         VALUES (1, $1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE
         SET daily_calorie_goal = EXCLUDED.daily_calorie_goal,
             protein_percent = EXCLUDED.protein_percent,
             carbs_percent = EXCLUDED.carbs_percent,
             fat_percent = EXCLUDED.fat_percent,
             updated_at = NOW()`,
        [sanitized.daily_calorie_goal, sanitized.protein_percent, sanitized.carbs_percent, sanitized.fat_percent],
      );
    },
    onSuccess: invalidateIntake,
  });

  const createLog = useMutation({
    mutationFn: async (input: IntakeLogInput) => {
      const db = await getDB();
      const sanitized = sanitizeIntakeLogInput(input);
      await db.query(
        `INSERT INTO intake_logs (
          logged_at, anchor_date, meal_label, notes,
          source_kind, source_id, source_name, source_origin,
          grams, servings, input_text,
          calories, protein_g, carbs_g, fat_g,
          updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())`,
        [
          sanitized.logged_at,
          sanitized.anchor_date,
          sanitized.meal_label,
          sanitized.notes,
          sanitized.source_kind,
          sanitized.source_id,
          sanitized.source_name,
          sanitized.source_origin,
          sanitized.grams,
          sanitized.servings,
          sanitized.input_text,
          sanitized.calories,
          sanitized.protein_g,
          sanitized.carbs_g,
          sanitized.fat_g,
        ],
      );
    },
    onSuccess: invalidateIntake,
  });

  const updateLog = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: IntakeLogInput }) => {
      const db = await getDB();
      const sanitized = sanitizeIntakeLogInput(input);
      await db.query(
        `UPDATE intake_logs
         SET logged_at=$1, anchor_date=$2, meal_label=$3, notes=$4,
             source_kind=$5, source_id=$6, source_name=$7, source_origin=$8,
             grams=$9, servings=$10, input_text=$11,
             calories=$12, protein_g=$13, carbs_g=$14, fat_g=$15,
             updated_at=NOW()
         WHERE id=$16`,
        [
          sanitized.logged_at,
          sanitized.anchor_date,
          sanitized.meal_label,
          sanitized.notes,
          sanitized.source_kind,
          sanitized.source_id,
          sanitized.source_name,
          sanitized.source_origin,
          sanitized.grams,
          sanitized.servings,
          sanitized.input_text,
          sanitized.calories,
          sanitized.protein_g,
          sanitized.carbs_g,
          sanitized.fat_g,
          id,
        ],
      );
    },
    onSuccess: invalidateIntake,
  });

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      const db = await getDB();
      await db.query(`DELETE FROM intake_logs WHERE id = $1`, [id]);
    },
    onSuccess: invalidateIntake,
  });

  return {
    updateSettings,
    createLog,
    updateLog,
    deleteLog,
  };
}

