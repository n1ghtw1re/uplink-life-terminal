// ============================================================
// src/hooks/useStats.ts
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStats } from '@/services/statService';
import { StatKey } from '@/types';

export function useStats(userId: string) {
  return useQuery({
    queryKey: ['stats', userId],
    queryFn: () => getStats(userId),
    enabled: !!userId,
  });
}