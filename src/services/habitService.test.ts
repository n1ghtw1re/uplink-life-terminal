import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Habit } from '@/types';
import { getNextDueDateLabel } from '@/services/habitService';

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
    created_at: '2026-04-04T00:00:00.000Z',
    ...overrides,
  };
}

describe('getNextDueDateLabel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns TODAY for daily habits', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-04T09:00:00.000Z'));

    expect(getNextDueDateLabel(makeHabit())).toBe('TODAY');
  });

  it('returns tomorrow for daily habits completed today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-04T09:00:00.000Z'));

    expect(getNextDueDateLabel(makeHabit(), true)).toBe('2026-04-05');
  });

  it('returns TODAY for interval habits due on the anchor day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-04T09:00:00.000Z'));

    expect(getNextDueDateLabel(makeHabit({
      frequency_type: 'INTERVAL',
      interval_days: 5,
      created_at: '2026-04-04T08:00:00.000Z',
    }))).toBe('TODAY');
  });

  it('returns the next interval date when an interval habit is completed today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-04T09:00:00.000Z'));

    expect(getNextDueDateLabel(makeHabit({
      frequency_type: 'INTERVAL',
      interval_days: 5,
      created_at: '2026-04-04T08:00:00.000Z',
    }), true)).toBe('2026-04-09');
  });

  it('returns the next interval due date when not due today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-04T09:00:00.000Z'));

    expect(getNextDueDateLabel(makeHabit({
      frequency_type: 'INTERVAL',
      interval_days: 5,
      created_at: '2026-04-02T08:00:00.000Z',
    }))).toBe('2026-04-07');
  });

  it('returns the next matching set-day date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-04T09:00:00.000Z'));

    expect(getNextDueDateLabel(makeHabit({
      frequency_type: 'SPECIFIC_DAYS',
      specific_days: [1, 3],
    }))).toBe('2026-04-06');
  });

  it('returns TODAY when a set-day habit is due now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-06T09:00:00.000Z'));

    expect(getNextDueDateLabel(makeHabit({
      frequency_type: 'SPECIFIC_DAYS',
      specific_days: [1, 3],
    }))).toBe('TODAY');
  });

  it('returns the next set-day date when today has already been completed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-06T09:00:00.000Z'));

    expect(getNextDueDateLabel(makeHabit({
      frequency_type: 'SPECIFIC_DAYS',
      specific_days: [1, 3],
    }), true)).toBe('2026-04-08');
  });

  it('returns em dash for paused or inactive habits', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-04T09:00:00.000Z'));

    expect(getNextDueDateLabel(makeHabit({ status: 'RETIRED' }))).toBe('—');
    expect(getNextDueDateLabel(makeHabit({ paused_until: '2099-01-01T00:00:00.000Z' }))).toBe('—');
  });
});
