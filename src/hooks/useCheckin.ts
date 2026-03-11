// ============================================================
// src/hooks/useCheckin.ts
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { submitCheckin, getTodayCheckin } from '@/services/checkinService';
import { StatKey } from '@/types';

export function useTodayCheckin(userId: string) {
  return useQuery({
    queryKey: ['checkin-today', userId],
    queryFn: () => getTodayCheckin(userId),
    enabled: !!userId,
  });
}