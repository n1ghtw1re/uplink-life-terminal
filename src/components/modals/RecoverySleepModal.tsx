import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { useRecoveryActions } from '@/hooks/useRecovery';
import type { SleepSession } from '@/types';
import { formatDurationMinutes, normalizeLocalDateTimeInput, sanitizeSleepSessionInput } from '@/services/recoveryService';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';

interface RecoverySleepModalProps {
  open: boolean;
  onClose: () => void;
  session?: SleepSession | null;
  initialEndTime?: Date;
}

export default function RecoverySleepModal({ open, onClose, session, initialEndTime }: RecoverySleepModalProps) {
  const { createSleepSession, updateSleepSession } = useRecoveryActions();
  const isEditing = !!session;

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [quality, setQuality] = useState<number | null>(4);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const end = initialEndTime ?? new Date();
    const start = new Date(end.getTime() - 8 * 60 * 60 * 1000);

    setStartTime(session ? normalizeLocalDateTimeInput(session.start_time) : normalizeLocalDateTimeInput(start));
    setEndTime(session ? normalizeLocalDateTimeInput(session.end_time) : normalizeLocalDateTimeInput(end));
    setQuality(session?.quality ?? 4);
    setNotes(session?.notes ?? '');
    setError('');
  }, [open, session, initialEndTime]);

  const previewDuration = useMemo(() => {
    if (!startTime || !endTime) return '';
    try {
      return formatDurationMinutes(sanitizeSleepSessionInput({
        start_time: startTime,
        end_time: endTime,
        quality,
        notes,
      }).duration_minutes);
    } catch {
      return '';
    }
  }, [startTime, endTime, quality, notes]);

  const canSave = startTime.length > 0 && endTime.length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const input = { start_time: startTime, end_time: endTime, quality, notes };
      sanitizeSleepSessionInput(input);

      if (session) {
        await updateSleepSession.mutateAsync({ id: session.id, input });
      } else {
        await createSleepSession.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const fieldLabel = (label: string, optional = false) => (
    <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 5 }}>
      {label}{optional && <span style={{ opacity: 0.5 }}> (optional)</span>}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'EDIT SLEEP SESSION' : 'LOG SLEEP'} width={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: mono }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            {fieldLabel('SLEEP START')}
            <input className="crt-input" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1 }}>
            {fieldLabel('WAKE TIME')}
            <input className="crt-input" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>

        <div style={{ padding: '10px 12px', border: `1px solid ${adim}`, background: 'hsl(var(--bg-tertiary))', color: previewDuration ? acc : dim, fontSize: 10 }}>
          DURATION: {previewDuration || '—'}
        </div>

        <div>
          {fieldLabel('QUALITY')}
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => setQuality(value)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  fontFamily: mono,
                  fontSize: 10,
                  border: `1px solid ${quality === value ? acc : adim}`,
                  background: quality === value ? 'rgba(255,176,0,0.1)' : 'transparent',
                  color: quality === value ? acc : dim,
                  cursor: 'pointer',
                }}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div>
          {fieldLabel('NOTES', true)}
          <textarea className="crt-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did you sleep?" style={{ width: '100%', minHeight: 90, resize: 'vertical' as const }} />
        </div>

        {error && <div style={{ fontSize: 10, color: '#ff6666' }}>{error}</div>}

        <div style={{ borderTop: `1px solid ${adim}`, paddingTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '6px 16px', fontFamily: mono, fontSize: 10, cursor: 'pointer', background: 'transparent', border: `1px solid ${adim}`, color: dim }}>
            CANCEL
          </button>
          <button
            disabled={!canSave || saving}
            onClick={handleSave}
            style={{
              padding: '6px 16px',
              fontFamily: mono,
              fontSize: 10,
              cursor: canSave ? 'pointer' : 'not-allowed',
              background: 'transparent',
              border: `1px solid ${canSave ? acc : adim}`,
              color: canSave ? acc : dim,
              opacity: canSave ? 1 : 0.5,
            }}
          >
            {saving ? '>> SAVING...' : isEditing ? '>> SAVE SESSION' : '>> LOG SLEEP'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
