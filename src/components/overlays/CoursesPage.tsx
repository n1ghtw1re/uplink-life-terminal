// ============================================================
// src/components/overlays/CoursesPage.tsx
// Full-page courses browser — list, sort, drawer with modules
// ============================================================
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import CourseDetailDrawer from '@/components/drawer/CourseDetailDrawer';
import AddCourseModal from '@/components/modals/AddCourseModal';

// ── Types ─────────────────────────────────────────────────────

type CourseStatus = 'ACTIVE' | 'COMPLETE' | 'DROPPED' | 'QUEUED';

interface Course {
  id: string;
  name: string;
  provider: string | null;
  subject: string | null;
  linked_stats: string[];
  status: CourseStatus;
  progress: number;
  cert_earned: boolean;
  url: string | null;
  notes: string | null;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────

const STATUS_TABS: { key: CourseStatus | 'ALL'; label: string }[] = [
  { key: 'ALL',      label: 'ALL' },
  { key: 'ACTIVE',   label: 'ACTIVE' },
  { key: 'QUEUED',   label: 'QUEUED' },
  { key: 'COMPLETE', label: 'COMPLETE' },
  { key: 'DROPPED',  label: 'DROPPED' },
];

type SortKey = 'name' | 'progress' | 'status' | 'recent';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name',     label: 'A–Z' },
  { key: 'progress', label: 'PROGRESS' },
  { key: 'status',   label: 'STATUS' },
  { key: 'recent',   label: 'RECENT' },
];

const STATUS_ORDER: Record<string, number> = {
  ACTIVE: 0, QUEUED: 1, COMPLETE: 2, DROPPED: 3,
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:   'hsl(var(--accent))',
  QUEUED:   'hsl(var(--text-dim))',
  COMPLETE: '#44ff88',
  DROPPED:  '#ff4444',
};

// ── Styles ────────────────────────────────────────────────────

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const dim  = 'hsl(var(--text-dim))';
const adim = 'hsl(var(--accent-dim))';
const bgP  = 'hsl(var(--bg-primary))';
const bgS  = 'hsl(var(--bg-secondary))';
const bgT  = 'hsl(var(--bg-tertiary))';

// ── Course row ────────────────────────────────────────────────

function CourseRow({ course, onClick, isActive }: {
  course: Course;
  onClick: () => void;
  isActive: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 16px',
        background: isActive ? 'rgba(255,176,0,0.06)' : bgS,
        border: `1px solid ${isActive ? acc : 'rgba(153,104,0,0.4)'}`,
        cursor: 'pointer', transition: 'all 150ms',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = adim;
          e.currentTarget.style.background = 'rgba(255,176,0,0.03)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)';
          e.currentTarget.style.background = bgS;
        }
      }}
    >
      {/* Status dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: STATUS_COLOR[course.status] ?? dim,
        boxShadow: course.status === 'ACTIVE' ? '0 0 6px rgba(255,176,0,0.6)' : 'none',
      }} />

      {/* Name */}
      <span style={{
        fontFamily: mono, fontSize: 12, color: acc,
        flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {course.name}
      </span>

      {/* Provider */}
      {course.provider && (
        <span style={{
          fontFamily: mono, fontSize: 10, color: dim,
          flexShrink: 0, maxWidth: 140,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {course.provider}
        </span>
      )}

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 120, flexShrink: 0 }}>
        <div style={{ flex: 1, height: 5, background: bgT, border: `1px solid ${adim}` }}>
          <div style={{
            width: `${course.progress ?? 0}%`, height: '100%',
            background: course.status === 'COMPLETE' ? '#44ff88' : acc,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{ fontFamily: mono, fontSize: 9, color: dim, width: 28, textAlign: 'right', flexShrink: 0 }}>
          {course.progress ?? 0}%
        </span>
      </div>

      {/* Cert badge */}
      {course.cert_earned && (
        <span style={{
          fontFamily: mono, fontSize: 8, color: '#ffdd44',
          border: '1px solid #ffdd44', padding: '1px 5px', flexShrink: 0,
        }}>CERT</span>
      )}

      {/* Status */}
      <span style={{
        fontFamily: mono, fontSize: 9, letterSpacing: 1,
        color: STATUS_COLOR[course.status] ?? dim,
        flexShrink: 0, width: 64, textAlign: 'right',
      }}>
        {course.status}
      </span>

      <span style={{ color: adim, fontSize: 10, flexShrink: 0 }}>›</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export default function CoursesPage({ onClose }: Props) {
  const { user } = useAuth();

  const [activeTab, setActiveTab]   = useState<CourseStatus | 'ALL'>('ALL');
  const [sortKey, setSortKey]       = useState<SortKey>('status');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd]       = useState(false);

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses-all', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user!.id)
        .order('name');
      if (error) throw error;
      return data as Course[];
    },
  });

  const countFor = (key: CourseStatus | 'ALL') =>
    key === 'ALL'
      ? (courses ?? []).length
      : (courses ?? []).filter(c => c.status === key).length;

  const filtered = useMemo(() => {
    const base = activeTab === 'ALL'
      ? (courses ?? [])
      : (courses ?? []).filter(c => c.status === activeTab);

    return [...base].sort((a, b) => {
      if (sortKey === 'name')     return a.name.localeCompare(b.name);
      if (sortKey === 'progress') return (b.progress ?? 0) - (a.progress ?? 0);
      if (sortKey === 'recent')   return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortKey === 'status') {
        const sa = STATUS_ORDER[a.status] ?? 9;
        const sb = STATUS_ORDER[b.status] ?? 9;
        return sa !== sb ? sa - sb : a.name.localeCompare(b.name);
      }
      return 0;
    });
  }, [courses, activeTab, sortKey]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: bgP, display: 'flex', flexDirection: 'column',
      fontFamily: mono,
    }}>

      {/* ── Header ── */}
      <div style={{
        height: 56, flexShrink: 0,
        borderBottom: `1px solid ${adim}`,
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 16,
      }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// ARSENAL</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>COURSES</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: dim }}>
          {(courses ?? []).length} total
        </span>
        <div style={{ flex: 1 }} />

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: adim, letterSpacing: 1 }}>SORT:</span>
          {SORT_OPTIONS.map(s => (
            <button key={s.key} onClick={() => setSortKey(s.key)} style={{
              padding: '3px 8px', fontSize: 9,
              border: `1px solid ${sortKey === s.key ? acc : adim}`,
              background: sortKey === s.key ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: sortKey === s.key ? acc : dim,
              fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
              transition: 'all 150ms',
            }}>{s.label}</button>
          ))}
        </div>

        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: '5px 14px', fontSize: 10,
            border: `1px solid ${acc}`,
            background: 'transparent', color: acc,
            fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = acc; e.currentTarget.style.color = bgP; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = acc; }}
        >[ + ADD COURSE ]</button>

        <button onClick={onClose} style={{
          padding: '5px 12px', fontSize: 10,
          border: `1px solid ${adim}`,
          background: 'transparent', color: dim,
          fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
        }}>× CLOSE</button>
      </div>

      {/* ── Status tabs ── */}
      <div style={{
        flexShrink: 0,
        borderBottom: `1px solid ${adim}`,
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 4,
        background: bgS,
      }}>
        {STATUS_TABS.map(({ key, label }) => {
          const count = countFor(key);
          const isActive = activeTab === key;
          if (key !== 'ALL' && count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setSelectedId(null); }}
              style={{
                padding: '10px 14px', fontSize: 10,
                border: 'none', borderBottom: `2px solid ${isActive ? acc : 'transparent'}`,
                background: 'transparent',
                color: isActive ? acc : dim,
                fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                transition: 'all 150ms',
              }}
            >
              {label}{' '}
              <span style={{ fontSize: 9, color: isActive ? adim : 'rgba(153,104,0,0.3)' }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* ── Content + drawer ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* List */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px 24px',
          scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}`,
        }}>
          {isLoading ? (
            <div style={{ color: dim, fontSize: 11 }}>LOADING...</div>
          ) : filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: 200, gap: 12,
            }}>
              <span style={{ fontFamily: vt, fontSize: 28, color: adim }}>NO COURSES</span>
              <span style={{ fontSize: 10, color: dim }}>
                {activeTab === 'ALL' ? 'No courses added yet.' : `No ${activeTab.toLowerCase()} courses.`}
              </span>
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  marginTop: 8, padding: '6px 16px', fontSize: 10,
                  border: `1px solid ${acc}`, background: 'transparent', color: acc,
                  fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                }}
              >[ + ADD COURSE ]</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map(course => (
                <CourseRow
                  key={course.id}
                  course={course}
                  isActive={selectedId === course.id}
                  onClick={() => setSelectedId(selectedId === course.id ? null : course.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Drawer */}
        <div style={{
          width: selectedId ? 460 : 0,
          flexShrink: 0, overflow: 'hidden',
          transition: 'width 200ms ease',
          borderLeft: selectedId ? `1px solid ${adim}` : 'none',
          display: 'flex', flexDirection: 'column',
        }}>
          {selectedId && (
            <>
              <div style={{
                height: 36, flexShrink: 0,
                borderBottom: `1px solid ${adim}`,
                display: 'flex', alignItems: 'center',
                justifyContent: 'flex-end', padding: '0 12px',
                background: bgS,
              }}>
                <button
                  onClick={() => setSelectedId(null)}
                  style={{
                    background: 'transparent', border: 'none',
                    color: dim, fontFamily: mono, fontSize: 10,
                    cursor: 'pointer', letterSpacing: 1,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = acc}
                  onMouseLeave={e => e.currentTarget.style.color = dim}
                >× CLOSE</button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <CourseDetailDrawer
                  courseId={selectedId}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Course Modal */}
      {showAdd && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowAdd(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: 560, maxHeight: '85vh', overflowY: 'auto',
            background: bgP, border: `1px solid ${adim}`,
            boxShadow: '0 0 40px rgba(255,176,0,0.1)',
          }}>
            <div style={{
              padding: '12px 20px', borderBottom: `1px solid ${adim}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: mono, fontSize: 10, color: acc, letterSpacing: 2 }}>// ADD COURSE</span>
              <button onClick={() => setShowAdd(false)} style={{
                background: 'transparent', border: 'none',
                color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer',
              }}>× CLOSE</button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <AddCourseModal onClose={() => setShowAdd(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}