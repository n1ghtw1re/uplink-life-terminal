import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import type { StatKey } from '@/types';
import type { WorkoutCategoryId } from '@/features/workouts/config';

export interface WorkoutOption {
  id: string;
  name: string;
  categoryId: WorkoutCategoryId;
  description: string | null;
  primaryStat: StatKey;
  secondaryStat: StatKey;
  primaryPct: number;
  secondaryPct: number;
  completedCount: number;
  active: boolean;
  createdAt: string;
  exerciseCount: number;
}

export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: async () => {
      const db = await getDB();
      const result = await db.query<any>(`
        SELECT w.*,
          (SELECT COUNT(*) FROM workout_exercises we WHERE we.workout_id = w.id) AS exercise_count
        FROM workouts w
        ORDER BY w.name;
      `);
      return result.rows.map((row: any): WorkoutOption => ({
        id: row.id,
        name: row.name,
        categoryId: row.category_id,
        description: row.description,
        primaryStat: row.primary_stat,
        secondaryStat: row.secondary_stat,
        primaryPct: row.primary_pct,
        secondaryPct: row.secondary_pct,
        completedCount: row.completed_count ?? 0,
        active: row.active ?? true,
        createdAt: row.created_at,
        exerciseCount: Number(row.exercise_count ?? 0),
      }));
    },
  });
}
