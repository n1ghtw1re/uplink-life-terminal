import { describe, expect, it } from 'vitest';
import type { Habit, PlannerEntry, PlannerOccurrence } from '@/types';
import {
  buildTopBarAlerts,
  joinTopBarAlerts,
  TOP_BAR_HABIT_STABLE_MESSAGE,
  TOP_BAR_STABLE_MESSAGE,
} from '@/services/topBarAlerts';

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    name: 'Meditate',
    stat_key: 'ghost',
    frequency_type: 'DAILY',
    interval_days: null,
    specific_days: null,
    target_type: 'BINARY',
    target_value: null,
    target_period_days: null,
    reminder_time: null,
    streak_goal: null,
    streak_reward: 100,
    shields: 0,
    current_streak: 0,
    longest_streak: 0,
    status: 'ACTIVE',
    paused_until: null,
    created_at: '2026-04-04T00:00:00Z',
    ...overrides,
  };
}

function makeOccurrence(overrides: Partial<PlannerOccurrence> = {}): PlannerOccurrence {
  const sourceEntry: PlannerEntry = {
    id: 'entry-1',
    title: 'Standup',
    date: '2026-04-04',
    time: '09:00',
    completed: false,
    recurrence_type: 'NONE',
    recurrence_interval: 1,
    recurrence_days_of_week: null,
    recurrence_end_type: null,
    recurrence_end_date: null,
    recurrence_count: null,
    created_at: '2026-04-04T00:00:00Z',
    updated_at: '2026-04-04T00:00:00Z',
  };

  return {
    entry_id: 'entry-1',
    occurrence_date: '2026-04-04',
    title: 'Standup',
    date: '2026-04-04',
    time: '09:00',
    completed: false,
    isRecurring: false,
    sourceEntry,
    exception: null,
    ...overrides,
  };
}

describe('buildTopBarAlerts', () => {
  it('returns stable message when nothing is pending', () => {
    expect(buildTopBarAlerts([], [], {})).toEqual([TOP_BAR_STABLE_MESSAGE]);
  });

  it('orders timed planner alerts before habits and all-day planner alerts', () => {
    const alerts = buildTopBarAlerts(
      [
        makeOccurrence({ title: 'Review', time: '13:00' }),
        makeOccurrence({ title: 'Standup', time: '09:00' }),
        makeOccurrence({ title: 'All day note', time: null }),
      ],
      [makeHabit({ name: 'Workout' })],
      {},
    );

    expect(alerts).toEqual([
      '// EVENT "Standup" 09:00',
      '// EVENT "Review" 13:00',
      '// DUE "Workout"',
      '// EVENT "All day note" ALL DAY',
    ]);
  });

  it('filters completed planner items out of the ticker', () => {
    const alerts = buildTopBarAlerts(
      [makeOccurrence({ title: 'Finished sync', completed: true })],
      [],
      {},
    );

    expect(alerts).toEqual([TOP_BAR_STABLE_MESSAGE]);
  });

  it('shows one alert per unfinished due habit', () => {
    const alerts = buildTopBarAlerts(
      [],
      [makeHabit({ id: 'habit-2', name: 'Workout' }), makeHabit({ id: 'habit-1', name: 'Meditate' })],
      {},
    );

    expect(alerts).toEqual([
      '// DUE "Meditate"',
      '// DUE "Workout"',
    ]);
  });

  it('shows habit stable when all due habits are completed and planner still has alerts', () => {
    const alerts = buildTopBarAlerts(
      [makeOccurrence({ title: 'Standup', time: '09:00' })],
      [makeHabit({ id: 'habit-1', name: 'Meditate' })],
      { 'habit-1': { completed: true, value: 1 } },
    );

    expect(alerts).toEqual([
      '// EVENT "Standup" 09:00',
      TOP_BAR_HABIT_STABLE_MESSAGE,
    ]);
  });

  it('joins alerts with ticker separators', () => {
    expect(joinTopBarAlerts(['A', 'B', 'C'])).toBe('A  //  B  //  C');
  });
});
