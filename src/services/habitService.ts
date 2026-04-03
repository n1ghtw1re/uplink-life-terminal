// ============================================================
// src/services/habitService.ts
// Pure logic — no React, no DB
// ============================================================
import { Habit, HabitLog } from '@/types';

export const DAILY_XP      = 10;   // 5 stat + 5 master
export const WEEKLY_BONUS  = 50;   // every 7-day milestone
export const MONTHLY_BONUS = 500;  // every 30-day milestone
export const MAX_SHIELDS   = 3;

/** Returns today's date as YYYY-MM-DD local string */
export function todayStr(): string {
  const d = new Date();
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

/** Is this habit due today given its schedule? */
export function isDueToday(habit: Habit): boolean {
  if (habit.status !== 'ACTIVE') return false;
  if (habit.paused_until && habit.paused_until >= new Date().toISOString()) return false;

  const dayOfWeek = new Date().getDay(); // 0 = Sun

  if (habit.frequency_type === 'DAILY') return true;

  if (habit.frequency_type === 'SPECIFIC_DAYS') {
    const days = habit.specific_days ?? [];
    return days.includes(dayOfWeek);
  }

  if (habit.frequency_type === 'INTERVAL') {
    const interval = habit.interval_days ?? 2;
    // Count days since habit was created
    const created = habit.created_at.slice(0, 10);
    const diff = daysBetween(created, todayStr());
    return diff % interval === 0;
  }

  return false;
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
