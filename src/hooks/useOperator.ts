// ============================================================
// UPLINK — OPERATOR HOOK
// src/hooks/useOperator.ts
// Fetches profile + master_progress for the current user.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMasterLevel, getStreakTier, STREAK_MULTIPLIERS } from '@/types';

export interface OperatorStatus {
  callsign: string;
  level: number;
  title: string;
  totalXP: number;
  xpInLevel: number;
  xpForLevel: number;
  progressPercent: number;
  streak: number;
  multiplier: number;
  shields: number;
  augmentationScore: number;
  theme: string;
  bootstrapComplete: boolean;
}

export function useOperator(userId: string | undefined) {
  return useQuery({
    queryKey: ['operator', userId],
    queryFn: async (): Promise<OperatorStatus> => {
      if (!userId) throw new Error('No user ID');

      const [profileRes, progressRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('callsign, theme, bootstrap_complete')
          .eq('id', userId)
          .single(),
        supabase
          .from('master_progress')
          .select('total_xp, level, streak, shields, augmentation_score')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      if (profileRes.error) throw profileRes.error;

      const profile = profileRes.data;
      const progress = progressRes.data;

      const totalXP = progress?.total_xp ?? 0;
      const streak  = progress?.streak  ?? 0;

      const { level, title, progressPercent, xpInLevel, xpForLevel } = getMasterLevel(totalXP);
      const streakTier  = getStreakTier(streak);
      const multiplier  = STREAK_MULTIPLIERS[streakTier];

      return {
        callsign:          profile.callsign,
        level,
        title,
        totalXP,
        xpInLevel,
        xpForLevel,
        progressPercent,
        streak,
        multiplier,
        shields:           progress?.shields           ?? 0,
        augmentationScore: progress?.augmentation_score ?? 0,
        theme:             profile.theme,
        bootstrapComplete: profile.bootstrap_complete,
      };
    },
    enabled: !!userId,
    staleTime: 30_000, // 30s — re-fetch after XP events via invalidation
  });
}