// ============================================================
// src/components/widgets/CoursesWidget.tsx
// ============================================================
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import WidgetWrapper from '../WidgetWrapper';
import ProgressBar from '../ProgressBar';
import Modal from '../Modal';
import AddCourseModal from '../modals/AddCourseModal';

interface WidgetProps { onClose?: () => void; onFullscreen?: () => void; isFullscreen?: boolean; onCourseClick?: (id: string) => void; }

const CoursesWidget = ({ onClose, onFullscreen, isFullscreen, onCourseClick }: WidgetProps) => {
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ['courses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const active = (courses ?? []).filter(c => c.status !== 'COMPLETE' && c.status !== 'DROPPED');
  const completed = (courses ?? []).filter(c => c.status === 'COMPLETE');
  const display = [...active, ...completed].slice(0, 6);

  return (
    <>
      <WidgetWrapper title="COURSES" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
        {display.length === 0 && (
          <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginBottom: 10 }}>
            No courses yet. Add your first course to start tracking.
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

        <button
          className="topbar-btn"
          style={{ width: '100%', fontSize: 10, marginTop: 4 }}
          onClick={() => setShowAdd(true)}
        >
          + ADD COURSE
        </button>
      </WidgetWrapper>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD COURSE" width={560}>
        <AddCourseModal onClose={() => setShowAdd(false)} />
      </Modal>
    </>
  );
};

export default CoursesWidget;