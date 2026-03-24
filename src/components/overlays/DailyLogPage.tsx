// ============================================================
// src/components/overlays/DailyLogPage.tsx
// Full-page daily log browser — lists all sessions logged via quick log
// ============================================================
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import SessionDetailDrawer from '@/components/drawer/SessionDetailDrawer';

// ── Types ─────────────────────────────────────────────────────

interface Session {
  id: string;
  skill_id: string;
  skill_name: string;
  duration_minutes: number;
  stat_split: string | null;
  notes: string | null;
  is_legacy: boolean;
  logged_at: string;
  skill_xp: number;
  master_xp: number;
  tool_ids: string | null;
  total_tool_xp: number;
  augment_ids: string | null;
  total_augment_xp: number;
  media_id: string | null;
  course_id: string | null;
  project_id: string | null;
}

// ── Constants ─────────────────────────────────────────────────

type SortKey = 'date' | 'skill' | 'duration';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date',     label: 'DATE' },
  { key: 'skill',    label: 'SKILL' },
  { key: 'duration', label: 'DURATION' },
];

// ── Styles ────────────────────────────────────────────────────

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const dim  = 'hsl(var(--text-dim))';
const adim = 'hsl(var(--accent-dim))';
const bgP  = 'hsl(var(--bg-primary))';
const bgS  = 'hsl(var(--bg-secondary))';
const bgT  = 'hsl(var(--bg-tertiary))';

// ── Utilities ─────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return dateStr;
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// ── Session row ────────────────────────────────────────────────

function SessionRow({ session, onClick, isActive }: {
  session: Session;
  onClick: () => void;
  isActive: boolean;
}) {
  const date = formatDate(session.logged_at);
  const duration = formatDuration(session.duration_minutes);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 20,
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
      {/* Date */}
      <span style={{
        fontFamily: mono, fontSize: 11, color: acc,
        width: 100, flexShrink: 0,
      }}>
        {date}
      </span>

      {/* Skill Name */}
      <span style={{
        fontFamily: mono, fontSize: 11, color: acc,
        flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {session.skill_name}
      </span>

      {/* Duration */}
      <span style={{
        fontFamily: mono, fontSize: 11, color: dim,
        width: 80, flexShrink: 0, textAlign: 'right',
      }}>
        {duration}
      </span>

      <span style={{ color: adim, fontSize: 10, flexShrink: 0 }}>›</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export default function DailyLogPage({ onClose }: Props) {
  const { user } = useAuth();

  const [search, setSearch]         = useState('');
  const [sortKey, setSortKey]       = useState<SortKey>('date');
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc'); // most recent first by default
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('logged_at', { ascending: false });
      if (error) throw error;
      return data as Session[];
    },
  });

  const filtered = useMemo(() => {
    let base = sessions ?? [];
    
    // Apply search filter
    if (search.trim()) {
      base = base.filter(s =>
        s.skill_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply sort
    return [...base].sort((a, b) => {
      let cmp = 0;
      
      if (sortKey === 'date') {
        cmp = new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime();
      } else if (sortKey === 'skill') {
        cmp = a.skill_name.localeCompare(b.skill_name);
      } else if (sortKey === 'duration') {
        cmp = a.duration_minutes - b.duration_minutes;
      }

      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [sessions, search, sortKey, sortDir]);

  const handleSortClick = (key: SortKey) => {
    if (sortKey === key) {
      // Cycle: asc → desc → asc
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      // New column — start with asc (or desc for date to show recent first)
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

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
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// TRACKING</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>DAILY LOG</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: dim }}>
          {(sessions ?? []).length} entries
        </span>
        <div style={{ flex: 1 }} />

        {/* Sort buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: adim, letterSpacing: 1 }}>SORT:</span>
          {SORT_OPTIONS.map(s => (
            <button key={s.key} onClick={() => handleSortClick(s.key)} style={{
              padding: '3px 8px', fontSize: 9,
              border: `1px solid ${sortKey === s.key ? acc : adim}`,
              background: sortKey === s.key ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: sortKey === s.key ? acc : dim,
              fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
            }}>
              {s.label}{getSortIndicator(s.key)}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="SKILL NAME..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            marginLeft: 16,
            padding: '4px 8px', fontSize: 10,
            border: `1px solid ${adim}`, background: bgT, color: acc,
            fontFamily: mono, outlineColor: acc, width: 150,
          }}
        />

        {/* Close button */}
        <button onClick={onClose} style={{
          marginLeft: 12,
          padding: '4px 8px', fontSize: 9,
          border: `1px solid ${adim}`, background: 'transparent', color: dim,
          fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
        }}>
          ESC
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: List of sessions */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {isLoading ? (
            <div style={{ padding: '24px', color: dim, textAlign: 'center' }}>Loading sessions...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '24px', color: dim, textAlign: 'center' }}>
              {search ? 'No sessions match your search' : 'No sessions logged yet'}
            </div>
          ) : (
            filtered.map(session => (
              <SessionRow
                key={session.id}
                session={session}
                onClick={() => setSelectedId(session.id)}
                isActive={selectedId === session.id}
              />
            ))
          )}
        </div>

        {/* Right: Detail drawer */}
        <div style={{
          width: selectedId ? 460 : 0,
          transition: 'width 200ms ease',
          borderLeft: selectedId ? `1px solid ${adim}` : 'none',
          overflow: 'hidden',
        }}>
          {selectedId && <SessionDetailDrawer sessionId={selectedId} />}
        </div>
      </div>
    </div>
  );
}
