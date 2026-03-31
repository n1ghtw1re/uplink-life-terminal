// src/hooks/useResources.ts
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';

export interface ResourceOption {
  id: string;
  title: string;
  url: string | null;
  category: string;
  status: string;
  description: string | null;
  notes: string | null;
  createdAt: string;
}

export function useResources(_userId?: string) {
  return useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{
        id: string; title: string; url: string | null;
        category: string; status: string;
        description: string | null; notes: string | null;
        created_at: string;
      }>(`SELECT id, title, url, category, status, description, notes, created_at FROM resources ORDER BY title;`);

      return res.rows.map((row): ResourceOption => ({
        id: row.id,
        title: row.title,
        url: row.url,
        category: row.category,
        status: row.status,
        description: row.description,
        notes: row.notes,
        createdAt: row.created_at,
      }));
    },
  });
}
