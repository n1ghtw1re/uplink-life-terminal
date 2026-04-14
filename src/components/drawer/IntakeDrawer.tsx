import { useState } from 'react';
import IntakeLogModal from '@/components/modals/IntakeLogModal';
import { useIntakeActions, useIntakeLog } from '@/hooks/useIntake';
import { formatLoggedAt } from '@/services/intakeService';

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgS = 'hsl(var(--bg-secondary))';

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}>
      {label}<div style={{ flex: 1, height: 1, background: 'rgba(153,104,0,0.3)' }} />
    </div>
  );
}

interface IntakeDrawerProps {
  logId: string;
  onClose?: () => void;
}

export default function IntakeDrawer({ logId, onClose }: IntakeDrawerProps) {
  const { log, isLoading } = useIntakeLog(logId);
  const { deleteLog } = useIntakeActions();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    if (!log) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteLog.mutateAsync(log.id);
    onClose?.();
  };

  if (isLoading) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>LOADING...</div>;
  if (!log) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>INTAKE LOG NOT FOUND</div>;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>
        <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${adim}`, flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>// BIOSYSTEM</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <div style={{ fontFamily: vt, fontSize: 22, color: acc, flex: 1, lineHeight: 1.1 }}>{log.source_name.toUpperCase()}</div>
            <span style={{ fontSize: 9, color: acc, border: `1px solid ${acc}`, padding: '2px 8px', letterSpacing: 1, flexShrink: 0 }}>{log.source_kind}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 9, color: dim }}>
            <span>{formatLoggedAt(log.logged_at)}</span>
            {log.meal_label && <span>{log.meal_label}</span>}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 20px 16px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          <SectionLabel label="NUTRITION" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {[
              ['CAL', log.calories],
              ['PRO', `${log.protein_g}g`],
              ['CARB', `${log.carbs_g}g`],
              ['FAT', `${log.fat_g}g`],
            ].map(([label, value]) => (
              <div key={label} style={{ border: `1px solid ${adim}`, padding: '10px 12px' }}>
                <div style={{ fontSize: 8, color: adim, letterSpacing: 1 }}>{label}</div>
                <div style={{ fontFamily: vt, fontSize: 20, color: acc, marginTop: 6 }}>{value}</div>
              </div>
            ))}
          </div>

          <SectionLabel label="DETAILS" />
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}><span style={{ color: adim }}>SOURCE</span><span style={{ color: acc }}>{log.source_kind}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}><span style={{ color: adim }}>ORIGIN</span><span style={{ color: acc }}>{log.source_origin ?? '--'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}><span style={{ color: adim }}>MEAL LABEL</span><span style={{ color: acc }}>{log.meal_label ?? '--'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}><span style={{ color: adim }}>ANCHOR DATE</span><span style={{ color: acc }}>{log.anchor_date}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}><span style={{ color: adim }}>LOGGED AT</span><span style={{ color: acc }}>{formatLoggedAt(log.logged_at)}</span></div>
            {log.grams != null && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}><span style={{ color: adim }}>GRAMS</span><span style={{ color: acc }}>{log.grams}g</span></div>}
            {log.servings != null && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}><span style={{ color: adim }}>SERVINGS</span><span style={{ color: acc }}>{log.servings}</span></div>}
            {log.input_text && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}><span style={{ color: adim }}>INPUT TEXT</span><span style={{ color: acc, textAlign: 'right' }}>{log.input_text}</span></div>}
          </div>

          {log.notes && (
            <>
              <SectionLabel label="NOTES" />
              <div style={{ fontSize: 10, color: dim, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{log.notes}</div>
            </>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${adim}`, padding: '12px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={() => setShowEdit(true)} style={{ padding: '6px 12px', fontFamily: mono, fontSize: 10, letterSpacing: 1, cursor: 'pointer', background: 'transparent', border: `1px solid ${acc}`, color: acc }}>
            EDIT
          </button>
          <button
            onClick={handleDelete}
            style={{
              padding: '6px 12px',
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: 1,
              cursor: 'pointer',
              background: 'transparent',
              border: `1px solid ${confirmDelete ? '#ff5555' : adim}`,
              color: confirmDelete ? '#ff5555' : dim,
            }}
          >
            {confirmDelete ? 'CONFIRM DELETE' : 'DELETE'}
          </button>
        </div>
      </div>

      {showEdit && <IntakeLogModal open={showEdit} onClose={() => setShowEdit(false)} log={log} />}
    </>
  );
}
