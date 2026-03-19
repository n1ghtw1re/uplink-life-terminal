// ============================================================
// src/components/widgets/SkillsWidget.tsx
// ============================================================
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSkills } from '@/hooks/useSkills';
import { getStatLevel, STAT_META, StatKey } from '@/types';
import WidgetWrapper from '../WidgetWrapper';
import Modal from '../Modal';
import AddSkillModal from '../modals/AddSkillModal';

interface Props {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenSkills?: () => void;
  onSkillClick?: (id: string) => void;
}

export default function SkillsWidget({ onClose, onFullscreen, isFullscreen, onOpenSkills, onSkillClick }: Props) {
  const { user } = useAuth();
  const { data: skills, isLoading } = useSkills(user?.id);
  const [showAdd, setShowAdd] = useState(false);

  const topSkills = [...(skills ?? [])]
    .filter(s => (s as any).active !== false)
    .sort((a, b) => {
      const la = getStatLevel(a.xp).level;
      const lb = getStatLevel(b.xp).level;
      return lb !== la ? lb - la : b.xp - a.xp;
    })
    .slice(0, 8);

  return (
    <WidgetWrapper title="SKILLS" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      {isLoading ? (
        <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>LOADING...</div>
      ) : topSkills.length === 0 ? (
        <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>No skills yet.</div>
      ) : (
        <div>
          {topSkills.map(skill => {
            const { level, xpInLevel, xpForLevel } = getStatLevel(skill.xp);
            const pct = xpForLevel > 0 ? Math.round((xpInLevel / xpForLevel) * 100) : 100;
            const statIcon = STAT_META[skill.statKeys[0] as StatKey]?.icon ?? '';

            return (
              <div
                key={skill.id}
                onClick={() => onSkillClick?.(skill.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 7, cursor: onSkillClick ? 'pointer' : 'default',
                }}
                onMouseEnter={e => { if (onSkillClick) e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <span style={{ fontSize: 10, color: 'hsl(var(--accent-dim))', width: 12, flexShrink: 0 }}>
                  {statIcon}
                </span>
                <span style={{
                  fontSize: 11, color: 'hsl(var(--accent))',
                  flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {skill.name}
                </span>
                <span style={{
                  fontFamily: "'VT323', monospace", fontSize: 14,
                  color: 'hsl(var(--accent))', flexShrink: 0, width: 42,
                }}>
                  LVL {level}
                </span>
                <div style={{
                  width: 60, height: 5, flexShrink: 0,
                  background: 'hsl(var(--bg-tertiary))',
                  border: '1px solid hsl(var(--accent-dim))',
                }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: 'hsl(var(--accent))',
                  }} />
                </div>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9, color: 'hsl(var(--text-dim))',
                  width: 28, textAlign: 'right', flexShrink: 0,
                }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        marginTop: 8, paddingTop: 8,
        borderTop: '1px solid hsl(var(--accent-dim))',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            background: 'transparent', border: 'none',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9, color: 'hsl(var(--accent-dim))',
            cursor: 'pointer', letterSpacing: 1,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'hsl(var(--accent))'}
          onMouseLeave={e => e.currentTarget.style.color = 'hsl(var(--accent-dim))'}
        >
          + ADD SKILL
        </button>
        <button
          onClick={onOpenSkills}
          style={{
            background: 'transparent', border: 'none',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9, color: 'hsl(var(--accent-dim))',
            cursor: 'pointer', letterSpacing: 1,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'hsl(var(--accent))'}
          onMouseLeave={e => e.currentTarget.style.color = 'hsl(var(--accent-dim))'}
        >
          VIEW ALL ›
        </button>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD SKILL" width={680}>
        <AddSkillModal onClose={() => setShowAdd(false)} />
      </Modal>
    </WidgetWrapper>
  );
}