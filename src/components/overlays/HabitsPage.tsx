// ============================================================
// src/components/overlays/HabitsPage.tsx
// Full-page habit overlay: Dashboard | Badges | All Habits
// ============================================================
import { useState } from 'react';
import { useHabits, useTodayLogs } from '@/hooks/useHabits';
import { useOperator, useUpdateHabitCutoffTime } from '@/hooks/useOperator';
import { STAT_META, StatKey, Habit } from '@/types';
import { isDueToday, daysAgoStr } from '@/services/habitService';
import AddHabitModal from '@/components/modals/AddHabitModal';
import Modal from '../Modal';
import HabitDrawer from '@/components/drawer/HabitDrawer';

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const dim  = 'hsl(var(--text-dim))';
const adim = 'hsl(var(--accent-dim))';
const bgP  = 'hsl(var(--bg-primary))';
const bgS  = 'hsl(var(--bg-secondary))';
const bgT  = 'hsl(var(--bg-tertiary))';
const green = '#44ff88';
const red   = '#ff4444';

const PAGES: { key: 1 | 2 | 3; label: string }[] = [
  { key: 1, label: 'DASHBOARD' },
  { key: 2, label: 'BADGES' },
  { key: 3, label: 'ALL HABITS' },
];

const STAT_TABS: { key: StatKey | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'ALL' },
  { key: 'body', label: 'BODY' },
  { key: 'wire', label: 'WIRE' },
  { key: 'mind', label: 'MIND' },
  { key: 'cool', label: 'COOL' },
  { key: 'grit', label: 'GRIT' },
  { key: 'flow', label: 'FLOW' },
  { key: 'ghost', label: 'GHOST' },
];

interface HabitsPageProps { onClose: () => void; }

// ── Page 1: Dashboard ─────────────────────────────────────────
function DashboardPage({ onOpenHabit }: { onOpenHabit: (h: Habit) => void }) {
  const { data: operator } = useOperator();
  const cutoffTime = operator?.habitCutoffTime;
  const { habits, todaysHabits, checkIn, isLoading } = useHabits(cutoffTime);
  const { data: todayMap = {} } = useTodayLogs(cutoffTime);

  const active = habits.filter(h => h.status === 'ACTIVE');
  const doneToday = todaysHabits.filter(h => todayMap[h.id]).length;
  const topStreaks = [...active].sort((a, b) => b.current_streak - a.current_streak).slice(0, 5);

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%', minHeight: 0 }}>
      {/* Left column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'ACTIVE', value: active.length },
            { label: 'DUE TODAY', value: todaysHabits.length },
            { label: 'DONE TODAY', value: doneToday },
            { label: 'RETIRED', value: habits.filter(h => h.status === 'RETIRED').length },
          ].map(({ label, value }) => (
            <div key={label} style={{ flex: 1, padding: '10px 12px', background: bgT, border: `1px solid ${adim}`, textAlign: 'center' }}>
              <div style={{ fontFamily: vt, fontSize: 28, color: acc }}>{value}</div>
              <div style={{ fontSize: 8, color: dim, letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Today's checklist */}
        <div style={{ flex: 1, background: bgT, border: `1px solid ${adim}`, padding: 14, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: 11, color: acc, fontFamily: vt, letterSpacing: 1, marginBottom: 12 }}>
            // TODAY'S MISSIONS — {doneToday}/{todaysHabits.length}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {isLoading && <div style={{ fontSize: 9, color: dim }}>// LOADING...</div>}
            {todaysHabits.length === 0 && !isLoading && (
              <div style={{ fontSize: 10, color: dim }}>No habits scheduled today.</div>
            )}
            {todaysHabits.map(h => {
              const done = !!todayMap[h.id];
              return (
                <div key={h.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px', cursor: 'pointer',
                  background: done ? 'rgba(68,255,136,0.05)' : 'transparent',
                  border: `1px solid ${done ? 'rgba(68,255,136,0.25)' : adim}`,
                }} onClick={() => !done && checkIn({ habit: h })}>
                  <span style={{ fontSize: 14, color: done ? green : adim }}>{done ? '✓' : '□'}</span>
                  <span style={{ fontSize: 10, color: done ? dim : acc, flex: 1 }}>{h.name}</span>
                  <span style={{ fontSize: 9, color: adim }}>{STAT_META[h.stat_key as StatKey]?.icon ?? '?'}</span>
                  <span style={{ fontSize: 9, color: h.current_streak > 0 ? acc : dim }}>🔥{h.current_streak}</span>
                  <span style={{ fontSize: 9, color: adim }}>{'🛡'.repeat(h.shields)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right column */}
      <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Top Streaks */}
        <div style={{ padding: 14, background: bgT, border: `1px solid ${adim}` }}>
          <div style={{ fontSize: 11, color: acc, fontFamily: vt, letterSpacing: 1, marginBottom: 12 }}>// TOP STREAKS</div>
          {topStreaks.length === 0 && <div style={{ fontSize: 9, color: dim }}>No active streaks</div>}
          {topStreaks.map((h, i) => (
            <div key={h.id} onClick={() => onOpenHabit(h)} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 8, cursor: 'pointer', padding: '4px 0',
              borderBottom: `1px solid rgba(153,104,0,0.15)`,
            }}>
              <span style={{ fontSize: 9, color: dim, marginRight: 6 }}>#{i + 1}</span>
              <span style={{ fontSize: 10, color: acc, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
              <span style={{ fontSize: 11, color: h.current_streak >= 7 ? green : acc }}>🔥{h.current_streak}</span>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div style={{ padding: 14, background: bgT, border: `1px solid ${adim}`, flex: 1 }}>
          <div style={{ fontSize: 11, color: acc, fontFamily: vt, letterSpacing: 1, marginBottom: 12 }}>// ALERTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 9 }}>
            {active.filter(h => h.shields === 0 && h.current_streak > 0).map(h => (
              <div key={h.id} style={{ color: red, padding: '4px 8px', border: `1px solid ${red}44`, background: `${red}11` }}>
                ⚠ {h.name} — NO SHIELDS
              </div>
            ))}
            {active.filter(h => h.shields === 1).map(h => (
              <div key={h.id} style={{ color: '#ffaa00', padding: '4px 8px', border: `1px solid #ffaa0044`, background: `#ffaa0011` }}>
                🛡 {h.name} — LAST SHIELD
              </div>
            ))}
            {active.filter(h => h.streak_goal && h.current_streak === h.streak_goal - 1).map(h => (
              <div key={h.id} style={{ color: acc, padding: '4px 8px', border: `1px solid ${adim}`, background: 'rgba(255,176,0,0.05)' }}>
                ⚡ {h.name} — GOAL TOMORROW!
              </div>
            ))}
            {active.filter(h => h.shields === 0 && h.current_streak > 0).length === 0 &&
             active.filter(h => h.shields === 1).length === 0 && (
               <div style={{ color: green, fontSize: 9 }}>✓ All systems nominal</div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page 2: Badges ────────────────────────────────────────────
function BadgesPage() {
  const mockBadges = [
    { id: 1, name: 'FIRST HABIT', desc: 'Create your first habit', earned: true },
    { id: 2, name: 'WEEK WARRIOR', desc: 'Complete a 7-day streak', earned: false },
    { id: 3, name: 'IRON WILL', desc: 'Complete a 30-day streak', earned: false },
    { id: 4, name: 'MULTI-TRACK', desc: 'Run 3 habits simultaneously', earned: false },
    { id: 5, name: 'SHIELD MAX', desc: 'Max shields on any habit', earned: false },
    { id: 6, name: 'COMMITTED', desc: 'Hit a streak goal', earned: false },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div style={{ fontSize: 10, color: dim }}>// Achievement system coming soon. Badges will unlock as you build your habits.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {mockBadges.map(badge => (
          <div key={badge.id} style={{
            padding: 14, background: bgT, border: `1px solid ${badge.earned ? acc : adim}`,
            opacity: badge.earned ? 1 : 0.45, textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{badge.earned ? '🏆' : '🔒'}</div>
            <div style={{ fontFamily: vt, fontSize: 16, color: badge.earned ? acc : dim, letterSpacing: 1 }}>{badge.name}</div>
            <div style={{ fontSize: 9, color: dim, marginTop: 4 }}>{badge.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page 3: All Habits ────────────────────────────────────────
function AllHabitsPage({ onOpenHabit }: { onOpenHabit: (h: Habit) => void }) {
  const { data: operator } = useOperator();
  const cutoffTime = operator?.habitCutoffTime;
  const { habits, isLoading } = useHabits(cutoffTime);
  const [statTab, setStatTab]  = useState<StatKey | 'ALL'>('ALL');
  const [search, setSearch]    = useState('');
  const [sort, setSort]        = useState<'name' | 'streak' | 'created'>('streak');
  const [showAdd, setShowAdd]  = useState(false);

  const filtered = habits
    .filter(h => statTab === 'ALL' || h.stat_key === statTab)
    .filter(h => h.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'name')    return a.name.localeCompare(b.name);
      if (sort === 'streak')  return b.current_streak - a.current_streak;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const active  = filtered.filter(h => h.status === 'ACTIVE');
  const retired = filtered.filter(h => h.status !== 'ACTIVE');

  const countForStat = (stat: StatKey | 'ALL') => {
    if (stat === 'ALL') return habits.length;
    return habits.filter(h => h.stat_key === stat).length;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
          <span style={{ position: 'absolute', left: 8, fontSize: 10, color: adim, pointerEvents: 'none' }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search habits..."
            style={{
              padding: '4px 10px 4px 24px', fontSize: 10, width: '100%',
              background: bgS, border: `1px solid ${search ? acc : adim}`,
              color: acc, fontFamily: mono, outline: 'none',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: 6, background: 'transparent',
              border: 'none', color: adim, cursor: 'pointer', fontSize: 12, padding: 0,
            }}>×</button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: adim, letterSpacing: 1 }}>SORT:</span>
          {[
            { key: 'streak', label: 'STREAK' },
            { key: 'name', label: 'NAME' },
            { key: 'created', label: 'NEWEST' },
          ].map(s => (
            <button key={s.key} onClick={() => setSort(s.key as any)} style={{
              padding: '3px 8px', fontSize: 9,
              fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
              border: `1px solid ${sort === s.key ? acc : adim}`,
              background: sort === s.key ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: sort === s.key ? acc : dim,
            }}>{s.label}</button>
          ))}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: '5px 14px', fontSize: 10,
            border: `1px solid ${acc}`,
            background: 'transparent', color: acc,
            fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = acc; e.currentTarget.style.color = bgP; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = acc; }}
        >
          [ + ADD HABIT ]
        </button>
      </div>

      {/* Stat tabs */}
      <div style={{
        flexShrink: 0,
        borderBottom: `1px solid ${adim}`,
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 4,
        background: bgS,
      }}>
        {STAT_TABS.map(({ key, label }) => {
          const count = countForStat(key);
          const isActive = statTab === key;
          return (
            <button
              key={key}
              onClick={() => setStatTab(key)}
              style={{
                padding: '10px 14px', fontSize: 10,
                border: 'none', borderBottom: `2px solid ${isActive ? acc : 'transparent'}`,
                background: 'transparent',
                color: isActive ? acc : dim,
                fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                transition: 'all 150ms',
              }}
            >
              {key === 'ALL' ? label : `${STAT_META[key as StatKey]?.icon} ${label}`}
              <span style={{ fontSize: 9, color: isActive ? adim : 'rgba(153,104,0,0.3)', marginLeft: 4 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {isLoading && <div style={{ fontSize: 9, color: dim }}>// LOADING...</div>}
        {active.length === 0 && !isLoading && (
          <div style={{ fontSize: 10, color: dim, padding: 8 }}>No habits found. Add your first habit →</div>
        )}
        {active.map(h => (
          <div key={h.id} onClick={() => onOpenHabit(h)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', cursor: 'pointer',
            background: 'transparent', border: `1px solid ${adim}`,
            opacity: h.status !== 'ACTIVE' ? 0.45 : 1,
            transition: 'all 150ms',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = acc)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = adim)}
          >
            <span style={{ fontSize: 12 }}>{STAT_META[h.stat_key as StatKey]?.icon ?? '?'}</span>
            <span style={{ flex: 1, fontSize: 11, color: acc }}>{h.name}</span>
            <span style={{ fontSize: 9, color: dim }}>{h.frequency_type}</span>
            <span style={{ fontSize: 10, color: h.current_streak >= 7 ? green : dim }}>🔥{h.current_streak}</span>
            <span style={{ fontSize: 9, color: adim }}>{'🛡'.repeat(h.shields)}</span>
            {h.status === 'RETIRED' && (
              <span style={{ fontSize: 8, color: dim, border: `1px solid ${adim}`, padding: '1px 6px' }}>RETIRED</span>
            )}
            {h.status === 'PAUSED' && (
              <span style={{ fontSize: 8, color: '#ffaa00', border: `1px solid #ffaa00`, padding: '1px 6px' }}>PAUSED</span>
            )}
          </div>
        ))}

        {retired.length > 0 && (
          <>
            <div style={{ fontSize: 9, color: adim, marginTop: 12, marginBottom: 4, letterSpacing: 1 }}>// RETIRED</div>
            {retired.map(h => (
              <div key={h.id} onClick={() => onOpenHabit(h)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', cursor: 'pointer',
                background: 'transparent', border: `1px solid ${adim}`,
                opacity: 0.45, transition: 'all 150ms',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = acc)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = adim)}
              >
                <span style={{ fontSize: 12 }}>{STAT_META[h.stat_key as StatKey]?.icon ?? '?'}</span>
                <span style={{ flex: 1, fontSize: 11, color: dim }}>{h.name}</span>
                <span style={{ fontSize: 8, color: dim, border: `1px solid ${adim}`, padding: '1px 6px' }}>RETIRED</span>
              </div>
            ))}
          </>
        )}
      </div>

      {showAdd && <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD NEW HABIT" width={500}>
        <AddHabitModal open={showAdd} isModal={false} onClose={() => setShowAdd(false)} />
      </Modal>}
    </div>
  );
}

// ── Main Overlay ──────────────────────────────────────────────
export default function HabitsPage({ onClose }: HabitsPageProps) {
  const [page, setPage]            = useState<1 | 2 | 3>(1);
  const [drawerHabit, setDrawerHabit] = useState<Habit | null>(null);
  const { data: operator } = useOperator();
  const updateCutoffTime = useUpdateHabitCutoffTime();
  const cutoffTime = operator?.habitCutoffTime || '06:00';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: bgP,
      display: 'flex', flexDirection: 'column',
      fontFamily: mono,
    }}>
      {/* Header */}
      <div style={{
        height: 56, flexShrink: 0,
        borderBottom: `1px solid ${adim}`,
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 16,
      }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// HABITS</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>
          HABIT SYSTEM
        </span>
        <span style={{ fontFamily: mono, fontSize: 10, color: dim }}>
          Behavior Protocols
        </span>
        <div style={{ flex: 1 }} />

        {/* Page tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {PAGES.map(p => {
            const isActive = page === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setPage(p.key)}
                style={{
                  padding: '6px 14px', fontSize: 10,
                  border: 'none', borderBottom: `2px solid ${isActive ? acc : 'transparent'}`,
                  background: 'transparent',
                  color: isActive ? acc : dim,
                  fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                  transition: 'all 150ms',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Cutoff Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: adim }}>CUTOFF:</span>
          <input
            type="time"
            value={cutoffTime}
            onChange={e => updateCutoffTime.mutate(e.target.value)}
            style={{
              background: bgT,
              border: `1px solid ${adim}`,
              color: acc,
              fontFamily: mono,
              fontSize: 10,
              padding: '2px 6px',
            }}
          />
        </div>

        {/* Close */}
        <button onClick={onClose} style={{
          padding: '5px 12px', fontSize: 10,
          border: `1px solid ${adim}`,
          background: 'transparent', color: dim,
          fontFamily: mono, cursor: 'pointer',
        }}>
          × CLOSE
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {page === 1 && <DashboardPage onOpenHabit={setDrawerHabit} />}
        {page === 2 && <BadgesPage />}
        {page === 3 && <AllHabitsPage onOpenHabit={setDrawerHabit} />}
      </div>

      {drawerHabit && (
        <HabitDrawer
          habitId={drawerHabit.id}
          onClose={() => setDrawerHabit(null)}
        />
      )}
    </div>
  );
}