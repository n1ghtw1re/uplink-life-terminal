import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import WidgetWrapper from '../WidgetWrapper';
import ProgressBar from '../ProgressBar';

interface WidgetProps { onClose?: () => void; onFullscreen?: () => void; isFullscreen?: boolean; }

const CoursesWidget = ({ onClose, onFullscreen, isFullscreen }: WidgetProps) => {
  const { user } = useAuth();

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
    <WidgetWrapper title="COURSES" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      {display.length === 0 && (
        <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginBottom: 10 }}>
          No courses yet. Add your first course to start tracking.
        </div>
      )}

      {display.map(c => (
        <div key={c.id} style={{ marginBottom: 10, cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'hsl(var(--accent))' }}>&gt; {c.name}</span>
            <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{c.provider}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <ProgressBar value={c.progress} max={100} width="120px" height={6} />
            <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{c.progress}%</span>
            {c.linked_stats?.length > 0 && (
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>
                {c.linked_stats.map((s: string) => s.toUpperCase()).join('/')}
              </span>
            )}
            <span style={{
              fontSize: 9,
              color: c.status === 'COMPLETE' ? 'hsl(var(--success))' : 'hsl(var(--accent))',
            }}>
              {c.status}{c.status === 'COMPLETE' ? ' ✓' : ''}
            </span>
          </div>
        </div>
      ))}

      <button className="topbar-btn" style={{ width: '100%', fontSize: 10, marginTop: 4 }}>
        + ADD COURSE
      </button>
    </WidgetWrapper>
  );
};

export default CoursesWidget;