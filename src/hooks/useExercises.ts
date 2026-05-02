import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { getLevelFromXP } from '@/services/xpService';
import type { StatKey } from '@/types';
import type { ExerciseCategoryId } from '@/features/exercise/config';

export interface ExerciseOption {
  id: string;
  name: string;
  categoryId: ExerciseCategoryId;
  quantityType: string;
  description: string | null;
  primaryStat: StatKey;
  secondaryStat: StatKey;
  primaryPct: number;
  secondaryPct: number;
  metricType: string;
  xp: number;
  level: number;
  xpInLevel: number;
  xpForLevel: number;
  active: boolean;
  createdAt: string;
}

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const db = await getDB();
      const result = await db.query<{
        id: string;
        name: string;
        category_id: ExerciseCategoryId;
        quantity_type: string;
        description: string | null;
        primary_stat: StatKey;
        secondary_stat: StatKey;
        primary_pct: number;
        secondary_pct: number;
        metric_type: string;
        xp: number;
        active: boolean;
        created_at: string;
      }>(`SELECT * FROM exercises ORDER BY name;`);

      return result.rows.map((row): ExerciseOption => {
        const { level, xpInLevel, xpForLevel } = getLevelFromXP(row.xp ?? 0);
        return {
          id: row.id,
          name: row.name,
          categoryId: row.category_id,
          quantityType: row.quantity_type,
          description: row.description,
          primaryStat: row.primary_stat,
          secondaryStat: row.secondary_stat,
          primaryPct: row.primary_pct,
          secondaryPct: row.secondary_pct,
          metricType: row.metric_type,
          xp: row.xp ?? 0,
          level,
          xpInLevel,
          xpForLevel,
          active: row.active ?? true,
          createdAt: row.created_at,
        };
      });
    },
  });
}
