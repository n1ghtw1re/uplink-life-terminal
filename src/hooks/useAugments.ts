// src/hooks/useAugments.ts
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { getLevelFromXP } from '@/services/xpService';

export interface AugmentOption {
  id: string;
  name: string;
  category: string;
  xp: number;
  level: number;
  xpInLevel: number;
  xpForLevel: number;
  active: boolean;
  url: string | null;
  description: string | null;
  notes: string | null;
}

export function useAugments(_userId?: string) {
  return useQuery({
    queryKey: ['augments'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<{
        id: string; name: string; category: string; xp: number;
        active: boolean; url: string | null; description: string | null; notes: string | null;
      }>(`SELECT id, name, category, xp, active, url, description, notes FROM augments ORDER BY name;`);
      return res.rows.map((row): AugmentOption => {
        const { level, xpInLevel, xpForLevel } = getLevelFromXP(row.xp ?? 0);
        return { ...row, level, xpInLevel, xpForLevel, xp: row.xp ?? 0, active: row.active ?? true };
      });
    },
  });
}