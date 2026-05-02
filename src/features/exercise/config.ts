import type { StatKey } from '@/types';

export type ExerciseCategoryId =
  | 'strength'
  | 'endurance'
  | 'calisthenics'
  | 'mobility'
  | 'high_intensity'
  | 'maintenance';

export type ExerciseMetricType =
  | 'weight_reps'
  | 'distance'
  | 'reps'
  | 'cycles'
  | 'rounds_points_time'
  | 'depth_1_5';

export interface ExerciseCategoryConfig {
  id: ExerciseCategoryId;
  label: string;
  defaultStatSplit: [number, number];
  defaultStats: [StatKey, StatKey];
  defaultMetricType: ExerciseMetricType;
  examples: string[];
}

export const EXERCISE_CATEGORIES: ExerciseCategoryConfig[] = [
  {
    id: 'strength',
    label: 'Strength',
    defaultStatSplit: [70, 30],
    defaultStats: ['body', 'grit'],
    defaultMetricType: 'weight_reps',
    examples: ['Bench Press', 'Deadlift', 'Weighted Pull-ups'],
  },
  {
    id: 'endurance',
    label: 'Endurance',
    defaultStatSplit: [50, 50],
    defaultStats: ['body', 'grit'],
    defaultMetricType: 'distance',
    examples: ['Running', 'Cycling', 'Rowing'],
  },
  {
    id: 'calisthenics',
    label: 'Calisthenics',
    defaultStatSplit: [40, 60],
    defaultStats: ['body', 'grit'],
    defaultMetricType: 'reps',
    examples: ['Pushups', 'Squats', 'Crunches'],
  },
  {
    id: 'mobility',
    label: 'Mobility',
    defaultStatSplit: [50, 50],
    defaultStats: ['body', 'ghost'],
    defaultMetricType: 'cycles',
    examples: ['Sun Salutation', 'Stretching', 'Deep Squat'],
  },
  {
    id: 'high_intensity',
    label: 'High-Intensity',
    defaultStatSplit: [50, 50],
    defaultStats: ['body', 'flow'],
    defaultMetricType: 'rounds_points_time',
    examples: ['Snowboarding', 'MMA', 'Dancing'],
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    defaultStatSplit: [50, 50],
    defaultStats: ['body', 'ghost'],
    defaultMetricType: 'depth_1_5',
    examples: ['Stretching', 'Meditation', 'Massage'],
  },
];

export const EXERCISE_CATEGORY_MAP: Record<ExerciseCategoryId, ExerciseCategoryConfig> =
  EXERCISE_CATEGORIES.reduce((acc, category) => {
    acc[category.id] = category;
    return acc;
  }, {} as Record<ExerciseCategoryId, ExerciseCategoryConfig>);

export const EXERCISE_XP_SHARES = {
  EXERCISE_SHARE: 0.5,
  STAT_SHARE: 0.25,
  MASTER_SHARE: 0.25,
} as const;
