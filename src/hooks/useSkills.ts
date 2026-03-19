// src/hooks/useSkills.ts
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { getLevelFromXP } from '@/services/xpService';
import { StatKey } from '@/types';

export interface SkillOption {
  id: string;
  name: string;
  icon: string;
  statKeys: StatKey[];
  defaultSplit: number[];
  level: number;
  xp: number;
  xpInLevel: number;
  xpForLevel: number;
  notes: string | null;
}

export function useSkills(_userId?: string) {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const db = await getDB();
      const result = await db.query<{
        id: string; name: string; icon: string;
        stat_keys: StatKey[]; default_split: number[];
        xp: number; notes: string | null; active: boolean;
      }>(`SELECT id, name, icon, stat_keys, default_split, xp, notes, active
          FROM skills ORDER BY name;`);

      return result.rows.map((row): SkillOption & { active: boolean } => {
        const { level, xpInLevel, xpForLevel } = getLevelFromXP(row.xp ?? 0);
        return {
          id:           row.id,
          name:         row.name,
          icon:         row.icon,
          statKeys:     Array.isArray(row.stat_keys) ? row.stat_keys : JSON.parse(row.stat_keys as any ?? '[]'),
          defaultSplit: Array.isArray(row.default_split) ? row.default_split : JSON.parse(row.default_split as any ?? '[100]'),
          level,
          xp:           row.xp ?? 0,
          xpInLevel,
          xpForLevel,
          notes:        row.notes,
          active:       row.active ?? true,
        };
      });
    },
  });
}