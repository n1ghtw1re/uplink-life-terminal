// ============================================================
// src/components/widgets/ResourcesWidget.tsx
// ============================================================
import { useState, useMemo } from 'react';
import { useResources } from '@/hooks/useResources';
import WidgetWrapper from '../WidgetWrapper';
import Modal from '../Modal';
import AddResourceModal from '../modals/AddResourceModal';

type FilterKey = 'all' | 'unread' | 'read';

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'all',    label: 'ALL'    },
  { key: 'unread', label: 'UNREAD' },
  { key: 'read',   label: 'READ'   },
];

const mono = "'IBM Plex Mono', monospace";
const acc  = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim  = 'hsl(var(--text-dim))';

interface Props {
  onClose?: () => void; onFullscreen?: () => void;
  isFullscreen?: boolean; onOpenResources?: () => void;
  onResourceClick?: (id: string) => void;
}

export default function ResourcesWidget({ onClose, onFullscreen, isFullscreen, onOpenResources, onResourceClick }: Props) {
  const { data: resources = [], isLoading } = useResources();
  const [showAdd, setShowAdd]   = useState(false);
  const [filter, setFilter]     = useState<FilterKey>(() => (localStorage.getItem('widget-resources-filter') as FilterKey) || 'all');
  const [search, setSearch]     = useState('');
  
  const setFilterPersist = (f: FilterKey) => { setFilter(f); localStorage.setItem('widget-resources-filter', f); };

  const displayResources = useMemo(() => {
    const searchFn = (title: string) => !search.trim() || title.toLowerCase().includes(search.toLowerCase());
    const all = resources;
    const sorted = [...all].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    switch (filter) {
      case 'all':
        return sorted.filter(r => searchFn(r.title)).slice(0, 10);
      case 'unread':
        return sorted.filter(r => r.status !== 'READ' && searchFn(r.title)).slice(0, 10);
      case 'read':
        return sorted.filter(r => r.status === 'READ' && searchFn(r.title)).slice(0, 10);
      default: return [];
    }
  }, [resources, filter, search]);

  return (
    <WidgetWrapper title="RESOURCES" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>

      {/* Filter tabs */}
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources..."
          style={{ width: '100%', padding: '3px 8px 3px 20px', fontSize: 9, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' }} />
        <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: adim, pointerEvents: 'none' }}>⌕</span>
        {search && <span onClick={() => setSearch('')} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: adim, cursor: 'pointer' }}>×</span>}
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

      {/* Resource list */}
      {isLoading ? (
        <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
      ) : displayResources.length === 0 ? (
        <div style={{ fontSize: 10, color: dim, opacity: 0.6 }}>
          {filter === 'unread' && 'No unread resources'}
          {filter === 'read'   && 'No read resources'}
          {filter === 'all'    && 'No resources yet'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {displayResources.map(resource => (
            <div key={resource.id} onClick={() => onResourceClick?.(resource.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: onResourceClick ? 'pointer' : 'default', borderBottom: `1px solid rgba(153,104,0,0.15)` }}
              onMouseEnter={e => { if (onResourceClick) e.currentTarget.style.background = 'rgba(255,176,0,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 8, color: adim, border: `1px solid ${adim}`, padding: '1px 4px', letterSpacing: 0.5, flexShrink: 0, width: 40, textAlign: 'center', overflow: 'hidden' }}>
                {resource.category.slice(0,4).toUpperCase()}
              </span>
              <span style={{ fontSize: 11, color: acc, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: mono, opacity: resource.status === 'READ' ? 0.6 : 1 }}>
                {resource.title}
              </span>
              <span style={{ fontSize: 9, color: resource.status === 'READ' ? adim : acc, flexShrink: 0, opacity: 0.8 }}>
                {resource.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = acc} onMouseLeave={e => e.currentTarget.style.color = adim}
        >+ ADD RESOURCE</button>
        <button onClick={onOpenResources} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = acc} onMouseLeave={e => e.currentTarget.style.color = adim}
        >VIEW ALL ›</button>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD RESOURCE" width={680}>
        <AddResourceModal onClose={() => setShowAdd(false)} />
      </Modal>
    </WidgetWrapper>
  );
}
