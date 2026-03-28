import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStats } from '@/hooks/useStats';
import { resolveClassFromStats } from '@/services/classSystem';

export function useClass(_userId?: string) {
  const { user } = useAuth();
  const statsQuery = useStats(_userId ?? user?.id);

  const resolvedClass = useMemo(
    () => resolveClassFromStats(statsQuery.data ?? []),
    [statsQuery.data]
  );

  return {
    ...statsQuery,
    data: resolvedClass,
  };
}
