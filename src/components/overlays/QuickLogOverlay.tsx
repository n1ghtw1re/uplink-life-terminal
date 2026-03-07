import { useState } from 'react';
import ProgressBar from '../ProgressBar';

const QuickLogOverlay = () => {
  const [skill, setSkill] = useState('');
  const [duration, setDuration] = useState(60);

  return (
    <div style={{ fontSize: 11 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 4 }}>SKILL:</div>
        <input
          className="crt-input"
          style={{ width: '100%' }}
          placeholder="start typing..."
          value={skill}
          onChange={e => setSkill(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 4 }}>DURATION:</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            className="crt-input"
            style={{ width: 60 }}
            type="number"
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
          />
          <span style={{ color: 'hsl(var(--text-dim))' }}>min</span>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 4 }}>STAT SPLIT:</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ width: 40, fontSize: 10 }}>BODY</span>
          <ProgressBar value={80} max={100} width="120px" height={6} />
          <span style={{ fontSize: 9 }}>80%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 40, fontSize: 10 }}>GRIT</span>
          <ProgressBar value={20} max={100} width="120px" height={6} />
          <span style={{ fontSize: 9 }}>20%</span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid hsl(var(--accent-dim))', paddingTop: 8, marginBottom: 12 }}>
        <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 4 }}>XP PREVIEW:</div>
        <div style={{ color: 'hsl(var(--accent))', fontSize: 10 }}>
          SKILL +200  STAT +96  MASTER +60  MULT: 2.0×
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="topbar-btn" style={{ flex: 1 }}>&gt;&gt; SUBMIT</button>
        <button className="topbar-btn" style={{ flex: 1, color: 'hsl(var(--text-dim))' }}>OPEN FULL FORM</button>
      </div>
    </div>
  );
};

export default QuickLogOverlay;
