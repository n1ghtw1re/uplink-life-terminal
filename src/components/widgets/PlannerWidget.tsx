import { useMemo, useState } from 'react';
import WidgetWrapper from '@/components/WidgetWrapper';
import PlannerEventModal from '@/components/modals/PlannerEventModal';
import { usePlannerActions, usePlannerToday } from '@/hooks/usePlanner';
import { comparePlannerOccurrences, toDateString } from '@/services/plannerService';
import type { PlannerOccurrence } from '@/types';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgT = 'hsl(var(--bg-tertiary))';
const green = '#44ff88';

interface PlannerWidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenPlanner?: () => void;
}

export default function PlannerWidget({ onClose, onFullscreen, isFullscreen, onOpenPlanner }: PlannerWidgetProps) {
  const { occurrences, isLoading } = usePlannerToday();
  const { toggleOccurrence } = usePlannerActions();
  const [showAdd, setShowAdd] = useState(false);

  const sortedOccurrences = useMemo(() => [...occurrences].sort(comparePlannerOccurrences), [occurrences]);
  const todayItems = useMemo(() => sortedOccurrences.slice(0, 5), [sortedOccurrences]);

  const renderOccurrence = (occurrence: PlannerOccurrence) => (
    <div
      key={`${occurrence.entry_id}:${occurrence.occurrence_date}:${occurrence.date}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        marginBottom: 6,
        border: `1px solid ${occurrence.completed ? `${green}66` : adim}`,
        background: occurrence.completed ? 'rgba(68,255,136,0.06)' : bgT,
      }}
    >
      <input type="checkbox" checked={occurrence.completed} onChange={(e) => toggleOccurrence({ occurrence, completed: e.target.checked })} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: occurrence.completed ? dim : acc, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {occurrence.title}
        </div>
        <div style={{ fontFamily: mono, fontSize: 8, color: dim }}>
          {occurrence.time || 'ALL DAY'}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <WidgetWrapper title="PLANNER" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
        {isLoading ? (
          <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>LOADING...</div>
        ) : todayItems.length ? (
          <div>{todayItems.map(renderOccurrence)}</div>
        ) : (
          <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>No planner items today.</div>
        )}

        <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={() => setShowAdd(true)}
            style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          >
            + ADD EVENT
          </button>
          <button
            onClick={onOpenPlanner}
            style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          >
            VIEW ALL {'>'}
          </button>
        </div>
      </WidgetWrapper>

      {showAdd && <PlannerEventModal open={showAdd} onClose={() => setShowAdd(false)} initialDate={toDateString(new Date())} />}
    </>
  );
}
