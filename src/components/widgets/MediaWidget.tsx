import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import WidgetWrapper from '../WidgetWrapper';

const TABS = ['BOOKS', 'COMICS', 'FILMS', 'TV', 'ALBUMS', 'ALL'];

const TAB_TYPE_MAP: Record<string, string> = {
  BOOKS: 'book', COMICS: 'comic', FILMS: 'film', TV: 'tv', ALBUMS: 'album',
};

interface WidgetProps { onClose?: () => void; onFullscreen?: () => void; isFullscreen?: boolean; }

const MediaWidget = ({ onClose, onFullscreen, isFullscreen }: WidgetProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('BOOKS');

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

  const reading  = filtered.filter(m => ['READING', 'WATCHING', 'LISTENING'].includes(m.status));
  const queued   = filtered.filter(m => m.status === 'QUEUED');
  const finished = filtered.filter(m => m.status === 'FINISHED');

  const getMeta = (m: typeof filtered[0]) => {
    if (!m.meta || typeof m.meta !== 'object') return null;
    return m.meta as Record<string, unknown>;
  };

  const renderProgress = (m: typeof filtered[0]) => {
    const meta = getMeta(m);
    if (m.type === 'book' && meta) {
      return `pg ${meta.current_page ?? '?'}/${meta.total_pages ?? '?'}`;
    }
    if (m.type === 'tv' && meta) {
      return `S${meta.current_season ?? 1}`;
    }
    return null;
  };

  return (
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

      {filtered.length === 0 && (
        <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginBottom: 8 }}>
          Nothing here yet. Add some {activeTab === 'ALL' ? 'media' : activeTab.toLowerCase()} to start tracking.
        </div>
      )}

      {reading.length > 0 && (
        <>
          <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginBottom: 4 }}>
            {activeTab === 'ALBUMS' ? 'LISTENING:' : activeTab === 'FILMS' ? 'WATCHING:' : 'READING:'}
          </div>
          {reading.map(m => (
            <div key={m.id} style={{ marginBottom: 4, fontSize: 10, cursor: 'pointer' }}>
              <span style={{ color: 'hsl(var(--accent))' }}>&gt; {m.title}</span>
              {m.creator && <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>{m.creator}</span>}
              {renderProgress(m) && <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>{renderProgress(m)}</span>}
            </div>
          ))}
        </>
      )}

      {queued.length > 0 && (
        <>
          <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginTop: 8, marginBottom: 4 }}>QUEUE:</div>
          {queued.map(m => (
            <div key={m.id} style={{ marginBottom: 4, fontSize: 10, cursor: 'pointer' }}>
              <span style={{ color: 'hsl(var(--accent))' }}>&gt; {m.title}</span>
              {m.creator && <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>{m.creator}</span>}
              <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>QUEUED</span>
            </div>
          ))}
        </>
      )}

      {finished.length > 0 && (
        <>
          <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginTop: 8, marginBottom: 4 }}>FINISHED:</div>
          {finished.map(m => (
            <div key={m.id} style={{ marginBottom: 4, fontSize: 10, cursor: 'pointer' }}>
              <span style={{ color: 'hsl(var(--accent))' }}>&gt; {m.title}</span>
              {m.rating && (
                <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>
                  {'★'.repeat(m.rating)}{'☆'.repeat(5 - m.rating)}
                </span>
              )}
              {m.linked_stat && (
                <span style={{ marginLeft: 8, color: 'hsl(var(--text-dim))' }}>
                  {m.linked_stat.toUpperCase()}
                </span>
              )}
              <span style={{ color: 'hsl(var(--success))', marginLeft: 4 }}>✓</span>
            </div>
          ))}
        </>
      )}

      <button className="topbar-btn" style={{ width: '100%', fontSize: 10, marginTop: 8 }}>
        + ADD
      </button>
    </WidgetWrapper>
  );
};

export default MediaWidget;