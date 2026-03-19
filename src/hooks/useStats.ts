// src/hooks/useStats.ts
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { getLevelFromXP } from '@/services/xpService';
import { STAT_META, STAT_LEVEL_TITLES, StatKey } from '@/types';

export interface StatDisplay {
  key: StatKey;
  name: string;
  icon: string;
  level: number;
  levelTitle: string;
  xp: number;
  xpInLevel: number;
  xpForLevel: number;
  streak: number;
  dormant: boolean;
}

export function useStats(_userId?: string) {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const db = await getDB();
      const result = await db.query<{
        stat_key: string; xp: number; level: number; streak: number; dormant: boolean;
      }>(`SELECT stat_key, xp, level, streak, dormant FROM stats ORDER BY stat_key;`);

      return result.rows.map((row): StatDisplay => {
        const key   = row.stat_key as StatKey;
        const meta  = STAT_META[key];
        const { level, xpInLevel, xpForLevel } = getLevelFromXP(row.xp ?? 0);
        const titles = STAT_LEVEL_TITLES[key] ?? [];
        return {
          key,
          name:       meta?.name ?? key.toUpperCase(),
          icon:       meta?.icon ?? '?',
          level,
          levelTitle: titles[level - 1] ?? `LVL ${level}`,
          xp:         row.xp ?? 0,
          xpInLevel,
          xpForLevel,
          streak:     row.streak ?? 0,
          dormant:    row.dormant ?? false,
        };
      });
    },
  });
}