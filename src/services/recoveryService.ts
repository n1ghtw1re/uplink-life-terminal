import { differenceInMinutes, format } from 'date-fns';
import type { RecoverySettings, SleepDaySummary, SleepSession } from '@/types';

export interface SleepSessionInput {
  start_time: string;
  end_time: string;
  quality: number | null;
  notes: string | null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function normalizeLocalDateTimeInput(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${toLocalDateString(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function normalizeSleepDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

export function getAnchorDate(endTime: string | Date): string {
  const date = endTime instanceof Date ? endTime : new Date(endTime);
  return toLocalDateString(date);
}

export function formatDurationMinutes(durationMinutes: number): string {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatSleepDateTime(value: string): string {
  return format(new Date(value), 'MMM d, yyyy HH:mm');
}

export function sanitizeSleepSessionInput(input: SleepSessionInput) {
  const start = new Date(input.start_time);
  const end = new Date(input.end_time);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid sleep session time.');
  }
  if (end <= start) {
    throw new Error('End time must be after start time.');
  }

  return {
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    duration_minutes: differenceInMinutes(end, start),
    quality: input.quality && input.quality >= 1 && input.quality <= 5 ? input.quality : null,
    notes: input.notes?.trim() ? input.notes.trim() : null,
  };
}

export function normalizeSleepSessionRow(row: Record<string, unknown>): SleepSession {
  return {
    id: String(row.id ?? ''),
    start_time: normalizeSleepDateTime(row.start_time as string | Date),
    end_time: normalizeSleepDateTime(row.end_time as string | Date),
    duration_minutes: Number(row.duration_minutes ?? 0),
    quality: row.quality == null ? null : Number(row.quality),
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

export function groupSleepSessionsByAnchorDate(sessions: SleepSession[]): SleepDaySummary[] {
  const map = new Map<string, SleepDaySummary>();

  for (const session of sessions) {
    const anchorDate = getAnchorDate(session.end_time);
    const existing = map.get(anchorDate) ?? {
      anchor_date: anchorDate,
      total_minutes: 0,
      session_count: 0,
      avg_quality: null,
      sessions: [],
    };

    existing.total_minutes += session.duration_minutes;
    existing.session_count += 1;
    existing.sessions.push(session);
    map.set(anchorDate, existing);
  }

  return [...map.values()]
    .map((summary) => {
      const rated = summary.sessions.filter((session) => session.quality != null);
      const avgQuality = rated.length
        ? rated.reduce((sum, session) => sum + (session.quality ?? 0), 0) / rated.length
        : null;

      return {
        ...summary,
        avg_quality: avgQuality,
        sessions: summary.sessions.sort((a, b) => b.end_time.localeCompare(a.end_time)),
      };
    })
    .sort((a, b) => b.anchor_date.localeCompare(a.anchor_date));
}

export function calculateRecoveryStreak(summaries: SleepDaySummary[], goalMinutes: number): number {
  if (!summaries.length || goalMinutes <= 0) return 0;

  let streak = 0;
  let cursor = new Date(`${summaries[0].anchor_date}T00:00:00`);
  const summaryMap = new Map(summaries.map((summary) => [summary.anchor_date, summary]));

  while (true) {
    const key = toLocalDateString(cursor);
    const summary = summaryMap.get(key);
    if (!summary || summary.total_minutes < goalMinutes) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function normalizeRecoverySettingsRow(row: Record<string, unknown> | undefined): RecoverySettings {
  return {
    id: Number(row?.id ?? 1),
    daily_goal_minutes: Number(row?.daily_goal_minutes ?? 480),
  };
}
