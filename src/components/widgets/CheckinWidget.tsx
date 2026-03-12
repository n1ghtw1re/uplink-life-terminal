import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStats } from '@/hooks/useStats';
import { useTodayCheckin, useHabits, useHabitLogsToday, useSubmitCheckin } from '@/hooks/useCheckin';
import { StatKey, STAT_META } from '@/types';
import WidgetWrapper from '../WidgetWrapper';
import { triggerXPFloat } from '@/components/effects/XPFloatLayer';

interface WidgetProps { onClose?: () => void; onFullscreen?: () => void; isFullscreen?: boolean; }

const CheckinWidget = ({ onClose, onFullscreen, isFullscreen }: WidgetProps) => {
  const { user } = useAuth();
  const { data: stats } = useStats(user?.id);
  const { data: todayCheckin } = useTodayCheckin(user?.id);
  const { data: habits } = useHabits(user?.id);
  const { data: completedHabitIds } = useHabitLogsToday(user?.id);
  const submitMutation = useSubmitCheckin();

  const activeStats = (stats ?? []).filter(s => !s.dormant);

  const [statChecks, setStatChecks] = useState<Record<string, boolean>>({});
  const [habitChecks, setHabitChecks] = useState<Record<string, boolean>>({});

  // Initialise habit checks from today's logs
  useEffect(() => {
    if (completedHabitIds) {
      const checks: Record<string, boolean> = {};
      completedHabitIds.forEach(id => { checks[id] = true; });
      setHabitChecks(checks);
    }
  }, [completedHabitIds]);

  // Initialise stat checks from today's checkin if already submitted
  useEffect(() => {
    if (todayCheckin?.stats_checked) {
      const checks: Record<string, boolean> = {};
      todayCheckin.stats_checked.forEach((k: string) => { checks[k] = true; });
      setStatChecks(checks);
    }
  }, [todayCheckin]);

  const alreadySubmitted = !!todayCheckin;

  const now = new Date();
  const dateStr = `${now.getFullYear()}.${(now.getMonth()+1).toString().padStart(2,'0')}.${now.getDate().toString().padStart(2,'0')}`;

  const handleSubmit = (e: React.MouseEvent) => {
    if (alreadySubmitted || !user) return;
    const statsChecked = Object.entries(statChecks).filter(([,v]) => v).map(([k]) => k as StatKey);
    const habitsChecked = Object.entries(habitChecks).filter(([,v]) => v).map(([k]) => k);
    submitMutation.mutate({ userId: user.id, statsChecked, habitsChecked });
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    triggerXPFloat(rect.left + rect.width / 2, rect.top - 10, 20, 1.0);
  };

  return (
    <WidgetWrapper title="DAILY CHECK-IN" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      <div style={{ fontSize: 11, color: 'hsl(var(--text-dim))', marginBottom: 8 }}>{dateStr}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 10 }}>
        {activeStats.map(s => (
          <label
            key={s.key}
            className="crt-checkbox"
            onClick={() => {
              if (alreadySubmitted) return;
              setStatChecks(prev => ({ ...prev, [s.key]: !prev[s.key] }));
            }}
            style={{ opacity: alreadySubmitted ? 0.6 : 1, cursor: alreadySubmitted ? 'default' : 'pointer' }}
          >
            <span className="crt-checkbox-box">{statChecks[s.key] ? 'X' : ' '}</span>
            <span>{s.icon} {s.name}</span>
          </label>
        ))}
      </div>

      {habits && habits.length > 0 && (
        <>
          <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginBottom: 4 }}>HABITS:</div>
          {habits.map(h => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, fontSize: 10 }}>
              <label
                className="crt-checkbox"
                onClick={() => {
                  if (alreadySubmitted) return;
                  setHabitChecks(prev => ({ ...prev, [h.id]: !prev[h.id] }));
                }}
                style={{ opacity: alreadySubmitted ? 0.6 : 1, cursor: alreadySubmitted ? 'default' : 'pointer' }}
              >
                <span className="crt-checkbox-box">{habitChecks[h.id] ? 'X' : ' '}</span>
                <span>{h.name}</span>
              </label>
              <span style={{ color: 'hsl(var(--text-dim))' }}>
                STK: {h.streak}d {'▣'.repeat(Math.min(h.shields, 2))}{'░'.repeat(Math.max(0, 2 - h.shields))}
              </span>
            </div>
          ))}
        </>
      )}

      {habits && habits.length === 0 && (
        <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginBottom: 8 }}>
          No habits yet. Add habits to track them here.
        </div>
      )}

      <button
        className="topbar-btn"
        style={{ marginTop: 10, width: '100%', fontSize: 10, opacity: alreadySubmitted ? 0.5 : 1, cursor: alreadySubmitted ? 'default' : 'pointer' }}
        onClick={handleSubmit}
        disabled={alreadySubmitted || submitMutation.isPending}
      >
        {alreadySubmitted ? '✓ DONE FOR TODAY' : submitMutation.isPending ? '>> SUBMITTING...' : '>> SUBMIT CHECK-IN'}
      </button>
    </WidgetWrapper>
  );
};

export default CheckinWidget;