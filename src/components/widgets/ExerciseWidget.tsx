import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import WidgetWrapper from '@/components/WidgetWrapper';
import Modal from '@/components/Modal';
import AddExerciseModal from '@/components/modals/AddExerciseModal';
import { useExercises } from '@/hooks/useExercises';
import { EXERCISE_CATEGORY_MAP } from '@/features/exercise/config';
import { getStatLevel } from '@/types';

type FilterKey = 'active' | 'recent' | 'most_used' | 'alpha';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'active', label: 'ACTIVE' },
  { key: 'recent', label: 'RECENT' },
  { key: 'most_used', label: 'MOST USED' },
  { key: 'alpha', label: 'A-Z' },
];

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim  = 'hsl(var(--text-dim))';

interface Props {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenExercise?: () => void;
  onExerciseClick?: (id: string) => void;
}

export default function ExerciseWidget({ onClose, onFullscreen, isFullscreen, onOpenExercise, onExerciseClick }: Props) {
  const { data: exercises, isLoading } = useExercises();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<FilterKey>(() => (localStorage.getItem('widget-exercise-filter') as FilterKey) || 'active');
  const [search, setSearch] = useState('');

  const setFilterPersist = (f: FilterKey) => { setFilter(f); localStorage.setItem('widget-exercise-filter', f); };

  // Session counts per exercise (for MOST USED)
  const { data: sessionCounts, isLoading: sessionCountsLoading } = useQuery({
    queryKey: ['exercise-session-counts'],
    staleTime: 0,
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ exercise_id: string; count: string }>(
        `SELECT exercise_id, COUNT(*) as count FROM output_log_exercises GROUP BY exercise_id;`
      );
      return Object.fromEntries(res.rows.map(r => [r.exercise_id, Number(r.count)]));
    },
  });

  // Last session date per exercise (for RECENT)
  const { data: lastSessions, isLoading: lastSessionsLoading } = useQuery({
    queryKey: ['exercise-last-session'],
    staleTime: 0,
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ exercise_id: string; last: string }>(
        `SELECT exercise_id, MAX(created_at) as last FROM output_logs GROUP BY exercise_id;`
      );
      return Object.fromEntries(res.rows.map(r => [r.exercise_id, r.last]));
    },
  });

  const sessionCountMap = sessionCounts ?? {};
  const lastSessionMap = lastSessions ?? {};

  const filterLoading =
    filter === 'recent'
      ? lastSessionsLoading
      : filter === 'most_used'
        ? sessionCountsLoading
        : false;

  const display = useMemo(() => {
    const base = [...(exercises ?? [])];
    const searched = search.trim() ? base.filter(e => e.name.toLowerCase().includes(search.toLowerCase())) : base;
    switch (filter) {
      case 'active':
        return searched
          .filter(e => (e as any).active !== false)
          .sort((a, b) => {
            const la = getStatLevel(a.xp).level;
            const lb = getStatLevel(b.xp).level;
            return lb !== la ? lb - la : b.xp - a.xp;
          })
          .slice(0, 8);
      case 'recent':
        return searched
          .filter(e => (e as any).active !== false && lastSessionMap[e.id])
          .sort((a, b) => {
            const da = String(lastSessionMap[a.id] ?? '');
            const db = String(lastSessionMap[b.id] ?? '');
            return db.localeCompare(da);
          })
          .slice(0, 8);
      case 'most_used':
        return searched
          .filter(e => (e as any).active !== false && (sessionCountMap[e.id] ?? 0) > 0)
          .sort((a, b) => Number(sessionCountMap[b.id] ?? 0) - Number(sessionCountMap[a.id] ?? 0))
          .slice(0, 8);
      case 'alpha':
        return searched.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8);
      default:
        return [];
    }
  }, [exercises, filter, sessionCountMap, lastSessionMap, search]);

  return (
    <WidgetWrapper title="EXERCISE" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search exercise..."
          style={{
            width: '100%',
            padding: '3px 8px 3px 20px',
            fontSize: 9,
            background: 'hsl(var(--bg-tertiary))',
            border: `1px solid ${search ? acc : adim}`,
            color: acc,
            fontFamily: mono,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: adim, pointerEvents: 'none' }}>⌕</span>
        {search && <span onClick={() => setSearch('')} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: adim, cursor: 'pointer' }}>×</span>}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilterPersist(f.key)}
            style={{
              padding: '2px 8px',
              fontSize: 9,
              fontFamily: mono,
              cursor: 'pointer',
              letterSpacing: 1,
              border: `1px solid ${filter === f.key ? acc : adim}`,
              background: filter === f.key ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: filter === f.key ? acc : dim,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      {isLoading || filterLoading ? (
        <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
      ) : display.length === 0 ? (
        <div style={{ fontSize: 10, color: dim, opacity: 0.6 }}>
          {filter === 'recent'    && 'No exercises logged yet'}
          {filter === 'most_used' && 'No sessions logged yet'}
          {filter === 'alpha'      && (search ? 'No exercises match search' : 'No exercises yet.')}
          {filter === 'active'    && (search ? 'No exercises match search' : 'No active exercises')}
        </div>
      ) : (
        <div>
          {display.map(ex => {
            const { level, xpInLevel, xpForLevel } = getStatLevel(ex.xp ?? 0);
            const pct = xpForLevel > 0 ? Math.round((xpInLevel / xpForLevel) * 100) : 100;
            const count = sessionCountMap[ex.id];
            const last  = lastSessionMap[ex.id];

            return (
              <div key={ex.id} onClick={() => onExerciseClick?.(ex.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, cursor: onExerciseClick ? 'pointer' : 'default' }}
                onMouseEnter={e => { if (onExerciseClick) e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <span style={{ fontSize: 11, color: acc, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: mono }}>
                  {ex.name}
                </span>

                {/* Context info based on filter */}
                {filter === 'most_used' && count && (
                  <span style={{ fontSize: 9, color: adim, flexShrink: 0, width: 40, textAlign: 'right' }}>
                    {count}×
                  </span>
                )}
                {filter === 'recent' && last && (
                  <span style={{ fontSize: 9, color: adim, flexShrink: 0, width: 48, textAlign: 'right' }}>
                    {new Date(last).toLocaleDateString('en', { month: 'numeric', day: 'numeric' })}
                  </span>
                )}

                <span style={{ fontFamily: vt, fontSize: 14, color: acc, flexShrink: 0, width: 42 }}>
                  LVL {level}
                </span>
                <div style={{ width: 60, height: 5, flexShrink: 0, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${adim}` }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: acc }} />
                </div>
                <span style={{ fontFamily: mono, fontSize: 9, color: dim, width: 28, textAlign: 'right', flexShrink: 0 }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = acc}
          onMouseLeave={e => e.currentTarget.style.color = adim}
        >+ ADD EXERCISE</button>
        <button onClick={onOpenExercise} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = acc}
          onMouseLeave={e => e.currentTarget.style.color = adim}
        >VIEW ALL {'>'}</button>
      </div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD EXERCISE" width={680}>
        <AddExerciseModal onClose={() => setShowAdd(false)} />
      </Modal>
    </WidgetWrapper>
  );
}
