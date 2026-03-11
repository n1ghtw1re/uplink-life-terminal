// ============================================================
// src/services/checkinService.ts
// ============================================================
import { supabase } from '@/integrations/supabase/client';
import { StatKey, DailyCheckin } from '@/types';
import { awardXP } from './xpService';

const CHECKIN_BASE_XP = 20;

export async function submitCheckin(params: {
  userId: string;
  statsChecked: StatKey[];
  habitsChecked: string[];
  notes?: string;
}): Promise<DailyCheckin> {
  const today = new Date().toISOString().slice(0, 10);

  // Check if already submitted
  const { data: existing } = await supabase
    .from('checkins')
    .select('id')
    .eq('user_id', params.userId)
    .eq('date', today)
    .single();

  if (existing) throw new Error('CHECKIN_ALREADY_SUBMITTED');

  // Award XP for each checked stat
  if (params.statsChecked.length > 0) {
    await awardXP({
      userId: params.userId,
      source: 'checkin',
      baseAmount: CHECKIN_BASE_XP,
      statKeys: params.statsChecked,
    });
  }

  // Update master streak
  await supabase.rpc('update_master_streak', { p_user_id: params.userId });

  const { data, error } = await supabase
    .from('checkins')
    .insert({
      user_id: params.userId,
      date: today,
      stats_checked: params.statsChecked,
      habits_checked: params.habitsChecked,
      notes: params.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTodayCheckin(userId: string): Promise<DailyCheckin | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
  return data;
}