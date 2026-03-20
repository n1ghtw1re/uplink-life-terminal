// src/components/overlays/AugmentsPage.tsx
import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAugments } from '@/hooks/useAugments';
import { getLevelFromXP } from '@/services/xpService';
import AugmentDetailDrawer from '@/components/drawer/AugmentDetailDrawer';
import Modal from '@/components/Modal';
import AddAugmentModal from '@/components/modals/AddAugmentModal';

const mono  = "'IBM Plex Mono', monospace";
const vt    = "'VT323', monospace";
const acc   = 'hsl(var(--accent))';
const adim  = 'hsl(var(--accent-dim))';
const dim   = 'hsl(var(--text-dim))';
const bgP   = 'hsl(var(--bg-primary))';
const bgS   = 'hsl(var(--bg-secondary))';
const bgT   = 'hsl(var(--bg-tertiary))';
const green = '#44ff88';

const CLUSTERS = [
  'ALL',
  'Architecture & Code',
  'Core Intelligence',
  'Data & Strategy',
  'Identity & Safety',
  'Linguistic & Narrative',
  'Sonic & Acoustic',
  'Visual & Cinematic',
  'Workflow & Context',
];

type SortKey = 'active' | 'level' | 'name' | 'xp';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'active', label: 'ACTIVE' },
  { key: 'level',  label: 'LEVEL'  },
  { key: 'name',   label: 'A–Z'    },
  { key: 'xp',     label: 'XP'     },
];

function XPBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: bgT, border: `1px solid ${adim}`, height: 5, flex: 1 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: acc }} />
    </div>
  );
}

interface Props { onClose: () => void; }

export default function AugmentsPage({ onClose }: Props) {
  const queryClient = useQueryClient();
  const { data: augments = [], isLoading } = useAugments();

  const [activeCluster, setActiveCluster] = useState('ALL');
  const [sortKey, setSortKey]             = useState<SortKey>('active');
  const [search, setSearch]               = useState('');
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [showAdd, setShowAdd]             = useState(false);

  const filtered = useMemo(() => {
    let base = activeCluster === 'ALL'
      ? augments
      : augments.filter(a => a.category === activeCluster);

    if (search.trim()) {
      base = base.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    }

    return [...base].sort((a, b) => {
      if (sortKey === 'active') {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      }
      if (sortKey === 'level') return b.level !== a.level ? b.level - a.level : b.xp - a.xp;
      if (sortKey === 'xp')    return b.xp - a.xp;
      return a.name.localeCompare(b.name);
    });
  }, [augments, activeCluster, sortKey, search]);

  const clusterCount = (c: string) =>
    c === 'ALL' ? augments.length : augments.filter(a => a.category === c).length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: bgP, display: 'flex', flexDirection: 'column', fontFamily: mono }}>

      {/* Header */}
      <div style={{ height: 56, flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// ARSENAL</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>AUGMENTS</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: dim }}>
          {augments.filter(a => a.active).length} active
        </span>
        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: adim, pointerEvents: 'none' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search augments..."
            style={{ padding: '4px 10px 4px 24px', fontSize: 10, width: 180, background: bgS, border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: adim, cursor: 'pointer', fontSize: 12 }}>×</button>}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: adim, letterSpacing: 1 }}>SORT:</span>
          {SORT_OPTIONS.map(s => (
            <button key={s.key} onClick={() => setSortKey(s.key)} style={{
              padding: '3px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
              border: `1px solid ${sortKey === s.key ? acc : adim}`,
              background: sortKey === s.key ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: sortKey === s.key ? acc : dim,
            }}>{s.label}</button>
          ))}
        </div>

        <button onClick={() => setShowAdd(true)} style={{ padding: '5px 16px', fontSize: 10, border: `1px solid ${acc}`, background: 'rgba(255,176,0,0.1)', color: acc, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>+ ADD</button>
        <button onClick={onClose} style={{ padding: '5px 12px', fontSize: 10, border: `1px solid ${adim}`, background: 'transparent', color: dim, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>× CLOSE</button>
      </div>

      {/* Cluster tabs */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 2, background: bgS, overflowX: 'auto' }}>
        {CLUSTERS.map(c => (
          <button key={c} onClick={() => { setActiveCluster(c); setSelectedId(null); }} style={{
            padding: '10px 14px', fontSize: 10, flexShrink: 0,
            border: 'none', borderBottom: `2px solid ${activeCluster === c ? acc : 'transparent'}`,
            background: 'transparent', color: activeCluster === c ? acc : dim,
            fontFamily: mono, cursor: 'pointer',
          }}>
            {c}
            <span style={{ marginLeft: 5, fontSize: 8, opacity: 0.6 }}>({clusterCount(c)})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          {isLoading ? (
            <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
          ) : filtered.length === 0 ? (
            <div style={{ fontSize: 10, color: dim, opacity: 0.6, marginTop: 40, textAlign: 'center' }}>
              {search ? `No augments matching "${search}"` : `No augments in ${activeCluster}`}
            </div>
          ) : filtered.map(aug => {
            const { level, xpInLevel, xpForLevel } = getLevelFromXP(aug.xp);
            const pct = xpForLevel > 0 ? Math.round((xpInLevel / xpForLevel) * 100) : 100;
            const isSelected = selectedId === aug.id;

            return (
              <div key={aug.id}
                onClick={() => setSelectedId(isSelected ? null : aug.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '10px 16px', marginBottom: 4, cursor: 'pointer',
                  background: isSelected ? 'rgba(255,176,0,0.06)' : bgS,
                  border: `1px solid ${isSelected ? acc : aug.active ? 'rgba(153,104,0,0.4)' : 'rgba(153,104,0,0.2)'}`,
                  opacity: aug.active ? 1 : 0.45,
                  transition: 'border-color 150ms',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = adim; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = aug.active ? 'rgba(153,104,0,0.4)' : 'rgba(153,104,0,0.2)'; }}
              >
                <span style={{ fontSize: 9, color: adim, border: `1px solid ${adim}`, padding: '1px 5px', letterSpacing: 1, flexShrink: 0 }}>
                  {aug.category.split(' ')[0].toUpperCase()}
                </span>
                <span style={{ fontFamily: mono, fontSize: 11, color: aug.active ? acc : dim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {aug.name}
                </span>
                <span style={{ fontFamily: vt, fontSize: 14, color: acc, flexShrink: 0, width: 42 }}>LVL {level}</span>
                <XPBar value={xpInLevel} max={xpForLevel} />
                <span style={{ fontFamily: mono, fontSize: 9, color: dim, width: 28, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                <span style={{ fontSize: 9, color: aug.active ? green : adim, flexShrink: 0 }}>{aug.active ? '●' : '○'}</span>
              </div>
            );
          })}
        </div>

        {/* Drawer */}
        <div style={{
          width: selectedId ? 420 : 0, flexShrink: 0, overflow: 'hidden',
          transition: 'width 200ms ease',
          borderLeft: selectedId ? `1px solid ${adim}` : 'none',
        }}>
          {selectedId && (
            <AugmentDetailDrawer
              augmentId={selectedId}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD AUGMENT" width={600}>
        <AddAugmentModal onClose={() => setShowAdd(false)} />
      </Modal>
    </div>
  );
}