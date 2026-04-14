import { describe, expect, it } from 'vitest';
import type { SleepSession } from '@/types';
import { calculateRecoveryStreak, getAnchorDate, groupSleepSessionsByAnchorDate, sanitizeSleepSessionInput } from '@/services/recoveryService';

function makeSession(overrides: Partial<SleepSession>): SleepSession {
  return {
    id: 'session-1',
    start_time: '2026-04-07T16:30:00.000Z',
    end_time: '2026-04-08T00:00:00.000Z',
    duration_minutes: 450,
    quality: 4,
    notes: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('recoveryService', () => {
  it('anchors sleep to the wake-up date', () => {
    expect(getAnchorDate('2026-04-08T07:00:00.000Z')).toBe('2026-04-08');
  });

  it('calculates duration from start and end', () => {
    const input = sanitizeSleepSessionInput({
      start_time: '2026-04-07T23:30',
      end_time: '2026-04-08T07:00',
      quality: 4,
      notes: '',
    });

    expect(input.duration_minutes).toBe(450);
  });

  it('groups sessions by anchor date and totals durations', () => {
    const days = groupSleepSessionsByAnchorDate([
      makeSession({ id: '1', end_time: '2026-04-08T00:00:00.000Z', duration_minutes: 420 }),
      makeSession({ id: '2', end_time: '2026-04-08T10:00:00.000Z', duration_minutes: 60, start_time: '2026-04-08T09:00:00.000Z' }),
    ]);

    expect(days).toHaveLength(1);
    expect(days[0].anchor_date).toBe('2026-04-08');
    expect(days[0].total_minutes).toBe(480);
    expect(days[0].session_count).toBe(2);
  });

  it('calculates a consecutive goal streak from the latest day', () => {
    const streak = calculateRecoveryStreak([
      { anchor_date: '2026-04-08', total_minutes: 480, session_count: 1, avg_quality: 4, sessions: [] },
      { anchor_date: '2026-04-07', total_minutes: 500, session_count: 1, avg_quality: 4, sessions: [] },
      { anchor_date: '2026-04-06', total_minutes: 300, session_count: 1, avg_quality: 3, sessions: [] },
    ], 480);

    expect(streak).toBe(2);
  });
});
