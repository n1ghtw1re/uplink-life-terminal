import { useState } from 'react';
import ProgressBar from '../ProgressBar';
import { courses, books } from '@/data/mockData';

type TabKey = 'courses' | 'media' | 'projects' | 'augmentation';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'courses', label: 'COURSES' },
  { key: 'media', label: 'MEDIA' },
  { key: 'projects', label: 'PROJECTS' },
  { key: 'augmentation', label: 'AUGMENTATION' },
];

const projects = {
  active: [
    { name: 'Portfolio Site', tags: 'WEB / WIRE', desc: 'Building personal portfolio with React', progress: 40, milestones: [2, 5] },
    { name: 'UPLINK', tags: 'SOFTWARE / WIRE', desc: 'Life OS dashboard application', progress: 82, milestones: [8, 10] },
  ],
  completed: [
    { name: 'Home Lab Setup', stat: 'WIRE', date: '2026.02.14' },
    { name: 'Blog Redesign', stat: 'WIRE', date: '2026.01.03' },
  ],
};

const aiTools = [
  { name: 'Claude', category: 'RESEARCH / WRITING', prof: 5, lastUsed: 'today' },
  { name: 'Cursor', category: 'CODING', prof: 4, lastUsed: 'today' },
  { name: 'Midjourney', category: 'IMAGE GENERATION', prof: 3, lastUsed: '3 days ago' },
  { name: 'Perplexity', category: 'RESEARCH', prof: 4, lastUsed: '1 week ago' },
  { name: 'Whisper', category: 'TRANSCRIPTION', prof: 2, lastUsed: '2 weeks ago' },
];

const milestones = [
  { score: 25, name: 'AUGMENTED', earned: true, date: '2025.11.02' },
  { score: 50, name: 'CYBER-ASSISTED', earned: true, date: '2026.01.15' },
  { score: 75, name: 'CYBER-ENHANCED', earned: false },
  { score: 100, name: 'FULL AUGMENTATION', earned: false },
];

const SectionHeader = ({ label }: { label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 14 }}>
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))', whiteSpace: 'nowrap' }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: '#261600' }} />
  </div>
);

const ProfDots = ({ value }: { value: number }) => (
  <span style={{ letterSpacing: 2 }}>
    {Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ fontSize: 10, color: i < value ? '#ffb000' : '#332200' }}>●</span>
    ))}
  </span>
);

const CoursesTab = () => (
  <div>
    {courses.map((c, i) => (
      <div key={i} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'hsl(var(--accent))' }}>
            <span style={{ color: 'hsl(var(--text-dim))' }}>&gt; </span>{c.name}
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))' }}>{c.provider}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))' }}>{c.stats}</span>
          <div style={{ flex: 1, height: 5, background: '#261600' }}>
            <div style={{ width: `${c.progress}%`, height: '100%', background: '#ffb000', boxShadow: '0 0 4px rgba(255,176,0,0.3)' }} />
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))' }}>{c.progress}%</span>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, padding: '1px 6px',
            border: `1px solid ${c.status === 'COMPLETE' ? '#226644' : '#996800'}`,
            color: c.status === 'COMPLETE' ? '#44ff88' : 'hsl(var(--text-dim))',
          }}>
            {c.status}{c.status === 'COMPLETE' ? ' ✓' : ''}
          </span>
        </div>
      </div>
    ))}
  </div>
);

const MediaTab = () => {
  const reading = books.filter(b => b.status === 'READING');
  const queued = books.filter(b => b.status === 'QUEUED');
  const finished = books.filter(b => b.status === 'FINISHED');

  return (
    <div>
      <SectionHeader label="READING" />
      {reading.map((b, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'hsl(var(--accent))' }}>
              <span style={{ color: 'hsl(var(--text-dim))' }}>&gt; </span>{b.title}
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))' }}>
              {b.author}&nbsp;&nbsp;pg {b.currentPage} / {b.totalPages}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            {b.stat && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))' }}>{b.stat}</span>}
            <div style={{ flex: 1, height: 5, background: '#261600' }}>
              <div style={{ width: `${Math.round(b.currentPage / b.totalPages * 100)}%`, height: '100%', background: '#ffb000', boxShadow: '0 0 4px rgba(255,176,0,0.3)' }} />
            </div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))' }}>{Math.round(b.currentPage / b.totalPages * 100)}%</span>
          </div>
        </div>
      ))}

      <SectionHeader label="QUEUE" />
      {queued.map((b, i) => (
        <div key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'hsl(var(--accent))' }}>
            <span style={{ color: 'hsl(var(--text-dim))' }}>&gt; </span>{b.title}
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))' }}>{b.author}&nbsp;&nbsp;QUEUED</span>
        </div>
      ))}

      <SectionHeader label="FINISHED" />
      {finished.map((b, i) => (
        <div key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'hsl(var(--accent))' }}>
            <span style={{ color: 'hsl(var(--text-dim))' }}>&gt; </span>{b.title}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10 }}>
              {Array.from({ length: 5 }, (_, j) => (
                <span key={j} style={{ color: j < (b.rating || 0) ? '#ffb000' : '#332200' }}>★</span>
              ))}
            </span>
            {b.stat && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))' }}>{b.stat}</span>}
            <span style={{ color: '#44ff88', fontSize: 9 }}>✓</span>
          </span>
        </div>
      ))}
    </div>
  );
};

const ProjectsTab = () => (
  <div>
    <SectionHeader label="ACTIVE" />
    {projects.active.map((p, i) => (
      <div key={i} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'hsl(var(--accent))' }}>
            <span style={{ color: 'hsl(var(--text-dim))' }}>&gt; </span>{p.name}
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))' }}>{p.tags}</span>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))', fontStyle: 'italic', marginTop: 2 }}>{p.desc}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <div style={{ flex: 1, height: 5, background: '#261600' }}>
            <div style={{ width: `${p.progress}%`, height: '100%', background: '#ffb000', boxShadow: '0 0 4px rgba(255,176,0,0.3)' }} />
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))' }}>{p.progress}%</span>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))', marginTop: 3 }}>
          Milestones: {p.milestones[0]} / {p.milestones[1]} complete
        </div>
      </div>
    ))}

    <SectionHeader label="COMPLETED" />
    {projects.completed.map((p, i) => (
      <div key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'hsl(var(--text-dim))' }}>
          <span style={{ opacity: 0.5 }}>&gt; </span>{p.name}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))' }}>
          <span>{p.stat}</span>
          <span style={{ color: '#44ff88' }}>✓</span>
          <span style={{ opacity: 0.5 }}>{p.date}</span>
        </span>
      </div>
    ))}
  </div>
);

const AugmentationTab = () => (
  <div>
    <SectionHeader label="AUGMENTATION SCORE" />
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <div style={{ flex: 1, height: 10, background: '#261600' }}>
        <div style={{ width: '74%', height: '100%', background: '#ffb000', boxShadow: '0 0 6px rgba(255,176,0,0.3)' }} />
      </div>
      <span className="font-display" style={{ fontSize: 18, color: 'hsl(var(--accent-bright))' }}>74 / 100</span>
    </div>
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))', marginBottom: 16 }}>
      MILESTONE: 75 → CYBER-ENHANCED&nbsp;&nbsp;(1 point away)
    </div>

    <SectionHeader label="AI TOOLS" />
    {aiTools.map((t, i) => (
      <div key={i} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'hsl(var(--accent))' }}>
            <span style={{ color: 'hsl(var(--text-dim))' }}>&gt; </span>{t.name}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))' }}>{t.category}</span>
            <ProfDots value={t.prof} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))' }}>{t.prof}/5</span>
          </span>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'hsl(var(--text-dim))', opacity: 0.5, marginTop: 1, paddingLeft: 14 }}>
          Last used: {t.lastUsed}
        </div>
      </div>
    ))}

    <SectionHeader label="MILESTONE HISTORY" />
    {milestones.map((m, i) => (
      <div key={i} style={{ marginBottom: 6, display: 'flex', alignItems: 'baseline', gap: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, opacity: m.earned ? 1 : 0.4 }}>
        <span style={{ color: m.earned ? '#ffb000' : 'hsl(var(--text-dim))' }}>{m.earned ? '✓' : '○'}</span>
        <span style={{ color: 'hsl(var(--text-dim))', minWidth: 24 }}>{m.score}</span>
        <span style={{ color: m.earned ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))' }}>{m.name}</span>
        <span style={{ color: 'hsl(var(--text-dim))', opacity: 0.5 }}>
          {m.earned ? `earned ${m.date}` : 'locked'}
        </span>
      </div>
    ))}
  </div>
);

const CharSheetPage4 = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('courses');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'hsl(var(--text-dim))', marginBottom: 16 }}>
        // ARSENAL
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #261600', marginBottom: 12 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: activeTab === t.key ? 'hsl(var(--accent-bright))' : 'hsl(var(--text-dim))',
              padding: '6px 16px',
              border: activeTab === t.key ? '1px solid hsl(var(--accent))' : '1px solid transparent',
              borderBottomColor: activeTab === t.key ? 'transparent' : undefined,
              cursor: 'pointer',
              background: activeTab === t.key ? 'rgba(255, 176, 0, 0.05)' : 'none',
              boxShadow: activeTab === t.key ? '0 0 8px rgba(255, 176, 0, 0.1)' : 'none',
              letterSpacing: 1,
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
        {activeTab === 'courses' && <CoursesTab />}
        {activeTab === 'media' && <MediaTab />}
        {activeTab === 'projects' && <ProjectsTab />}
        {activeTab === 'augmentation' && <AugmentationTab />}
      </div>
    </div>
  );
};

export default CharSheetPage4;
