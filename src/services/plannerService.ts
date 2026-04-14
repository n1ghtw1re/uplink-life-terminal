import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarWeeks,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfWeek,
} from 'date-fns';
import type {
  PlannerEntry,
  PlannerOccurrence,
  PlannerOccurrenceException,
  PlannerRecurrenceRule,
} from '@/types';

export interface PlannerEntryInput {
  title: string;
  date: string;
  time: string | null;
  completed: boolean;
  recurrence_type: PlannerEntry['recurrence_type'];
  recurrence_interval: number;
  recurrence_days_of_week: number[] | null;
  recurrence_end_type: PlannerEntry['recurrence_end_type'];
  recurrence_end_date: string | null;
  recurrence_count: number | null;
}

export interface PlannerOccurrencePatch {
  title?: string | null;
  date?: string | null;
  time?: string | null;
  completed?: boolean | null;
}

const DATE_FMT = 'yyyy-MM-dd';

export function toDateString(date: Date): string {
  return format(date, DATE_FMT);
}

export function normalizePlannerDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return toDateString(value);
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return toDateString(parsed);
  }
  return String(value);
}

export function parsePlannerDate(value: string | Date): Date {
  const normalized = normalizePlannerDate(value);
  return parseISO(`${normalized}T00:00:00`);
}

export function buildRecurrenceRule(entry: PlannerEntry): PlannerRecurrenceRule {
  return {
    type: entry.recurrence_type,
    interval: entry.recurrence_interval,
    days_of_week: entry.recurrence_days_of_week,
    end_type: entry.recurrence_end_type,
    end_date: entry.recurrence_end_date,
    count: entry.recurrence_count,
  };
}

export function isRecurringEntry(entry: PlannerEntry): boolean {
  return entry.recurrence_type !== 'NONE';
}

export function comparePlannerOccurrences(a: PlannerOccurrence, b: PlannerOccurrence): number {
  const aDate = normalizePlannerDate(a.date);
  const bDate = normalizePlannerDate(b.date);
  if (aDate !== bDate) return aDate.localeCompare(bDate);
  const aTime = a.time ? String(a.time) : null;
  const bTime = b.time ? String(b.time) : null;
  if (aTime && bTime) return aTime.localeCompare(bTime);
  if (aTime) return -1;
  if (bTime) return 1;
  return String(a.title).localeCompare(String(b.title));
}

function shouldStopByRule(rule: PlannerRecurrenceRule, candidateDate: Date, occurrenceNumber: number): boolean {
  if (rule.end_type === 'ON_DATE' && rule.end_date) {
    return isAfter(candidateDate, parsePlannerDate(rule.end_date));
  }
  if (rule.end_type === 'AFTER_COUNT' && rule.count) {
    return occurrenceNumber > rule.count;
  }
  return false;
}

function makeOccurrence(
  entry: PlannerEntry,
  occurrenceDate: string,
  exception: PlannerOccurrenceException | null,
): PlannerOccurrence | null {
  if (exception?.is_deleted) return null;
  const date = normalizePlannerDate(exception?.date ?? occurrenceDate);
  return {
    entry_id: entry.id,
    occurrence_date: normalizePlannerDate(occurrenceDate),
    title: String(exception?.title ?? entry.title),
    date,
    time: exception?.time ? String(exception.time) : (entry.time ? String(entry.time) : null),
    completed: exception?.completed ?? entry.completed,
    isRecurring: isRecurringEntry(entry),
    sourceEntry: entry,
    exception,
  };
}

function buildExceptionMap(exceptions: PlannerOccurrenceException[]) {
  const map = new Map<string, PlannerOccurrenceException>();
  for (const exception of exceptions) {
    map.set(`${exception.entry_id}:${exception.occurrence_date}`, exception);
  }
  return map;
}

function maybePushOccurrence(
  output: PlannerOccurrence[],
  entry: PlannerEntry,
  occurrenceDate: string,
  start: Date,
  end: Date,
  exceptionMap: Map<string, PlannerOccurrenceException>,
) {
  const exception = exceptionMap.get(`${entry.id}:${occurrenceDate}`) ?? null;
  const occurrence = makeOccurrence(entry, occurrenceDate, exception);
  if (!occurrence) return;
  const actualDate = parsePlannerDate(occurrence.date);
  if (isBefore(actualDate, start) || isAfter(actualDate, end)) return;
  output.push(occurrence);
}

function generateDailyOccurrences(
  entry: PlannerEntry,
  start: Date,
  end: Date,
  exceptionMap: Map<string, PlannerOccurrenceException>,
  output: PlannerOccurrence[],
) {
  const baseDate = parsePlannerDate(entry.date);
  const interval = Math.max(1, entry.recurrence_interval || 1);
  let current = baseDate;
  let occurrenceNumber = 1;

  while (!isAfter(current, end)) {
    if (!shouldStopByRule(buildRecurrenceRule(entry), current, occurrenceNumber)) {
      maybePushOccurrence(output, entry, toDateString(current), start, end, exceptionMap);
    } else {
      break;
    }
    current = addDays(current, interval);
    occurrenceNumber += 1;
  }
}

function generateWeeklyOccurrences(
  entry: PlannerEntry,
  start: Date,
  end: Date,
  exceptionMap: Map<string, PlannerOccurrenceException>,
  output: PlannerOccurrence[],
) {
  const baseDate = parsePlannerDate(entry.date);
  const days = entry.recurrence_days_of_week?.length
    ? [...entry.recurrence_days_of_week].sort((a, b) => a - b)
    : [baseDate.getDay()];
  const rule = buildRecurrenceRule(entry);
  const interval = Math.max(1, entry.recurrence_interval || 1);
  let cursor = baseDate;
  let occurrenceNumber = 0;

  while (!isAfter(cursor, end)) {
    const weekDelta = differenceInCalendarWeeks(
      startOfWeek(cursor, { weekStartsOn: 0 }),
      startOfWeek(baseDate, { weekStartsOn: 0 }),
      { weekStartsOn: 0 },
    );
    if (weekDelta >= 0 && weekDelta % interval === 0 && days.includes(cursor.getDay())) {
      occurrenceNumber += 1;
      if (shouldStopByRule(rule, cursor, occurrenceNumber)) break;
      maybePushOccurrence(output, entry, toDateString(cursor), start, end, exceptionMap);
    }
    cursor = addDays(cursor, 1);
  }
}

function generateMonthlyOccurrences(
  entry: PlannerEntry,
  start: Date,
  end: Date,
  exceptionMap: Map<string, PlannerOccurrenceException>,
  output: PlannerOccurrence[],
) {
  const baseDate = parsePlannerDate(entry.date);
  const interval = Math.max(1, entry.recurrence_interval || 1);
  const dayOfMonth = baseDate.getDate();
  const rule = buildRecurrenceRule(entry);
  let cursor = baseDate;
  let occurrenceNumber = 1;

  while (!isAfter(cursor, end)) {
    if (cursor.getDate() === dayOfMonth) {
      if (shouldStopByRule(rule, cursor, occurrenceNumber)) break;
      maybePushOccurrence(output, entry, toDateString(cursor), start, end, exceptionMap);
      occurrenceNumber += 1;
    }
    const next = addMonths(cursor, interval);
    cursor = next.getDate() === dayOfMonth ? next : addDays(next, dayOfMonth - next.getDate());
  }
}

export function generateOccurrencesForRange(
  entries: PlannerEntry[],
  exceptions: PlannerOccurrenceException[],
  startDate: string,
  endDate: string,
): PlannerOccurrence[] {
  const start = parsePlannerDate(startDate);
  const end = parsePlannerDate(endDate);
  const exceptionMap = buildExceptionMap(exceptions);
  const output: PlannerOccurrence[] = [];

  for (const entry of entries) {
    if (entry.recurrence_type === 'NONE') {
      maybePushOccurrence(output, entry, entry.date, start, end, exceptionMap);
      continue;
    }

    if (entry.recurrence_type === 'DAILY') {
      generateDailyOccurrences(entry, start, end, exceptionMap, output);
      continue;
    }

    if (entry.recurrence_type === 'WEEKLY') {
      generateWeeklyOccurrences(entry, start, end, exceptionMap, output);
      continue;
    }

    if (entry.recurrence_type === 'MONTHLY') {
      generateMonthlyOccurrences(entry, start, end, exceptionMap, output);
    }
  }

  return output.sort(comparePlannerOccurrences);
}

export function getMonthBounds(month: Date): { start: string; end: string } {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return {
    start: toDateString(monthStart),
    end: toDateString(monthEnd),
  };
}

export function isOccurrenceUpcoming(occurrence: PlannerOccurrence, now: Date = new Date()): boolean {
  const [hours, minutes] = (occurrence.time ?? '23:59').split(':').map(Number);
  const occurrenceDate = parsePlannerDate(occurrence.date);
  occurrenceDate.setHours(Number.isFinite(hours) ? hours : 23, Number.isFinite(minutes) ? minutes : 59, 0, 0);
  return occurrenceDate >= now && !occurrence.completed;
}

export function getNextUpcomingOccurrence(occurrences: PlannerOccurrence[], now: Date = new Date()) {
  return occurrences.find((occurrence) => isOccurrenceUpcoming(occurrence, now)) ?? null;
}

export function getWeekdayOptions(date: string): number[] {
  return [parsePlannerDate(normalizePlannerDate(date)).getDay()];
}

export function sanitizePlannerEntryInput(input: PlannerEntryInput): PlannerEntryInput {
  const recurrenceType = input.recurrence_type;
  return {
    ...input,
    title: input.title.trim(),
    time: input.time || null,
    recurrence_interval: Math.max(1, input.recurrence_interval || 1),
    recurrence_days_of_week: recurrenceType === 'WEEKLY'
      ? (input.recurrence_days_of_week?.length ? [...input.recurrence_days_of_week].sort((a, b) => a - b) : getWeekdayOptions(input.date))
      : null,
    recurrence_end_type: recurrenceType === 'NONE' ? null : input.recurrence_end_type,
    recurrence_end_date: recurrenceType === 'NONE' ? null : input.recurrence_end_date,
    recurrence_count: recurrenceType === 'NONE' ? null : input.recurrence_count,
  };
}

export function buildFutureSeriesInput(
  occurrence: PlannerOccurrence,
  patch: PlannerOccurrencePatch,
): PlannerEntryInput {
  return sanitizePlannerEntryInput({
    title: patch.title ?? occurrence.title,
    date: patch.date ?? occurrence.date,
    time: patch.time === undefined ? occurrence.time : patch.time,
    completed: patch.completed ?? occurrence.completed,
    recurrence_type: occurrence.sourceEntry.recurrence_type,
    recurrence_interval: occurrence.sourceEntry.recurrence_interval,
    recurrence_days_of_week: occurrence.sourceEntry.recurrence_days_of_week,
    recurrence_end_type: occurrence.sourceEntry.recurrence_end_type,
    recurrence_end_date: occurrence.sourceEntry.recurrence_end_date,
    recurrence_count: occurrence.sourceEntry.recurrence_count,
  });
}

export function getOccurrenceSeriesIndex(entry: PlannerEntry, occurrenceDate: string): number {
  const base = parsePlannerDate(entry.date);
  const occurrence = parsePlannerDate(occurrenceDate);
  if (entry.recurrence_type === 'DAILY') {
    return Math.floor(differenceInCalendarDays(occurrence, base) / Math.max(1, entry.recurrence_interval));
  }
  return 0;
}

export function isOccurrenceOnDate(occurrence: PlannerOccurrence, date: string): boolean {
  return occurrence.date === date || (occurrence.occurrence_date === date && isSameDay(parsePlannerDate(occurrence.date), parsePlannerDate(date)));
}
