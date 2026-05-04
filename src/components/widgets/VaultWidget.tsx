import { useMemo, useState } from 'react';
import WidgetWrapper from '@/components/WidgetWrapper';
import VaultItemModal from '@/components/modals/VaultItemModal';
import { useVaultItems } from '@/hooks/useVault';
import type { VaultCategory } from '@/types';
import { getVaultNotesPreview, VAULT_CATEGORIES } from '@/services/vaultService';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';

type FilterKey = 'all' | VaultCategory;

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'ALL' },
  ...VAULT_CATEGORIES.map(c => ({ key: c as FilterKey, label: c })),
];

interface VaultWidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenVault?: () => void;
  onVaultClick?: (id: string) => void;
}

export default function VaultWidget({ onClose, onFullscreen, isFullscreen, onOpenVault, onVaultClick }: VaultWidgetProps) {
  const { items, isLoading } = useVaultItems();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<FilterKey>(() => (localStorage.getItem('widget-vault-filter') as FilterKey) || 'all');
  const [search, setSearch] = useState('');

  const setFilterPersist = (f: FilterKey) => { setFilter(f); localStorage.setItem('widget-vault-filter', f); };

  const displayItems = useMemo(() => {
    const searchFn = (title: string) => !search.trim() || title.toLowerCase().includes(search.toLowerCase());
    const filtered = filter === 'all' ? items : items.filter((item) => item.category === filter);
    return filtered.filter(item => searchFn(item.title)).slice(0, 10);
  }, [items, filter, search]);

  return (
    <>
      <WidgetWrapper title="VAULT" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
        {/* Search box */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vault..."
            style={{ width: '100%', padding: '3px 8px 3px 20px', fontSize: 9, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' }} />
          <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: adim, pointerEvents: 'none' }}>⌕</span>
          {search && <span onClick={() => setSearch('')} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: adim, cursor: 'pointer' }}>×</span>}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilterPersist(f.key)}
              style={{
                padding: '2px 6px',
                fontSize: 8,
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

        {isLoading ? (
          <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>LOADING...</div>
        ) : displayItems.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>
            {filter !== 'all' ? `No ${filter.toLowerCase()} items yet.` : 'No completed works yet.'}
          </div>
        ) : (
          <div>
            {displayItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onVaultClick?.(item.id)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, cursor: onVaultClick ? 'pointer' : 'default' }}
              >
                <span style={{ fontSize: 8, color: acc, flexShrink: 0 }}>●</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, color: acc, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: mono }}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: 8, color: adim, border: `1px solid ${adim}`, padding: '1px 4px', flexShrink: 0 }}>{item.category}</span>
                  </div>
                  <div style={{ fontSize: 8, color: dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.completed_date} · {getVaultNotesPreview(item.notes, 42) || 'Completed work'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}>
            + ADD ITEM
          </button>
          <button onClick={onOpenVault} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}>
            VIEW ALL {'>'}
          </button>
        </div>
      </WidgetWrapper>

      {showAdd && <VaultItemModal open={showAdd} onClose={() => setShowAdd(false)} />}
    </>
  );
}
