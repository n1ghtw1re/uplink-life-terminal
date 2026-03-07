import { useState, useEffect, useRef } from 'react';

const searchItems = [
  { name: 'MMA', type: 'SKILL', stats: 'BODY / GRIT' },
  { name: 'Clean Code', type: 'BOOK', stats: 'MIND' },
  { name: 'React Fundamentals', type: 'COURSE', stats: 'WIRE / MIND' },
  { name: 'CompTIA Security+', type: 'COURSE', stats: 'WIRE' },
  { name: 'Dune', type: 'BOOK', stats: '' },
  { name: 'Meditation', type: 'SKILL', stats: 'GHOST' },
  { name: 'Spanish B1', type: 'COURSE', stats: 'MIND / COOL' },
];

const tabs = ['ALL', 'SKILLS', 'COURSES', 'BOOKS', 'PROJECTS', 'GOALS'];

const SearchOverlay = () => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = searchItems.filter(
    item => item.name.toLowerCase().includes(query.toLowerCase()) &&
      (activeTab === 'ALL' || item.type === activeTab.slice(0, -1) || item.type + 'S' === activeTab)
  );

  return (
    <div style={{ fontSize: 11 }}>
      <input
        ref={inputRef}
        className="crt-input"
        style={{ width: '100%', fontSize: 14, padding: '10px 12px', marginBottom: 12 }}
        placeholder="search..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t}
            className={`theme-pill ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
            style={{ fontSize: 9 }}
          >{t}</button>
        ))}
      </div>

      <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 8, fontSize: 10 }}>
        {query ? 'RESULTS:' : 'RECENT:'}
      </div>
      {filtered.map((item, i) => (
        <div key={i} style={{
          padding: '6px 0',
          borderBottom: '1px solid hsl(var(--accent-dim) / 0.3)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>
            <span style={{ color: 'hsl(var(--accent))' }}>&gt; {item.name}</span>
            <span style={{ marginLeft: 12, fontSize: 9, color: 'hsl(var(--text-dim))' }}>{item.type}</span>
          </span>
          <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{item.stats}</span>
        </div>
      ))}
    </div>
  );
};

export default SearchOverlay;
