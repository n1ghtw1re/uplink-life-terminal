// ============================================================
// src/hooks/useSocials.ts
// Hook for fetching social accounts and their follower history
// ============================================================
import { useEffect, useState } from 'react';
import { getDB } from '@/lib/db';

export interface Social {
  id: string;
  platform: string;
  account_name: string;
  url: string | null;
  category: string | null;
  status: string;
  initial_followers: number | null;
  notes: string | null;
  created_at: string;
}

export interface SocialLog {
  id: string;
  social_id: string;
  followers: number;
  logged_date: string;
  notes: string | null;
}

interface UseSocialsResult {
  socials: (Social & { history: SocialLog[] })[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSocials(): UseSocialsResult {
  const [socials, setSocials] = useState<(Social & { history: SocialLog[] })[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSocials = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const db = await getDB();

      // Fetch all socials
      const socialsResult = await db.query<Social>(
        `SELECT id, platform, account_name, url, category, status, initial_followers, notes, created_at
         FROM socials
         WHERE status != 'DELETED'
         ORDER BY created_at DESC;`
      );

      // For each social, fetch its history
      const socialsWithHistory = await Promise.all(
        socialsResult.rows.map(async (social) => {
          const historyResult = await db.query<SocialLog>(
            `SELECT id, social_id, followers, logged_date, notes
             FROM social_logs
             WHERE social_id = $1
             ORDER BY logged_date ASC;`,
            [social.id]
          );

          return {
            ...social,
            history: historyResult.rows,
          };
        })
      );

      setSocials(socialsWithHistory);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch socials'));
      console.error('useSocials error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSocials();
  }, []);

  return {
    socials,
    isLoading,
    error,
    refetch: fetchSocials,
  };
}
