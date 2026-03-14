// ============================================================
// src/components/overlays/LibraryPage.tsx
// Full-page media library — tabbed by type, drawer on click
// ============================================================
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatKey } from '@/types';
import MediaDetailDrawer from '@/components/drawer/MediaDetailDrawer';
import AddMediaModal from '@/components/modals/AddMediaModal';

// ── Types ─────────────────────────────────────────────────────

type MediaType   = 'book' | 'comic' | 'film' | 'documentary' | 'tv' | 'album';
type MediaStatus = 'READING' | 'WATCHING' | 'LISTENING' | 'QUEUED' | 'FINISHED' | 'DROPPED';

interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  creator: string | null;
  year: number | null;
  status: MediaStatus;
  linked_stat: StatKey | null;
  rating: number | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
}

// ── Constants ─────────────────────────────────────────────────

const TABS: { key: MediaType | 'ALL'; label: string }[] = [
  { key: 'ALL',          label: 'ALL' },
  { key: 'book',         label: 'BOOKS' },
  { key: 'comic',        label: 'COMICS' },
  { key: 'film',         label: 'FILMS' },
  { key: 'documentary',  label: 'DOCS' },
  { key: 'tv',           label: 'TV' },
  { key: 'album',        label: 'ALBUMS' },
];

type SortKey = 'title' | 'status' | 'rating' | 'recent';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'title',  label: 'A–Z' },
  { key: 'status', label: 'STATUS' },
  { key: 'rating', label: 'RATING' },
  { key: 'recent', label: 'RECENT' },
];

const STATUS_ORDER: Record<MediaStatus, number> = {
  READING: 0, WATCHING: 0, LISTENING: 0,
  QUEUED: 1, FINISHED: 2, DROPPED: 3,
};

const STATUS_COLOR: Record<MediaStatus, string> = {
  READING:   'hsl(var(--accent))',
  WATCHING:  'hsl(var(--accent))',
  LISTENING: 'hsl(var(--accent))',
  QUEUED:    'hsl(var(--text-dim))',
  FINISHED:  '#44ff88',
  DROPPED:   '#ff4444',
};

// ── Styles ────────────────────────────────────────────────────

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const dim  = 'hsl(var(--text-dim))';
const adim = 'hsl(var(--accent-dim))';
const bgP  = 'hsl(var(--bg-primary))';
const bgS  = 'hsl(var(--bg-secondary))';
const bgT  = 'hsl(var(--bg-tertiary))';

// ── Helpers ───────────────────────────────────────────────────

function getProgress(item: MediaItem): number | null {
  const m = item.meta;
  if (!m) return null;
  if (item.type === 'book' || item.type === 'comic') {
    const cur = m.page_current as number;
    const tot = m.pages as number;
    if (cur && tot) return Math.round((cur / tot) * 100);
  }
  if (item.type === 'tv') {
    const cur = m.current_season as number;
    const tot = m.seasons as number;
    if (cur && tot) return Math.round((cur / tot) * 100);
  }
  return null;
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span style={{ color: acc, fontSize: 9, letterSpacing: 1, flexShrink: 0 }}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

// ── Media row ─────────────────────────────────────────────────

function MediaRow({ item, onClick, isActive }: {
  item: MediaItem;
  onClick: () => void;
  isActive: boolean;
}) {
  const progress = getProgress(item);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '9px 16px',
        background: isActive ? 'rgba(255,176,0,0.06)' : bgS,
        border: `1px solid ${isActive ? acc : 'rgba(153,104,0,0.4)'}`,
        cursor: 'pointer',
        transition: 'all 150ms',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = adim;
          e.currentTarget.style.background = 'rgba(255,176,0,0.03)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)';
          e.currentTarget.style.background = bgS;
        }
      }}
    >
      {/* Type badge */}
      <span style={{
        fontFamily: mono, fontSize: 8, letterSpacing: 1,
        color: adim, border: `1px solid ${adim}`,
        padding: '1px 5px', flexShrink: 0, width: 56, textAlign: 'center',
      }}>
        {item.type === 'documentary' ? 'DOC' : item.type.toUpperCase()}
      </span>

      {/* Title */}
      <span style={{
        fontFamily: mono, fontSize: 11, color: acc,
        flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.title}
      </span>

      {/* Creator */}
      {item.creator && (
        <span style={{
          fontFamily: mono, fontSize: 10, color: dim,
          flexShrink: 0, maxWidth: 160,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.creator}
        </span>
      )}

      {/* Progress bar */}
      {progress !== null && item.status !== 'FINISHED' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 90, flexShrink: 0 }}>
          <div style={{ flex: 1, height: 4, background: bgT, border: `1px solid ${adim}` }}>
            <div style={{ width: `${progress}%`, height: '100%', background: acc }} />
          </div>
          <span style={{ fontFamily: mono, fontSize: 9, color: dim, width: 28, textAlign: 'right' }}>
            {progress}%
          </span>
        </div>
      )}

      {/* Rating */}
      <StarRating rating={item.rating} />

      {/* Status */}
      <span style={{
        fontFamily: mono, fontSize: 9, letterSpacing: 1,
        color: STATUS_COLOR[item.status] ?? dim,
        flexShrink: 0, width: 72, textAlign: 'right',
      }}>
        {item.status}
      </span>

      {/* Arrow */}
      <span style={{ color: adim, fontSize: 10, flexShrink: 0 }}>›</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export default function LibraryPage({ onClose }: Props) {
  const { user } = useAuth();

  const [activeTab, setActiveTab]     = useState<MediaType | 'ALL'>('ALL');
  const [sortKey, setSortKey]         = useState<SortKey>('status');
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [showAdd, setShowAdd]         = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ['media-library', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('user_id', user!.id)
        .order('title');
      if (error) throw error;
      return data as MediaItem[];
    },
  });

  const countFor = (key: MediaType | 'ALL') =>
    key === 'ALL' ? (items ?? []).length : (items ?? []).filter(i => i.type === key).length;

  const filtered = useMemo(() => {
    const base = activeTab === 'ALL'
      ? (items ?? [])
      : (items ?? []).filter(i => i.type === activeTab);

    return [...base].sort((a, b) => {
      if (sortKey === 'title')  return a.title.localeCompare(b.title);
      if (sortKey === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortKey === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortKey === 'status') {
        const sa = STATUS_ORDER[a.status] ?? 9;
        const sb = STATUS_ORDER[b.status] ?? 9;
        return sa !== sb ? sa - sb : a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [items, activeTab, sortKey]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: bgP,
      display: 'flex', flexDirection: 'column',
      fontFamily: mono,
    }}>

      {/* ── Header ── */}
      <div style={{
        height: 56, flexShrink: 0,
        borderBottom: `1px solid ${adim}`,
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 16,
      }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// ARSENAL</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>MEDIA LIBRARY</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: dim }}>
          {(items ?? []).length} items
        </span>
        <div style={{ flex: 1 }} />

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: adim, letterSpacing: 1 }}>SORT:</span>
          {SORT_OPTIONS.map(s => (
            <button key={s.key} onClick={() => setSortKey(s.key)} style={{
              padding: '3px 8px', fontSize: 9,
              border: `1px solid ${sortKey === s.key ? acc : adim}`,
              background: sortKey === s.key ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: sortKey === s.key ? acc : dim,
              fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
              transition: 'all 150ms',
            }}>{s.label}</button>
          ))}
        </div>

        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: '5px 14px', fontSize: 10,
            border: `1px solid ${acc}`,
            background: 'transparent', color: acc,
            fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = acc; e.currentTarget.style.color = bgP; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = acc; }}
        >[ + ADD MEDIA ]</button>

        <button onClick={onClose} style={{
          padding: '5px 12px', fontSize: 10,
          border: `1px solid ${adim}`,
          background: 'transparent', color: dim,
          fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
        }}>× CLOSE</button>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        flexShrink: 0,
        borderBottom: `1px solid ${adim}`,
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 4,
        background: bgS,
      }}>
        {TABS.map(({ key, label }) => {
          const count = countFor(key);
          const isActive = activeTab === key;
          if (key !== 'ALL' && count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setSelectedId(null); }}
              style={{
                padding: '10px 14px', fontSize: 10,
                border: 'none', borderBottom: `2px solid ${isActive ? acc : 'transparent'}`,
                background: 'transparent',
                color: isActive ? acc : dim,
                fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                transition: 'all 150ms',
              }}
            >
              {label} <span style={{ fontSize: 9, color: isActive ? adim : 'rgba(153,104,0,0.3)' }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* ── Content + drawer ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* List */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px 24px',
          scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}`,
        }}>
          {isLoading ? (
            <div style={{ color: dim, fontSize: 11 }}>LOADING...</div>
          ) : filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: 200, gap: 12,
            }}>
              <span style={{ fontFamily: vt, fontSize: 28, color: adim }}>EMPTY</span>
              <span style={{ fontSize: 10, color: dim }}>
                {activeTab === 'ALL' ? 'No media added yet.' : `No ${activeTab}s added yet.`}
              </span>
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  marginTop: 8, padding: '6px 16px', fontSize: 10,
                  border: `1px solid ${acc}`, background: 'transparent', color: acc,
                  fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                }}
              >[ + ADD MEDIA ]</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map(item => (
                <MediaRow
                  key={item.id}
                  item={item}
                  isActive={selectedId === item.id}
                  onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Drawer */}
        <div style={{
          width: selectedId ? 420 : 0,
          flexShrink: 0, overflow: 'hidden',
          transition: 'width 200ms ease',
          borderLeft: selectedId ? `1px solid ${adim}` : 'none',
          display: 'flex', flexDirection: 'column',
        }}>
          {selectedId && (
            <>
              <div style={{
                height: 36, flexShrink: 0,
                borderBottom: `1px solid ${adim}`,
                display: 'flex', alignItems: 'center',
                justifyContent: 'flex-end', padding: '0 12px',
                background: bgS,
              }}>
                <button
                  onClick={() => setSelectedId(null)}
                  style={{
                    background: 'transparent', border: 'none',
                    color: dim, fontFamily: mono, fontSize: 10,
                    cursor: 'pointer', letterSpacing: 1,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = acc}
                  onMouseLeave={e => e.currentTarget.style.color = dim}
                >× CLOSE</button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <MediaDetailDrawer
                  mediaId={selectedId}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Media Modal */}
      {showAdd && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowAdd(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: 560, maxHeight: '85vh', overflowY: 'auto',
            background: bgP, border: `1px solid ${adim}`,
            boxShadow: '0 0 40px rgba(255,176,0,0.1)',
          }}>
            <div style={{
              padding: '12px 20px', borderBottom: `1px solid ${adim}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: mono, fontSize: 10, color: acc, letterSpacing: 2 }}>// ADD MEDIA</span>
              <button onClick={() => setShowAdd(false)} style={{
                background: 'transparent', border: 'none',
                color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer',
              }}>× CLOSE</button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <AddMediaModal onClose={() => setShowAdd(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}