import { useMemo, useState } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import { EXERCISE_CATEGORIES, EXERCISE_CATEGORY_MAP, ExerciseCategoryId } from '@/features/exercise/config';
import AddWorkoutModal from '@/components/modals/AddWorkoutModal';
import WorkoutDetailDrawer from '@/components/drawer/WorkoutDetailDrawer';

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgP = 'hsl(var(--bg-primary))';
const bgS = 'hsl(var(--bg-secondary))';

interface Props { onClose: () => void; }
type PageTab = 'workouts' | 'analytics';

export default function WorkoutsPage({ onClose }: Props) {
  const { data: workouts, isLoading } = useWorkouts();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState<ExerciseCategoryId | 'all'>('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<PageTab>('workouts');

  const filtered = useMemo(() => {
    const base = category === 'all' ? (workouts ?? []) : (workouts ?? []).filter(w => w.categoryId === category);
    const searched = search.trim() ? base.filter(w => w.name.toLowerCase().includes(search.toLowerCase())) : base;
    return [...searched].sort((a, b) => a.name.localeCompare(b.name));
  }, [workouts, category, search]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: bgP, display: 'flex', flexDirection: 'column', fontFamily: mono }}>
      <div style={{ height: 56, borderBottom: `1px solid ${adim}`, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 9, color: adim, letterSpacing: 2 }}>// WORKOUTS</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>WORKOUTS</span>
        <span style={{ fontSize: 10, color: dim }}>{(workouts ?? []).length} total</span>
        <div style={{ flex: 1 }} />
        <button className="topbar-btn" onClick={() => setShowAdd(true)}>+ ADD WORKOUT</button>
        <button className="topbar-btn" onClick={onClose}>X CLOSE</button>
      </div>
      <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${adim}`, padding: '8px 24px', background: bgS }}>
        <button className="topbar-btn" onClick={() => setTab('workouts')} style={{ borderColor: tab === 'workouts' ? acc : adim, color: tab === 'workouts' ? acc : dim }}>WORKOUTS</button>
        <button className="topbar-btn" onClick={() => setTab('analytics')} style={{ borderColor: tab === 'analytics' ? acc : adim, color: tab === 'analytics' ? acc : dim }}>ANALYTICS</button>
      </div>
      {tab === 'workouts' && (
        <>
          <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${adim}`, padding: '8px 24px', background: bgS, flexWrap: 'wrap' }}>
            <button className="topbar-btn" onClick={() => setCategory('all')} style={{ borderColor: category === 'all' ? acc : adim, color: category === 'all' ? acc : dim }}>ALL</button>
            {EXERCISE_CATEGORIES.map(c => (
              <button key={c.id} className="topbar-btn" onClick={() => setCategory(c.id)} style={{ borderColor: category === c.id ? acc : adim, color: category === c.id ? acc : dim }}>{c.label}</button>
            ))}
            <div style={{ flex: 1 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workouts..." style={{ width: 220, background: bgP, border: `1px solid ${adim}`, color: acc, fontFamily: mono, fontSize: 10, padding: '4px 8px' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {isLoading && <div style={{ fontSize: 11, color: dim }}>LOADING...</div>}
              {!isLoading && filtered.length === 0 && <div style={{ fontSize: 11, color: dim }}>No workouts found.</div>}
              {!isLoading && filtered.map(w => (
                <div key={w.id} onClick={() => setSelectedId(selectedId === w.id ? null : w.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `1px solid ${adim}`, marginBottom: 6, cursor: 'pointer', background: bgS }}>
                  <span style={{ color: acc, fontSize: 11, flex: 1 }}>{w.name}</span>
                  <span style={{ color: dim, fontSize: 9 }}>{EXERCISE_CATEGORY_MAP[w.categoryId].label}</span>
                  <span style={{ color: adim, fontSize: 9 }}>{w.exerciseCount} EX</span>
                </div>
              ))}
            </div>
            <div style={{ width: selectedId ? 420 : 0, transition: 'width 200ms ease', overflow: 'hidden', borderLeft: selectedId ? `1px solid ${adim}` : 'none' }}>
              {selectedId && <WorkoutDetailDrawer workoutId={selectedId} onClose={() => setSelectedId(null)} />}
            </div>
          </div>
        </>
      )}
      {tab === 'analytics' && <div style={{ padding: '20px 24px', color: dim, fontSize: 11 }}>Analytics scaffold ready for workouts.</div>}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAdd(false)}>
          <div style={{ width: 760, maxWidth: 'calc(100vw - 40px)', background: bgP, border: `1px solid ${adim}` }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: acc, fontSize: 10, letterSpacing: 2 }}>// ADD WORKOUT</span>
              <button className="topbar-btn" onClick={() => setShowAdd(false)}>X CLOSE</button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <AddWorkoutModal onClose={() => setShowAdd(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
