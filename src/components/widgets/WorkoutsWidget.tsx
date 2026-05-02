import { useMemo, useState } from 'react';
import WidgetWrapper from '@/components/WidgetWrapper';
import Modal from '@/components/Modal';
import AddWorkoutModal from '@/components/modals/AddWorkoutModal';
import { useWorkouts } from '@/hooks/useWorkouts';
import { EXERCISE_CATEGORY_MAP } from '@/features/exercise/config';

type FilterKey = 'recent' | 'most_used' | 'alpha';
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'recent', label: 'RECENT' },
  { key: 'most_used', label: 'MOST USED' },
  { key: 'alpha', label: 'A-Z' },
];
const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';

interface Props {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenWorkouts?: () => void;
  onWorkoutClick?: (id: string) => void;
}

export default function WorkoutsWidget({ onClose, onFullscreen, isFullscreen, onOpenWorkouts, onWorkoutClick }: Props) {
  const { data: workouts, isLoading } = useWorkouts();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('alpha');
  const [search, setSearch] = useState('');

  const display = useMemo(() => {
    const base = [...(workouts ?? [])];
    const searched = search.trim() ? base.filter(w => w.name.toLowerCase().includes(search.toLowerCase())) : base;
    if (filter === 'alpha') return searched.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8);
    if (filter === 'recent') return searched.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 8);
    return searched.sort((a, b) => (b.completedCount ?? 0) - (a.completedCount ?? 0)).slice(0, 8);
  }, [workouts, filter, search]);

  return (
    <WidgetWrapper title="WORKOUTS" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workouts..." style={{ width: '100%', padding: '3px 8px 3px 20px', fontSize: 9, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' }} />
        <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: adim, pointerEvents: 'none' }}>⌕</span>
        {search && <span onClick={() => setSearch('')} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: adim, cursor: 'pointer' }}>×</span>}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: '2px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer', letterSpacing: 1, border: `1px solid ${filter === f.key ? acc : adim}`, background: filter === f.key ? 'rgba(255,176,0,0.1)' : 'transparent', color: filter === f.key ? acc : dim }}>
            {f.label}
          </button>
        ))}
      </div>
      {isLoading && <div style={{ fontSize: 10, color: dim }}>LOADING...</div>}
      {!isLoading && display.length === 0 && <div style={{ fontSize: 10, color: dim }}>{search ? 'No workouts match search' : 'No workouts yet.'}</div>}
      {!isLoading && display.map(w => (
        <div key={w.id} onClick={() => onWorkoutClick?.(w.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, cursor: onWorkoutClick ? 'pointer' : 'default' }}>
          <span style={{ fontSize: 10, color: acc, flex: 1, fontFamily: mono }}>{w.name}</span>
          <span style={{ fontSize: 9, color: adim }}>{EXERCISE_CATEGORY_MAP[w.categoryId].label}</span>
        </div>
      ))}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer' }}>+ ADD WORKOUT</button>
        <button onClick={onOpenWorkouts} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer' }}>VIEW ALL {'>'}</button>
      </div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD WORKOUT" width={760}>
        <AddWorkoutModal onClose={() => setShowAdd(false)} />
      </Modal>
    </WidgetWrapper>
  );
}
