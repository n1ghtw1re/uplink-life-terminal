// ============================================================
// src/components/overlays/AddHabitModal.tsx
// ============================================================
import { useState, Fragment } from 'react';
import { useHabits } from '@/hooks/useHabits';
import { useUpdateWeekStart, useOperator } from '@/hooks/useOperator';
import { StatKey, STAT_META } from '@/types';
import Modal from '../Modal';

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const dim  = 'hsl(var(--text-dim))';
const adim = 'hsl(var(--accent-dim))';
const bgS  = 'hsl(var(--bg-secondary))';
const bgT  = 'hsl(var(--bg-tertiary))';

const STATS: StatKey[] = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

interface AddHabitModalProps {
  open?: boolean;
  isModal?: boolean;
  onClose: () => void;
}

export default function AddHabitModal({ open, isModal = true, onClose }: AddHabitModalProps) {
  if (!open) return null;
  
  const content = <FormContent onClose={onClose} />;
  
  if (!isModal) {
    return content;
  }
  
  return (
    <Modal open={open} onClose={onClose} title="ADD NEW HABIT" width={500}>
      {content}
    </Modal>
  );
}

function FormContent({ onClose }: { onClose: () => void }) {
  const { createHabit } = useHabits();
  const { data: operator } = useOperator();
  const updateWeekStart = useUpdateWeekStart();

  const [name, setName] = useState('');
  const [statKey, setStatKey] = useState<StatKey>('body');

  const [freqType, setFreqType] = useState<'DAILY' | 'INTERVAL' | 'SPECIFIC_DAYS' | 'TARGET'>('DAILY');
  const [intervalDays, setIntervalDays] = useState(2);
  const [specificDays, setSpecificDays] = useState<number[]>([]);

  const [targetType, setTargetType] = useState<'BINARY' | 'QUANTITATIVE'>('BINARY');
  const [targetValue, setTargetValue] = useState<number | ''>(8);
  const [targetPeriodDays, setTargetPeriodDays] = useState<number | ''>(7);

  const [reminder, setReminder] = useState<string>('');
  const [streakGoal, setStreakGoal] = useState<number | ''>(21);
  const [streakReward, setStreakReward] = useState<number | ''>(100);
  const currentWeekStart = (operator?.weekStart as 'MONDAY' | 'SUNDAY') || 'MONDAY';

  const handleWeekStartChange = (val: 'MONDAY' | 'SUNDAY') => {
    updateWeekStart.mutate(val);
  };

  const toggleDay = (d: number) => {
    setSpecificDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    await createHabit({
      name: name.trim(),
      stat_key: statKey,
      frequency_type: freqType,
      interval_days: freqType === 'INTERVAL' ? intervalDays : null,
      specific_days: freqType === 'SPECIFIC_DAYS' && specificDays.length > 0 ? specificDays : null,
      target_type: targetType,
      target_value: targetType === 'QUANTITATIVE' ? (Number(targetValue) || 1) : null,
      target_period_days: freqType === 'TARGET' ? (Number(targetPeriodDays) || 7) : null,
      reminder_time: reminder || null,
      streak_goal: Number(streakGoal) || null,
      streak_reward: Number(streakReward) || 100,
    });
    onClose();
  };

  const segBtn = (active: boolean) => ({
    padding: '6px 12px',
    background: active ? 'rgba(255,176,0,0.12)' : 'transparent',
    border: `1px solid ${active ? acc : adim}`,
    color: active ? acc : dim,
    fontFamily: mono,
    fontSize: 10,
    cursor: 'pointer',
    flex: 1,
    textAlign: 'center' as const,
    transition: 'all 150ms',
  });

  return (
    <Fragment>
      <div style={{ fontFamily: mono, color: acc, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Habit Name */}
        <div>
          <div style={{ fontSize: 10, color: adim, letterSpacing: 1, marginBottom: 8 }}>// HABIT DESIGNATION</div>
          <input
            className="crt-input"
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            placeholder="e.g. Morning Meditation"
            style={{ width: '100%', fontSize: 14, padding: '10px 12px', background: bgT, boxSizing: 'border-box' }}
          />
        </div>

        {/* Linked Stat */}
        <div>
          <div style={{ fontSize: 10, color: adim, letterSpacing: 1, marginBottom: 8 }}>// LINKED STAT CORE</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATS.map(s => (
              <button key={s} onClick={() => setStatKey(s)} style={{ ...segBtn(statKey === s), flex: 'none', padding: '6px 14px' }}>
                {STAT_META[s].icon} {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency + Target side by side */}
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Frequency */}
          <div style={{ flex: 1, background: bgT, border: `1px solid ${adim}`, padding: 14 }}>
            <div style={{ fontSize: 10, color: adim, letterSpacing: 1, marginBottom: 12 }}>// EXECUTION SCHEDULE</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              <button onClick={() => setFreqType('DAILY')} style={segBtn(freqType === 'DAILY')}>DAILY</button>
              <button onClick={() => setFreqType('SPECIFIC_DAYS')} style={segBtn(freqType === 'SPECIFIC_DAYS')}>SET DAYS</button>
              <button onClick={() => setFreqType('INTERVAL')} style={segBtn(freqType === 'INTERVAL')}>INTERVAL</button>
              <button onClick={() => setFreqType('TARGET')} style={segBtn(freqType === 'TARGET')}>TARGET</button>
            </div>

            {freqType === 'INTERVAL' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <span style={{ fontSize: 10, color: dim }}>EVERY</span>
                <input type="number" min={2} max={30} value={intervalDays}
                  onChange={e => setIntervalDays(Number(e.target.value))}
                  className="crt-input" style={{ width: 56, textAlign: 'center' }} />
                <span style={{ fontSize: 10, color: dim }}>DAYS</span>
              </div>
            )}

            {freqType === 'SPECIFIC_DAYS' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginTop: 8 }}>
                {DAYS.map((d, idx) => (
                  <button key={d} onClick={() => toggleDay(idx)} style={segBtn(specificDays.includes(idx))}>
                    {d}
                  </button>
                ))}
              </div>
            )}

            {freqType === 'TARGET' && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 9, color: dim, marginBottom: 8, lineHeight: 1.4 }}>
                  Complete this habit <span style={{ color: acc }}>{targetValue || 3}</span> times in <span style={{ color: acc }}>{targetPeriodDays || 7}</span> days
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: dim }}>TIMES:</span>
                  <input type="number" min={1} max={30} value={targetValue}
                    onChange={e => setTargetValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="crt-input" style={{ width: 50, textAlign: 'center' }} />
                  <span style={{ fontSize: 10, color: dim }}>IN</span>
                  <input type="number" min={1} max={30} value={targetPeriodDays}
                    onChange={e => setTargetPeriodDays(e.target.value === '' ? '' : Number(e.target.value))}
                    className="crt-input" style={{ width: 50, textAlign: 'center' }} />
                  <span style={{ fontSize: 10, color: dim }}>DAYS</span>
                </div>
              </div>
            )}
          </div>

          {/* Target */}
          <div style={{ flex: 1, background: bgT, border: `1px solid ${adim}`, padding: 14 }}>
            <div style={{ fontSize: 10, color: adim, letterSpacing: 1, marginBottom: 12 }}>// TARGET GOAL</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button onClick={() => setTargetType('BINARY')} style={segBtn(targetType === 'BINARY')}>BINARY</button>
              <button onClick={() => setTargetType('QUANTITATIVE')} style={segBtn(targetType === 'QUANTITATIVE')}>QUANTITY</button>
            </div>

            {targetType === 'QUANTITATIVE' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: dim }}>TARGET:</span>
                <input type="number" min={1} value={targetValue}
                  onChange={e => setTargetValue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="crt-input" style={{ width: 70 }} placeholder="#" />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: targetType === 'BINARY' ? 4 : 0 }}>
              <span style={{ fontSize: 10, color: adim }}>REMINDER:</span>
              <input type="time" value={reminder} onChange={e => setReminder(e.target.value)}
                className="crt-input" style={{ padding: '5px 8px', fontSize: 11 }} />
            </div>
          </div>
        </div>

        {/* Streak Commitment */}
        <div style={{ background: bgT, border: `1px solid ${adim}`, padding: 14, display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: acc, letterSpacing: 1, marginBottom: 4 }}>// STREAK COMMITMENT (OPTIONAL)</div>
            <div style={{ fontSize: 9, color: dim, lineHeight: 1.5 }}>
              Set a target day count commitment. Hitting it unlocks a private XP payload.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: dim }}>GOAL:</span>
            <input type="number" min={1} value={streakGoal}
              onChange={e => setStreakGoal(e.target.value === '' ? '' : Number(e.target.value))}
              className="crt-input" style={{ width: 58 }} placeholder="Days" />
            <span style={{ fontSize: 10, color: dim }}>XP:</span>
            <input type="number" min={0} value={streakReward}
              onChange={e => setStreakReward(e.target.value === '' ? '' : Number(e.target.value))}
              className="crt-input" style={{ width: 72 }} />
          </div>
        </div>

        {/* XP Info Banner */}
        <div style={{ padding: '10px 14px', border: `1px solid ${adim}`, background: 'rgba(255,176,0,0.04)', fontSize: 9, color: dim, lineHeight: 1.8 }}>
          <span style={{ color: adim }}>AUTO REWARDS: </span>
          Complete daily <span style={{ color: acc }}>+10 XP</span> | 7-day streak <span style={{ color: acc }}>+50 XP</span> | 30-day streak <span style={{ color: acc }}>+500 XP</span>
        </div>

        {/* Week Start Preference */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: adim }}>
          <span style={{ letterSpacing: 1 }}>// WEEK STARTS ON:</span>
          <button onClick={() => handleWeekStartChange('MONDAY')} style={segBtn(currentWeekStart === 'MONDAY')}>MONDAY</button>
          <button onClick={() => handleWeekStartChange('SUNDAY')} style={segBtn(currentWeekStart === 'SUNDAY')}>SUNDAY</button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="topbar-btn" onClick={onClose} style={{ padding: '8px 20px', fontSize: 11 }}>
            [ CANCEL ]
          </button>
          <button
            className="topbar-btn"
            onClick={handleSave}
            disabled={!name.trim()}
            style={{
              padding: '8px 24px',
              fontSize: 11,
              background: name.trim() ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: name.trim() ? acc : adim,
              cursor: name.trim() ? 'pointer' : 'not-allowed',
            }}>
            [ EXECUTE_SAVE ]
          </button>
        </div>
      </div>
    </Fragment>
  );
}