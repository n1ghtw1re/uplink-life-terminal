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
  const [activeCategory, setActiveCategory] = useState<VaultCategory | null>(null);

  const displayItems = useMemo(() => {
    const filtered = activeCategory ? items.filter((item) => item.category === activeCategory) : items;
    return filtered.slice(0, 6);
  }, [items, activeCategory]);

  return (
    <>
      <WidgetWrapper title="VAULT" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {VAULT_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory((prev) => prev === category ? null : category)}
              style={{
                padding: '2px 6px',
                fontSize: 8,
                fontFamily: mono,
                cursor: 'pointer',
                letterSpacing: 1,
                border: `1px solid ${activeCategory === category ? acc : adim}`,
                background: activeCategory === category ? 'rgba(255,176,0,0.1)' : 'transparent',
                color: activeCategory === category ? acc : dim,
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>LOADING...</div>
        ) : displayItems.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>
            {activeCategory ? `No ${activeCategory.toLowerCase()} items yet.` : 'No completed works yet.'}
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
