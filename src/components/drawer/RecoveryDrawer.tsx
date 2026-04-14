import { useMemo, useState } from 'react';
import RecoverySleepModal from '@/components/modals/RecoverySleepModal';
import { useRecoveryActions, useSleepDay } from '@/hooks/useRecovery';
import { formatDurationMinutes, formatSleepDateTime } from '@/services/recoveryService';

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgS = 'hsl(var(--bg-secondary))';

interface RecoveryDrawerProps {
  anchorDate: string | null;
  open: boolean;
  onClose: () => void;
}

export default function RecoveryDrawer({ anchorDate, open, onClose }: RecoveryDrawerProps) {
  const { day, isLoading } = useSleepDay(anchorDate);
  const { deleteSleepSession } = useRecoveryActions();
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const editingSession = useMemo(
    () => day?.sessions.find((session) => session.id === editingSessionId) ?? null,
    [day, editingSessionId],
  );

  if (!open) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 56,
          right: 0,
          bottom: 0,
          width: 420,
          background: 'hsl(var(--bg-primary))',
          borderLeft: `1px solid ${adim}`,
          boxShadow: '-4px 0 20px rgba(255, 176, 0, 0.08)',
          zIndex: 1200,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: `1px solid ${adim}`, flexShrink: 0 }}>
          <span style={{ fontFamily: mono, fontSize: 10, color: adim }}>
            // RECOVERY {anchorDate ? `— ${anchorDate}` : ''}
          </span>
          <button className="topbar-btn" onClick={onClose} style={{ fontSize: 10, padding: '2px 8px' }}>
            × CLOSE
          </button>
        </div>

        <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${adim}`, flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>// SLEEP DAY</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <div style={{ fontFamily: vt, fontSize: 22, color: acc, flex: 1, lineHeight: 1.1 }}>{anchorDate ?? 'NO DATE'}</div>
            {day && <span style={{ fontSize: 9, color: acc, border: `1px solid ${acc}`, padding: '2px 8px', letterSpacing: 1 }}>{formatDurationMinutes(day.total_minutes)}</span>}
          </div>
          {day && (
            <div style={{ display: 'flex', gap: 12, fontSize: 10, color: dim }}>
              <span>{day.session_count} session{day.session_count > 1 ? 's' : ''}</span>
              <span>Quality: {day.avg_quality ? day.avg_quality.toFixed(1) : '—'}</span>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          {isLoading ? (
            <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>LOADING...</div>
          ) : !day ? (
            <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>No sleep logged for this wake-up date.</div>
          ) : (
            day.sessions.map((session) => (
              <div key={session.id} style={{ border: `1px solid ${adim}`, background: bgS, padding: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: acc }}>{formatDurationMinutes(session.duration_minutes)}</div>
                  <div style={{ fontSize: 9, color: dim }}>Q{session.quality ?? '—'}</div>
                </div>
                <div style={{ fontSize: 9, color: dim, marginBottom: 4 }}>START: {formatSleepDateTime(session.start_time)}</div>
                <div style={{ fontSize: 9, color: dim, marginBottom: 8 }}>WAKE: {formatSleepDateTime(session.end_time)}</div>
                {session.notes && <div style={{ fontSize: 9, color: dim, marginBottom: 10, whiteSpace: 'pre-wrap' }}>{session.notes}</div>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditingSessionId(session.id)} style={{ background: 'transparent', border: `1px solid ${acc}`, color: acc, fontFamily: mono, fontSize: 9, padding: '4px 8px', cursor: 'pointer' }}>
                    EDIT
                  </button>
                  <button onClick={() => deleteSleepSession.mutate(session.id)} style={{ background: 'transparent', border: `1px solid ${adim}`, color: dim, fontFamily: mono, fontSize: 9, padding: '4px 8px', cursor: 'pointer' }}>
                    DELETE
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ borderTop: `1px solid ${adim}`, padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: `1px solid ${acc}`, color: acc, fontFamily: mono, fontSize: 9, padding: '6px 10px', cursor: 'pointer' }}>
            + ADD SESSION
          </button>
        </div>
      </div>

      {showAdd && <RecoverySleepModal open={showAdd} onClose={() => setShowAdd(false)} />}
      {editingSession && <RecoverySleepModal open={!!editingSession} onClose={() => setEditingSessionId(null)} session={editingSession} />}
    </>
  );
}
