// ============================================================
// src/components/overlays/StatDetailOverlay.tsx
// ============================================================
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStats } from '@/hooks/useStats';
import { useSkills } from '@/hooks/useSkills';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatKey, STAT_META, STAT_FLAVOR, STAT_LEVEL_TITLES, getStatLevel } from '@/types';
import CourseDetailDrawer from '@/components/drawer/CourseDetailDrawer';
import SkillDetailDrawer from '@/components/drawer/SkillDetailDrawer';
import MediaDetailDrawer from '@/components/drawer/MediaDetailDrawer';

interface Props {
  statKey: StatKey;
  onClose: () => void;
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

function Divider({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      margin: '20px 0 10px',
    }}>
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9,
        color: 'hsl(var(--accent-dim))',
        letterSpacing: 2,
        flexShrink: 0,
      }}>── {label}</span>
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

// ── Main component ────────────────────────────────────────────

export default function StatDetailOverlay({ statKey, onClose }: Props) {
  const [innerDrawer, setInnerDrawer] = useState<{ type: string; id: string } | null>(null);
  const { user } = useAuth();
  const { data: allStats } = useStats(user?.id);
  const { data: allSkills } = useSkills(user?.id);

  const stat   = allStats?.find(s => s.key === statKey);
  const meta   = STAT_META[statKey];
  const flavor = STAT_FLAVOR[statKey];
  const titles = STAT_LEVEL_TITLES[statKey];
  const skills = (allSkills ?? []).filter(s => s.statKeys.includes(statKey));
  const skillIds = skills.map(s => s.id);

  const { data: recentActivity } = useQuery({
    queryKey: ['xp-log-by-stat', user?.id, statKey],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xp_log')
        .select('id, source, source_id, amount, notes, created_at, skill_id')
        .eq('user_id', user!.id)
        .eq('stat_key', statKey)
        .eq('tier', 'stat')
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data;
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

  const streakColor = stat
    ? stat.streak >= 30 ? '#ffd060'
    : stat.streak >= 14 ? '#ffb000'
    : stat.streak >= 7  ? '#cc8800'
    : 'hsl(var(--text-dim))'
    : 'hsl(var(--text-dim))';

  const streakTierLabel = stat
    ? stat.streak >= 30 ? 'LEGENDARY 3.0×'
    : stat.streak >= 14 ? 'ON FIRE 2.0×'
    : stat.streak >= 7  ? 'HOT STREAK 1.5×'
    : 'STANDARD 1.0×'
    : 'STANDARD 1.0×';

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
          {stat && (
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: 'hsl(var(--accent-dim))',
            }}>
              STK: <span style={{ color: streakColor }}>{stat.streak}d [{streakTierLabel}]</span>
            </span>
          )}
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
                  <XPBar value={stat.xp} max={stat.xpToNext} height={10} />
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: 'hsl(var(--text-dim))',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}>
                    {stat.xp.toLocaleString()} / {stat.xpToNext.toLocaleString()}
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
          }}
        >

          {/* ── Skills ── */}
          <Divider label="SKILLS" />
          {skills.length === 0 ? (
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
          )}

          {/* ── Recent activity ── */}
          <Divider label="RECENT ACTIVITY" />
          {!recentActivity || recentActivity.length === 0 ? (
            <EmptyState text="No activity yet." />
          ) : (
            <div style={{ display: 'grid', gap: 3 }}>
              {recentActivity.map(entry => {
                const sourceLabel = entry.source
                  .replace(/_/g, ' ')
                  .replace('course ', '')
                  .toUpperCase();
                const skillName = skills.find(s => s.id === entry.skill_id)?.name;
                const label = entry.notes || skillName || sourceLabel;
                return (
                  <div key={entry.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '6px 14px 6px 12px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    borderLeft: '2px solid hsl(var(--accent-dim))',
                  }}>
                    <span style={{
                      fontSize: 10,
                      color: 'hsl(var(--accent))',
                      width: 64,
                      flexShrink: 0,
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
                      {sourceLabel}
                    </span>
                    <span style={{ fontSize: 10, color: 'hsl(var(--text-dim))', width: 76, textAlign: 'right', flexShrink: 0 }}>
                      {formatTimeAgo(entry.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Media ── */}
          {linkedMedia && linkedMedia.length > 0 && (
            <>
              <Divider label="MEDIA" />
              <div style={{ display: 'grid', gap: 5 }}>
                {linkedMedia.map(m => {
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

          {/* ── Courses ── */}
          {linkedCourses && linkedCourses.length > 0 && (
            <>
              <Divider label="COURSES" />
              <div style={{ display: 'grid', gap: 5 }}>
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
              </div>
            </>
          )}

          <div style={{ height: 40 }} />
        </div>

        {/* ── Inner drawer — slides in from right ── */}
        <div style={{
          width: innerDrawer ? 420 : 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 200ms ease',
          borderLeft: innerDrawer ? '1px solid hsl(var(--accent-dim))' : 'none',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {innerDrawer && (
            <>
              {/* Drawer close button */}
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

              {/* Drawer content */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {innerDrawer.type === 'course' && (
                  <CourseDetailDrawer courseId={innerDrawer.id} />
                )}
                {innerDrawer.type === 'skill' && (
                  <SkillDetailDrawer skillId={innerDrawer.id} onClose={() => setInnerDrawer(null)} />
                )}
                {(innerDrawer.type === 'media' || innerDrawer.type === 'book') && (
                  <MediaDetailDrawer mediaId={innerDrawer.id} onClose={() => setInnerDrawer(null)} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
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