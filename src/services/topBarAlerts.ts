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
  todayHabits: Habit[],
  todayMap: HabitTodayMap,
): string[] {
  const now = new Date();
  const msIn24Hours = 24 * 60 * 60 * 1000; // 86400000
  const in24Hours = new Date(now.getTime() + msIn24Hours);

  const actionablePlanner = [...plannerOccurrences]
    .filter((occurrence) => {
      if (occurrence.completed) return false;
      // If no time specified (all-day event), always show
      if (!occurrence.time) return true;
      try {
        // Parse event time (format: "HH:MM")
        const [hours, minutes] = occurrence.time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return true; // Invalid time, show anyway
        const eventDate = new Date(now);
        eventDate.setHours(hours, minutes, 0, 0);
        // Show if event is within the next 24 hours
        return eventDate >= now && eventDate <= in24Hours;
      } catch {
        return true; // On error, show the event
      }
    })
    .sort(comparePlannerOccurrences);

  const timedPlannerAlerts = actionablePlanner
    .filter((occurrence) => !!occurrence.time)
    .map(formatPlannerAlert);

  const allDayPlannerAlerts = actionablePlanner
    .filter((occurrence) => !occurrence.time)
    .map(formatPlannerAlert);

  const dueHabitAlerts = [...todayHabits]
    .filter((habit) => !(todayMap[habit.id]?.completed ?? false))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(formatHabitAlert);

  if (timedPlannerAlerts.length === 0 && dueHabitAlerts.length === 0 && allDayPlannerAlerts.length === 0) {
    return [TOP_BAR_STABLE_MESSAGE];
  }

  const hasHabitContext = todayHabits.length > 0;

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
