import { describe, expect, it } from 'vitest';
import type { PlannerEntry, PlannerOccurrenceException } from '@/types';
import { generateOccurrencesForRange } from '@/services/plannerService';

function makeEntry(overrides: Partial<PlannerEntry>): PlannerEntry {
  return {
    id: 'entry-1',
    title: 'Test',
    date: '2026-04-01',
    time: null,
    completed: false,
    recurrence_type: 'NONE',
    recurrence_interval: 1,
    recurrence_days_of_week: null,
    recurrence_end_type: null,
    recurrence_end_date: null,
    recurrence_count: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

function makeException(overrides: Partial<PlannerOccurrenceException>): PlannerOccurrenceException {
  return {
    id: 'exc-1',
    entry_id: 'entry-1',
    occurrence_date: '2026-04-03',
    title: null,
    date: null,
    time: null,
    completed: null,
    is_deleted: false,
    created_at: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

describe('generateOccurrencesForRange', () => {
  it('returns one-time events in range', () => {
    const occurrences = generateOccurrencesForRange(
      [makeEntry({ recurrence_type: 'NONE', date: '2026-04-10', time: '09:00' })],
      [],
      '2026-04-01',
      '2026-04-30',
    );

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].date).toBe('2026-04-10');
    expect(occurrences[0].time).toBe('09:00');
  });

  it('expands daily recurring events', () => {
    const occurrences = generateOccurrencesForRange(
      [makeEntry({ recurrence_type: 'DAILY', date: '2026-04-01', recurrence_interval: 1 })],
      [],
      '2026-04-01',
      '2026-04-05',
    );

    expect(occurrences.map((item) => item.date)).toEqual([
      '2026-04-01',
      '2026-04-02',
      '2026-04-03',
      '2026-04-04',
      '2026-04-05',
    ]);
  });

  it('expands weekly recurring events on selected weekdays', () => {
    const occurrences = generateOccurrencesForRange(
      [makeEntry({ recurrence_type: 'WEEKLY', date: '2026-04-01', recurrence_days_of_week: [1, 3, 5] })],
      [],
      '2026-04-01',
      '2026-04-12',
    );

    expect(occurrences.map((item) => item.date)).toEqual([
      '2026-04-01',
      '2026-04-03',
      '2026-04-06',
      '2026-04-08',
      '2026-04-10',
    ]);
  });

  it('expands monthly recurring events', () => {
    const occurrences = generateOccurrencesForRange(
      [makeEntry({ recurrence_type: 'MONTHLY', date: '2026-01-15' })],
      [],
      '2026-01-01',
      '2026-04-30',
    );

    expect(occurrences.map((item) => item.date)).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
    ]);
  });

  it('respects end-date bounded series', () => {
    const occurrences = generateOccurrencesForRange(
      [makeEntry({ recurrence_type: 'DAILY', date: '2026-04-01', recurrence_end_type: 'ON_DATE', recurrence_end_date: '2026-04-03' })],
      [],
      '2026-04-01',
      '2026-04-10',
    );

    expect(occurrences.map((item) => item.date)).toEqual(['2026-04-01', '2026-04-02', '2026-04-03']);
  });

  it('applies exceptions for moved and deleted recurring occurrences', () => {
    const occurrences = generateOccurrencesForRange(
      [makeEntry({ recurrence_type: 'DAILY', date: '2026-04-01' })],
      [
        makeException({ occurrence_date: '2026-04-02', date: '2026-04-04', title: 'Moved event' }),
        makeException({ id: 'exc-2', occurrence_date: '2026-04-03', is_deleted: true }),
      ],
      '2026-04-01',
      '2026-04-05',
    );

    expect(occurrences.map((item) => `${item.occurrence_date}->${item.date}:${item.title}`)).toEqual([
      '2026-04-01->2026-04-01:Test',
      '2026-04-02->2026-04-04:Moved event',
      '2026-04-04->2026-04-04:Test',
      '2026-04-05->2026-04-05:Test',
    ]);
  });
});
