import { useState } from 'react';
import WidgetWrapper from '../WidgetWrapper';
import { dailyCheckinStats, habits } from '@/data/mockData';

interface WidgetProps { onClose?: () => void; onFullscreen?: () => void; isFullscreen?: boolean; }

const CheckinWidget = ({ onClose, onFullscreen, isFullscreen }: WidgetProps) => {
  const [statChecks, setStatChecks] = useState(dailyCheckinStats.map(s => s.checked));
  const [habitChecks, setHabitChecks] = useState(habits.map(h => h.checked));

  const now = new Date();
  const dateStr = `${now.getFullYear()}.${(now.getMonth()+1).toString().padStart(2,'0')}.${now.getDate().toString().padStart(2,'0')}`;

  return (
    <WidgetWrapper title="DAILY CHECK-IN" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      <div style={{ fontSize: 11, color: 'hsl(var(--text-dim))', marginBottom: 8 }}>{dateStr}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 10 }}>
        {dailyCheckinStats.map((s, i) => (
          <label key={i} className="crt-checkbox" onClick={() => {
            const n = [...statChecks];
            n[i] = !n[i];
            setStatChecks(n);
          }}>
            <span className="crt-checkbox-box">{statChecks[i] ? 'X' : ' '}</span>
            <span>{s.icon} {s.name}</span>
          </label>
        ))}
      </div>
      <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginBottom: 4 }}>HABITS:</div>
      {habits.map((h, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, fontSize: 10 }}>
          <label className="crt-checkbox" onClick={() => {
            const n = [...habitChecks];
            n[i] = !n[i];
            setHabitChecks(n);
          }}>
            <span className="crt-checkbox-box">{habitChecks[i] ? 'X' : ' '}</span>
            <span>{h.name}</span>
          </label>
          <span style={{ color: 'hsl(var(--text-dim))' }}>STK: {h.streak}d {'▣'.repeat(h.shields)}{'░'.repeat(2 - h.shields)}</span>
        </div>
      ))}
      <button className="topbar-btn" style={{ marginTop: 10, width: '100%', fontSize: 10 }}>
        {'>> SUBMIT CHECK-IN'}
      </button>
    </WidgetWrapper>
  );
};

export default CheckinWidget;
