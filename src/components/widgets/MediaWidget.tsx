import { useState } from 'react';
import WidgetWrapper from '../WidgetWrapper';
import { books } from '@/data/mockData';

const tabs = ['BOOKS', 'COMICS', 'FILMS', 'TV', 'ALBUMS', 'ALL'];

const MediaWidget = () => {
  const [activeTab, setActiveTab] = useState('BOOKS');

  const reading = books.filter(b => b.status === 'READING');
  const queued = books.filter(b => b.status === 'QUEUED');
  const finished = books.filter(b => b.status === 'FINISHED');

  return (
    <WidgetWrapper title="MEDIA LIBRARY">
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t}
            className={`theme-pill ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
            style={{ fontSize: 9 }}
          >{t}</button>
        ))}
      </div>

      <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginBottom: 4 }}>READING:</div>
      {reading.map((b, i) => (
        <div key={i} style={{ marginBottom: 4, fontSize: 10, cursor: 'pointer' }}>
          <span style={{ color: 'hsl(var(--accent))' }}>&gt; {b.title}</span>
          <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>{b.author}</span>
          <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>pg {b.currentPage}/{b.totalPages}</span>
        </div>
      ))}

      <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginTop: 8, marginBottom: 4 }}>QUEUE:</div>
      {queued.map((b, i) => (
        <div key={i} style={{ marginBottom: 4, fontSize: 10, cursor: 'pointer' }}>
          <span style={{ color: 'hsl(var(--accent))' }}>&gt; {b.title}</span>
          <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>{b.author}</span>
          <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>QUEUED</span>
        </div>
      ))}

      <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginTop: 8, marginBottom: 4 }}>FINISHED:</div>
      {finished.map((b, i) => (
        <div key={i} style={{ marginBottom: 4, fontSize: 10, cursor: 'pointer' }}>
          <span style={{ color: 'hsl(var(--accent))' }}>&gt; {b.title}</span>
          <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>{'★'.repeat(b.rating || 0)}{'☆'.repeat(5 - (b.rating || 0))}</span>
          {b.stat && <span style={{ marginLeft: 8, color: 'hsl(var(--text-dim))' }}>{b.stat}</span>}
          <span style={{ color: 'hsl(var(--success))', marginLeft: 4 }}>✓</span>
        </div>
      ))}

      <button className="topbar-btn" style={{ width: '100%', fontSize: 10, marginTop: 8 }}>
        + ADD
      </button>
    </WidgetWrapper>
  );
};

export default MediaWidget;
