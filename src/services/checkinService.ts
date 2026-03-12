// ============================================================
// src/services/checkinService.ts
// ============================================================
import { supabase } from '@/integrations/supabase/client';
import { StatKey } from '@/types';

export async function getTodayCheckin(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
  return data;
}

export async function getHabits(userId: string) {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function getHabitLogsToday(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('habit_logs')
    .select('habit_id')
    .eq('user_id', userId)
    .eq('date', today)
    .eq('completed', true);
  return (data ?? []).map(r => r.habit_id);
}

export async function submitCheckin(params: {
  userId: string;
  statsChecked: StatKey[];
  habitsChecked: string[];
  notes?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from('checkins')
    .insert({
      user_id: params.userId,
      date: today,
      stats_checked: params.statsChecked,
      habits_checked: params.habitsChecked,
      notes: params.notes ?? null,
    });
  if (error) throw error;

  if (params.habitsChecked.length > 0) {
    await supabase.from('habit_logs').insert(
      params.habitsChecked.map(habitId => ({
        user_id: params.userId,
        habit_id: habitId,
        date: today,
        completed: true,
      }))
    );
  }
}