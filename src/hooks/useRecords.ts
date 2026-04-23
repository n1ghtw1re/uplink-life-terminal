import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import type { BackgroundRecord } from '@/types';

export function useRecords() {
  return useQuery({
    queryKey: ['background_records'],
    queryFn: async (): Promise<BackgroundRecord[]> => {
      const db = await getDB();
      // Try with sort_order first, fallback to created_at if column doesn't exist
      try {
        const res = await db.query(`SELECT * FROM background_records ORDER BY type, sort_order ASC, created_at DESC;`);
        return res.rows.map((r: any) => ({
          id: r.id,
          type: r.type,
          title: r.title,
          organization: r.organization,
          dateStr: r.date_str,
          description: r.description || '',
          sortOrder: r.sort_order ?? 0,
          createdAt: r.created_at,
        }));
      } catch {
        // Fallback for existing databases without sort_order
        const res = await db.query(`SELECT * FROM background_records ORDER BY type, created_at DESC;`);
        return res.rows.map((r: any) => ({
          id: r.id,
          type: r.type,
          title: r.title,
          organization: r.organization,
          dateStr: r.date_str,
          description: r.description || '',
          sortOrder: 0,
          createdAt: r.created_at,
        }));
      }
    },
  });
}
