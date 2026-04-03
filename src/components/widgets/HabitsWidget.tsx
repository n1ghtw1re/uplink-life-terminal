// ============================================================
// src/components/widgets/HabitsWidget.tsx
// ============================================================
import { useState } from 'react';
import { useHabits, useTodayLogs } from '@/hooks/useHabits';
import { STAT_META, StatKey, Habit } from '@/types';
import WidgetWrapper from '../WidgetWrapper';
import Modal from '../Modal';
import AddHabitModal from '../modals/AddHabitModal';

type FilterKey = 'active' | 'due' | 'streak' | 'retired';

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'active',  label: 'ACTIVE' },
  { key: 'due',     label: 'DUE' },
  { key: 'streak',  label: 'STREAK' },
  { key: 'retired', label: 'RETIRED' },
];

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim  = 'hsl(var(--text-dim))';
const green = '#44ff88';

interface Props {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenHabits?: () => void;
  onHabitClick?: (habit: Habit) => void;
}

export default function HabitsWidget({ onClose, onFullscreen, isFullscreen, onOpenHabits, onHabitClick }: Props) {
  const { habits, isLoading } = useHabits();
  const { data: todayMap = {} } = useTodayLogs();
  const [showAdd, setShowAdd]     = useState(false);
  const [filter, setFilter]       = useState<FilterKey>(() => (localStorage.getItem('widget-habits-filter') as FilterKey) || 'active');
  const [search, setSearch]       = useState('');
  const setFilterPersist = (f: FilterKey) => { setFilter(f); localStorage.setItem('widget-habits-filter', f); };

  const displayHabits = (() => {
    let all = habits.filter(h => {
      // Filter by status
      if (filter === 'active') return h.status === 'ACTIVE';
      if (filter === 'retired') return h.status === 'RETIRED';
      if (filter === 'due') return h.status === 'ACTIVE' && !(todayMap[h.id]?.completed ?? false); // Due but NOT done
      return true;
    });

    // Search filter
    if (search.trim()) {
      all = all.filter(h => h.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Sort
    if (filter === 'streak') {
      return all.sort((a, b) => b.current_streak - a.current_streak).slice(0, 8);
    }
    if (filter === 'due') {
      return all.sort((a, b) => b.current_streak - a.current_streak).slice(0, 8);
    }
    // Active/Retired - sort by name or streak
    return all.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'ACTIVE' ? -1 : 1;
      return b.current_streak - a.current_streak;
    }).slice(0, 8);
  })();

  return (
    <WidgetWrapper title="HABITS" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search habits..."
          style={{ width: '100%', padding: '3px 8px 3px 20px', fontSize: 9, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }} />
        <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: adim, pointerEvents: 'none' }}>⌕</span>
        {search && <span onClick={() => setSearch('')} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: adim, cursor: 'pointer' }}>×</span>}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map(f => (
          <button key={f.key} onClick={() => setFilterPersist(f.key)} style={{
            padding: '2px 8px', fontSize: 9, fontFamily: mono,
            cursor: 'pointer', letterSpacing: 1,
            border: `1px solid ${filter === f.key ? acc : adim}`,
            background: filter === f.key ? 'rgba(255,176,0,0.1)' : 'transparent',
            color: filter === f.key ? acc : dim,
          }}>{f.label}</button>
        ))}
      </div>

      {/* Habit list */}
      {isLoading ? (
        <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
      ) : displayHabits.length === 0 ? (
        <div style={{ fontSize: 10, color: dim, opacity: 0.6 }}>
          {filter === 'active' && 'No active habits'}
          {filter === 'due' && 'No habits due today'}
          {filter === 'streak' && 'No active habits with streaks'}
          {filter === 'retired' && 'No retired habits'}
        </div>
      ) : (
        <div>
          {displayHabits.map(habit => {
            const statIcon = STAT_META[habit.stat_key as StatKey]?.icon ?? '?';
            const todayData = todayMap[habit.id];
            const isDue = habit.status === 'ACTIVE' && todayData;
            const doneToday = todayData?.completed ?? false;
            const todayValue = todayData?.value ?? 0;
            const isQuantity = habit.target_type === 'QUANTITATIVE' && habit.target_value;

            return (
              <div key={habit.id} onClick={() => onHabitClick?.(habit)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, 
                  cursor: onHabitClick ? 'pointer' : 'default',
                  padding: '4px 6px',
                  background: habit.status !== 'ACTIVE' ? 'rgba(255,255,255,0.02)' : 
                              isDue ? 'rgba(255,176,0,0.05)' : 'transparent',
                  border: `1px solid ${habit.status !== 'ACTIVE' ? adim : 'transparent'}`,
                  opacity: habit.status !== 'ACTIVE' ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (onHabitClick) e.currentTarget.style.borderColor = acc; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = habit.status !== 'ACTIVE' ? adim : 'transparent'; }}
              >
                {/* Status indicator */}
                <span style={{ 
                  fontSize: 10, width: 10, flexShrink: 0,
                  color: habit.status === 'ACTIVE' ? green : habit.status === 'PAUSED' ? '#ffaa00' : adim,
                }}>
                  {habit.status === 'ACTIVE' ? '●' : habit.status === 'PAUSED' ? '◐' : '○'}
                </span>

                {/* Stat icon */}
                <span style={{ fontSize: 10, color: adim, flexShrink: 0 }}>{statIcon}</span>

                {/* Name */}
                <span style={{ 
                  fontSize: 10, color: habit.status !== 'ACTIVE' ? dim : acc, 
                  flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap', fontFamily: mono 
                }}>
                  {habit.name}
                </span>

                {/* Streak */}
                <span style={{ 
                  fontSize: 9, flexShrink: 0,
                  color: habit.current_streak >= 7 ? green : habit.current_streak > 0 ? acc : dim 
                }}>
                  🔥{habit.current_streak}
                </span>

                {/* Today's quantity */}
                {isQuantity && habit.target_value && (
                  <span style={{ 
                    fontSize: 9, flexShrink: 0,
                    color: doneToday ? green : (todayValue > 0 ? acc : dim),
                    marginLeft: 4,
                  }}>
                    {todayValue}/{habit.target_value}
                  </span>
                )}

                {/* Shields */}
                <span style={{ fontSize: 9, color: adim, flexShrink: 0 }}>
                  {'🛡'.repeat(habit.shields)}
                </span>

                {/* Due/Done badge */}
                {habit.status === 'ACTIVE' && (
                  doneToday ? (
                    <span style={{ 
                      fontSize: 8, padding: '1px 4px', 
                      background: 'rgba(68,255,136,0.15)', 
                      color: green, border: `1px solid ${green}`,
                      flexShrink: 0,
                    }}>
                      DONE
                    </span>
                  ) : isDue ? (
                    <span style={{ 
                      fontSize: 8, padding: '1px 4px', 
                      background: 'rgba(255,176,0,0.15)', 
                      color: acc, border: `1px solid ${acc}`,
                      flexShrink: 0,
                    }}>
                      DUE
                    </span>
                  ) : null
                )}

                {/* Retired/Paused badge */}
                {habit.status !== 'ACTIVE' && (
                  <span style={{ 
                    fontSize: 8, padding: '1px 4px', 
                    background: 'transparent', 
                    color: habit.status === 'PAUSED' ? '#ffaa00' : dim, 
                    border: `1px solid ${habit.status === 'PAUSED' ? '#ffaa00' : adim}`,
                    flexShrink: 0,
                  }}>
                    {habit.status === 'PAUSED' ? 'PAUSED' : 'RETIRED'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = acc}
          onMouseLeave={e => e.currentTarget.style.color = adim}
        >+ ADD HABIT</button>
        <button onClick={onOpenHabits} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = acc}
          onMouseLeave={e => e.currentTarget.style.color = adim}
        >VIEW ALL ›</button>
      </div>

      {showAdd && <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD HABIT" width={500}>
        <AddHabitModal open={showAdd} isModal={false} onClose={() => setShowAdd(false)} />
      </Modal>}
    </WidgetWrapper>
  );
}