import { useAuth } from '@/contexts/AuthContext';
import { useOperator } from '@/hooks/useOperator';
import { useQuery } from '@tanstack/react-query';
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

  // Fetch recent XP log entries
  const { data: recentXP } = useQuery({
    queryKey: ['xp-recent', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xp_log')
        .select('amount, source, notes, created_at')
        .eq('user_id', user!.id)
        .eq('tier', 'master')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Fetch active weekly challenge
  const { data: challenge } = useQuery({
    queryKey: ['weekly-challenge', user?.id],
    queryFn: async () => {
      const monday = new Date();
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const weekStart = monday.toISOString().slice(0, 10);
      const { data } = await supabase
        .from('weekly_challenges')
        .select('*')
        .eq('user_id', user!.id)
        .eq('week_start', weekStart)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const level      = op?.level      ?? 1;
  const title      = op?.title      ?? 'INITIALISING';
  const xpInLevel  = op?.xpInLevel  ?? 0;
  const xpForLevel = op?.xpForLevel ?? 500;
  const totalXP    = op?.totalXP    ?? 0;
  const streak     = op?.streak     ?? 0;
  const multiplier = op?.multiplier ?? 1.0;
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
        LVL {level} // {title}
      </div>
      <ProgressBar value={xpInLevel} max={xpForLevel} />
      <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginTop: 4, marginBottom: 10 }}>
        {xpInLevel.toLocaleString()} / {xpForLevel.toLocaleString()} XP
      </div>

      {recentXP && recentXP.length > 0 ? (
        recentXP.map((entry, i) => (
          <div key={i} style={{ fontSize: 10, marginBottom: 3, color: 'hsl(var(--text-dim))' }}>
            <span style={{ color: 'hsl(var(--accent))' }}>+{entry.amount} XP</span>
            {entry.notes ? ` — ${entry.notes}` : ` — ${entry.source.replace(/_/g, ' ')}`}
          </div>
        ))
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
