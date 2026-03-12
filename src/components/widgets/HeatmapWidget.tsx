import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOperator } from '@/hooks/useOperator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import WidgetWrapper from '../WidgetWrapper';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKS = 12;

interface WidgetProps { onClose?: () => void; onFullscreen?: () => void; isFullscreen?: boolean; }

const HeatmapWidget = ({ onClose, onFullscreen, isFullscreen }: WidgetProps) => {
  const { user } = useAuth();
  const { data: op } = useOperator(user?.id);

  // Fetch last 12 weeks of checkins
  const { data: checkins } = useQuery({
    queryKey: ['checkins-heatmap', user?.id],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - (WEEKS * 7));
      const { data, error } = await supabase
        .from('checkins')
        .select('date, stats_checked')
        .eq('user_id', user!.id)
        .gte('date', since.toISOString().slice(0, 10))
        .order('date');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Build 7×12 grid (rows=days of week, cols=weeks)
  const heatmap = useMemo(() => {
    const checkinSet = new Set((checkins ?? []).map(c => c.date));

    // Start from Monday 12 weeks ago
    const start = new Date();
    const dayOfWeek = (start.getDay() + 6) % 7; // Mon=0
    start.setDate(start.getDate() - dayOfWeek - (WEEKS - 1) * 7);

    const grid: number[][] = Array.from({ length: 7 }, () => Array(WEEKS).fill(0));

    for (let week = 0; week < WEEKS; week++) {
      for (let day = 0; day < 7; day++) {
        const d = new Date(start);
        d.setDate(start.getDate() + week * 7 + day);
        const dateStr = d.toISOString().slice(0, 10);
        const isToday = dateStr === new Date().toISOString().slice(0, 10);
        const isFuture = d > new Date();
        if (isFuture) {
          grid[day][week] = -1; // future — render differently
        } else if (checkinSet.has(dateStr)) {
          grid[day][week] = isToday ? 2 : 2;
        } else {
          grid[day][week] = 0;
        }
      }
    }
    return grid;
  }, [checkins]);

  const cellSize = 14;
  const gap = 2;
  const streak = op?.streak ?? 0;

  // Longest streak: we don't store this yet, derive from checkin dates
  const longestStreak = useMemo(() => {
    if (!checkins || checkins.length === 0) return 0;
    const dates = checkins.map(c => c.date).sort();
    let longest = 1, current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) { current++; longest = Math.max(longest, current); }
      else { current = 1; }
    }
    return longest;
  }, [checkins]);

  return (
    <WidgetWrapper title="STREAK HEATMAP" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {heatmap.map((row, dayIdx) => (
          <div key={dayIdx} style={{ display: 'flex', alignItems: 'center', gap }}>
            <span style={{ width: 12, fontSize: 9, color: 'hsl(var(--text-dim))' }}>{DAYS[dayIdx]}</span>
            {row.map((val, weekIdx) => (
              <div
                key={weekIdx}
                style={{
                  width: cellSize,
                  height: cellSize,
                  background: val === -1
                    ? 'transparent'
                    : val === 0
                      ? 'hsl(var(--bg-tertiary))'
                      : 'hsl(var(--accent))',
                  boxShadow: val === 2 ? '0 0 4px rgba(255,176,0,0.5)' : 'none',
                  border: val === -1 ? 'none' : '1px solid hsl(var(--accent-dim) / 0.2)',
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: 'hsl(var(--text-dim))' }}>
        <div>// CURRENT STREAK: <span style={{ color: 'hsl(var(--accent))' }}>{streak} DAYS</span></div>
        <div>// LONGEST: <span style={{ color: 'hsl(var(--accent))' }}>{longestStreak} DAYS</span></div>
      </div>
    </WidgetWrapper>
  );
};

export default HeatmapWidget;