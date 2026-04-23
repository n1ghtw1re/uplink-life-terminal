// ============================================================
// src/components/overlays/StatDetailOverlay.tsx
// ============================================================
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStats } from '@/hooks/useStats';
import { useSkills } from '@/hooks/useSkills';
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import { StatKey, STAT_META, STAT_FLAVOR, STAT_LEVEL_TITLES, getStatLevel } from '@/types';
import { getXPDisplayValues } from '@/services/xpService';
import CourseDetailDrawer from '@/components/drawer/CourseDetailDrawer';
import SkillDetailDrawer from '@/components/drawer/SkillDetailDrawer';
import MediaDetailDrawer from '@/components/drawer/MediaDetailDrawer';
import SessionDetailDrawer from '@/components/drawer/SessionDetailDrawer';

const STAT_NAV: StatKey[] = ['body', 'cool', 'flow', 'ghost', 'grit', 'mind', 'wire'];

interface Props {
  statKey: StatKey;
  onClose: () => void;
  onNavigate?: (key: StatKey) => void;
  onOpenLog?: () => void;
}

// ── Shared primitives ─────────────────────────────────────────

function XPBar({ value, max, height = 6 }: { value: number; max: number; height?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{
      background: 'hsl(var(--bg-tertiary))',
      border: '1px solid hsl(var(--accent-dim))',
      height,
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        background: 'hsl(var(--accent))',
        boxShadow: '0 0 6px rgba(255,176,0,0.35)',
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

function Divider({ label, collapsed, onToggle, count }: {
  label: string;
  collapsed?: boolean;
  onToggle?: () => void;
  count?: number;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        margin: '20px 0 10px',
        cursor: onToggle ? 'pointer' : 'default',
        userSelect: 'none',
      }}
      onMouseEnter={e => { if (onToggle) (e.currentTarget.querySelector('span') as HTMLElement).style.color = 'hsl(var(--accent))'; }}
      onMouseLeave={e => { if (onToggle) (e.currentTarget.querySelector('span') as HTMLElement).style.color = 'hsl(var(--accent-dim))'; }}
    >
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9, color: 'hsl(var(--accent-dim))',
        letterSpacing: 2, flexShrink: 0,
        transition: 'color 150ms',
      }}>
        {onToggle ? (collapsed ? '› ' : '▾ ') : '── '}
        {label}
        {count !== undefined && (
          <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 6 }}>({count})</span>
        )}
      </span>
      <div style={{ flex: 1, height: 1, background: 'hsl(var(--accent-dim))', opacity: 0.3 }} />
    </div>
  );
}

function Badge({ label, success }: { label: string; success?: boolean }) {
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 9,
      color: success ? '#44ff88' : 'hsl(var(--text-dim))',
      border: '1px solid',
      borderColor: success ? '#44ff88' : 'hsl(var(--accent-dim))',
      padding: '1px 6px',
      flexShrink: 0,
      letterSpacing: 1,
    }}>
      {label}
    </span>
  );
}

// ── Activity entry types ─────────────────────────────────────
interface SessionActivity {
  type: 'session';
  id: string;
  session_id: string;
  skill_name: string;
  duration_minutes: number;
  amount: number;
  logged_at: string;
  notes: string | null;
  source_label: string;
}

interface BonusActivity {
  type: 'bonus';
  id: string;
  source: string;
  source_id: string;
  amount: number;
  logged_at: string;
  notes: string | null;
  source_label: string;
  drawer_type: 'session' | null;
}

type ActivityEntry = SessionActivity | BonusActivity;

// ── Main component ────────────────────────────────────────────

export default function StatDetailOverlay({ statKey, onClose, onNavigate, onOpenLog }: Props) {
  const [innerDrawer, setInnerDrawer] = useState<{ type: string; id: string } | null>(null);
  const [collapsedSkills, setCollapsedSkills]     = useState(false);
  const [collapsedActivity, setCollapsedActivity] = useState(false);
  const [collapsedMedia, setCollapsedMedia]       = useState(false);
  const [collapsedCourses, setCollapsedCourses]   = useState(false);
  const [mediaTab, setMediaTab] = useState<string>('ALL');

  // Reset section states when navigating to a new stat
  useEffect(() => {
    setCollapsedSkills(false);
    setCollapsedActivity(false);
    setCollapsedMedia(false);
    setCollapsedCourses(false);
    setMediaTab('ALL');
    setInnerDrawer(null);
  }, [statKey]);
  const { user } = useAuth();
  const { data: allStats } = useStats(user?.id);
  const { data: allSkills } = useSkills(user?.id);

  const stat   = allStats?.find(s => s.key === statKey);
  const meta   = STAT_META[statKey];
  const flavor = STAT_FLAVOR[statKey];
  const titles = STAT_LEVEL_TITLES[statKey];
  const skills = (allSkills ?? []).filter(s => s.statKeys.includes(statKey));

  const { data: recentActivity } = useQuery({
    queryKey: ['activity-by-stat', statKey],
    queryFn: async () => {
      const db = await getDB();
      const activities: ActivityEntry[] = [];

      const sessionRes = await db.query<{
        id: string;
        skill_id: string;
        skill_name: string;
        duration_minutes: number;
        notes: string | null;
        logged_at: string;
        stat_split: Array<{ stat: string; percent: number }> | string;
        stat_amount: number | string;
      }>(
        `SELECT s.id, s.skill_id, s.skill_name, s.duration_minutes, s.notes, s.logged_at, s.stat_split,
                COALESCE(SUM(x.amount), 0) AS stat_amount
         FROM sessions s
         LEFT JOIN xp_log x
           ON x.source_id = s.id
          AND x.tier = 'stat'
          AND x.entity_id = $1
         GROUP BY s.id, s.skill_id, s.skill_name, s.duration_minutes, s.notes, s.logged_at, s.stat_split
         ORDER BY s.logged_at DESC
         LIMIT 150;`,
        [statKey]
      );

      const filteredSessions = sessionRes.rows.filter((row) => {
        const split = Array.isArray(row.stat_split)
          ? row.stat_split
          : JSON.parse((row.stat_split as string) || '[]');
        return split.some((s) => s.stat === statKey);
      });

      for (const row of filteredSessions) {
        if (Number(row.stat_amount || 0) > 0) {
          activities.push({
            type: 'session',
            id: crypto.randomUUID(),
            session_id: row.id,
            skill_name: row.skill_name,
            duration_minutes: row.duration_minutes,
            amount: Number(row.stat_amount || 0),
            logged_at: row.logged_at,
            notes: row.notes,
            source_label: 'SESSION',
          });
        }
      }

      const bonusRes = await db.query<{
        id: string;
        source: string;
        source_id: string;
        amount: number;
        notes: string | null;
        logged_at: string;
      }>(
        `SELECT id, source, source_id, amount, notes, logged_at
         FROM xp_log
         WHERE tier = 'stat'
           AND entity_id = $1
           AND source IN ('course_section', 'course_complete', 'book_complete', 'comic_complete', 'film_complete', 'documentary_complete', 'tv_complete', 'album_complete', 'game_complete')
         ORDER BY logged_at DESC
         LIMIT 50;`,
        [statKey]
      );

      const mediaSources = ['book_complete', 'comic_complete', 'film_complete', 'documentary_complete', 'tv_complete', 'album_complete', 'game_complete'];
      const sourceLabels: Record<string, string> = {
        'course_section': 'MODULE',
        'course_complete': 'COURSE',
        'book_complete': 'BOOK',
        'comic_complete': 'COMIC',
        'film_complete': 'FILM',
        'documentary_complete': 'DOC',
        'tv_complete': 'TV',
        'album_complete': 'ALBUM',
        'game_complete': 'GAME',
      };

      for (const row of bonusRes.rows) {
        const isMedia = mediaSources.includes(row.source);
        
        let sessionId: string | null = null;
        
        if (isMedia) {
          const sessionRes = await db.query<{ id: string }>(
            `SELECT id FROM sessions WHERE media_id = $1 LIMIT 1;`,
            [row.source_id]
          );
          sessionId = sessionRes.rows[0]?.id ?? null;
        } else if (row.source === 'course_complete') {
          const sessionRes = await db.query<{ id: string }>(
            `SELECT id FROM sessions WHERE course_id = $1 LIMIT 1;`,
            [row.source_id]
          );
          sessionId = sessionRes.rows[0]?.id ?? null;
        } else {
          const sectionRes = await db.query<{ course_id: string }>(
            `SELECT course_id FROM course_sections WHERE id = $1;`,
            [row.source_id]
          );
          if (sectionRes.rows[0]?.course_id) {
            const sessionRes = await db.query<{ id: string }>(
              `SELECT id FROM sessions WHERE course_id = $1 LIMIT 1;`,
              [sectionRes.rows[0].course_id]
            );
            sessionId = sessionRes.rows[0]?.id ?? null;
          }
        }
        
        activities.push({
          type: 'bonus',
          id: row.id,
          source: row.source,
          source_id: sessionId || row.source_id,
          amount: Number(row.amount),
          logged_at: row.logged_at,
          notes: row.notes,
          source_label: sourceLabels[row.source] || row.source.toUpperCase(),
          drawer_type: sessionId ? 'session' : null,
        });
      }

      activities.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
      return activities.slice(0, 20);
    },
  });

  const { data: linkedMedia } = useQuery({
    queryKey: ['media-by-stat', user?.id, statKey],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media')
        .select('id, type, title, creator, status, meta')
        .eq('user_id', user!.id)
        .eq('linked_stat', statKey)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: linkedCourses } = useQuery({
    queryKey: ['courses-by-stat', user?.id, statKey],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, provider, status, progress')
        .eq('user_id', user!.id)
        .contains('linked_stats', [statKey])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // ── Helpers ──────────────────────────────────────────────────

  const formatTimeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  };

  const mediaTypeLabel: Record<string, string> = {
    book: 'BOOK', comic: 'COMIC', film: 'FILM',
    documentary: 'DOC', tv: 'TV', album: 'ALBUM',
  };

  const currentTitle = stat ? (titles[stat.level - 1] ?? `LVL ${stat.level}`) : '—';
  const nextTitle    = stat ? (titles[stat.level] ?? 'MAX') : '—';

  // ── Render ───────────────────────────────────────────────────

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'hsl(var(--bg-primary))',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* CRT overlay */}
      <div className="crt-scanlines crt-vignette"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }} />

      {/* ── Top bar ── */}
      <div style={{
        borderBottom: '1px solid hsl(var(--accent-dim))',
        padding: '0 20px',
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 2,
        position: 'relative',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          color: 'hsl(var(--accent))',
        }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{meta.icon}</span>
          <span style={{ letterSpacing: 2 }}>// {meta.name}</span>
          <span style={{ color: 'hsl(var(--accent-dim))', fontSize: 10 }}>
            — {meta.domain}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid hsl(var(--accent-dim))',
              color: 'hsl(var(--accent-dim))',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              padding: '4px 12px',
              cursor: 'pointer',
              letterSpacing: 1,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'hsl(var(--accent))';
              e.currentTarget.style.color = 'hsl(var(--accent))';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'hsl(var(--accent-dim))';
              e.currentTarget.style.color = 'hsl(var(--accent-dim))';
            }}
          >
            [ × CLOSE ]
          </button>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        zIndex: 2,
        position: 'relative',
      }}>

        {/* ── LEFT PANEL — fixed, no scroll ── */}
        <div style={{
          width: '38%',
          minWidth: 320,
          maxWidth: 480,
          borderRight: '1px solid hsl(var(--accent-dim))',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          overflow: 'hidden',
        }}>

          {/* Stat name + icon hero */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontFamily: "'VT323', monospace",
              fontSize: 56,
              lineHeight: 1,
              color: 'hsl(var(--accent))',
              textShadow: '0 0 20px rgba(255,176,0,0.4), 0 0 40px rgba(255,176,0,0.2)',
              marginBottom: 4,
            }}>
              {meta.icon} {meta.name}
            </div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: 'hsl(var(--accent-dim))',
              letterSpacing: 3,
              marginBottom: 14,
            }}>
              {flavor.subtitle}
            </div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: 'hsl(var(--text-dim))',
              lineHeight: 1.8,
            }}>
              {flavor.description}
            </div>
          </div>

          {/* XP block */}
          <div style={{
            background: 'hsl(var(--bg-secondary))',
            border: '1px solid hsl(var(--accent-dim))',
            padding: '14px 16px',
            marginBottom: 20,
          }}>
            {stat ? (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  marginBottom: 10,
                }}>
                  <span style={{
                    fontFamily: "'VT323', monospace",
                    fontSize: 32,
                    color: 'hsl(var(--accent-bright))',
                    lineHeight: 1,
                  }}>
                    LVL {stat.level}
                  </span>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    color: 'hsl(var(--accent))',
                  }}>
                    {currentTitle}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <XPBar value={stat.xpInLevel} max={stat.xpForLevel} height={10} />
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: 'hsl(var(--text-dim))',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}>
                    {getXPDisplayValues(stat.xp).totalXP.toLocaleString()} / {getXPDisplayValues(stat.xp).totalXPToNextLevel.toLocaleString()}
                  </span>
                </div>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9,
                  color: 'hsl(var(--text-dim))',
                }}>
                  NEXT: <span style={{ color: 'hsl(var(--accent-dim))' }}>{nextTitle}</span>
                </div>
              </>
            ) : (
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: 'hsl(var(--text-dim))',
              }}>
                DORMANT — no activity logged yet
              </div>
            )}
          </div>

          {/* Level titles grid */}
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            color: 'hsl(var(--accent-dim))',
            letterSpacing: 2,
            marginBottom: 8,
          }}>
            ── LEVEL TITLES
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 4,
            flex: 1,
            overflow: 'hidden',
          }}>
            {titles.map((title, i) => {
              const isCurrent = stat?.level === i + 1;
              const isPast    = stat ? stat.level > i + 1 : false;
              return (
                <div key={i} style={{
                  padding: '5px 8px',
                  background: isCurrent ? 'rgba(255,176,0,0.08)' : 'hsl(var(--bg-secondary))',
                  border: `1px solid ${isCurrent ? 'hsl(var(--accent))' : 'rgba(153,104,0,0.4)'}`,
                  opacity: isPast ? 0.45 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span style={{
                    fontSize: 8,
                    color: 'hsl(var(--accent-dim))',
                    flexShrink: 0,
                    minWidth: 28,
                  }}>
                    LVL {i + 1}
                  </span>
                  <span style={{
                    fontSize: 9,
                    color: isCurrent ? 'hsl(var(--accent-bright))' : 'hsl(var(--accent-dim))',
                    fontFamily: "'IBM Plex Mono', monospace",
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT PANEL — scrollable, custom scrollbar ── */}
        <style>{`
          .stat-scroll::-webkit-scrollbar {
            width: 4px;
          }
          .stat-scroll::-webkit-scrollbar-track {
            background: hsl(var(--bg-secondary));
          }
          .stat-scroll::-webkit-scrollbar-thumb {
            background: hsl(var(--accent-dim));
          }
          .stat-scroll::-webkit-scrollbar-thumb:hover {
            background: hsl(var(--accent));
          }
          .stat-scroll {
            scrollbar-width: thin;
            scrollbar-color: hsl(var(--accent-dim)) hsl(var(--bg-secondary));
          }
        `}</style>
        <div
          className="stat-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
            paddingBottom: onNavigate ? 72 : 24,
          }}
        >

          {/* ── Skills ── */}
          <Divider label="SKILLS" collapsed={collapsedSkills} onToggle={() => setCollapsedSkills(v => !v)} count={skills.length} />
          {!collapsedSkills && (skills.length === 0 ? (
            <EmptyState text="No skills added for this domain yet." />
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {skills.map(skill => {
                const { xpInLevel, xpForLevel } = getStatLevel(skill.xp);
                return (
                  <div key={skill.id}
                    onClick={() => setInnerDrawer({ type: 'skill', id: skill.id })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '9px 14px',
                      background: 'hsl(var(--bg-secondary))',
                      border: '1px solid rgba(153,104,0,0.5)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'hsl(var(--accent-dim))')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(153,104,0,0.5)')}
                  >
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      color: 'hsl(var(--accent))',
                      width: 180,
                      flexShrink: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {skill.name}
                    </span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 9,
                      color: 'hsl(var(--accent-dim))',
                      width: 36,
                      flexShrink: 0,
                    }}>
                      LVL {skill.level}
                    </span>
                    <XPBar value={xpInLevel} max={xpForLevel} height={5} />
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 9,
                      color: 'hsl(var(--text-dim))',
                      width: 72,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}>
                      {skill.xp.toLocaleString()} XP
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          {/* ── Recent activity ── */}
          <Divider label="RECENT ACTIVITY" collapsed={collapsedActivity} onToggle={() => setCollapsedActivity(v => !v)} count={recentActivity?.length} />
          {!collapsedActivity && (!recentActivity || recentActivity.length === 0 ? (
            <EmptyState text="No activity yet." />
          ) : (
            <div style={{ display: 'grid', gap: 3 }}>
              {recentActivity.map(entry => {
                const isSession = entry.type === 'session';
                const isBonus = entry.type === 'bonus';
                const bonusEntry = entry as BonusActivity;
                const label = isSession
                  ? (entry as SessionActivity).notes || (entry as SessionActivity).skill_name
                  : bonusEntry.notes || bonusEntry.source_label;
                
                const handleClick = () => {
                  console.log('[Activity] Click:', { isSession, entry });
                  if (isSession) {
                    const sessionId = (entry as SessionActivity).session_id;
                    console.log('[Activity] Opening session:', sessionId);
                    setInnerDrawer({ type: 'session', id: sessionId });
                  } else if (bonusEntry.drawer_type === 'session') {
                    console.log('[Activity] Opening bonus session:', bonusEntry.source_id);
                    setInnerDrawer({ type: 'session', id: bonusEntry.source_id });
                  } else {
                    console.log('[Activity] No drawer_type for bonus entry');
                  }
                };
                
                return (
                  <div key={entry.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '6px 14px 6px 12px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    borderLeft: `2px solid ${isBonus ? '#44ff88' : 'hsl(var(--accent-dim))'}`,
                    cursor: 'pointer',
                    opacity: isBonus ? 0.85 : 1,
                  }}
                    onClick={handleClick}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = isBonus ? 'rgba(68,255,136,0.06)' : 'rgba(255,176,0,0.04)';
                      e.currentTarget.style.borderLeftColor = isBonus ? '#88ffbb' : 'hsl(var(--accent))';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderLeftColor = isBonus ? '#44ff88' : 'hsl(var(--accent-dim))';
                    }}
                  >
                    <span style={{
                      fontSize: 10,
                      color: 'hsl(var(--accent))',
                      width: 50,
                      flexShrink: 0,
                    }}>
                      {isSession ? `${(entry as SessionActivity).duration_minutes}m` : '---'}
                    </span>
                    <span style={{
                      fontSize: 10,
                      color: isBonus ? '#44ff88' : 'hsl(var(--accent-bright))',
                      width: 64,
                      flexShrink: 0,
                      textAlign: 'right',
                    }}>
                      +{entry.amount} XP
                    </span>
                    <span style={{
                      fontSize: 11,
                      color: 'hsl(var(--accent))',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))', flexShrink: 0, letterSpacing: 1 }}>
                      {entry.source_label}
                      {isBonus && <span style={{ color: '#44ff88' }}> [BONUS]</span>}
                    </span>
                    <span style={{ fontSize: 10, color: 'hsl(var(--text-dim))', width: 76, textAlign: 'right', flexShrink: 0 }}>
                      {formatTimeAgo(entry.logged_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          {/* ── Media ── */}
          {linkedMedia && linkedMedia.length > 0 && (
            <>
              <Divider label="MEDIA" collapsed={collapsedMedia} onToggle={() => setCollapsedMedia(v => !v)} count={linkedMedia.length} />
              {!collapsedMedia && (
              <>
                {/* Media type tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                  {['ALL', 'BOOK', 'COMIC', 'FILM', 'DOCUMENTARY', 'TV', 'ALBUM'].map(tab => {
                    const tabCount = tab === 'ALL' ? linkedMedia.length : linkedMedia.filter(m => m.type.toUpperCase() === tab).length;
                    if (tab !== 'ALL' && tabCount === 0) return null;
                    const tabLabel: Record<string, string> = { ALL: 'ALL', BOOK: 'BOOKS', COMIC: 'COMICS', FILM: 'FILMS', DOCUMENTARY: 'DOCS', TV: 'TV', ALBUM: 'ALBUMS' };
                    return (
                      <button key={tab} onClick={() => setMediaTab(tab)} style={{
                        padding: '3px 8px', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace",
                        border: `1px solid ${mediaTab === tab ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
                        background: mediaTab === tab ? 'rgba(255,176,0,0.1)' : 'transparent',
                        color: mediaTab === tab ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))',
                        cursor: 'pointer', letterSpacing: 1,
                      }}>
                        {tabLabel[tab]} {tabCount > 0 && tab !== 'ALL' ? `(${tabCount})` : ''}
                      </button>
                    );
                  })}
                </div>
              <div style={{ display: 'grid', gap: 5 }}>
                {(mediaTab === 'ALL' ? linkedMedia : linkedMedia.filter(m => m.type.toUpperCase() === mediaTab)).map(m => {
                  const pages      = (m.meta as any)?.pages;
                  const pageCurrent = (m.meta as any)?.page_current;
                  const progress   = pages && pageCurrent
                    ? Math.round((pageCurrent / pages) * 100)
                    : null;
                  return (
                    <div key={m.id}
                      onClick={() => setInnerDrawer({ type: 'media', id: m.id })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '7px 14px',
                        background: 'hsl(var(--bg-secondary))',
                        border: '1px solid rgba(153,104,0,0.5)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'hsl(var(--accent-dim))')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(153,104,0,0.5)')}
                    >
                      <Badge label={mediaTypeLabel[m.type] ?? m.type.toUpperCase()} />
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11,
                        color: 'hsl(var(--accent))',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {m.title}
                      </span>
                      {m.creator && (
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 10,
                          color: 'hsl(var(--text-dim))',
                          flexShrink: 0,
                        }}>
                          {m.creator}
                        </span>
                      )}
                      {progress !== null && (
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 10,
                          color: 'hsl(var(--text-dim))',
                          flexShrink: 0,
                          width: 36,
                          textAlign: 'right',
                        }}>
                          {progress}%
                        </span>
                      )}
                      <Badge label={m.status} success={m.status === 'FINISHED'} />
                    </div>
                  );
                })}
              </div>
              </>
              )}
            </>
          )}

          {/* ── Courses ── */}
          {linkedCourses && linkedCourses.length > 0 && (
            <>
              <Divider label="COURSES" collapsed={collapsedCourses} onToggle={() => setCollapsedCourses(v => !v)} count={linkedCourses.length} />
              {!collapsedCourses && <div style={{ display: 'grid', gap: 5 }}>
                {linkedCourses.map(c => (
                  <div key={c.id}
                    onClick={() => setInnerDrawer({ type: 'course', id: c.id })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 14px',
                      background: 'hsl(var(--bg-secondary))',
                      border: '1px solid rgba(153,104,0,0.5)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'hsl(var(--accent-dim))')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(153,104,0,0.5)')}
                  >
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      color: 'hsl(var(--accent))',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {c.name}
                    </span>
                    {c.provider && (
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10,
                        color: 'hsl(var(--text-dim))',
                        flexShrink: 0,
                      }}>
                        {c.provider}
                      </span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 120, flexShrink: 0 }}>
                      <XPBar value={c.progress ?? 0} max={100} height={4} />
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 9,
                        color: 'hsl(var(--text-dim))',
                        width: 28,
                        textAlign: 'right',
                      }}>
                        {c.progress ?? 0}%
                      </span>
                    </div>
                    <Badge label={c.status} success={c.status === 'COMPLETE'} />
                  </div>
                ))}
              </div>}
            </>
          )}

          <div style={{ height: 40 }} />
        </div>

        {/* ── Inner drawer — slides in from right ── */}
        <div style={{
          width: innerDrawer ? 420 : 0,
          flexShrink: 0,
          minHeight: 0,
          overflow: 'hidden',
          transition: 'width 200ms ease',
          borderLeft: innerDrawer ? '1px solid hsl(var(--accent-dim))' : 'none',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {innerDrawer && (
            <>
              {innerDrawer.type !== 'session' && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  padding: '8px 12px',
                  borderBottom: '1px solid hsl(var(--accent-dim))',
                  flexShrink: 0,
                }}>
                  <button
                    onClick={() => setInnerDrawer(null)}
                    style={{
                      background: 'transparent',
                      border: '1px solid hsl(var(--accent-dim))',
                      color: 'hsl(var(--accent-dim))',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      padding: '3px 10px',
                      cursor: 'pointer',
                      letterSpacing: 1,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'hsl(var(--accent))';
                      e.currentTarget.style.color = 'hsl(var(--accent))';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'hsl(var(--accent-dim))';
                      e.currentTarget.style.color = 'hsl(var(--accent-dim))';
                    }}
                  >
                    × CLOSE
                  </button>
                </div>
              )}

              {/* Drawer content */}
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: 'hsl(var(--bg-primary))', display: 'flex', flexDirection: 'column' }}>
                {innerDrawer.type === 'course' && (
                  <CourseDetailDrawer courseId={innerDrawer.id} />
                )}
                {innerDrawer.type === 'skill' && (
                  <SkillDetailDrawer
                    skillId={innerDrawer.id}
                    onClose={() => setInnerDrawer(null)}
                    onOpenLog={onOpenLog}
                  />
                )}
                {innerDrawer.type === 'session' && (
                  <SessionDetailDrawer sessionId={innerDrawer.id} onDeleted={() => setInnerDrawer(null)} onClose={() => setInnerDrawer(null)} />
                )}
                {(innerDrawer.type === 'media' || innerDrawer.type === 'book') && (
                  <MediaDetailDrawer mediaId={innerDrawer.id} onClose={() => setInnerDrawer(null)} />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Stat nav bar ── */}
      {onNavigate && (
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: 48,
          background: 'hsl(var(--bg-primary))',
          borderTop: '1px solid hsl(var(--accent-dim))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          flexShrink: 0,
          zIndex: 10,
        }}>
          {STAT_NAV.map((key) => {
            const isActive = key === statKey;
            const icon = STAT_META[key]?.icon ?? key;
            return (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                style={{
                  width: 36, height: 36,
                  border: `1px solid ${isActive ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
                  background: isActive ? 'rgba(255,176,0,0.12)' : 'transparent',
                  color: isActive ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: isActive ? 18 : 14,
                  cursor: 'pointer',
                  letterSpacing: 1,
                  transition: 'all 150ms',
                  boxShadow: isActive ? '0 0 8px rgba(255,176,0,0.3)' : 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'hsl(var(--accent))';
                    e.currentTarget.style.color = 'hsl(var(--accent))';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'hsl(var(--accent-dim))';
                    e.currentTarget.style.color = 'hsl(var(--text-dim))';
                  }
                }}
                title={STAT_META[key]?.name ?? key.toUpperCase()}
              >
                {icon}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 11,
      color: 'hsl(var(--text-dim))',
      padding: '6px 0',
      opacity: 0.6,
    }}>
      {text}
    </div>
  );
}
