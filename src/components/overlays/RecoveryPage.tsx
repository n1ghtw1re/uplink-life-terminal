import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import RecoveryDrawer from '@/components/drawer/RecoveryDrawer';
import RecoverySleepModal from '@/components/modals/RecoverySleepModal';
import { SleepTrackerButton } from '@/components/widgets/SleepTrackerButton';
import { useRecoveryActions, useRecoverySettings, useSleepDays } from '@/hooks/useRecovery';
import { calculateRecoveryStreak, formatDurationMinutes } from '@/services/recoveryService';

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgP = 'hsl(var(--bg-primary))';
const bgS = 'hsl(var(--bg-secondary))';
const green = '#44ff88';

interface RecoveryPageProps {
  onClose: () => void;
}

export default function RecoveryPage({ onClose }: RecoveryPageProps) {
  const { days, isLoading } = useSleepDays();
  const { settings } = useRecoverySettings();
  const { updateDailyGoal } = useRecoveryActions();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [goalHours, setGoalHours] = useState(String(Math.round(settings.daily_goal_minutes / 60)));

  const chartData = useMemo(
    () => days.slice(0, 14).reverse().map((day) => ({
      date: day.anchor_date.slice(5),
      anchor_date: day.anchor_date,
      hours: Number((day.total_minutes / 60).toFixed(1)),
      quality: day.avg_quality ? Number(day.avg_quality.toFixed(1)) : 0,
    })),
    [days],
  );

  const streak = useMemo(() => calculateRecoveryStreak(days, settings.daily_goal_minutes), [days, settings.daily_goal_minutes]);
  const latest = days[0] ?? null;
  const averageMinutes = days.length ? Math.round(days.reduce((sum, day) => sum + day.total_minutes, 0) / days.length) : 0;

  const handleGoalSave = async () => {
    const hours = Math.max(1, Number(goalHours) || 8);
    await updateDailyGoal.mutateAsync(hours * 60);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: bgP, display: 'flex', flexDirection: 'column', fontFamily: mono }}>
      <div style={{ height: 56, flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px' }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// BIOSYSTEM</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>RECOVERY</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: dim }}>{days.length} sleep day{days.length === 1 ? '' : 's'} recorded</span>
        <div style={{ flex: 1 }} />
        <button className="topbar-btn" onClick={() => setShowAdd(true)} style={{ padding: '5px 12px', fontSize: 9 }}>
          + QUICK LOG
        </button>
        <button className="topbar-btn" onClick={onClose} style={{ padding: '5px 12px', fontSize: 9 }}>
          CLOSE
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', paddingRight: selectedDate ? 400 : 0, transition: 'padding-right 200ms ease' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'LATEST', value: latest ? formatDurationMinutes(latest.total_minutes) : '—' },
              { label: 'AVERAGE', value: averageMinutes ? formatDurationMinutes(averageMinutes) : '—' },
              { label: 'GOAL', value: formatDurationMinutes(settings.daily_goal_minutes) },
              { label: 'STREAK', value: `${streak} DAYS` },
            ].map((stat) => (
              <div key={stat.label} style={{ padding: '12px 14px', background: bgS, border: `1px solid ${adim}` }}>
                <div style={{ fontFamily: vt, fontSize: 22, color: acc }}>{stat.value}</div>
                <div style={{ fontSize: 8, color: dim, letterSpacing: 1 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16, maxWidth: 320 }}>
            <SleepTrackerButton />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: bgS, border: `1px solid ${adim}`, padding: 14 }}>
              <div style={{ fontSize: 11, color: acc, marginBottom: 10 }}>// HOURS · LAST 14 WAKE DATES</div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(153,104,0,0.18)" />
                    <XAxis dataKey="date" stroke={adim} tick={{ fill: dim, fontSize: 10 }} />
                    <YAxis stroke={adim} tick={{ fill: dim, fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: bgP, border: `1px solid ${adim}`, fontFamily: mono, fontSize: 10 }} formatter={(value: number, name: string) => [name === 'hours' ? `${value}h` : value, name.toUpperCase()]} />
                    <Bar dataKey="hours" fill="rgba(255,176,0,0.75)" radius={[2, 2, 0, 0]} onClick={(data) => setSelectedDate((data?.activePayload?.[0]?.payload as any)?.anchor_date ?? null)} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: bgS, border: `1px solid ${adim}`, padding: 14 }}>
              <div style={{ fontSize: 11, color: acc, marginBottom: 10 }}>// QUALITY TREND</div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(153,104,0,0.18)" />
                    <XAxis dataKey="date" stroke={adim} tick={{ fill: dim, fontSize: 10 }} />
                    <YAxis domain={[0, 5]} stroke={adim} tick={{ fill: dim, fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: bgP, border: `1px solid ${adim}`, fontFamily: mono, fontSize: 10 }} formatter={(value: number) => [value || '—', 'QUALITY']} />
                    <Area type="monotone" dataKey="quality" stroke={green} fill="rgba(68,255,136,0.18)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
            <div style={{ background: bgS, border: `1px solid ${adim}`, padding: 14, height: 'fit-content' }}>
              <div style={{ fontSize: 11, color: acc, marginBottom: 10 }}>// DAILY GOAL</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input className="crt-input" type="number" min={1} max={24} value={goalHours} onChange={(e) => setGoalHours(e.target.value)} style={{ width: 90 }} />
                <span style={{ fontSize: 10, color: dim }}>hours</span>
              </div>
              <button onClick={handleGoalSave} style={{ padding: '6px 10px', fontSize: 9, fontFamily: mono, background: 'transparent', border: `1px solid ${acc}`, color: acc, cursor: 'pointer' }}>
                SAVE GOAL
              </button>
              <div style={{ marginTop: 12, fontSize: 9, color: streak > 0 ? green : dim }}>
                Current streak: {streak} day{streak === 1 ? '' : 's'}
              </div>
            </div>

            <div style={{ background: bgS, border: `1px solid ${adim}`, padding: 14 }}>
              <div style={{ fontSize: 11, color: acc, marginBottom: 10 }}>// SLEEP LOG</div>
              {isLoading ? (
                <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
              ) : days.length === 0 ? (
                <div style={{ fontSize: 10, color: dim }}>No sleep sessions recorded yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {days.map((day) => (
                    <button
                      key={day.anchor_date}
                      onClick={() => setSelectedDate(day.anchor_date)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 12px',
                        textAlign: 'left',
                        background: selectedDate === day.anchor_date ? 'rgba(255,176,0,0.08)' : 'transparent',
                        border: `1px solid ${selectedDate === day.anchor_date ? acc : adim}`,
                        color: acc,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 9, color: day.total_minutes >= settings.daily_goal_minutes ? green : acc, flexShrink: 0 }}>
                        {day.total_minutes >= settings.daily_goal_minutes ? 'GOAL' : 'LOG'}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 10, color: acc }}>{day.anchor_date}</span>
                      <span style={{ fontSize: 9, color: dim, flexShrink: 0 }}>{formatDurationMinutes(day.total_minutes)}</span>
                      <span style={{ fontSize: 9, color: dim, flexShrink: 0 }}>Q{day.avg_quality ? day.avg_quality.toFixed(1) : '—'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <RecoveryDrawer anchorDate={selectedDate} open={!!selectedDate} onClose={() => setSelectedDate(null)} />
      {showAdd && <RecoverySleepModal open={showAdd} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
