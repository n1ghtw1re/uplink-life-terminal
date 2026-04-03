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
        db.query<{ 
          callsign: string; theme: string; custom_class: string | null; 
          designation: string | null; avatar: string | null;
          origin: string | null; personal_code: string | null; birthdate: string | null;
          location: string | null; affiliations: string | null; life_goal: string | null;
          current_focus: string | null; height: string | null; weight: string | null;
          blood_type: string | null; intel_log: string | null;
        }>(
          `SELECT callsign, theme, custom_class, designation, avatar, 
                  origin, personal_code, birthdate, location, affiliations,
                  life_goal, current_focus, height, weight, blood_type, intel_log 
           FROM profile WHERE id = 1;`
        ),
        db.query<{ stat_key: string; xp: number; level: number }>(
          `SELECT stat_key, xp, level FROM stats;`
        ),
      ]);
      const p = prog.rows[0] ?? { total_xp: 0, level: 1, streak: 0, shields: 0 };
      const pr = prof.rows[0] ?? { 
        callsign: 'OPERATOR', theme: 'AMBER', custom_class: null, 
        designation: null, avatar: null, origin: null, personal_code: null,
        birthdate: null, location: null, affiliations: null, life_goal: null,
        current_focus: null, height: null, weight: null, blood_type: null, intel_log: null
      };
      
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
        origin: pr.origin,
        personalCode: pr.personal_code,
        birthdate: pr.birthdate,
        location: pr.location,
        affiliations: pr.affiliations,
        lifeGoal: pr.life_goal,
        currentFocus: pr.current_focus,
        height: pr.height,
        weight: pr.weight,
        bloodType: pr.blood_type,
        intelLog: pr.intel_log,
        theme: pr.theme,
        customClass: resolvedClass?.name ?? '',
        bootstrapComplete: true, // skip wizard until rebuilt for Lifepath system
      };
    },
  });
}