import WidgetWrapper from '../WidgetWrapper';
import ProgressBar from '../ProgressBar';
import { operatorData, recentXp } from '@/data/mockData';

const XPWidget = () => {
  const op = operatorData;
  return (
    <WidgetWrapper title="XP & LEVELLING">
      <div className="font-display text-glow" style={{ fontSize: 18, marginBottom: 8, color: 'hsl(var(--accent-bright))' }}>
        LVL {op.level} // {op.title}
      </div>
      <ProgressBar value={op.xp} max={op.xpToNext} />
      <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginTop: 4, marginBottom: 10 }}>
        {op.xp.toLocaleString()} / {op.xpToNext.toLocaleString()} XP
      </div>
      {recentXp.map((xp, i) => (
        <div key={i} style={{ fontSize: 10, marginBottom: 3, color: 'hsl(var(--text-dim))' }}>
          <span style={{ color: 'hsl(var(--accent))' }}>+{xp.amount} XP</span> — {xp.desc}
        </div>
      ))}
      <div style={{ marginTop: 10, borderTop: '1px solid hsl(var(--accent-dim))', paddingTop: 8, fontSize: 10 }}>
        <span style={{ color: 'hsl(var(--accent-bright))' }}>STREAK: {op.streak} DAYS</span>
        <span style={{ marginLeft: 8, color: 'hsl(var(--accent))' }}>[ON FIRE {op.multiplier}×]</span>
      </div>
      <div style={{ fontSize: 10, marginTop: 4, color: 'hsl(var(--text-dim))' }}>
        SHIELDS: {op.shields.map((s, i) => <span key={i}>{s ? '▣' : '□'} </span>)}
      </div>
      <div style={{ marginTop: 10, borderTop: '1px solid hsl(var(--accent-dim))', paddingTop: 8, fontSize: 10 }}>
        <div style={{ color: 'hsl(var(--text-dim))' }}>WEEKLY CHALLENGE: Complete 3 sessions</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <ProgressBar value={2} max={3} width="80px" />
          <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>2/3 RESETS IN: 2d 14h</span>
        </div>
      </div>
    </WidgetWrapper>
  );
};

export default XPWidget;
