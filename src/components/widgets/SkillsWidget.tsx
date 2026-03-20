// ============================================================
// src/components/widgets/SkillsWidget.tsx
// ============================================================
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSkills } from '@/hooks/useSkills';
import { getDB } from '@/lib/db';
import { getStatLevel, STAT_META, StatKey } from '@/types';
import WidgetWrapper from '../WidgetWrapper';
import Modal from '../Modal';
import AddSkillModal from '../modals/AddSkillModal';

type FilterKey = 'active' | 'recent' | 'most_used' | 'new';

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'active',    label: 'ACTIVE'    },
  { key: 'recent',    label: 'RECENT'    },
  { key: 'most_used', label: 'MOST USED' },
  { key: 'new',       label: 'NEW'       },
];

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim  = 'hsl(var(--text-dim))';

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
  const [showAdd, setShowAdd]     = useState(false);
  const [filter, setFilter]       = useState<FilterKey>('active');

  // ── Session counts per skill (for MOST USED) ─────────────
  const { data: sessionCounts = {} } = useQuery({
    queryKey: ['skill-session-counts'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<{ skill_id: string; count: string }>(
        `SELECT skill_id, COUNT(*) as count FROM sessions GROUP BY skill_id;`
      );
      return Object.fromEntries(res.rows.map(r => [r.skill_id, Number(r.count)]));
    },
  });

  // ── Last session date per skill (for RECENT) ─────────────
  const { data: lastSessions = {} } = useQuery({
    queryKey: ['skill-last-session'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<{ skill_id: string; last: string }>(
        `SELECT skill_id, MAX(logged_at) as last FROM sessions GROUP BY skill_id;`
      );
      return Object.fromEntries(res.rows.map(r => [r.skill_id, r.last]));
    },
  });

  // ── Filtered + sorted list ────────────────────────────────
  const displaySkills = useMemo(() => {
    const all = skills ?? [];

    switch (filter) {
      case 'active':
        return all
          .filter(s => (s as any).active !== false)
          .sort((a, b) => {
            const la = getStatLevel(a.xp).level;
            const lb = getStatLevel(b.xp).level;
            return lb !== la ? lb - la : b.xp - a.xp;
          })
          .slice(0, 8);

      case 'recent':
        return all
          .filter(s => (s as any).active !== false && lastSessions[s.id])
          .sort((a, b) => {
            const da = lastSessions[a.id] ?? '';
            const db = lastSessions[b.id] ?? '';
            return db.localeCompare(da);
          })
          .slice(0, 8);

      case 'most_used':
        return all
          .filter(s => (s as any).active !== false && (sessionCounts[s.id] ?? 0) > 0)
          .sort((a, b) => (sessionCounts[b.id] ?? 0) - (sessionCounts[a.id] ?? 0))
          .slice(0, 8);

      case 'new':
        return all
          .filter(s => (s as any).active !== false && !(sessionCounts[s.id]))
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 8);

      default:
        return [];
    }
  }, [skills, filter, sessionCounts, lastSessions]);

  return (
    <WidgetWrapper title="SKILLS" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '2px 8px', fontSize: 9, fontFamily: mono,
            cursor: 'pointer', letterSpacing: 1,
            border: `1px solid ${filter === f.key ? acc : adim}`,
            background: filter === f.key ? 'rgba(255,176,0,0.1)' : 'transparent',
            color: filter === f.key ? acc : dim,
          }}>{f.label}</button>
        ))}
      </div>

      {/* Skill list */}
      {isLoading ? (
        <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
      ) : displaySkills.length === 0 ? (
        <div style={{ fontSize: 10, color: dim, opacity: 0.6 }}>
          {filter === 'recent'    && 'No skills logged yet'}
          {filter === 'most_used' && 'No sessions logged yet'}
          {filter === 'new'       && 'All active skills have been logged'}
          {filter === 'active'    && 'No active skills'}
        </div>
      ) : (
        <div>
          {displaySkills.map(skill => {
            const { level, xpInLevel, xpForLevel } = getStatLevel(skill.xp);
            const pct      = xpForLevel > 0 ? Math.round((xpInLevel / xpForLevel) * 100) : 100;
            const statIcon = STAT_META[skill.statKeys[0] as StatKey]?.icon ?? '';
            const count    = sessionCounts[skill.id];
            const last     = lastSessions[skill.id];

            return (
              <div key={skill.id} onClick={() => onSkillClick?.(skill.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, cursor: onSkillClick ? 'pointer' : 'default' }}
                onMouseEnter={e => { if (onSkillClick) e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <span style={{ fontSize: 10, color: adim, width: 12, flexShrink: 0 }}>{statIcon}</span>
                <span style={{ fontSize: 11, color: acc, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: mono }}>
                  {skill.name}
                </span>

                {/* Context info based on filter */}
                {filter === 'most_used' && count && (
                  <span style={{ fontSize: 9, color: adim, flexShrink: 0, width: 40, textAlign: 'right' }}>
                    {count}×
                  </span>
                )}
                {filter === 'recent' && last && (
                  <span style={{ fontSize: 9, color: adim, flexShrink: 0, width: 48, textAlign: 'right' }}>
                    {new Date(last).toLocaleDateString('en', { month: 'numeric', day: 'numeric' })}
                  </span>
                )}

                <span style={{ fontFamily: vt, fontSize: 14, color: acc, flexShrink: 0, width: 42 }}>
                  LVL {level}
                </span>
                <div style={{ width: 60, height: 5, flexShrink: 0, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${adim}` }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: acc }} />
                </div>
                <span style={{ fontFamily: mono, fontSize: 9, color: dim, width: 28, textAlign: 'right', flexShrink: 0 }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = acc}
          onMouseLeave={e => e.currentTarget.style.color = adim}
        >+ ADD SKILL</button>
        <button onClick={onOpenSkills} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = acc}
          onMouseLeave={e => e.currentTarget.style.color = adim}
        >VIEW ALL ›</button>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD SKILL" width={680}>
        <AddSkillModal onClose={() => setShowAdd(false)} />
      </Modal>
    </WidgetWrapper>
  );
}