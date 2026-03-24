// src/components/widgets/AugmentsWidget.tsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { useAugments } from '@/hooks/useAugments';
import { getLevelFromXP } from '@/services/xpService';
import WidgetWrapper from '../WidgetWrapper';
import Modal from '../Modal';
import AddAugmentModal from '../modals/AddAugmentModal';

type FilterKey = 'active' | 'recent' | 'most_used' | 'new';
const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'active',    label: 'ACTIVE'    },
  { key: 'recent',    label: 'RECENT'    },
  { key: 'most_used', label: 'MOST USED' },
  { key: 'new',       label: 'NEW'       },
];

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim  = 'hsl(var(--text-dim))';

interface Props {
  onClose?: () => void; onFullscreen?: () => void;
  isFullscreen?: boolean; onOpenAugments?: () => void;
  onAugmentClick?: (id: string) => void;
}

export default function AugmentsWidget({ onClose, onFullscreen, isFullscreen, onOpenAugments, onAugmentClick }: Props) {
  const { data: augments, isLoading } = useAugments();
  const [showAdd, setShowAdd]         = useState(false);
  const [filter, setFilter]         = useState<FilterKey>(() => (localStorage.getItem('widget-augments-filter') as FilterKey) || 'active');
  const [search, setSearch]         = useState('');
  const setFilterPersist = (f: FilterKey) => { setFilter(f); localStorage.setItem('widget-augments-filter', f); };

  const { data: sessionCounts = {} } = useQuery({
    queryKey: ['augment-session-counts'],
    staleTime: 0,
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<{ augment_id: string; count: string }>(
        `SELECT aug_id, COUNT(*) as count
         FROM (
           SELECT jsonb_array_elements_text(augment_ids::jsonb) as aug_id FROM sessions WHERE augment_ids::text != '[]'
         ) t GROUP BY aug_id;`
      );
      return Object.fromEntries(res.rows.map(r => [(r as any).aug_id ?? (r as any).augment_id, Number(r.count)]));
    },
  });

  const { data: lastSessions = {} } = useQuery({
    queryKey: ['augment-last-session'],
    staleTime: 0,
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<{ augment_id: string; last: string }>(
        `SELECT aug_id, MAX(logged_at) as last
         FROM (
           SELECT jsonb_array_elements_text(augment_ids::jsonb) as aug_id, logged_at FROM sessions WHERE augment_ids::text != '[]'
         ) t GROUP BY aug_id;`
      );
      return Object.fromEntries(res.rows.map(r => [(r as any).aug_id ?? (r as any).augment_id, r.last]));
    },
  });

  const displayAugments = useMemo(() => {
    const searchFn = (name: string) => !search.trim() || name.toLowerCase().includes(search.toLowerCase());
    const all = augments ?? [];
    switch (filter) {
      case 'active':
        return all.filter(a => a.active && searchFn(a.name)).sort((a, b) => b.level !== a.level ? b.level - a.level : b.xp - a.xp).slice(0, 8);
      case 'recent':
        return all.filter(a => a.active && lastSessions[a.id] && searchFn(a.name)).sort((a, b) => String(lastSessions[b.id] ?? '').localeCompare(String(lastSessions[a.id] ?? ''))).slice(0, 8);
      case 'most_used':
        return all.filter(a => a.active && (sessionCounts[a.id] ?? 0) > 0 && searchFn(a.name)).sort((a, b) => (sessionCounts[b.id] ?? 0) - (sessionCounts[a.id] ?? 0)).slice(0, 8);
      case 'new':
        return all.filter(a => a.active && !sessionCounts[a.id] && searchFn(a.name)).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8);
      default: return [];
    }
  }, [augments, filter, sessionCounts, lastSessions, search]);

  return (
    <WidgetWrapper title="AUGMENTS" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>

      {/* Filter tabs */}
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search augments..."
          style={{ width: '100%', padding: '3px 8px 3px 20px', fontSize: 9, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${search ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`, color: 'hsl(var(--accent))', fontFamily: "'IBM Plex Mono', monospace", outline: 'none', boxSizing: 'border-box' as const }} />
        <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: 'hsl(var(--accent-dim))', pointerEvents: 'none' }}>⌕</span>
        {search && <span onClick={() => setSearch('')} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'hsl(var(--accent-dim))', cursor: 'pointer' }}>×</span>}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map(f => (
          <button key={f.key} onClick={() => setFilterPersist(f.key)} style={{
            padding: '2px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
            border: `1px solid ${filter === f.key ? acc : adim}`,
            background: filter === f.key ? 'rgba(255,176,0,0.1)' : 'transparent',
            color: filter === f.key ? acc : dim,
          }}>{f.label}</button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
      ) : displayAugments.length === 0 ? (
        <div style={{ fontSize: 10, color: dim, opacity: 0.6 }}>
          {filter === 'recent' && 'No augments used yet'}
          {filter === 'most_used' && 'No sessions logged yet'}
          {filter === 'new' && 'All augments have been used'}
          {filter === 'active' && 'No active augments'}
        </div>
      ) : (
        <div>
          {displayAugments.map(aug => {
            const { level, xpInLevel, xpForLevel } = getLevelFromXP(Number(aug.xp) || 0);
            const pct   = xpForLevel > 0 ? Math.round((xpInLevel / xpForLevel) * 100) : 0;
            const count = sessionCounts[aug.id];
            const last  = lastSessions[aug.id];
            return (
              <div key={aug.id} onClick={() => onAugmentClick?.(aug.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, cursor: onAugmentClick ? 'pointer' : 'default' }}
                onMouseEnter={e => { if (onAugmentClick) e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <span style={{ fontSize: 9, color: adim, width: 12, flexShrink: 0 }}>⬡</span>
                <span style={{ fontSize: 11, color: acc, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: mono }}>
                  {aug.name}
                </span>
                {filter === 'most_used' && count && <span style={{ fontSize: 9, color: adim, flexShrink: 0, width: 40, textAlign: 'right' }}>{count}×</span>}
                {filter === 'recent' && last && <span style={{ fontSize: 9, color: adim, flexShrink: 0, width: 48, textAlign: 'right' }}>{new Date(last).toLocaleDateString('en', { month: 'numeric', day: 'numeric' })}</span>}
                <span style={{ fontFamily: vt, fontSize: 14, color: acc, flexShrink: 0, width: 42 }}>LVL {level}</span>
                <div style={{ width: 60, height: 5, flexShrink: 0, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${adim}` }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: acc }} />
                </div>
                <span style={{ fontFamily: mono, fontSize: 9, color: dim, width: 28, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = acc}
          onMouseLeave={e => e.currentTarget.style.color = adim}
        >+ ADD AUGMENT</button>
        <button onClick={onOpenAugments} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = acc}
          onMouseLeave={e => e.currentTarget.style.color = adim}
        >VIEW ALL ›</button>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD AUGMENT" width={600}>
        <AddAugmentModal onClose={() => setShowAdd(false)} />
      </Modal>
    </WidgetWrapper>
  );
}