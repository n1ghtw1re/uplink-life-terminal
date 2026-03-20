// src/hooks/useTools.ts
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { getLevelFromXP } from '@/services/xpService';

export interface ToolOption {
  id: string;
  name: string;
  type: string;
  xp: number;
  level: number;
  xpInLevel: number;
  xpForLevel: number;
  active: boolean;
  url: string | null;
  description: string | null;
  notes: string | null;
  lifepathIds: string[];
}

export function useTools(_userId?: string) {
  return useQuery({
    queryKey: ['tools'],
    queryFn: async () => {
      const db = await getDB();

      const toolsRes = await db.query<{
        id: string; name: string; type: string; xp: number;
        active: boolean; url: string | null; description: string | null; notes: string | null;
      }>(`SELECT id, name, type, xp, active, url, description, notes FROM tools ORDER BY name;`);

      const lpRes = await db.query<{ tool_id: string; lifepath_id: string }>(
        `SELECT tool_id, lifepath_id FROM tool_lifepaths;`
      );

      const lpMap: Record<string, string[]> = {};
      for (const row of lpRes.rows) {
        if (!lpMap[row.tool_id]) lpMap[row.tool_id] = [];
        lpMap[row.tool_id].push(row.lifepath_id);
      }

      return toolsRes.rows.map((row): ToolOption => {
        const { level, xpInLevel, xpForLevel } = getLevelFromXP(row.xp ?? 0);
        return {
          id: row.id, name: row.name, type: row.type,
          xp: row.xp ?? 0, level, xpInLevel, xpForLevel,
          active: row.active ?? true,
          url: row.url, description: row.description, notes: row.notes,
          lifepathIds: lpMap[row.id] ?? [],
        };
      });
    },
  });
}