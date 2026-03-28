// ============================================================
// src/components/widgets/CoursesWidget.tsx
// ============================================================
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import WidgetWrapper from '../WidgetWrapper';
import ProgressBar from '../ProgressBar';
import Modal from '../Modal';
import AddCourseModal from '../modals/AddCourseModal';

interface WidgetProps { onClose?: () => void; onFullscreen?: () => void; isFullscreen?: boolean; onCourseClick?: (id: string) => void; onOpenCourses?: () => void; }
const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';

const CoursesWidget = ({ onClose, onFullscreen, isFullscreen, onCourseClick, onOpenCourses }: WidgetProps) => {
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{
        id: string;
        name: string;
        provider: string | null;
        subject: string | null;
        linked_stats: string[] | string;
        status: string;
        progress: number | null;
        cert_earned: boolean;
        url: string | null;
        notes: string | null;
        is_legacy: boolean;
        created_at: string;
      }>(`SELECT * FROM courses ORDER BY created_at DESC;`);
      return res.rows.map((row) => ({
        ...row,
        linked_stats: Array.isArray(row.linked_stats) ? row.linked_stats : JSON.parse((row.linked_stats as string) || '[]'),
      }));
    },
  });

  const searchFn = (value: string | null | undefined) => !search.trim() || (value ?? '').toLowerCase().includes(search.toLowerCase());
  const matchingCourses = (courses ?? []).filter(c => searchFn(c.name) || searchFn(c.provider) || searchFn(c.subject));
  const active = matchingCourses.filter(c => c.status !== 'COMPLETE' && c.status !== 'DROPPED');
  const completed = matchingCourses.filter(c => c.status === 'COMPLETE');
  const display = [...active, ...completed].slice(0, 6);

  return (
    <>
      <WidgetWrapper title="COURSES" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..."
            style={{ width: '100%', padding: '3px 8px 3px 20px', fontSize: 9, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }} />
          <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: adim, pointerEvents: 'none' }}>⌕</span>
          {search && <span onClick={() => setSearch('')} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: adim, cursor: 'pointer' }}>×</span>}
        </div>
        {display.length === 0 && (
          <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginBottom: 10 }}>
            {search ? 'No courses match your search.' : 'No courses yet. Add your first course to start tracking.'}
          </div>
        )}

        {display.map(c => (
          <div
            key={c.id}
            style={{ marginBottom: 10, cursor: 'pointer' }}
            onClick={() => onCourseClick?.(c.id)}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'hsl(var(--accent))' }}>&gt; {c.name}</span>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{c.provider}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <ProgressBar value={c.progress ?? 0} max={100} width="120px" height={6} />
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{c.progress ?? 0}%</span>
              {c.linked_stats?.length > 0 && (
                <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>
                  {c.linked_stats.map((s: string) => s.toUpperCase()).join('/')}
                </span>
              )}
              <span style={{
                fontSize: 9,
                color: c.status === 'COMPLETE' ? 'hsl(var(--success))' : 'hsl(var(--accent))',
                marginLeft: 'auto',
              }}>
                {c.status}{c.status === 'COMPLETE' ? ' ✓' : ''}
                {c.is_legacy && <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 4 }}>[L]</span>}
              </span>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = acc}
            onMouseLeave={e => e.currentTarget.style.color = adim}
          >+ ADD COURSE</button>
          <button onClick={onOpenCourses} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = acc}
            onMouseLeave={e => e.currentTarget.style.color = adim}
          >VIEW ALL ›</button>
        </div>
      </WidgetWrapper>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD COURSE" width={560}>
        <AddCourseModal onClose={() => setShowAdd(false)} />
      </Modal>
    </>
  );
};

export default CoursesWidget;
