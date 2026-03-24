// ============================================================
// src/components/drawer/SessionDetailDrawer.tsx
// Drawer showing full details of a logged session
// ============================================================
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

// ── Styles ────────────────────────────────────────────────────

const mono = "'IBM Plex Mono', monospace";
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
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
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

// ── Sub-components ────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', fontSize: 10, borderBottom: `1px solid ${adim}`,
    }}>
      <span style={{ color: dim }}>{label}</span>
      <span style={{ color: acc, fontFamily: mono }}>{value ?? '—'}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

interface Props {
  sessionId: string;
}

export default function SessionDetailDrawer({ sessionId }: Props) {
  const { data: session, isLoading } = useQuery({
    queryKey: ['session-detail', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      if (error) throw error;
      return data as Session;
    },
  });

  if (isLoading) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: dim, fontSize: 11,
      }}>
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: dim, fontSize: 11,
      }}>
        Session not found
      </div>
    );
  }

  let statSplit: Record<string, number> = {};
  if (session.stat_split) {
    try {
      const parsed = JSON.parse(session.stat_split);
      if (Array.isArray(parsed)) {
        // Convert from [{stat: 'body', percent: 50}, ...] format
        parsed.forEach(item => {
          if (item.stat && item.percent) {
            statSplit[item.stat] = item.percent;
          }
        });
      }
    } catch (e) {
      // Silent fail
    }
  }

  const toolIds = session.tool_ids 
    ? (typeof session.tool_ids === 'string' ? JSON.parse(session.tool_ids) : session.tool_ids)
    : [];
  const augmentIds = session.augment_ids
    ? (typeof session.augment_ids === 'string' ? JSON.parse(session.augment_ids) : session.augment_ids)
    : [];

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: bgP, borderLeft: `1px solid ${adim}`,
      overflowY: 'auto', color: acc, fontFamily: mono,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px', borderBottom: `1px solid ${adim}`, flexShrink: 0,
      }}>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 4 }}>SESSION DETAILS</div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{session.skill_name}</div>
        <div style={{ fontSize: 9, color: dim, marginTop: 4 }}>{formatDate(session.logged_at)}</div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto' }}>
        
        {/* Core info */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 8 }}>CORE</div>
          <StatRow label="Duration" value={formatDuration(session.duration_minutes)} />
          <StatRow label="Skill ID" value={session.skill_id} />
          <StatRow label="Legacy" value={session.is_legacy ? 'YES' : 'NO'} />
        </div>

        {/* XP Earned */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 8 }}>XP EARNED</div>
          <StatRow label="Skill XP" value={session.skill_xp} />
          <StatRow label="Master XP" value={session.master_xp} />
          {session.total_tool_xp > 0 && (
            <StatRow label="Tool XP" value={`${session.total_tool_xp} (${toolIds.length} tool${toolIds.length !== 1 ? 's' : ''})`} />
          )}
          {session.total_augment_xp > 0 && (
            <StatRow label="Augment XP" value={`${session.total_augment_xp} (${augmentIds.length} aug${augmentIds.length !== 1 ? 's' : ''})`} />
          )}
        </div>

        {/* Stat split */}
        {Object.keys(statSplit).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 8 }}>STAT SPLIT</div>
            {Object.entries(statSplit).map(([stat, percent]) => (
              <StatRow key={stat} label={stat.toUpperCase()} value={`${percent}%`} />
            ))}
          </div>
        )}

        {/* Linked items */}
        {(session.media_id || session.course_id || session.project_id || toolIds.length > 0 || augmentIds.length > 0) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 8 }}>LINKED ITEMS</div>
            {session.media_id && (
              <StatRow label="Media ID" value={session.media_id} />
            )}
            {session.course_id && (
              <StatRow label="Course ID" value={session.course_id} />
            )}
            {session.project_id && (
              <StatRow label="Project ID" value={session.project_id} />
            )}
            {toolIds.length > 0 && (
              <StatRow label="Tool IDs" value={`${toolIds.length} tool${toolIds.length !== 1 ? 's' : ''}`} />
            )}
            {augmentIds.length > 0 && (
              <StatRow label="Augment IDs" value={`${augmentIds.length} aug${augmentIds.length !== 1 ? 's' : ''}`} />
            )}
          </div>
        )}

        {/* Notes */}
        {session.notes && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 8 }}>NOTES</div>
            <div style={{
              fontSize: 10, color: acc, padding: '8px',
              background: bgT, border: `1px solid ${adim}`,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              minHeight: 60, maxHeight: 120, overflowY: 'auto',
            }}>
              {session.notes}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
