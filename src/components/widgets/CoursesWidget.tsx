import WidgetWrapper from '../WidgetWrapper';
import ProgressBar from '../ProgressBar';
import { courses } from '@/data/mockData';

const CoursesWidget = () => (
  <WidgetWrapper title="COURSES">
    {courses.map((c, i) => (
      <div key={i} style={{ marginBottom: 10, cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'hsl(var(--accent))' }}>&gt; {c.name}</span>
          <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{c.provider}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <ProgressBar value={c.progress} max={100} width="120px" height={6} />
          <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{c.progress}%</span>
          <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{c.stats}</span>
          <span style={{
            fontSize: 9,
            color: c.status === 'COMPLETE' ? 'hsl(var(--success))' : 'hsl(var(--accent))',
          }}>{c.status}{c.status === 'COMPLETE' ? ' ✓' : ''}</span>
        </div>
      </div>
    ))}
    <button className="topbar-btn" style={{ width: '100%', fontSize: 10, marginTop: 4 }}>
      + ADD COURSE
    </button>
  </WidgetWrapper>
);

export default CoursesWidget;
