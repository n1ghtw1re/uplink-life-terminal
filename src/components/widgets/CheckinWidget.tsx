// ============================================================
// src/components/widgets/CheckinWidget.tsx
// Daily check-in via habit completion
// ============================================================
import { useState } from 'react';
import { useHabits, useTodayLogs } from '@/hooks/useHabits';
import { STAT_META, StatKey, Habit } from '@/types';
import WidgetWrapper from '../WidgetWrapper';
import Modal from '../Modal';
import AddHabitModal from '../modals/AddHabitModal';

type FilterKey = StatKey | 'all';

const STAT_FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',   label: 'ALL' },
  { key: 'body',  label: 'BODY' },
  { key: 'wire',  label: 'WIRE' },
  { key: 'mind',  label: 'MIND' },
  { key: 'cool',  label: 'COOL' },
  { key: 'grit',  label: 'GRIT' },
  { key: 'flow',  label: 'FLOW' },
  { key: 'ghost', label: 'GHOST' },
];

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim  = 'hsl(var(--text-dim))';
const green = '#44ff88';
const bgT  = 'hsl(var(--bg-tertiary))';

interface Props {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  isModal?: boolean;
}

export default function CheckinWidget({ onClose, onFullscreen, isFullscreen, isModal }: Props) {
  const { habits, isLoading, checkIn } = useHabits();
  const { data: todayMap = {} } = useTodayLogs();
  const [statFilter, setStatFilter] = useState<FilterKey>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [quantityValues, setQuantityValues] = useState<Record<string, number | ''>>({});

  const activeHabits = habits.filter(h => h.status === 'ACTIVE');
  
  const displayHabits = activeHabits
    .filter(h => statFilter === 'all' || h.stat_key === statFilter)
    .slice(0, 8);

  const handleCheckIn = async (habit: Habit) => {
    if (todayMap[habit.id]?.completed) return;
    
    const value = habit.target_type === 'QUANTITATIVE' && habit.target_value
      ? (Number(quantityValues[habit.id]) || 1)
      : undefined;
    
    try {
      await checkIn({ habit, value });
      setQuantityValues(prev => ({ ...prev, [habit.id]: '' }));
    } catch (e) {
      console.error('Check-in failed:', e);
    }
  };

  const handleQuantityChange = (habitId: string, val: number | '') => {
    setQuantityValues(prev => ({ ...prev, [habitId]: val }));
  };

  const now = new Date();
  const dateStr = `${now.getFullYear()}.${(now.getMonth()+1).toString().padStart(2,'0')}.${now.getDate().toString().padStart(2,'0')}`;

  const completedCount = activeHabits.filter(h => todayMap[h.id]?.completed).length;
  const totalCount = activeHabits.length;

  const content = (
    <>
      {/* Date */}
      <div style={{ fontSize: 11, color: dim, marginBottom: 8, fontFamily: vt }}>{dateStr}</div>

      {/* Stat filters */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 10, flexWrap: 'nowrap', overflowX: 'auto' }}>
        {STAT_FILTERS.map(f => (
          <button key={f.key} onClick={() => setStatFilter(f.key)} style={{
            padding: '2px 8px', fontSize: 9, fontFamily: mono,
            cursor: 'pointer', letterSpacing: 1, whiteSpace: 'nowrap',
            border: `1px solid ${statFilter === f.key ? acc : adim}`,
            background: statFilter === f.key ? 'rgba(255,176,0,0.1)' : 'transparent',
            color: statFilter === f.key ? acc : dim,
          }}>
            {f.key === 'all' ? f.label : `${STAT_META[f.key as StatKey]?.icon} ${f.label}`}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 8px', background: 'hsl(var(--bg-tertiary))', border: `1px solid ${adim}`,
        marginBottom: 8, fontSize: 10
      }}>
        <span style={{ color: dim, fontFamily: mono }}>PROGRESS</span>
        <span style={{ fontFamily: vt, fontSize: 14, color: completedCount === totalCount ? green : acc }}>
          {completedCount}/{totalCount} COMPLETE
        </span>
      </div>

      {/* Habits list */}
      {isLoading ? (
        <div style={{ fontSize: 10, color: dim, textAlign: 'center', padding: 20 }}>Loading...</div>
      ) : displayHabits.length === 0 ? (
        <div style={{ fontSize: 10, color: dim, textAlign: 'center', padding: 20 }}>
          No habits yet.<br />Add one to start tracking.
        </div>
      ) : (
        <div>
          {displayHabits.map(habit => {
            const isDone = todayMap[habit.id]?.completed;
            const statIcon = STAT_META[habit.stat_key as StatKey]?.icon ?? '?';
            const isQuantity = habit.target_type === 'QUANTITATIVE' && habit.target_value;
            const quantityVal = quantityValues[habit.id] ?? '';
            
            return (
              <div 
                key={habit.id}
                onClick={() => !isDone && handleCheckIn(habit)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 6,
                  padding: '4px 6px',
                  cursor: isDone ? 'default' : 'pointer',
                  background: isDone ? 'rgba(68,255,136,0.05)' : 'transparent',
                  border: `1px solid ${isDone ? 'rgba(68,255,136,0.3)' : 'transparent'}`,
                }}
              >
                {/* Checkbox */}
                <span style={{
                  fontSize: 12, width: 14, flexShrink: 0,
                  color: isDone ? green : adim,
                }}>
                  {isDone ? '✓' : '□'}
                </span>

                {/* Stat icon */}
                <span style={{ fontSize: 10, color: adim, flexShrink: 0 }}>{statIcon}</span>

                {/* Name */}
                <span style={{
                  fontSize: 10, color: isDone ? dim : acc,
                  flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', fontFamily: mono,
                }}>
                  {habit.name}
                  {isQuantity && !isDone && <span style={{ color: adim, marginLeft: 4 }}>({habit.target_value})</span>}
                </span>

                {/* Quantity input for QUANTITATIVE */}
                {isQuantity && !isDone && (
                  <input
                    type="number"
                    min={1}
                    value={quantityVal}
                    onChange={e => handleQuantityChange(habit.id, e.target.value === '' ? '' : Number(e.target.value))}
                    onKeyDown={e => { if (e.key === 'Enter') handleCheckIn(habit); }}
                    placeholder="#"
                    style={{
                      width: 40,
                      padding: '2px 4px',
                      fontSize: 9,
                      background: bgT,
                      border: `1px solid ${adim}`,
                      color: acc,
                      fontFamily: mono,
                      textAlign: 'center',
                    }}
                  />
                )}

                {/* Streak */}
                <span style={{
                  fontSize: 9, flexShrink: 0,
                  color: habit.current_streak > 0 ? (habit.current_streak >= 7 ? green : acc) : dim,
                }}>
                  🔥{habit.current_streak}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => setShowAdd(true)} style={{
          background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9,
          color: acc, cursor: 'pointer',
        }}>+ ADD HABIT</button>
        <span style={{ fontSize: 9, color: dim, fontFamily: mono }}>Click habit or press ↵ to check in</span>
      </div>

      {isModal ? (
        <AddHabitModal open={showAdd} onClose={() => setShowAdd(false)} />
      ) : (
        <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD NEW HABIT" width={500}>
          <AddHabitModal open={showAdd} isModal={false} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
    </>
  );

  if (isModal) {
    return content;
  }

  return (
    <WidgetWrapper title="DAILY CHECK-IN" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      {content}
    </WidgetWrapper>
  );
}