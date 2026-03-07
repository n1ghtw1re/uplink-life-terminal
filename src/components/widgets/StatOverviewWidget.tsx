import WidgetWrapper from '../WidgetWrapper';
import ProgressBar from '../ProgressBar';
import { stats, operatorData } from '@/data/mockData';

const StatOverviewWidget = () => (
  <WidgetWrapper title="STAT OVERVIEW">
    {stats.map(s => (
      <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, opacity: s.dormant ? 0.4 : 1 }}>
        <span style={{ width: 16, fontSize: 14 }}>{s.icon}</span>
        <span style={{ width: 40, fontSize: 10 }}>{s.name}</span>
        {s.dormant ? (
          <span style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>░░░░░ DORMANT</span>
        ) : (
          <>
            <span style={{ width: 36, fontSize: 10, color: 'hsl(var(--accent))' }}>LVL {s.level}</span>
            <ProgressBar value={s.xp} max={s.xpToNext} width="100px" height={6} />
            <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>STK: {s.streak}d</span>
          </>
        )}
      </div>
    ))}
    <div style={{ marginTop: 10, borderTop: '1px solid hsl(var(--accent-dim))', paddingTop: 8, fontSize: 10 }}>
      <div style={{ color: 'hsl(var(--text-dim))' }}>
        CLASS: <span style={{ color: 'hsl(var(--accent))' }}>{operatorData.classPrimary}</span> // <span style={{ color: 'hsl(var(--accent))' }}>{operatorData.classSecondary}</span>
      </div>
      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'hsl(var(--text-dim))' }}>AUGMENTATION:</span>
        <ProgressBar value={operatorData.augmentation} max={100} width="80px" height={6} />
        <span style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>{operatorData.augmentation}/100</span>
      </div>
    </div>
  </WidgetWrapper>
);

export default StatOverviewWidget;
