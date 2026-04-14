import { useState } from 'react';
import PlannerEventModal from '@/components/modals/PlannerEventModal';
import { usePlannerActions, usePlannerDay } from '@/hooks/usePlanner';
import { comparePlannerOccurrences } from '@/services/plannerService';
import type { PlannerOccurrence } from '@/types';

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgT = 'hsl(var(--bg-tertiary))';
const green = '#44ff88';

interface PlannerDayDrawerProps {
  date: string | null;
  open: boolean;
  onClose: () => void;
}

export default function PlannerDayDrawer({ date, open, onClose }: PlannerDayDrawerProps) {
  const { occurrences, isLoading } = usePlannerDay(date ?? '');
  const { toggleOccurrence, deleteOccurrence } = usePlannerActions();
  const [editingOccurrence, setEditingOccurrence] = useState<PlannerOccurrence | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const sorted = [...occurrences].sort(comparePlannerOccurrences);

  const handleDelete = async (occurrence: PlannerOccurrence) => {
    if (occurrence.isRecurring) {
      const deleteFuture = window.confirm('Delete all future occurrences?\n\nPress OK for all future, Cancel to delete only this occurrence.');
      await deleteOccurrence({ occurrence, scope: deleteFuture ? 'ALL_FUTURE' : 'THIS_OCCURRENCE' });
      return;
    }
    await deleteOccurrence({ occurrence, scope: 'THIS_OCCURRENCE' });
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 56,
          right: 0,
          bottom: 0,
          width: 400,
          transform: open ? 'translateX(0)' : 'translateX(420px)',
          transition: 'transform 200ms ease',
          background: 'hsl(var(--bg-primary))',
          borderLeft: `1px solid ${adim}`,
          boxShadow: '-6px 0 28px rgba(0,0,0,0.35)',
          zIndex: 1400,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${adim}` }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// DAY DETAIL</div>
            <div style={{ fontFamily: vt, fontSize: 24, color: acc }}>{date ?? 'NO DATE'}</div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="topbar-btn" onClick={() => setShowAdd(true)} style={{ padding: '5px 10px', fontSize: 9 }}>
            + ADD EVENT
          </button>
          <button className="topbar-btn" onClick={onClose} style={{ padding: '5px 10px', fontSize: 9 }}>
            CLOSE
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isLoading && <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>LOADING...</div>}
          {!isLoading && sorted.length === 0 && (
            <div style={{ fontFamily: mono, fontSize: 10, color: dim, border: `1px solid ${adim}`, padding: 14, background: bgT }}>
              No planner items for this day.
            </div>
          )}

          {sorted.map((occurrence) => (
            <div
              key={`${occurrence.entry_id}:${occurrence.occurrence_date}:${occurrence.date}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                border: `1px solid ${occurrence.completed ? `${green}66` : adim}`,
                background: occurrence.completed ? 'rgba(68,255,136,0.06)' : bgT,
                padding: '10px 12px',
              }}
            >
              <input
                type="checkbox"
                checked={occurrence.completed}
                onChange={(e) => toggleOccurrence({ occurrence, completed: e.target.checked })}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: mono, fontSize: 11, color: occurrence.completed ? dim : acc }}>
                    {occurrence.title}
                  </span>
                  {occurrence.isRecurring && (
                    <span style={{ fontFamily: mono, fontSize: 8, color: adim, border: `1px solid ${adim}`, padding: '1px 6px' }}>
                      RECURRING
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: mono, fontSize: 9, color: dim, marginTop: 4 }}>
                  {occurrence.time ? occurrence.time : 'ALL DAY'}
                  {occurrence.date !== occurrence.occurrence_date ? ` · MOVED TO ${occurrence.date}` : ''}
                </div>
              </div>
              <button className="topbar-btn" onClick={() => setEditingOccurrence(occurrence)} style={{ padding: '4px 8px', fontSize: 8 }}>
                EDIT
              </button>
              <button className="topbar-btn" onClick={() => handleDelete(occurrence)} style={{ padding: '4px 8px', fontSize: 8, color: '#ff6666' }}>
                DEL
              </button>
            </div>
          ))}
        </div>
      </div>

      {showAdd && <PlannerEventModal open={showAdd} onClose={() => setShowAdd(false)} initialDate={date ?? undefined} />}
      {editingOccurrence && (
        <PlannerEventModal
          open={!!editingOccurrence}
          onClose={() => setEditingOccurrence(null)}
          occurrence={editingOccurrence}
          initialDate={editingOccurrence.date}
        />
      )}
    </>
  );
}
