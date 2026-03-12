// ============================================================
// src/hooks/useCheckin.ts
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTodayCheckin, getHabits, getHabitLogsToday, submitCheckin } from '@/services/checkinService';
import { StatKey } from '@/types';

export function useTodayCheckin(userId: string | undefined) {
  return useQuery({
    queryKey: ['checkin-today', userId],
    queryFn: () => getTodayCheckin(userId!),
    enabled: !!userId,
  });
}

export function useHabits(userId: string | undefined) {
  return useQuery({
    queryKey: ['habits', userId],
    queryFn: () => getHabits(userId!),
    enabled: !!userId,
  });
}

export function useHabitLogsToday(userId: string | undefined) {
  return useQuery({
    queryKey: ['habit-logs-today', userId],
    queryFn: () => getHabitLogsToday(userId!),
    enabled: !!userId,
  });
}

export function useSubmitCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitCheckin,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['checkin-today', vars.userId] });
      queryClient.invalidateQueries({ queryKey: ['habit-logs-today', vars.userId] });
      queryClient.invalidateQueries({ queryKey: ['operator', vars.userId] });
      queryClient.invalidateQueries({ queryKey: ['stats', vars.userId] });
    },
  });
}