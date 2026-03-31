// src/hooks/useOperator.ts
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { getLevelFromXP } from '@/services/xpService';
import { resolveClassFromStats } from '@/services/classSystem';
import type { StatDisplay } from '@/hooks/useStats';

const MASTER_TITLES = [
  'Novice', 'Apprentice', 'Initiate', 'Adept', 'Specialist', 
  'Senior', 'Lead', 'Expert', 'Master', 'Principal', 
  'Elite', 'Exalted', 'Grandmaster',
];

export function useOperator(_userId?: string) {
  return useQuery({
    queryKey: ['operator'],
    queryFn: async () => {
      const db = await getDB();
      const [prog, prof, stats] = await Promise.all([
        db.query<{ total_xp: number; level: number; streak: number; shields: number }>(
          `SELECT total_xp, level, streak, shields FROM master_progress WHERE id = 1;`
        ),
        db.query<{ callsign: string; theme: string; custom_class: string | null; designation: string | null; avatar: string | null }>(
          `SELECT callsign, theme, custom_class, designation, avatar FROM profile WHERE id = 1;`
        ),
        db.query<{ stat_key: string; xp: number; level: number }>(
          `SELECT stat_key, xp, level FROM stats;`
        ),
      ]);
      const p = prog.rows[0] ?? { total_xp: 0, level: 1, streak: 0, shields: 0 };
      const pr = prof.rows[0] ?? { callsign: 'OPERATOR', theme: 'AMBER', custom_class: null, designation: null, avatar: null };
      
      const statsData = stats.rows.map(s => ({
        key: s.stat_key as any,
        name: s.stat_key.toUpperCase(),
        icon: s.stat_key[0].toUpperCase(),
        xp: s.xp,
        level: s.level,
        xpInLevel: 0,
        xpForLevel: 500,
        streak: 0,
        levelTitle: '',
        dormant: s.xp === 0,
      }));
      
      const resolvedClass = resolveClassFromStats(statsData);
      const { level, xpInLevel, xpForLevel } = getLevelFromXP(p.total_xp);
      const titleIndex = Math.min(Math.floor(level / 5), MASTER_TITLES.length - 1);
      return {
        totalXp: p.total_xp,
        level,
        levelTitle: MASTER_TITLES[titleIndex] ?? 'Novice',
        xpInLevel,
        xpForLevel,
        streak: p.streak,
        shields: p.shields,
        callsign: pr.callsign,
        designation: pr.designation,
        avatar: pr.avatar,
        theme: pr.theme,
        customClass: resolvedClass?.name ?? '',
        bootstrapComplete: true, // skip wizard until rebuilt for Lifepath system
      };
    },
  });
}