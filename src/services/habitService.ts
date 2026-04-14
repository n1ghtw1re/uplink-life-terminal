// ============================================================
// src/services/habitService.ts
// Pure logic — no React, no DB
// ============================================================
import { Habit, HabitLog } from '@/types';

export const DAILY_XP      = 10;   // 5 stat + 5 master
export const WEEKLY_BONUS  = 50;   // every 7-day milestone
export const MONTHLY_BONUS = 500;  // every 30-day milestone
export const MAX_SHIELDS   = 3;

/** Returns today's date as YYYY-MM-DD local string, using optional cutoff time */
export function todayStr(cutoffTime?: string | null): string {
  const d = new Date();
  if (typeof cutoffTime === 'string' && cutoffTime.includes(':')) {
    const [hours, minutes] = cutoffTime.split(':').map(Number);
    const now = d.getHours() * 60 + d.getMinutes();
    const cutoff = hours * 60 + minutes;
    if (now < cutoff) {
      d.setDate(d.getDate() - 1);
    }
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Returns date N days ago as YYYY-MM-DD */
export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Days between two YYYY-MM-DD strings (b - a) */
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export function normalizeHabitDate(value: string | Date | null | undefined): string {
  if (!value) return todayStr();
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    }
    return value.slice(0, 10);
  }
  return todayStr();
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Is this habit due today given its schedule? */
export function isDueToday(habit: Habit, cutoffTime?: string): boolean {
  if (habit.status !== 'ACTIVE') return false;
  if (habit.paused_until && String(habit.paused_until) >= new Date().toISOString()) return false;

  const effectiveToday = todayStr(cutoffTime);
  const dayOfWeek = new Date(effectiveToday + 'T12:00:00').getDay(); // 0 = Sun

  if (habit.frequency_type === 'DAILY') return true;

  if (habit.frequency_type === 'SPECIFIC_DAYS') {
    const days = habit.specific_days ?? [];
    return days.includes(dayOfWeek);
  }

  if (habit.frequency_type === 'INTERVAL') {
    const interval = habit.interval_days ?? 2;
    // Count days since habit was created
    const created = normalizeHabitDate(habit.created_at as string | Date);
    const diff = daysBetween(created, effectiveToday);
    return diff % interval === 0;
  }

  return false;
}

export function getNextDueDateLabel(habit: Habit, completedToday = false, cutoffTime?: string): string {
  if (habit.status !== 'ACTIVE') return '—';
  if (habit.paused_until && String(habit.paused_until) >= new Date().toISOString()) return '—';

  const today = todayStr(cutoffTime);

  if (habit.frequency_type === 'DAILY') {
    return completedToday ? addDaysToDate(today, 1) : 'TODAY';
  }

  if (habit.frequency_type === 'SPECIFIC_DAYS') {
    const days = habit.specific_days ?? [];
    if (days.length === 0) return '—';

    for (let offset = completedToday ? 1 : 0; offset < 14; offset++) {
      const candidate = addDaysToDate(today, offset);
      const dayOfWeek = new Date(candidate + 'T12:00:00').getDay();
      if (days.includes(dayOfWeek)) {
        return offset === 0 ? 'TODAY' : candidate;
      }
    }

    return '—';
  }

  if (habit.frequency_type === 'INTERVAL') {
    const interval = Math.max(1, habit.interval_days ?? 2);
    const created = normalizeHabitDate(habit.created_at as string | Date);
    const diff = daysBetween(created, today);
    const remainder = ((diff % interval) + interval) % interval;
    const daysUntilDue = remainder === 0 ? 0 : interval - remainder;
    if (daysUntilDue === 0) {
      return completedToday ? addDaysToDate(today, interval) : 'TODAY';
    }
    return addDaysToDate(today, daysUntilDue);
  }

  return '—';
}

/** XP calculation for a check-in, given the new streak total */
export function calcCheckInXP(habit: Habit, newStreak: number): {
  statXp: number;
  masterXp: number;
  bonuses: { label: string; amount: number }[];
} {
  const statXp   = Math.floor(DAILY_XP / 2);
  const masterXp = DAILY_XP - statXp;
  const bonuses: { label: string; amount: number }[] = [];

  // Weekly milestone (every 7)
  if (newStreak > 0 && newStreak % 7 === 0) {
    bonuses.push({ label: `7-DAY STREAK BONUS`, amount: WEEKLY_BONUS });
  }

  // Monthly milestone (every 30)
  if (newStreak > 0 && newStreak % 30 === 0) {
    bonuses.push({ label: `30-DAY STREAK BONUS`, amount: MONTHLY_BONUS });
  }

  // Streak commitment goal
  if (
    habit.streak_goal &&
    newStreak === habit.streak_goal
  ) {
    bonuses.push({ label: `STREAK GOAL UNLOCKED`, amount: habit.streak_reward });
  }

  return { statXp, masterXp, bonuses };
}

/** Returns number of days missed since the last completed log */
export function getMissedDays(logs: HabitLog[]): number {
  const completed = logs
    .filter(l => l.completed)
    .map(l => l.logged_for_date)
    .sort()
    .reverse();

  if (completed.length === 0) return 0;

  const lastDate   = completed[0];
  const today      = todayStr();
  const diff       = daysBetween(lastDate, today);

  // 0 = already logged today, 1 = yesterday (fine), >1 = missed days
  return Math.max(0, diff - 1);
}
