import { useAuth } from '@/contexts/AuthContext';
import { useOperator } from '@/hooks/useOperator';
import { useQuery } from '@tanstack/react-query';
import { getXPDisplayValues } from '@/services/xpService';
import { supabase } from '@/integrations/supabase/client';
import { getStreakTier } from '@/types';
import WidgetWrapper from '../WidgetWrapper';
import ProgressBar from '../ProgressBar';

interface WidgetProps { onClose?: () => void; onFullscreen?: () => void; isFullscreen?: boolean; }

const STREAK_LABELS: Record<string, string> = {
  STANDARD:   'STANDARD',
  HOT_STREAK: 'HOT STREAK',
  ON_FIRE:    'ON FIRE',
  LEGENDARY:  'LEGENDARY',
};

const XPWidget = ({ onClose, onFullscreen, isFullscreen }: WidgetProps) => {
  const { user } = useAuth();
  const { data: op } = useOperator(user?.id);

  // Fetch recent XP log entries with skill/exercise names and duration
  const { data: recentXP } = useQuery({
    queryKey: ['xp-recent'],
    queryFn: async () => {
      const db  = await import('@/lib/db').then(m => m.getDB());
      const res = await db.query<any>(
        `SELECT x.amount, x.source, x.logged_at,
           CASE 
             WHEN x.source = 'session' THEN s.skill_name
             WHEN x.source = 'exercise_output' THEN e.name
             ELSE COALESCE(x.notes, x.source)
           END as target_name,
           CASE
             WHEN x.source = 'session' THEN s.duration_minutes
             WHEN x.source = 'exercise_output' THEN ol.duration_minutes
             ELSE 0
           END as duration_minutes
         FROM xp_log x
         LEFT JOIN sessions s ON x.source = 'session' AND s.id = x.source_id
         LEFT JOIN output_logs ol ON x.source = 'exercise_output' AND ol.id = x.source_id
         LEFT JOIN output_log_exercises ole ON ole.output_log_id = ol.id
         LEFT JOIN exercises e ON ole.exercise_id = e.id
         WHERE x.tier = 'master'
         ORDER BY x.logged_at DESC LIMIT 8;`
      );
      return res.rows;
    },
  });

  // Weekly challenge — placeholder until challenges system is built
  const challenge = null;

  const level      = op?.level      ?? 1;
  const title      = op?.levelTitle  ?? 'Novice';
  const customClass = op?.customClass ?? '';
  const xpInLevel  = op?.xpInLevel  ?? 0;
  const xpForLevel = op?.xpForLevel ?? 500;
  const totalXP    = op?.totalXp    ?? 0;
  const streak     = op?.streak     ?? 0;
  const multiplier = streak >= 30 ? 3.0 : streak >= 14 ? 2.0 : streak >= 7 ? 1.5 : 1.0;
  const shields    = op?.shields    ?? 0;
  const streakTier = getStreakTier(streak);
  const streakLabel = STREAK_LABELS[streakTier];

  // Days until Monday reset
  const daysUntilReset = () => {
    const now = new Date();
    const day = now.getDay();
    const daysLeft = day === 0 ? 1 : 8 - day;
    return daysLeft;
  };

  return (
    <WidgetWrapper title="XP & LEVELLING" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      <div className="font-display text-glow" style={{ fontSize: 18, marginBottom: 8, color: 'hsl(var(--accent-bright))' }}>
        Level {level} // {title}{customClass ? ` ${customClass}` : ''}
      </div>
      <ProgressBar value={xpInLevel} max={xpForLevel} />
      <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginTop: 4, marginBottom: 10 }}>
        {getXPDisplayValues(totalXP).totalXP.toLocaleString()} / {getXPDisplayValues(totalXP).totalXPToNextLevel.toLocaleString()} XP
      </div>

      {recentXP && recentXP.length > 0 ? (
        recentXP.map((entry, i) => {
          const d = new Date(entry.logged_at);
          const day = d.toLocaleDateString('en', { weekday: 'short' }).toUpperCase();
          const time = d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
          const hours = (entry.duration_minutes / 60).toFixed(2).replace(/\.?0+$/, '');
          return (
            <div key={i} style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 3, color: 'hsl(var(--text-dim))' }}>
              <span style={{ color: 'hsl(var(--accent-dim))' }}>{day} {time}</span>
              <span style={{ color: 'hsl(var(--text-dim))' }}> - </span>
              <span style={{ color: 'hsl(var(--accent))' }}>{entry.target_name ?? entry.source}</span>
              <span style={{ color: 'hsl(var(--text-dim))' }}> - </span>
              <span style={{ color: 'hsl(var(--text-dim))' }}>{hours} hr</span>
              <span style={{ color: 'hsl(var(--text-dim))' }}> - </span>
              <span style={{ color: 'hsl(var(--accent-dim))' }}>XP {entry.amount}</span>
            </div>
          );
        })
      ) : (
        <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginBottom: 8 }}>
          No activity yet. Log a session to earn XP.
        </div>
      )}

      <div style={{ marginTop: 10, borderTop: '1px solid hsl(var(--accent-dim))', paddingTop: 8, fontSize: 10 }}>
        <span style={{ color: 'hsl(var(--accent-bright))' }}>STREAK: {streak} DAYS</span>
        <span style={{ marginLeft: 8, color: 'hsl(var(--accent))' }}>[{streakLabel} {multiplier.toFixed(1)}×]</span>
      </div>
      <div style={{ fontSize: 10, marginTop: 4, color: 'hsl(var(--text-dim))' }}>
        SHIELDS: {Array.from({ length: 3 }).map((_, i) => (
          <span key={i}>{i < shields ? '▣' : '□'} </span>
        ))}
      </div>

      <div style={{ marginTop: 10, borderTop: '1px solid hsl(var(--accent-dim))', paddingTop: 8, fontSize: 10 }}>
        {challenge ? (
          <>
            <div style={{ color: 'hsl(var(--text-dim))' }}>WEEKLY CHALLENGE: {challenge.description}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <ProgressBar value={challenge.current} max={challenge.target} width="80px" />
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>
                {challenge.current}/{challenge.target} RESETS IN: {daysUntilReset()}d
              </span>
            </div>
          </>
        ) : (
          <div style={{ color: 'hsl(var(--text-dim))' }}>NO ACTIVE CHALLENGE</div>
        )}
      </div>
    </WidgetWrapper>
  );
};

export default XPWidget;