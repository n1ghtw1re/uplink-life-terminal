import type { ExerciseCategoryId } from '@/features/exercise/config';

export type WorkoutCategoryId = ExerciseCategoryId;

export const WORKOUT_XP_RULES = {
  EXERCISE_SHARE: 0.5,
  STAT_SHARE: 0.25,
  MASTER_SHARE: 0.25,
  WORKOUT_GETS_XP: false,
  SPLIT_EXERCISE_SHARE_BY_ENTRIES: true,
} as const;
