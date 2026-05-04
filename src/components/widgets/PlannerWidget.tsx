import { useMemo, useState, useEffect } from 'react';
import WidgetWrapper from '@/components/WidgetWrapper';
import PlannerEventModal from '@/components/modals/PlannerEventModal';
import { usePlannerActions, usePlannerUpcoming } from '@/hooks/usePlanner';
import { comparePlannerOccurrences, toDateString, parsePlannerDate } from '@/services/plannerService';
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
  const { occurrences, isLoading } = usePlannerUpcoming();
  const { toggleOccurrence } = usePlannerActions();
  const [showAdd, setShowAdd] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const validOccurrences = useMemo(() => {
    return occurrences.filter(occ => {
      const [hours, minutes] = (occ.time ?? '23:59').split(':').map(Number);
      const occurrenceDate = parsePlannerDate(occ.date);
      occurrenceDate.setHours(Number.isFinite(hours) ? hours : 23, Number.isFinite(minutes) ? minutes : 59, 0, 0);
      return occurrenceDate >= now;
    });
  }, [occurrences, now]);

  const nextEvent = validOccurrences[0];
  const upcomingEvents = validOccurrences.slice(1, 6);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dateStr === toDateString(today)) return 'TODAY';
    if (dateStr === toDateString(tomorrow)) return 'TOMORROW';
    
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  const renderNextEvent = () => {
    if (!nextEvent) return null;
    return (
      <div
        key={`next-${nextEvent.entry_id}:${nextEvent.occurrence_date}`}
        style={{
          padding: '8px 10px',
          marginBottom: 8,
          border: `1px solid ${acc}`,
          background: bgT,
        }}
      >
        <div style={{ fontFamily: mono, fontSize: 8, color: adim, marginBottom: 4 }}>NEXT</div>
        <div style={{ fontFamily: mono, fontSize: 11, color: acc, fontWeight: 'bold', marginBottom: 2 }}>
          {nextEvent.title}
        </div>
        <div style={{ fontFamily: mono, fontSize: 9, color: dim }}>
          {nextEvent.time || 'ALL DAY'} • {formatDate(nextEvent.occurrence_date)}
        </div>
      </div>
    );
  };

  const renderUpcoming = (occurrence: PlannerOccurrence) => (
    <div
      key={`${occurrence.entry_id}:${occurrence.occurrence_date}:${occurrence.date}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 6px',
        marginBottom: 4,
        border: `1px solid ${occurrence.completed ? `${green}66` : adim}`,
        background: occurrence.completed ? 'rgba(68,255,136,0.06)' : bgT,
      }}
    >
      <input 
        type="checkbox" 
        checked={occurrence.completed} 
        onChange={(e) => {
          e.stopPropagation();
          toggleOccurrence({ occurrence, completed: e.target.checked });
        }} 
        style={{ width: 12, height: 12 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: occurrence.completed ? dim : acc, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {occurrence.title}
        </div>
      </div>
      <div style={{ fontFamily: mono, fontSize: 8, color: dim, whiteSpace: 'nowrap' }}>
        {formatDate(occurrence.occurrence_date)}
      </div>
    </div>
  );

  return (
    <>
      <WidgetWrapper title="PLANNER" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
        {isLoading ? (
          <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>LOADING...</div>
        ) : (
          <>
            {nextEvent && renderNextEvent()}
            
            {upcomingEvents.length > 0 && (
              <div style={{ marginTop: nextEvent ? 8 : 0 }}>
                {nextEvent && <div style={{ fontFamily: mono, fontSize: 8, color: adim, marginBottom: 6 }}>UPCOMING</div>}
                {upcomingEvents.map(renderUpcoming)}
              </div>
            )}
            
            {!nextEvent && upcomingEvents.length === 0 && (
              <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>No planner items.</div>
            )}
          </>
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
