// src/hooks/useCheckin.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTodayCheckin, getHabits, getHabitLogsToday, submitCheckin } from '@/services/checkinService';

// ── Default export — combined hook ───────────────────────────

export function useCheckin(_userId?: string) {
  const today     = useTodayCheckin();
  const habits    = useHabits();
  const habitLogs = useHabitLogsToday();
  return {
    todayCheckin:    today.data ?? null,
    habits:          habits.data ?? [],
    habitLogsToday:  habitLogs.data ?? [],
    isLoading:       today.isLoading || habits.isLoading,
    alreadyCheckedIn: !!today.data,
  };
}

// ── Individual named exports for CheckinWidget ────────────────

export function useTodayCheckin(_userId?: string) {
  return useQuery({
    queryKey: ['checkin-today'],
    queryFn: getTodayCheckin,
  });
}

export function useHabits(_userId?: string) {
  return useQuery({
    queryKey: ['habits'],
    queryFn: getHabits,
  });
}

export function useHabitLogsToday(_userId?: string) {
  return useQuery({
    queryKey: ['habit-logs-today'],
    queryFn: async () => {
      const logs = await getHabitLogsToday();
      return (logs as any[])
        .filter(l => l.completed)
        .map(l => l.habit_id as string);
    },
  });
}

export function useSubmitCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitCheckin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin-today'] });
      queryClient.invalidateQueries({ queryKey: ['habit-logs-today'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['operator'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}