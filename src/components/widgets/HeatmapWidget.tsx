import { useMemo } from 'react';
import WidgetWrapper from '../WidgetWrapper';
import { generateHeatmap } from '@/data/mockData';

const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface WidgetProps { onClose?: () => void; onFullscreen?: () => void; isFullscreen?: boolean; }

const HeatmapWidget = ({ onClose, onFullscreen, isFullscreen }: WidgetProps) => {
  const heatmap = useMemo(() => generateHeatmap(), []);
  const cellSize = 14;
  const gap = 2;

  return (
    <WidgetWrapper title="STREAK HEATMAP" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {heatmap.map((row, dayIdx) => (
          <div key={dayIdx} style={{ display: 'flex', alignItems: 'center', gap }}>
            <span style={{ width: 12, fontSize: 9, color: 'hsl(var(--text-dim))' }}>{days[dayIdx]}</span>
            {row.map((val, weekIdx) => (
              <div
                key={weekIdx}
                style={{
                  width: cellSize,
                  height: cellSize,
                  background: val === 0
                    ? 'hsl(var(--bg-tertiary))'
                    : val === 1
                      ? 'hsl(var(--accent) / 0.5)'
                      : 'hsl(var(--accent))',
                  boxShadow: val === 2 ? '0 0 4px hsl(var(--accent-glow) / 0.5)' : 'none',
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: 'hsl(var(--text-dim))' }}>
        <div>// CURRENT STREAK: <span style={{ color: 'hsl(var(--accent))' }}>14 DAYS</span></div>
        <div>// LONGEST: <span style={{ color: 'hsl(var(--accent))' }}>31 DAYS</span></div>
      </div>
    </WidgetWrapper>
  );
};

export default HeatmapWidget;
