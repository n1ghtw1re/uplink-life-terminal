import { useMemo, useState } from 'react';
import VaultItemDrawer from '@/components/drawer/VaultItemDrawer';
import VaultItemModal from '@/components/modals/VaultItemModal';
import { useVaultItems } from '@/hooks/useVault';
import type { VaultCategory } from '@/types';
import { getVaultNotesPreview, VAULT_CATEGORIES } from '@/services/vaultService';

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgP = 'hsl(var(--bg-primary))';
const bgS = 'hsl(var(--bg-secondary))';

interface VaultPageProps {
  onClose: () => void;
}

export default function VaultPage({ onClose }: VaultPageProps) {
  const { items, isLoading } = useVaultItems();
  const [activeTab, setActiveTab] = useState<VaultCategory | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'alpha' | 'date'>('date');

  const filtered = useMemo(() => {
    let base = activeTab === 'ALL' ? items : items.filter((item) => item.category === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter((item) => item.title.toLowerCase().includes(q) || (item.notes ?? '').toLowerCase().includes(q));
    }
    return [...base].sort((a, b) => {
      if (sortBy === 'alpha') {
        return a.title.localeCompare(b.title);
      }
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }, [items, activeTab, search, sortBy]);

  const countFor = (category: VaultCategory | 'ALL') => category === 'ALL' ? items.length : items.filter((item) => item.category === category).length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: bgP, display: 'flex', flexDirection: 'column', fontFamily: mono }}>
      <div style={{ height: 56, flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// ARSENAL</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>VAULT</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: dim }}>{items.length} completed works</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setSortBy('alpha')}
            style={{
              padding: '4px 10px',
              fontSize: 9,
              fontFamily: mono,
              cursor: 'pointer',
              border: `1px solid ${sortBy === 'alpha' ? acc : adim}`,
              background: sortBy === 'alpha' ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: sortBy === 'alpha' ? acc : dim,
              letterSpacing: 1,
            }}
          >
            A-Z
          </button>
          <button
            onClick={() => setSortBy('date')}
            style={{
              padding: '4px 10px',
              fontSize: 9,
              fontFamily: mono,
              cursor: 'pointer',
              border: `1px solid ${sortBy === 'date' ? acc : adim}`,
              background: sortBy === 'date' ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: sortBy === 'date' ? acc : dim,
              letterSpacing: 1,
            }}
          >
            DATE ADDED
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: adim, pointerEvents: 'none' }}>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vault..."
            style={{ padding: '4px 10px 4px 24px', fontSize: 10, width: 180, background: bgS, border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: adim, cursor: 'pointer', fontSize: 12 }}>×</button>}
        </div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '5px 16px', fontSize: 10, border: `1px solid ${acc}`, background: 'rgba(255,176,0,0.1)', color: acc, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>
          + ADD ITEM
        </button>
        <button onClick={onClose} style={{ padding: '5px 12px', fontSize: 10, border: `1px solid ${adim}`, background: 'transparent', color: dim, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>
          × CLOSE
        </button>
      </div>

      <div style={{ flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', padding: '0 16px', background: bgS }}>
        {(['ALL', ...VAULT_CATEGORIES] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedId(null); }}
            style={{ padding: '10px 14px', fontSize: 10, border: 'none', borderBottom: `2px solid ${activeTab === tab ? acc : 'transparent'}`, background: 'transparent', color: activeTab === tab ? acc : dim, fontFamily: mono, cursor: 'pointer' }}
          >
            {tab} <span style={{ fontSize: 8, opacity: 0.6 }}>({countFor(tab)})</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          {isLoading ? (
            <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
          ) : filtered.length === 0 ? (
            <div style={{ fontSize: 10, color: dim, opacity: 0.6, marginTop: 40, textAlign: 'center' }}>
              {search ? `No vault items matching "${search}"` : activeTab === 'ALL' ? 'No vault items yet.' : `No ${activeTab.toLowerCase()} items yet.`}
            </div>
          ) : filtered.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedId(isSelected ? null : item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  marginBottom: 6,
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(255,176,0,0.06)' : bgS,
                  border: `1px solid ${isSelected ? acc : 'rgba(153,104,0,0.4)'}`,
                }}
              >
                <span style={{ fontSize: 9, color: acc, border: `1px solid ${acc}`, padding: '1px 5px', letterSpacing: 1, flexShrink: 0 }}>{item.category}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: mono, fontSize: 11, color: acc, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                  <div style={{ fontSize: 9, color: dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {getVaultNotesPreview(item.notes, 110) || 'No notes'}
                  </div>
                </div>
                <span style={{ fontSize: 9, color: adim, flexShrink: 0 }}>{item.completed_date}</span>
              </div>
            );
          })}
        </div>

        <div style={{ width: selectedId ? 420 : 0, flexShrink: 0, overflow: 'hidden', transition: 'width 200ms ease', borderLeft: selectedId ? `1px solid ${adim}` : 'none', display: 'flex', flexDirection: 'column' }}>
          {selectedId && (
            <>
              <div style={{ height: 36, flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 12px', background: bgS }}>
                <button onClick={() => setSelectedId(null)} style={{ background: 'transparent', border: 'none', color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer', letterSpacing: 1 }}>
                  × CLOSE
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <VaultItemDrawer itemId={selectedId} onClose={() => setSelectedId(null)} />
              </div>
            </>
          )}
        </div>
      </div>

      {showAdd && <VaultItemModal open={showAdd} onClose={() => setShowAdd(false)} initialCategory={activeTab} />}
    </div>
  );
}
