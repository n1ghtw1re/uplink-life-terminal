import { useMemo, useState } from 'react';
import WidgetWrapper from '@/components/WidgetWrapper';
import RecoverySleepModal from '@/components/modals/RecoverySleepModal';
import { SleepTrackerButton } from '@/components/widgets/SleepTrackerButton';
import { useRecoverySettings, useSleepDays } from '@/hooks/useRecovery';
import { calculateRecoveryStreak, formatDurationMinutes } from '@/services/recoveryService';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const green = '#44ff88';

interface RecoveryWidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenRecovery?: () => void;
}

export default function RecoveryWidget({ onClose, onFullscreen, isFullscreen, onOpenRecovery }: RecoveryWidgetProps) {
  const { days, isLoading } = useSleepDays();
  const { settings } = useRecoverySettings();
  const [showAdd, setShowAdd] = useState(false);

  const lastFiveDays = days.slice(0, 5);
  const streak = useMemo(() => calculateRecoveryStreak(days, settings.daily_goal_minutes), [days, settings.daily_goal_minutes]);

  return (
    <>
      <WidgetWrapper title="RECOVERY" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
        <div style={{ marginBottom: 8 }}>
          <SleepTrackerButton compact />
        </div>

        <div style={{ marginBottom: 10, border: `1px solid ${adim}`, padding: 10 }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: adim, letterSpacing: 1, marginBottom: 6 }}>
            // GOAL {formatDurationMinutes(settings.daily_goal_minutes)} · STREAK {streak}D
          </div>
          <div style={{ fontFamily: mono, fontSize: 10, color: streak > 0 ? green : dim }}>
            {streak > 0 ? `${streak} day goal streak active` : 'No current recovery streak'}
          </div>
        </div>

        {isLoading ? (
          <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>LOADING...</div>
        ) : lastFiveDays.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>No sleep sessions logged yet.</div>
        ) : (
          lastFiveDays.map((day) => (
            <div key={day.anchor_date} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 8, color: day.total_minutes >= settings.daily_goal_minutes ? green : acc, flexShrink: 0 }}>●</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: mono, fontSize: 10, color: acc }}>{day.anchor_date}</div>
                <div style={{ fontFamily: mono, fontSize: 8, color: dim }}>
                  {formatDurationMinutes(day.total_minutes)} · {day.session_count} session{day.session_count > 1 ? 's' : ''} · Q{day.avg_quality ? day.avg_quality.toFixed(1) : '—'}
                </div>
              </div>
            </div>
          ))
        )}

        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}>
            + QUICK LOG
          </button>
          <button onClick={onOpenRecovery} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}>
            VIEW ALL {'>'}
          </button>
        </div>
      </WidgetWrapper>

      {showAdd && <RecoverySleepModal open={showAdd} onClose={() => setShowAdd(false)} />}
    </>
  );
}
