import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import IntakeDrawer from '@/components/drawer/IntakeDrawer';
import IntakeLogModal from '@/components/modals/IntakeLogModal';
import { useIntakeActions, useIntakeDays } from '@/hooks/useIntake';

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgP = 'hsl(var(--bg-primary))';
const bgS = 'hsl(var(--bg-secondary))';
const green = '#44ff88';

interface IntakePageProps {
  onClose: () => void;
}

export default function IntakePage({ onClose }: IntakePageProps) {
  const { days, settings, streak, isLoading } = useIntakeDays();
  const { updateSettings } = useIntakeActions();
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [goalCalories, setGoalCalories] = useState(String(settings.daily_calorie_goal));
  const [proteinPercent, setProteinPercent] = useState(String(settings.protein_percent));
  const [carbsPercent, setCarbsPercent] = useState(String(settings.carbs_percent));
  const [fatPercent, setFatPercent] = useState(String(settings.fat_percent));
  const [settingsError, setSettingsError] = useState('');

  useEffect(() => {
    setGoalCalories(String(settings.daily_calorie_goal));
    setProteinPercent(String(settings.protein_percent));
    setCarbsPercent(String(settings.carbs_percent));
    setFatPercent(String(settings.fat_percent));
  }, [settings]);

  const today = days[0] ?? null;
  const last14Days = days.slice(0, 14).reverse();

  const calorieChartData = useMemo(() => {
    return last14Days.map((day) => ({
      date: day.anchor_date.slice(5),
      anchor_date: day.anchor_date,
      calories: day.total_calories,
      goal: settings.daily_calorie_goal,
    }));
  }, [last14Days, settings.daily_calorie_goal]);

  const macroChartData = useMemo(() => {
    return last14Days.map((day) => ({
      date: day.anchor_date.slice(5),
      protein: day.protein_percent_actual,
      carbs: day.carbs_percent_actual,
      fat: day.fat_percent_actual,
    }));
  }, [last14Days]);

  const macroGoals = useMemo(() => {
    const cals = settings.daily_calorie_goal;
    return {
      protein: Math.round((cals * settings.protein_percent / 100) / 4),
      carbs: Math.round((cals * settings.carbs_percent / 100) / 4),
      fat: Math.round((cals * settings.fat_percent / 100) / 9),
    };
  }, [settings]);

  const macroPercents = useMemo(() => {
    if (!today) return { protein: 0, carbs: 0, fat: 0 };
    return {
      protein: macroGoals.protein > 0 ? Math.round((today.total_protein_g / macroGoals.protein) * 100) : 0,
      carbs: macroGoals.carbs > 0 ? Math.round((today.total_carbs_g / macroGoals.carbs) * 100) : 0,
      fat: macroGoals.fat > 0 ? Math.round((today.total_fat_g / macroGoals.fat) * 100) : 0,
    };
  }, [today, macroGoals]);

  const getMacroColor = (percent: number) => {
    if (percent >= 90) return green;
    if (percent >= 50) return acc;
    return '#ff6644';
  };

  const handleSaveSettings = async () => {
    setSettingsError('');
    try {
      await updateSettings.mutateAsync({
        daily_calorie_goal: goalCalories,
        protein_percent: proteinPercent,
        carbs_percent: carbsPercent,
        fat_percent: fatPercent,
      });
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Failed to save intake settings.');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: bgP, display: 'flex', flexDirection: 'column', fontFamily: mono }}>
      <div style={{ height: 56, flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px' }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// BIOSYSTEM</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>INTAKE</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: dim }}>{days.length} tracked day{days.length === 1 ? '' : 's'}</span>
        <div style={{ flex: 1 }} />
        <button className="topbar-btn" onClick={() => setShowAdd(true)} style={{ padding: '5px 12px', fontSize: 9 }}>
          + LOG INTAKE
        </button>
        <button className="topbar-btn" onClick={onClose} style={{ padding: '5px 12px', fontSize: 9 }}>
          CLOSE
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', paddingRight: selectedLogId ? 420 : 0, transition: 'padding-right 200ms ease' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'TODAY KCAL', value: `${today?.total_calories ?? 0}` },
              { 
                label: 'TODAY MACROS', 
                value: (
                  <span style={{ fontSize: 13 }}>
                    <span style={{ color: getMacroColor(macroPercents.protein) }}>P {today?.total_protein_g ?? 0}g ({macroPercents.protein}%)</span>
                    {' · '}
                    <span style={{ color: getMacroColor(macroPercents.carbs) }}>C {today?.total_carbs_g ?? 0}g ({macroPercents.carbs}%)</span>
                    {' · '}
                    <span style={{ color: getMacroColor(macroPercents.fat) }}>F {today?.total_fat_g ?? 0}g ({macroPercents.fat}%)</span>
                  </span>
                )
              },
              { label: 'GOAL', value: `${settings.daily_calorie_goal}` },
              { label: 'STREAK', value: `${streak}` },
            ].map((stat) => (
              <div key={stat.label} style={{ padding: '10px 12px', background: bgS, border: `1px solid ${adim}` }}>
                <div style={{ fontFamily: vt, fontSize: 18, color: acc, whiteSpace: 'nowrap' }}>{stat.value}</div>
                <div style={{ fontSize: 8, color: dim, letterSpacing: 1 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: bgS, border: `1px solid ${adim}`, padding: 14 }}>
              <div style={{ fontSize: 11, color: acc, marginBottom: 10 }}>// CALORIES · LAST 14 DAYS</div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={calorieChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(153,104,0,0.18)" />
                    <XAxis dataKey="date" stroke={adim} tick={{ fill: dim, fontSize: 10 }} />
                    <YAxis stroke={adim} tick={{ fill: dim, fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: bgP, border: `1px solid ${adim}`, fontFamily: mono, fontSize: 10 }} />
                    <Bar dataKey="calories" fill="rgba(255,176,0,0.75)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: bgS, border: `1px solid ${adim}`, padding: 14 }}>
              <div style={{ fontSize: 11, color: acc, marginBottom: 10 }}>// PROTEIN % TREND</div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={macroChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(153,104,0,0.18)" />
                    <XAxis dataKey="date" stroke={adim} tick={{ fill: dim, fontSize: 10 }} />
                    <YAxis domain={[0, 100]} stroke={adim} tick={{ fill: dim, fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: bgP, border: `1px solid ${adim}`, fontFamily: mono, fontSize: 10 }} />
                    <Area type="monotone" dataKey="protein" stroke={green} fill="rgba(68,255,136,0.18)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
            <div style={{ background: bgS, border: `1px solid ${adim}`, padding: 14, height: 'fit-content' }}>
              <div style={{ fontSize: 11, color: acc, marginBottom: 10 }}>// GOALS</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 8, color: adim, letterSpacing: 1, marginBottom: 4 }}>DAILY CALORIE GOAL</div>
                  <input className="crt-input" type="number" min={1} value={goalCalories} onChange={(e) => setGoalCalories(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <div style={{ fontSize: 8, color: adim, letterSpacing: 1, marginBottom: 4 }}>MACRO SPLIT %</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                    <input className="crt-input" type="number" min={0} max={100} value={proteinPercent} onChange={(e) => setProteinPercent(e.target.value)} />
                    <input className="crt-input" type="number" min={0} max={100} value={carbsPercent} onChange={(e) => setCarbsPercent(e.target.value)} />
                    <input className="crt-input" type="number" min={0} max={100} value={fatPercent} onChange={(e) => setFatPercent(e.target.value)} />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 9, color: dim }}>
                    P / C / F = {proteinPercent || 0}/{carbsPercent || 0}/{fatPercent || 0}
                  </div>
                </div>
                <button onClick={handleSaveSettings} style={{ padding: '6px 10px', fontSize: 9, fontFamily: mono, background: 'transparent', border: `1px solid ${acc}`, color: acc, cursor: 'pointer' }}>
                  SAVE GOALS
                </button>
                {settingsError && <div style={{ fontSize: 9, color: '#ff7777' }}>{settingsError}</div>}
                <div style={{ fontSize: 9, color: streak > 0 ? green : dim }}>
                  Current streak: {streak} day{streak === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            <div style={{ background: bgS, border: `1px solid ${adim}`, padding: 14 }}>
              <div style={{ fontSize: 11, color: acc, marginBottom: 10 }}>// INTAKE LOG</div>
              {isLoading ? (
                <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
              ) : days.length === 0 ? (
                <div style={{ fontSize: 10, color: dim }}>No intake logged yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {days.map((day) => (
                    <div key={day.anchor_date} style={{ border: `1px solid ${adim}`, padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 10, color: acc, flex: 1 }}>{day.anchor_date}</span>
                        <span style={{ fontSize: 9, color: day.calorie_goal_hit ? green : dim }}>{day.total_calories} / {settings.daily_calorie_goal} kcal</span>
                      </div>
                      <div style={{ fontSize: 8, color: dim, marginBottom: 10 }}>
                        P {day.total_protein_g}g · C {day.total_carbs_g}g · F {day.total_fat_g}g · {day.protein_percent_actual}/{day.carbs_percent_actual}/{day.fat_percent_actual}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {day.logs.map((log) => (
                          <button
                            key={log.id}
                            onClick={() => setSelectedLogId(log.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '10px 12px',
                              textAlign: 'left',
                              background: selectedLogId === log.id ? 'rgba(255,176,0,0.08)' : 'transparent',
                              border: `1px solid ${selectedLogId === log.id ? acc : adim}`,
                              color: acc,
                              cursor: 'pointer',
                            }}
                          >
                            <span style={{ fontSize: 9, color: acc, flexShrink: 0 }}>{log.meal_label ?? log.source_kind}</span>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 10, color: acc, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.source_name}</span>
                            <span style={{ fontSize: 9, color: dim, flexShrink: 0 }}>{log.calories} kcal</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ width: selectedLogId ? 420 : 0, flexShrink: 0, overflow: 'hidden', transition: 'width 200ms ease', borderLeft: selectedLogId ? `1px solid ${adim}` : 'none', display: 'flex', flexDirection: 'column', position: 'fixed', top: 56, right: 0, bottom: 0, background: bgP, zIndex: 1200 }}>
        {selectedLogId && (
          <>
            <div style={{ height: 36, flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 12px', background: bgS }}>
              <button onClick={() => setSelectedLogId(null)} style={{ background: 'transparent', border: 'none', color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer', letterSpacing: 1 }}>
                × CLOSE
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <IntakeDrawer logId={selectedLogId} onClose={() => setSelectedLogId(null)} />
            </div>
          </>
        )}
      </div>

      {showAdd && <IntakeLogModal open={showAdd} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
