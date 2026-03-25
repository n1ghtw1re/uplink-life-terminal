// ============================================================
// src/hooks/useNotes.ts
// Hook for fetching notes
// ============================================================
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';

export interface Note {
  id: string;
  name: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface UseNotesResult {
  notes: Note[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useNotes(): UseNotesResult {
  const query = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const db = await getDB();
      const notesResult = await db.query<Note>(
        `SELECT id, name, content, status, created_at, updated_at
         FROM notes
         WHERE status != 'DELETED'
         ORDER BY created_at DESC;`
      );
      return notesResult.rows;
    },
  });

  return {
    notes: query.data ?? null,
    isLoading: query.isPending,
    error: query.error instanceof Error ? query.error : query.error ? new Error(String(query.error)) : null,
    refetch: async () => {
      await query.refetch();
    },
  };
}
