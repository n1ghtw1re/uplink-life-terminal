// ============================================================
// src/hooks/useOperator.ts
// ============================================================
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useOperator(userId: string) {
  return useQuery({
    queryKey: ['operator', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, master_progress(*)')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}