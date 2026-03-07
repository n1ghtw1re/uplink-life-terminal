import ProgressBar from '../ProgressBar';
import { operatorData, stats, classAffinities, xpHistory } from '@/data/mockData';

const CharacterSheet = () => {
  const op = operatorData;
  return (
    <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ marginBottom: 16 }}>
        <div className="font-display text-glow-bright" style={{ fontSize: 24, marginBottom: 4 }}>
          CALLSIGN: {op.callsign}
        </div>
        <div style={{ color: 'hsl(var(--text-dim))' }}>
          CLASS: <span style={{ color: 'hsl(var(--accent))' }}>{op.classPrimary}</span>
          <span style={{ marginLeft: 12 }}>SECONDARY: <span style={{ color: 'hsl(var(--accent))' }}>{op.classSecondary}</span></span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="font-display text-glow" style={{ fontSize: 20 }}>LVL {op.level} // {op.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <ProgressBar value={op.xp} max={op.xpToNext} width="250px" />
          <span style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>{op.xp.toLocaleString()} / {op.xpToNext.toLocaleString()} XP</span>
        </div>
        <div style={{ marginTop: 4, fontSize: 10, color: 'hsl(var(--text-dim))' }}>
          STREAK: {op.streak}d [ON FIRE {op.multiplier}×]  SHIELDS: {op.shields.map((s, i) => <span key={i}>{s ? '▣' : '□'}</span>)}
        </div>
      </div>

      <div style={{ borderTop: '1px solid hsl(var(--accent-dim))', paddingTop: 12, marginBottom: 16 }}>
        <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 8 }}>STATS ─────────────────────────────</div>
        {stats.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, opacity: s.dormant ? 0.4 : 1 }}>
            <span style={{ fontSize: 14, width: 18 }}>{s.icon}</span>
            <span style={{ width: 45 }}>{s.name}</span>
            {s.dormant ? (
              <span style={{ color: 'hsl(var(--text-dim))' }}>DORMANT</span>
            ) : (
              <>
                <span style={{ width: 40, color: 'hsl(var(--accent))' }}>LVL {s.level}</span>
                <ProgressBar value={s.xp} max={s.xpToNext} width="180px" height={6} />
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid hsl(var(--accent-dim))', paddingTop: 12, marginBottom: 16 }}>
        <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 8 }}>CLASS AFFINITY ───────────────────</div>
        {classAffinities.map(c => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ width: 90 }}>{c.name}</span>
            <ProgressBar value={c.percent} max={100} width="150px" height={6} />
            <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{c.percent}%</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid hsl(var(--accent-dim))', paddingTop: 12 }}>
        <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 8 }}>RECENT XP ────────────────────────</div>
        {xpHistory.map((xp, i) => (
          <div key={i} style={{ marginBottom: 4, fontSize: 10 }}>
            <span style={{ color: 'hsl(var(--accent))' }}>+{xp.amount} XP</span>
            <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>{xp.desc} ({xp.stats})</span>
            <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>{xp.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CharacterSheet;
