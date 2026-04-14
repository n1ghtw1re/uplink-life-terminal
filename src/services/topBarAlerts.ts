import type { Habit, PlannerOccurrence } from '@/types';
import { comparePlannerOccurrences } from '@/services/plannerService';

export const TOP_BAR_STABLE_MESSAGE = '// SYSTEM STABLE - NO PENDING ALERTS';
export const TOP_BAR_HABIT_STABLE_MESSAGE = '// HABIT SYSTEM STABLE';

export interface HabitTodayMap {
  [habitId: string]: {
    completed: boolean;
    value: number;
  };
}

function quote(value: string): string {
  return `"${value}"`;
}

function formatPlannerAlert(occurrence: PlannerOccurrence): string {
  return `// EVENT ${quote(occurrence.title)} ${occurrence.time ?? 'ALL DAY'}`;
}

function formatHabitAlert(habit: Habit): string {
  return `// DUE ${quote(habit.name)}`;
}

export function buildTopBarAlerts(
  plannerOccurrences: PlannerOccurrence[],
  todaysHabits: Habit[],
  todayMap: HabitTodayMap,
): string[] {
  const actionablePlanner = [...plannerOccurrences]
    .filter((occurrence) => !occurrence.completed)
    .sort(comparePlannerOccurrences);

  const timedPlannerAlerts = actionablePlanner
    .filter((occurrence) => !!occurrence.time)
    .map(formatPlannerAlert);

  const allDayPlannerAlerts = actionablePlanner
    .filter((occurrence) => !occurrence.time)
    .map(formatPlannerAlert);

  const dueHabitAlerts = [...todaysHabits]
    .filter((habit) => !(todayMap[habit.id]?.completed ?? false))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(formatHabitAlert);

  if (timedPlannerAlerts.length === 0 && dueHabitAlerts.length === 0 && allDayPlannerAlerts.length === 0) {
    return [TOP_BAR_STABLE_MESSAGE];
  }

  const hasHabitContext = todaysHabits.length > 0;

  return [
    ...timedPlannerAlerts,
    ...dueHabitAlerts,
    ...(dueHabitAlerts.length === 0 && hasHabitContext ? [TOP_BAR_HABIT_STABLE_MESSAGE] : []),
    ...allDayPlannerAlerts,
  ];
}

export function joinTopBarAlerts(alerts: string[]): string {
  return alerts.join('  //  ');
}
