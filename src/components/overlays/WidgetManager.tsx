// ============================================================
// src/components/overlays/WidgetManager.tsx
// Widget picker — shows active and closed widgets, restore/close
// ============================================================

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const dim  = 'hsl(var(--text-dim))';
const adim = 'hsl(var(--accent-dim))';
const bgP  = 'hsl(var(--bg-primary))';
const bgS  = 'hsl(var(--bg-secondary))';
const bgT  = 'hsl(var(--bg-tertiary))';

export interface WidgetDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'CORE' | 'ARSENAL' | 'BIOSYSTEM' | 'TRACKING' | 'UTILITY' | 'FUTURE';
}

export const WIDGET_REGISTRY: WidgetDef[] = [
  // Current widgets
  { id: 'xp',      name: 'XP & LEVELLING',   icon: '▲', category: 'CORE',    description: 'Master level, XP progress, streak, shields, weekly challenge' },
  { id: 'checkin', name: 'DAILY CHECK-IN',    icon: '⬡', category: 'CORE',    description: 'Domain toggles, habit checkboxes, submit daily activity' },
  { id: 'heatmap', name: 'STREAK HEATMAP',    icon: '░', category: 'FUTURE',  description: '12-week activity grid, current and longest streak — coming soon' },
  { id: 'stats',   name: 'STAT OVERVIEW',     icon: '◈', category: 'CORE',    description: 'All 7 stats at a glance — level, XP bar, streak, class' },
  { id: 'courses', name: 'COURSES',           icon: '▸', category: 'ARSENAL', description: 'Active and queued courses with progress bars' },
  { id: 'media',   name: 'MEDIA LIBRARY',     icon: '◆', category: 'ARSENAL', description: 'Books, films, TV, albums — tabbed by type, reading progress' },
  { id: 'skills',  name: 'SKILLS',             icon: '◫', category: 'CORE',    description: 'Top skills by level — XP bars, stat icons, quick access' },
  { id: 'tools',    name: 'TOOLS',    icon: '⚙', category: 'ARSENAL', description: 'Active tools by level — toolXP progress, filter by type' },
  { id: 'resources', name: 'RESOURCES', icon: '▤', category: 'ARSENAL', description: 'Websites, links, and documents — filter by read/unread' },
  { id: 'augments', name: 'AUGMENTS', icon: '⬡', category: 'ARSENAL', description: 'AI augments with augmentXP progress — filter by cluster and usage' },
  { id: 'projects', name: 'PROJECTS', icon: '◎', category: 'ARSENAL', description: 'Active projects with objective progress bars and status' },
  { id: 'vault', name: 'VAULT', icon: '[]', category: 'ARSENAL', description: 'Completed works archive with categories and metadata' },
  { id: 'recovery', name: 'RECOVERY', icon: 'Zz', category: 'BIOSYSTEM', description: 'Sleep sessions, wake-date tracking, daily goal, and recovery streaks' },
  { id: 'ingredients', name: 'INGREDIENTS', icon: '::', category: 'BIOSYSTEM', description: 'USDA and custom ingredients with category filters and macro details' },
  { id: 'intake', name: 'INTAKE', icon: '++', category: 'BIOSYSTEM', description: 'Daily food logging with calorie goals, macro totals, and streak tracking' },
  { id: 'recipes', name: 'RECIPES', icon: 'Rx', category: 'BIOSYSTEM', description: 'Saved recipes with servings, ingredient snapshots, and macro totals' },
  // Future widgets (greyed out, not yet available)
  { id: 'clock',        name: 'CLOCK',          icon: '◷', category: 'UTILITY', description: 'Live clock with timer and pomodoro' },
  { id: 'calculator',   name: 'CALCULATOR',     icon: '⌨', category: 'UTILITY', description: 'CRT-style calculator' },
  { id: 'unitConverter',name: 'UNIT CONVERTER', icon: '⇄', category: 'UTILITY', description: 'Unit conversion tool' },
  { id: 'notes',        name: 'NOTES',           icon: '📝', category: 'UTILITY', description: 'Personal notes and documentation' },
  { id: 'planner',      name: 'PLANNER',         icon: '◷', category: 'TRACKING', description: 'Month planner, recurring events, day drawer, and today queue' },
  { id: 'goals',    name: 'GOALS',            icon: '◎', category: 'FUTURE',  description: 'Life, mid, and sprint goals — coming soon' },
  { id: 'habits',   name: 'HABITS',             icon: '✓', category: 'CORE',    description: 'Daily habit streaks and completion — filter by active, due, streak, retired' },
  { id: 'terminal', name: 'TERMINAL',         icon: '$', category: 'UTILITY',  description: 'Command-line interface for UPLink — type help for commands' },
];

const CATEGORIES = ['CORE', 'ARSENAL', 'BIOSYSTEM', 'UTILITY', 'TRACKING', 'FUTURE'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  CORE: '// CORE',
  ARSENAL: '// ARSENAL',
  BIOSYSTEM: '// BIOSYSTEM',
  UTILITY: '// UTILITY',
  TRACKING: '// TRACKING',
  FUTURE: '// COMING SOON',
};

interface Props {
  activeWidgets: string[];
  onRestore: (id: string) => void;
  onClose: (id: string) => void;
  onDismiss: () => void;
}

export default function WidgetManager({ activeWidgets, onRestore, onClose, onDismiss }: Props) {
  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = WIDGET_REGISTRY.filter(w => w.category === cat);
    return acc;
  }, {} as Record<string, WidgetDef[]>);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1500,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onDismiss}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 620, maxHeight: '80vh',
          background: bgP, border: `1px solid ${adim}`,
          boxShadow: '0 0 40px rgba(255,176,0,0.12)',
          display: 'flex', flexDirection: 'column',
          fontFamily: mono,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: `1px solid ${adim}`,
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// SYSTEM</span>
          <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>WIDGET MANAGER</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: mono, fontSize: 9, color: dim }}>
            {activeWidgets.length} active
          </span>
          <button onClick={onDismiss} style={{
            background: 'transparent', border: 'none',
            color: dim, fontFamily: mono, fontSize: 10,
            cursor: 'pointer', letterSpacing: 1, padding: '2px 8px',
          }}
            onMouseEnter={e => e.currentTarget.style.color = acc}
            onMouseLeave={e => e.currentTarget.style.color = dim}
          >× CLOSE</button>
        </div>

        {/* Widget list */}
        <div style={{
          overflowY: 'auto', padding: '12px 20px 20px',
          scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}`,
        }}>
          {CATEGORIES.filter(cat => grouped[cat]?.length > 0).map(cat => (
            <div key={cat}>
              {/* Category label */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                margin: '16px 0 8px',
              }}>
                <span style={{ fontSize: 9, color: adim, letterSpacing: 2 }}>
                  {CATEGORY_LABELS[cat]}
                </span>
                <div style={{ flex: 1, height: 1, background: adim, opacity: 0.3 }} />
              </div>

              {/* Widget cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {grouped[cat].map(widget => {
                  const isActive  = activeWidgets.includes(widget.id);
                  const isFuture  = widget.category === 'FUTURE';

                  return (
                    <div
                      key={widget.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '10px 14px',
                        background: isActive ? 'rgba(255,176,0,0.04)' : bgS,
                        border: `1px solid ${isActive ? 'rgba(255,176,0,0.3)' : 'rgba(153,104,0,0.3)'}`,
                        opacity: isFuture ? 0.45 : 1,
                      }}
                    >
                      {/* Icon */}
                      <span style={{
                        fontFamily: vt, fontSize: 20, color: isActive ? acc : adim,
                        width: 24, textAlign: 'center', flexShrink: 0,
                      }}>
                        {widget.icon}
                      </span>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: mono, fontSize: 11,
                          color: isActive ? acc : dim,
                          marginBottom: 2,
                        }}>
                          {widget.name}
                        </div>
                        <div style={{ fontFamily: mono, fontSize: 9, color: dim, opacity: 0.7 }}>
                          {widget.description}
                        </div>
                      </div>

                      {/* Status + action */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {isFuture ? (
                          <span style={{ fontFamily: mono, fontSize: 9, color: dim, letterSpacing: 1 }}>
                            SOON
                          </span>
                        ) : isActive ? (
                          <>
                            <span style={{
                              fontFamily: mono, fontSize: 9,
                              color: '#44ff88', letterSpacing: 1,
                            }}>
                              ● ACTIVE
                            </span>
                            <button
                              onClick={() => onClose(widget.id)}
                              style={{
                                padding: '3px 10px', fontSize: 9,
                                border: '1px solid rgba(153,104,0,0.4)',
                                background: 'transparent', color: dim,
                                fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4444'; e.currentTarget.style.color = '#ff4444'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)'; e.currentTarget.style.color = dim; }}
                            >
                              HIDE
                            </button>
                          </>
                        ) : (
                          <>
                            <span style={{
                              fontFamily: mono, fontSize: 9,
                              color: dim, letterSpacing: 1, opacity: 0.5,
                            }}>
                              ○ HIDDEN
                            </span>
                            <button
                              onClick={() => onRestore(widget.id)}
                              style={{
                                padding: '3px 10px', fontSize: 9,
                                border: `1px solid ${acc}`,
                                background: 'transparent', color: acc,
                                fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = acc; e.currentTarget.style.color = bgP; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = acc; }}
                            >
                              SHOW
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '10px 20px',
          borderTop: `1px solid ${adim}`,
          fontFamily: mono, fontSize: 9, color: dim,
          flexShrink: 0,
        }}>
          Widgets snap back to their last position when restored. Drag to rearrange on the dashboard.
        </div>
      </div>
    </div>
  );
}
