import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import type { BackgroundRecord } from '@/types';

export function useRecords() {
  return useQuery({
    queryKey: ['background_records'],
    queryFn: async (): Promise<BackgroundRecord[]> => {
      const db = await getDB();
      const res = await db.query(`SELECT * FROM background_records ORDER BY created_at DESC;`);
      return res.rows.map((r: any) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        organization: r.organization,
        dateStr: r.date_str,
        description: r.description || '',
        createdAt: r.created_at,
      }));
    },
  });
}
