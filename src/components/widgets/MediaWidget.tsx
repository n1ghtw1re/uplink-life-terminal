// ============================================================
// src/components/widgets/MediaWidget.tsx
// ============================================================
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import WidgetWrapper from '../WidgetWrapper';
import Modal from '../Modal';
import AddMediaModal from '../modals/AddMediaModal';

const TABS = ['BOOKS', 'COMICS', 'FILMS', 'DOCS', 'TV', 'ALBUMS', 'GAMES', 'ALL'];

const TAB_TYPE_MAP: Record<string, string> = {
  BOOKS: 'book', COMICS: 'comic', FILMS: 'film', DOCS: 'documentary', TV: 'tv', ALBUMS: 'album', GAMES: 'game',
};

const TAB_MEDIA_TYPE: Record<string, 'book' | 'comic' | 'film' | 'documentary' | 'tv' | 'album' | 'game'> = {
  BOOKS: 'book', COMICS: 'comic', FILMS: 'film', DOCS: 'documentary', TV: 'tv', ALBUMS: 'album', GAMES: 'game', ALL: 'book',
};

const IN_PROGRESS = ['READING', 'WATCHING', 'LISTENED', 'LISTENING', 'PLAYING'];
const DONE = ['FINISHED'];
const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';

interface WidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onMediaClick?: (id: string) => void;
  onOpenLibrary?: () => void;
}

const MediaWidget = ({ onClose, onFullscreen, isFullscreen, onMediaClick, onOpenLibrary }: WidgetProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('BOOKS');
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const { data: media } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{
        id: string;
        type: string;
        title: string;
        creator: string | null;
        year: number | null;
        status: string;
        linked_stat: string | null;
        linked_skill_id: string | null;
        rating: number | null;
        notes: string | null;
        is_legacy: boolean;
        completed_at: string | null;
        pages: number | null;
        page_current: number | null;
        runtime: number | null;
        seasons: number | null;
        current_season: number | null;
        platform: string | null;
        issue_count: number | null;
        created_at: string;
      }>(`SELECT * FROM media ORDER BY created_at DESC;`);
      return res.rows.map((row) => ({
        ...row,
        meta: {
          pages: row.pages,
          page_current: row.page_current,
          runtime: row.runtime,
          seasons: row.seasons,
          current_season: row.current_season,
          platform: row.platform,
          issue_count: row.issue_count,
        },
      }));
    },
  });

  const searchFn = (value: string | null | undefined) => !search.trim() || (value ?? '').toLowerCase().includes(search.toLowerCase());
  const filtered = (media ?? []).filter(m =>
    (activeTab === 'ALL' ? true : m.type === TAB_TYPE_MAP[activeTab]) &&
    (searchFn(m.title) || searchFn(m.creator) || searchFn(m.status))
  );

  const inProgress = filtered.filter(m => IN_PROGRESS.includes(m.status));
  const queued = filtered.filter(m => m.status === 'QUEUED');
  const done = filtered.filter(m => DONE.includes(m.status));

  const getMeta = (m: typeof filtered[0]) => {
    if (!m.meta || typeof m.meta !== 'object') return null;
    return m.meta as Record<string, unknown>;
  };

  const renderProgress = (m: typeof filtered[0]) => {
    const meta = getMeta(m);
    if (!meta) return null;
    if (m.type === 'book') {
      const cur = meta.page_current;
      const tot = meta.pages;
      if (cur || tot) return `pg ${cur ?? '?'}/${tot ?? '?'}`;
    }
    if (m.type === 'tv') {
      return meta.seasons ? `${meta.seasons} seasons` : null;
    }
    return null;
  };

  const inProgressLabel = () => {
    if (activeTab === 'ALL') return 'ACTIVE:';
    if (activeTab === 'ALBUMS') return 'LISTENING:';
    if (activeTab === 'FILMS') return 'WATCHING:';
    if (activeTab === 'TV') return 'WATCHING:';
    if (activeTab === 'GAMES') return 'PLAYING:';
    return 'READING:';
  };

  const rowStyle = (_id: string) => ({
    marginBottom: 5,
    fontSize: 10,
    cursor: onMediaClick ? 'pointer' : 'default',
    opacity: 1,
  });

  const handleClick = (id: string) => {
    if (onMediaClick) onMediaClick(id);
  };

  return (
    <>
      <WidgetWrapper title="MEDIA LIBRARY" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t}
              className={`theme-pill ${activeTab === t ? 'active' : ''}`}
              onClick={() => setActiveTab(t)}
              style={{ fontSize: 9 }}
            >{t}</button>
          ))}
        </div>

        <div style={{ position: 'relative', marginBottom: 6 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search media..."
            style={{ width: '100%', padding: '3px 8px 3px 20px', fontSize: 9, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }} />
          <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: adim, pointerEvents: 'none' }}>⌕</span>
          {search && <span onClick={() => setSearch('')} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: adim, cursor: 'pointer' }}>×</span>}
        </div>

        {filtered.length === 0 && (
          <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginBottom: 8 }}>
            {search ? 'No media matches your search.' : 'Nothing here yet.'}
          </div>
        )}

        {inProgress.length > 0 && (
          <>
            <div style={{ fontSize: 9, color: 'hsl(var(--text-dim))', marginBottom: 4, letterSpacing: 1 }}>
              {inProgressLabel()}
            </div>
            {inProgress.map(m => (
              <div key={m.id} style={rowStyle(m.id)} onClick={() => handleClick(m.id)}>
                <span style={{ color: 'hsl(var(--accent))' }}>&gt; {m.title}</span>
                {m.creator && <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>{m.creator}</span>}
                {renderProgress(m) && <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>{renderProgress(m)}</span>}
              </div>
            ))}
          </>
        )}

        {queued.length > 0 && (
          <>
            <div style={{ fontSize: 9, color: 'hsl(var(--text-dim))', marginTop: 8, marginBottom: 4, letterSpacing: 1 }}>
              QUEUE:
            </div>
            {queued.map(m => (
              <div key={m.id} style={rowStyle(m.id)} onClick={() => handleClick(m.id)}>
                <span style={{ color: 'hsl(var(--accent))' }}>&gt; {m.title}</span>
                {m.creator && <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>{m.creator}</span>}
                <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>QUEUED</span>
              </div>
            ))}
          </>
        )}

        {done.length > 0 && (
          <>
            <div style={{ fontSize: 9, color: 'hsl(var(--text-dim))', marginTop: 8, marginBottom: 4, letterSpacing: 1 }}>
              FINISHED:
            </div>
            {done.map(m => (
              <div key={m.id} style={rowStyle(m.id)} onClick={() => handleClick(m.id)}>
                <span style={{ color: 'hsl(var(--accent))' }}>&gt; {m.title}</span>
                {m.rating != null && m.rating > 0 && (
                  <span style={{ color: 'hsl(var(--accent-dim))', marginLeft: 8 }}>
                    {'★'.repeat(m.rating)}{'☆'.repeat(5 - m.rating)}
                  </span>
                )}
                {m.linked_stat && (
                  <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8, fontSize: 9 }}>
                    {m.linked_stat.toUpperCase()}
                  </span>
                )}
                {m.is_legacy && <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 4, fontSize: 9 }}>[L]</span>}
                <span style={{ color: 'hsl(var(--success))', marginLeft: 4 }}>✓</span>
              </div>
            ))}
          </>
        )}

        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = acc}
            onMouseLeave={e => e.currentTarget.style.color = adim}
          >+ ADD MEDIA</button>
          <button onClick={onOpenLibrary} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = acc}
            onMouseLeave={e => e.currentTarget.style.color = adim}
          >VIEW ALL ›</button>
        </div>
      </WidgetWrapper>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD MEDIA" width={540}>
        <AddMediaModal key={Date.now()} onClose={() => setShowAdd(false)} defaultType={TAB_MEDIA_TYPE[activeTab]} />
      </Modal>
    </>
  );
};

export default MediaWidget;
