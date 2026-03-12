// ============================================================
// src/hooks/useSkills.ts
// ============================================================
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatKey } from '@/types';

export interface SkillOption {
  id: string;
  name: string;
  icon: string;
  statKeys: StatKey[];
  defaultSplit: number[];
  level: number;
  xp: number;
}

export function useSkills(userId: string | undefined) {
  return useQuery({
    queryKey: ['skills', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('id, name, icon, stat_keys, default_split, level, xp')
        .eq('user_id', userId!)
        .order('name');
      if (error) throw error;
      return (data ?? []).map((row): SkillOption => ({
        id: row.id,
        name: row.name,
        icon: row.icon,
        statKeys: row.stat_keys as StatKey[],
        defaultSplit: row.default_split,
        level: row.level,
        xp: row.xp,
      }));
    },
    enabled: !!userId,
  });
}