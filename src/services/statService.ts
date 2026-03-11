// ============================================================
// src/services/statService.ts
// ============================================================
import { supabase } from '@/integrations/supabase/client';
import { Stat, StatKey, STAT_META } from '@/types';

export async function getStats(userId: string): Promise<Stat[]> {
  const { data, error } = await supabase
    .from('stats')
    .select('*')
    .eq('user_id', userId)
    .order('stat_key');
  if (error) throw error;
  return data ?? [];
}

export async function initStats(userId: string): Promise<void> {
  const statKeys = Object.keys(STAT_META) as StatKey[];
  const inserts = statKeys.map(key => ({
    user_id: userId,
    stat_key: key,
    level: 1,
    xp: 0,
    streak: 0,
    dormant: key === 'cool' || key === 'grit', // default dormant until activated
  }));
  await supabase.from('stats').insert(inserts);
}