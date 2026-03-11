import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatKey, STAT_META, STAT_LEVEL_TITLES, getStatLevel, getStreakTier } from '@/types';

export interface StatDisplay {
  key: StatKey;
  name: string;
  icon: string;
  level: number;
  levelTitle: string;
  xp: number;
  xpToNext: number;
  streak: number;
  multiplier: number;
  dormant: boolean;
}

const MULTIPLIER_MAP: Record<string, number> = {
  STANDARD: 1.0, HOT_STREAK: 1.5, ON_FIRE: 2.0, LEGENDARY: 3.0,
};

export function useStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['stats', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stats')
        .select('*')
        .eq('user_id', userId!);
      if (error) throw error;

      return (data ?? []).map((row): StatDisplay => {
        const key = row.stat_key as StatKey;
        const meta = STAT_META[key];
        const { xpInLevel, xpForLevel } = getStatLevel(row.xp ?? 0);
        const titles = STAT_LEVEL_TITLES[key];
        const streakTier = getStreakTier(row.streak ?? 0);
        const level = row.level ?? 1;

        return {
          key,
          name: meta?.name ?? key,
          icon: meta?.icon ?? '?',
          level,
          levelTitle: titles?.[level - 1] ?? `LVL ${level}`,
          xp: xpInLevel,
          xpToNext: xpForLevel,
          streak: row.streak ?? 0,
          multiplier: MULTIPLIER_MAP[streakTier] ?? 1.0,
          dormant: row.dormant ?? false,
        };
      });
    },
    enabled: !!userId,
  });
}