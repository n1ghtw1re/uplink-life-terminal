import { useEffect } from 'react';
import ProgressBar from '../ProgressBar';
import { toast } from '@/hooks/use-toast';

export interface DrawerItem {
  type: 'skill';
  id: string;
}

// Mock skill data for MMA
const mockSkillData = {
  name: 'MMA',
  stats: [
    { icon: '▲', name: 'BODY', pct: 80 },
    { icon: '▣', name: 'GRIT', pct: 20 },
  ],
  level: 4,
  xp: 2840,
  xpToNext: 4500,
  streak: 9,
  shields: [true, true, false] as boolean[],
  sessions: [
    { date: '2026.03.08', duration: 60, intensity: 4 },
    { date: '2026.03.06', duration: 45, intensity: 3 },
    { date: '2026.03.04', duration: 90, intensity: 5 },
    { date: '2026.03.01', duration: 60, intensity: 4 },
    { date: '2026.02.28', duration: 45, intensity: 3 },
  ],
  tags: ['BODY / GRIT', 'PHYSICAL', 'MARTIAL ARTS'],
  status: 'ACTIVE',
};

interface DetailDrawerProps {
  open: boolean;
  item: DrawerItem | null;
  onClose: () => void;
  onOpenLog?: () => void;
}

const SectionHeader = ({ label }: { label: string }) => (
  <div style={{
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 9,
    color: '#664400',
    letterSpacing: 2,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '16px 0 8px 0',
  }}>
    {label}
    <div style={{ flex: 1, height: 1, background: '#261600' }} />
  </div>
);

const DetailDrawer = ({ open, item, onClose, onOpenLog }: DetailDrawerProps) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const d = mockSkillData;

  return (
    <div
      className="detail-drawer"
      style={{
        position: 'fixed',
        top: 48,
        right: 0,
        bottom: 0,
        width: 420,
        background: '#0f0800',
        borderLeft: '1px solid #996800',
        boxShadow: '-4px 0 20px rgba(255, 176, 0, 0.08)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(420px)',
        transition: 'transform 200ms ease',
      }}
    >
      {/* Header */}
      <div style={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid #261600',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#664400' }}>
          // DETAIL — {item?.type?.toUpperCase() || 'SKILL'}
        </span>
        <button
          className="topbar-btn"
          onClick={onClose}
          style={{ fontSize: 10, padding: '2px 8px' }}
        >
          × CLOSE
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: 16,
      }} className="drawer-scroll-area">
        {/* Skill name */}
        <div style={{
          fontFamily: "'VT323', monospace",
          fontSize: 28,
          color: 'hsl(var(--accent-bright))',
          textShadow: '0 0 8px hsla(var(--accent-glow) / 0.6), 0 0 16px hsla(var(--accent-glow) / 0.3)',
          marginBottom: 4,
        }}>
          // {d.name}
        </div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          color: '#664400',
          marginBottom: 8,
        }}>
          {d.stats.map(s => s.name).join(' / ')}  •  LVL {d.level}  •  {d.status}
        </div>
        <div style={{ height: 1, background: '#261600', marginBottom: 8 }} />

        {/* Stat Split */}
        <SectionHeader label="STAT SPLIT" />
        {d.stats.map(s => (
          <div key={s.name} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
          }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: 'hsl(var(--accent))',
              width: 48,
              flexShrink: 0,
            }}>
              {s.icon} {s.name}
            </span>
            <div style={{ flex: 1 }}>
              <ProgressBar value={s.pct} max={100} height={5} />
            </div>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: '#664400',
              width: 32,
              textAlign: 'right',
              flexShrink: 0,
            }}>
              {s.pct}%
            </span>
          </div>
        ))}

        {/* Level & XP */}
        <SectionHeader label="LEVEL & XP" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontFamily: "'VT323', monospace",
            fontSize: 18,
            color: 'hsl(var(--accent-bright))',
          }}>
            LVL {d.level}
          </span>
        </div>
        <ProgressBar value={d.xp} max={d.xpToNext} height={6} />
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          color: '#664400',
          marginTop: 4,
        }}>
          {d.xp.toLocaleString()} / {d.xpToNext.toLocaleString()} XP to LVL {d.level + 1}
        </div>

        {/* Streak */}
        <SectionHeader label="STREAK" />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
        }}>
          <span>
            {d.shields.map((s, i) => (
              <span key={i} style={{ color: s ? 'hsl(var(--accent))' : '#332200', marginRight: 2 }}>
                {s ? '▣' : '□'}
              </span>
            ))}
          </span>
          <span style={{ color: 'hsl(var(--accent))' }}>{d.streak} DAYS</span>
          <span style={{ color: '#664400' }}>
            SHIELDS: {d.shields.filter(Boolean).length}/{d.shields.length}
          </span>
        </div>

        {/* Session History */}
        <SectionHeader label="SESSION HISTORY" />
        {d.sessions.map((s, i) => (
          <div key={i} style={{
            display: 'flex',
            gap: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            marginBottom: 4,
          }}>
            <span style={{ color: '#664400' }}>&gt;</span>
            <span style={{ color: '#664400' }}>{s.date}</span>
            <span style={{ color: 'hsl(var(--accent))' }}>{s.duration} min</span>
            <span style={{ color: '#664400' }}>intensity {s.intensity}/5</span>
          </div>
        ))}

        {/* Tags */}
        <SectionHeader label="TAGS" />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {d.tags.map(tag => (
            <span key={tag} style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 8,
              color: '#996800',
              border: '1px solid #332200',
              padding: '2px 6px',
              letterSpacing: 1,
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Divider before actions */}
        <div style={{ height: 1, background: '#261600', margin: '20px 0 16px' }} />

        {/* Actions */}
        <button
          onClick={() => {
            onClose();
            onOpenLog?.();
          }}
          style={{
            width: '100%',
            height: 36,
            border: '1px solid hsl(var(--accent))',
            background: 'transparent',
            color: 'hsl(var(--accent))',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            cursor: 'pointer',
            marginBottom: 8,
            transition: 'all 150ms ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'hsl(var(--accent))';
            e.currentTarget.style.color = 'hsl(var(--bg-primary))';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'hsl(var(--accent))';
          }}
        >
          [ &gt;&gt; LOG SESSION ]
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => toast({ title: 'COMING SOON', description: 'Skill editing is not yet available.' })}
            style={{
              flex: 1,
              height: 32,
              border: '1px solid #261600',
              background: 'transparent',
              color: '#664400',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              cursor: 'pointer',
              transition: 'border-color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#996800'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#261600'; }}
          >
            [ EDIT SKILL ]
          </button>
          <button
            onClick={() => toast({ title: 'COMING SOON', description: 'Skill deletion is not yet available.' })}
            style={{
              flex: 1,
              height: 32,
              border: '1px solid #261600',
              background: 'transparent',
              color: '#664400',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#ff4400';
              e.currentTarget.style.color = '#ff4400';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#261600';
              e.currentTarget.style.color = '#664400';
            }}
          >
            [ DELETE ]
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailDrawer;
