// src/hooks/useOperator.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { getLevelFromXP } from '@/services/xpService';

const MASTER_TITLES = [
  'INITIALISING', 'SCRIPT KIDDIE', 'CURIOUS OPERATOR', 'APPRENTICE',
  'ANALYST', 'SPECIALIST', 'ENGINEER', 'ARCHITECT', 'SYSTEMS MASTER',
  'ROOT ACCESS', 'GHOST PROTOCOL', 'SHADOW OPS', 'CIPHER', 'ARCHITECT PRIME', 'ROOT GOD',
];

export function useOperator(_userId?: string) {
  return useQuery({
    queryKey: ['operator'],
    queryFn: async () => {
      const db = await getDB();
      const [prog, prof] = await Promise.all([
        db.query<{ total_xp: number; level: number; streak: number; shields: number }>(
          `SELECT total_xp, level, streak, shields FROM master_progress WHERE id = 1;`
        ),
        db.query<{ callsign: string; theme: string; custom_class: string | null }>(
          `SELECT callsign, theme, custom_class FROM profile WHERE id = 1;`
        ),
      ]);
      const p = prog.rows[0] ?? { total_xp: 0, level: 1, streak: 0, shields: 0 };
      const pr = prof.rows[0] ?? { callsign: 'OPERATOR', theme: 'AMBER', custom_class: null };
      const { level, xpInLevel, xpForLevel } = getLevelFromXP(p.total_xp);
      return {
        totalXp: p.total_xp,
        level,
        levelTitle: MASTER_TITLES[level - 1] ?? `LVL ${level}`,
        xpInLevel,
        xpForLevel,
        streak: p.streak,
        shields: p.shields,
        callsign: pr.callsign,
        theme: pr.theme,
        customClass: pr.custom_class,
        bootstrapComplete: true, // skip wizard until rebuilt for Lifepath system
      };
    },
  });
}