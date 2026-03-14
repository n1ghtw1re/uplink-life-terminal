// ============================================================
// src/components/widgets/MediaWidget.tsx
// ============================================================
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import WidgetWrapper from '../WidgetWrapper';
import Modal from '../Modal';
import AddMediaModal from '../modals/AddMediaModal';

const TABS = ['BOOKS', 'COMICS', 'FILMS', 'DOCS', 'TV', 'ALBUMS', 'ALL'];

const TAB_TYPE_MAP: Record<string, string> = {
  BOOKS: 'book', COMICS: 'comic', FILMS: 'film', DOCS: 'documentary', TV: 'tv', ALBUMS: 'album',
};

const TAB_MEDIA_TYPE: Record<string, 'book' | 'comic' | 'film' | 'documentary' | 'tv' | 'album'> = {
  BOOKS: 'book', COMICS: 'comic', FILMS: 'film', DOCS: 'documentary', TV: 'tv', ALBUMS: 'album', ALL: 'book',
};

const IN_PROGRESS = ['READING', 'WATCHING', 'LISTENED', 'LISTENING'];
const DONE = ['FINISHED'];

interface WidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onMediaClick?: (id: string) => void;  // ← NEW
}

const MediaWidget = ({ onClose, onFullscreen, isFullscreen, onMediaClick }: WidgetProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('BOOKS');
  const [showAdd, setShowAdd] = useState(false);

  const { data: media } = useQuery({
    queryKey: ['media', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const filtered = (media ?? []).filter(m =>
    activeTab === 'ALL' ? true : m.type === TAB_TYPE_MAP[activeTab]
  );

  const inProgress = filtered.filter(m => IN_PROGRESS.includes(m.status));
  const queued     = filtered.filter(m => m.status === 'QUEUED');
  const done       = filtered.filter(m => DONE.includes(m.status));

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
    if (activeTab === 'ALBUMS') return 'LISTENING:';
    if (activeTab === 'FILMS')  return 'WATCHING:';
    if (activeTab === 'TV')     return 'WATCHING:';
    return 'READING:';
  };

  const rowStyle = (id: string) => ({
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

        {/* Tabs */}
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

        {filtered.length === 0 && (
          <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginBottom: 8 }}>
            Nothing here yet.
          </div>
        )}

        {/* In progress */}
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

        {/* Queued */}
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

        {/* Done */}
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

        <button
          className="topbar-btn"
          style={{ width: '100%', fontSize: 10, marginTop: 8 }}
          onClick={() => setShowAdd(true)}
        >
          + ADD
        </button>
      </WidgetWrapper>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD MEDIA" width={540}>
        <AddMediaModal onClose={() => setShowAdd(false)} defaultType={TAB_MEDIA_TYPE[activeTab]} />
      </Modal>
    </>
  );
};

export default MediaWidget;