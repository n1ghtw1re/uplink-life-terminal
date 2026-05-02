import { useMemo, useState } from 'react';
import { useExercises } from '@/hooks/useExercises';
import { EXERCISE_CATEGORIES, EXERCISE_CATEGORY_MAP, ExerciseCategoryId } from '@/features/exercise/config';
import AddExerciseModal from '@/components/modals/AddExerciseModal';
import ExerciseDetailDrawer from '@/components/drawer/ExerciseDetailDrawer';

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgP = 'hsl(var(--bg-primary))';
const bgS = 'hsl(var(--bg-secondary))';

interface Props {
  onClose: () => void;
}

type PageTab = 'exercise' | 'analytics';
type SortKey = 'level' | 'name' | 'xp' | 'active';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'active', label: 'ACTIVE' },
  { key: 'level', label: 'LEVEL' },
  { key: 'name', label: 'A-Z' },
  { key: 'xp', label: 'XP' },
];

function XPBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ width: 140, height: 5, background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--accent-dim))' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: acc, boxShadow: '0 0 4px rgba(255,176,0,0.4)' }} />
    </div>
  );
}

export default function ExercisePage({ onClose }: Props) {
  const { data: exercises, isLoading } = useExercises();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState<ExerciseCategoryId | 'all'>('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<PageTab>('exercise');
  const [sortKey, setSortKey] = useState<SortKey>('active');

  const filtered = useMemo(() => {
    const base = category === 'all' ? (exercises ?? []) : (exercises ?? []).filter(e => e.categoryId === category);
    const searched = search.trim() ? base.filter(e => e.name.toLowerCase().includes(search.toLowerCase())) : base;
    return [...searched].sort((a, b) => {
      if (sortKey === 'active') {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      }
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'xp') return (b.xp ?? 0) - (a.xp ?? 0);
      if (sortKey === 'level') return b.level !== a.level ? b.level - a.level : (b.xp ?? 0) - (a.xp ?? 0);
      return 0;
    });
  }, [exercises, category, search, sortKey]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: bgP, display: 'flex', flexDirection: 'column', fontFamily: mono }}>
      <div style={{ height: 56, borderBottom: `1px solid ${adim}`, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 9, color: adim, letterSpacing: 2 }}>// EXERCISE</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>EXERCISE</span>
        <span style={{ fontSize: 10, color: dim }}>{(exercises ?? []).length} total</span>
        <div style={{ flex: 1 }} />
        <button className="topbar-btn" onClick={() => setShowAdd(true)}>+ ADD EXERCISE</button>
        <button className="topbar-btn" onClick={onClose}>X CLOSE</button>
      </div>

      <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${adim}`, padding: '8px 24px', background: bgS }}>
        <button className="topbar-btn" onClick={() => setTab('exercise')} style={{ borderColor: tab === 'exercise' ? acc : adim, color: tab === 'exercise' ? acc : dim }}>EXERCISE</button>
        <button className="topbar-btn" onClick={() => setTab('analytics')} style={{ borderColor: tab === 'analytics' ? acc : adim, color: tab === 'analytics' ? acc : dim }}>ANALYTICS</button>
      </div>

      {tab === 'exercise' && (
        <>
          <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${adim}`, padding: '8px 24px', background: bgS, flexWrap: 'wrap' }}>
            <button className="topbar-btn" onClick={() => setCategory('all')} style={{ borderColor: category === 'all' ? acc : adim, color: category === 'all' ? acc : dim }}>ALL</button>
            {EXERCISE_CATEGORIES.map(c => (
              <button key={c.id} className="topbar-btn" onClick={() => setCategory(c.id)} style={{ borderColor: category === c.id ? acc : adim, color: category === c.id ? acc : dim }}>{c.label}</button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 4 }}>
              {SORT_OPTIONS.map(s => (
                <button key={s.key} className="topbar-btn" onClick={() => setSortKey(s.key)} style={{ borderColor: sortKey === s.key ? acc : adim, color: sortKey === s.key ? acc : dim }}>{s.label}</button>
              ))}
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercise..." style={{ width: 220, background: bgP, border: `1px solid ${adim}`, color: acc, fontFamily: mono, fontSize: 10, padding: '4px 8px' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {isLoading && <div style={{ fontSize: 11, color: dim }}>LOADING...</div>}
              {!isLoading && filtered.length === 0 && <div style={{ fontSize: 11, color: dim }}>No exercises found.</div>}
              {!isLoading && filtered.map(ex => (
                <div
                  key={ex.id}
                  onClick={() => setSelectedId(selectedId === ex.id ? null : ex.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    border: `1px solid ${ex.active ? adim : 'rgba(153,104,0,0.15)'}`,
                    marginBottom: 6,
                    cursor: 'pointer',
                    background: bgS,
                    opacity: ex.active ? 1 : 0.45,
                  }}
                >
                  <span style={{ color: acc, fontSize: 11, flex: 1 }}>{ex.name}</span>
                  <span style={{ color: dim, fontSize: 9, width: 90, textAlign: 'center' }}>{EXERCISE_CATEGORY_MAP[ex.categoryId].label}</span>
                  <span style={{ color: adim, fontSize: 9, width: 48 }}>LVL {ex.level}</span>
                  <XPBar value={ex.xpInLevel} max={ex.xpForLevel} />
                  <span style={{ color: dim, fontSize: 9, width: 34, textAlign: 'right' }}>{ex.xpForLevel > 0 ? Math.round((ex.xpInLevel / ex.xpForLevel) * 100) : 100}%</span>
                </div>
              ))}
            </div>
            <div style={{ width: selectedId ? 420 : 0, transition: 'width 200ms ease', overflow: 'hidden', borderLeft: selectedId ? `1px solid ${adim}` : 'none' }}>
              {selectedId && <ExerciseDetailDrawer exerciseId={selectedId} onClose={() => setSelectedId(null)} />}
            </div>
          </div>
        </>
      )}

      {tab === 'analytics' && (
        <div style={{ padding: '20px 24px', color: dim, fontSize: 11 }}>
          Analytics scaffold ready. Category filter: {category === 'all' ? 'ALL' : EXERCISE_CATEGORY_MAP[category].label}
        </div>
      )}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAdd(false)}>
          <div style={{ width: 680, maxWidth: 'calc(100vw - 40px)', background: bgP, border: `1px solid ${adim}` }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: acc, fontSize: 10, letterSpacing: 2 }}>// ADD EXERCISE</span>
              <button className="topbar-btn" onClick={() => setShowAdd(false)}>X CLOSE</button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <AddExerciseModal onClose={() => setShowAdd(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
