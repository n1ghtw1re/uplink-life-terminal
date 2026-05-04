import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import WidgetWrapper from '@/components/WidgetWrapper';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';

interface Props {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenOutput?: () => void;
  onViewAll?: () => void;
  onOutputClick?: (id: string) => void;
}

export default function OutputWidget({ onClose, onFullscreen, isFullscreen, onOpenOutput, onViewAll, onOutputClick }: Props) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['output-widget-logs'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<any>(
        `SELECT ol.id, ol.target_type, ol.target_id, ol.duration_minutes, ol.created_at,
          (CASE WHEN ol.target_type = 'exercise' THEN e.name ELSE w.name END) AS target_name
         FROM output_logs ol
         LEFT JOIN exercises e ON ol.target_type = 'exercise' AND e.id = ol.target_id
         LEFT JOIN workouts w ON ol.target_type = 'workout' AND w.id = ol.target_id
         ORDER BY ol.created_at DESC
         LIMIT 8;`
      );
      return res.rows;
    },
  });

  const items = useMemo(() => logs, [logs]);

  return (
    <WidgetWrapper title="OUTPUT" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      {isLoading && <div style={{ fontSize: 10, color: dim }}>LOADING...</div>}
      {!isLoading && items.length === 0 && <div style={{ fontSize: 10, color: dim }}>No output logs yet.</div>}
      {!isLoading && items.map((log: any) => {
        const date = new Date(log.created_at).toLocaleDateString('en', { month: 'numeric', day: 'numeric' });
        return (
          <div key={log.id} onClick={() => onOutputClick?.(log.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, cursor: onOutputClick ? 'pointer' : 'default' }}>
            <span style={{ fontSize: 8, color: adim, width: 32 }}>{date}</span>
            <span style={{ fontSize: 8, color: dim, width: 58 }}>{String(log.target_type).toUpperCase()}</span>
            <span style={{ fontSize: 10, color: acc, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: mono }}>{log.target_name ?? log.target_id}</span>
            <span style={{ fontSize: 8, color: adim }}>{log.duration_minutes}m</span>
          </div>
        );
      })}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onOpenOutput} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer' }}>+ ADD OUTPUT</button>
        <button onClick={() => onViewAll?.()} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer' }}>VIEW ALL {'>'}</button>
      </div>
    </WidgetWrapper>
  );
}
