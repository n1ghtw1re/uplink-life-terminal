import { useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import PlannerDayDrawer from '@/components/drawer/PlannerDayDrawer';
import PlannerEventModal from '@/components/modals/PlannerEventModal';
import { usePlannerRange } from '@/hooks/usePlanner';
import { getMonthBounds, toDateString } from '@/services/plannerService';

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgP = 'hsl(var(--bg-primary))';
const bgS = 'hsl(var(--bg-secondary))';
const bgT = 'hsl(var(--bg-tertiary))';
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

interface PlannerPageProps {
  onClose: () => void;
}

export default function PlannerPage({ onClose }: PlannerPageProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const todayKey = toDateString(new Date());
  const bounds = getMonthBounds(month);
  const { occurrences, isLoading } = usePlannerRange(bounds.start, bounds.end);

  const monthMap = useMemo(() => {
    const map = new Map<string, typeof occurrences>();
    for (const occurrence of occurrences) {
      const bucket = map.get(occurrence.date) ?? [];
      bucket.push(occurrence);
      map.set(occurrence.date, bucket);
    }
    return map;
  }, [occurrences]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: bgP, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 56, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', flexShrink: 0 }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// TRACKING</span>
        <span style={{ fontFamily: vt, fontSize: 24, color: acc }}>PLANNER</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: dim }}>{format(month, 'MMMM yyyy')}</span>
        <div style={{ flex: 1 }} />
        <button className="topbar-btn" onClick={() => setMonth(subMonths(month, 1))} style={{ padding: '5px 10px', fontSize: 9 }}>
          PREV
        </button>
        <button className="topbar-btn" onClick={() => setMonth(startOfMonth(new Date()))} style={{ padding: '5px 10px', fontSize: 9 }}>
          TODAY
        </button>
        <button className="topbar-btn" onClick={() => setMonth(addMonths(month, 1))} style={{ padding: '5px 10px', fontSize: 9 }}>
          NEXT
        </button>
        <button className="topbar-btn" onClick={() => setShowAdd(true)} style={{ padding: '5px 12px', fontSize: 9 }}>
          + ADD EVENT
        </button>
        <button className="topbar-btn" onClick={onClose} style={{ padding: '5px 12px', fontSize: 9 }}>
          CLOSE
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', paddingRight: selectedDate ? 400 : 0, transition: 'padding-right 200ms ease' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1, background: adim, borderBottom: `1px solid ${adim}`, flexShrink: 0 }}>
          {DAYS.map((day) => (
            <div key={day} style={{ background: bgS, color: adim, fontFamily: mono, fontSize: 9, letterSpacing: 1, padding: '10px 12px', boxSizing: 'border-box', minWidth: 0 }}>
              {day}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridAutoRows: '1fr', gap: 1, background: adim, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {days.map((day) => {
            const dateKey = toDateString(day);
            const items = monthMap.get(dateKey) ?? [];
            const inMonth = isSameMonth(day, month);
            const isSelected = selectedDate === dateKey;
            const isToday = dateKey === todayKey;
            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(dateKey)}
                style={{
                  background: isSelected ? 'rgba(255,176,0,0.1)' : isToday ? 'rgba(255,176,0,0.05)' : bgS,
                  border: 'none',
                  padding: 12,
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  cursor: 'pointer',
                  color: acc,
                  boxSizing: 'border-box',
                  minWidth: 0,
                  overflow: 'hidden',
                  boxShadow: isToday ? 'inset 0 0 0 1px rgba(255,176,0,0.55)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: vt, fontSize: 24, color: inMonth ? acc : dim }}>
                    {format(day, 'd')}
                  </span>
                  <span style={{ fontFamily: mono, fontSize: 8, color: items.length ? adim : dim }}>
                    {isToday ? 'TODAY' : items.length ? `${items.length} ITEM${items.length > 1 ? 'S' : ''}` : 'OPEN'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
                  {items.slice(0, 3).map((item) => (
                    <div key={`${item.entry_id}:${item.occurrence_date}:${item.date}`} style={{
                      fontFamily: mono,
                      fontSize: 9,
                      color: item.completed ? dim : acc,
                      background: bgT,
                      border: `1px solid ${item.completed ? `${adim}` : `${adim}66`}`,
                      padding: '5px 6px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      maxWidth: '100%',
                    }}>
                      {item.time ? `${item.time} ` : ''}{item.title}
                    </div>
                  ))}
                  {items.length > 3 && <div style={{ fontFamily: mono, fontSize: 8, color: dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>+ {items.length - 3} more</div>}
                  {!items.length && !isLoading && (
                    <div style={{ fontFamily: mono, fontSize: 8, color: dim, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      No entries
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        </div>
      </div>

      <PlannerDayDrawer date={selectedDate} open={!!selectedDate} onClose={() => setSelectedDate(null)} />
      {showAdd && <PlannerEventModal open={showAdd} onClose={() => setShowAdd(false)} initialDate={selectedDate ?? toDateString(new Date())} />}
    </div>
  );
}
