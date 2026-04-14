import { useMemo, useState } from 'react';
import WidgetWrapper from '@/components/WidgetWrapper';
import IntakeLogModal from '@/components/modals/IntakeLogModal';
import { useTodayIntake } from '@/hooks/useIntake';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const green = '#44ff88';

interface IntakeWidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenIntake?: () => void;
  onLogClick?: (id: string) => void;
}

export default function IntakeWidget({ onClose, onFullscreen, isFullscreen, onOpenIntake, onLogClick }: IntakeWidgetProps) {
  const { day, settings, streak, isLoading } = useTodayIntake();
  const [showAdd, setShowAdd] = useState(false);

  const progressPercent = useMemo(() => {
    if (!settings.daily_calorie_goal) return 0;
    return Math.min(100, Math.round(((day?.total_calories ?? 0) / settings.daily_calorie_goal) * 100));
  }, [day?.total_calories, settings.daily_calorie_goal]);

  const recentLogs = day?.logs.slice(0, 5) ?? [];

  return (
    <>
      <WidgetWrapper title="INTAKE" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
        <div style={{ marginBottom: 10, border: `1px solid ${adim}`, padding: 10 }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: adim, letterSpacing: 1, marginBottom: 6 }}>
            // TODAY {day?.total_calories ?? 0} / {settings.daily_calorie_goal} KCAL · STREAK {streak}D
          </div>
          <div style={{ height: 6, background: 'rgba(153,104,0,0.18)', marginBottom: 8 }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent >= 100 ? green : acc }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, fontSize: 8 }}>
            <div style={{ color: dim }}>P {day?.total_protein_g ?? 0}g</div>
            <div style={{ color: dim }}>C {day?.total_carbs_g ?? 0}g</div>
            <div style={{ color: dim }}>F {day?.total_fat_g ?? 0}g</div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>LOADING...</div>
        ) : recentLogs.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>No intake logged today.</div>
        ) : (
          <div>
            {recentLogs.map((log) => (
              <div key={log.id} onClick={() => onLogClick?.(log.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, cursor: onLogClick ? 'pointer' : 'default' }}>
                <span style={{ fontSize: 8, color: acc, flexShrink: 0 }}>●</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, color: acc, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: mono }}>
                      {log.source_name}
                    </span>
                    {log.meal_label && <span style={{ fontSize: 8, color: adim }}>{log.meal_label}</span>}
                  </div>
                  <div style={{ fontSize: 8, color: dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.calories} kcal · P {log.protein_g}g · C {log.carbs_g}g · F {log.fat_g}g
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}>
            + LOG INTAKE
          </button>
          <button onClick={onOpenIntake} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}>
            VIEW ALL {'>'}
          </button>
        </div>
      </WidgetWrapper>

      {showAdd && <IntakeLogModal open={showAdd} onClose={() => setShowAdd(false)} />}
    </>
  );
}
