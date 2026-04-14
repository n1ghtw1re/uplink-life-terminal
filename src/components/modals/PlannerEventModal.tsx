import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { usePlannerActions } from '@/hooks/usePlanner';
import { getWeekdayOptions, sanitizePlannerEntryInput, toDateString } from '@/services/plannerService';
import type { PlannerOccurrence, PlannerRecurrenceType } from '@/types';

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgT = 'hsl(var(--bg-tertiary))';
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

interface PlannerEventModalProps {
  open: boolean;
  onClose: () => void;
  initialDate?: string;
  occurrence?: PlannerOccurrence | null;
}

export default function PlannerEventModal({ open, onClose, initialDate, occurrence }: PlannerEventModalProps) {
  const { createEntry, updateBaseEntry, updateOccurrence } = usePlannerActions();
  const defaultDate = initialDate ?? toDateString(new Date());
  const isEditing = !!occurrence;
  const isRecurringEdit = !!occurrence?.isRecurring;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('');
  const [completed, setCompleted] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<PlannerRecurrenceType>('NONE');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'NEVER' | 'ON_DATE' | 'AFTER_COUNT'>('NEVER');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceCount, setRecurrenceCount] = useState(10);
  const [scope, setScope] = useState<'THIS_OCCURRENCE' | 'ALL_FUTURE'>('THIS_OCCURRENCE');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const source = occurrence?.sourceEntry;
    setTitle(occurrence?.title ?? '');
    setDate(occurrence?.date ?? defaultDate);
    setTime(occurrence?.time ?? '');
    setCompleted(occurrence?.completed ?? false);
    setRecurrenceType(source?.recurrence_type ?? 'NONE');
    setRecurrenceInterval(source?.recurrence_interval ?? 1);
    setRecurrenceDays(source?.recurrence_days_of_week ?? getWeekdayOptions(occurrence?.date ?? defaultDate));
    setRecurrenceEndType(source?.recurrence_end_type ?? 'NEVER');
    setRecurrenceEndDate(source?.recurrence_end_date ?? '');
    setRecurrenceCount(source?.recurrence_count ?? 10);
    setScope('THIS_OCCURRENCE');
  }, [open, occurrence, defaultDate]);

  const recurrenceDisabled = isRecurringEdit && scope === 'THIS_OCCURRENCE';
  const canSave = title.trim().length > 0 && date.length > 0;

  const weeklySummary = useMemo(
    () => [...recurrenceDays].sort((a, b) => a - b).map((day) => DAYS[day]).join(' / '),
    [recurrenceDays],
  );

  const toggleDay = (day: number) => {
    setRecurrenceDays((prev) => (
      prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day].sort((a, b) => a - b)
    ));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const input = sanitizePlannerEntryInput({
        title,
        date,
        time: time || null,
        completed,
        recurrence_type: recurrenceType,
        recurrence_interval: recurrenceInterval,
        recurrence_days_of_week: recurrenceType === 'WEEKLY' ? recurrenceDays : null,
        recurrence_end_type: recurrenceType === 'NONE' ? null : recurrenceEndType,
        recurrence_end_date: recurrenceType === 'NONE' || recurrenceEndType !== 'ON_DATE' ? null : recurrenceEndDate,
        recurrence_count: recurrenceType === 'NONE' || recurrenceEndType !== 'AFTER_COUNT' ? null : recurrenceCount,
      });

      if (!occurrence) {
        await createEntry(input);
        onClose();
        return;
      }

      if (!occurrence.isRecurring) {
        await updateBaseEntry({ id: occurrence.entry_id, input });
        onClose();
        return;
      }

      if (scope === 'THIS_OCCURRENCE') {
        await updateOccurrence({
          occurrence,
          scope,
          patch: {
            title: input.title,
            date: input.date,
            time: input.time,
            completed: input.completed,
          },
        });
        onClose();
        return;
      }

      await updateOccurrence({
        occurrence,
        scope,
        patch: {
          title: input.title,
          date: input.date,
          time: input.time,
          completed: input.completed,
        },
        futureInput: input,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'PLANNER EVENT' : 'ADD EVENT'} width={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: mono, color: acc }}>
        {isRecurringEdit && (
          <div style={{ border: `1px solid ${adim}`, background: bgT, padding: 12 }}>
            <div style={{ fontSize: 10, color: adim, letterSpacing: 1, marginBottom: 10 }}>// EDIT SCOPE</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'THIS_OCCURRENCE', label: 'THIS OCCURRENCE' },
                { key: 'ALL_FUTURE', label: 'ALL FUTURE' },
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setScope(option.key as typeof scope)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontFamily: mono,
                    fontSize: 10,
                    background: scope === option.key ? 'rgba(255,176,0,0.1)' : 'transparent',
                    border: `1px solid ${scope === option.key ? acc : adim}`,
                    color: scope === option.key ? acc : dim,
                    cursor: 'pointer',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize: 10, color: adim, letterSpacing: 1, marginBottom: 8 }}>// TITLE</div>
          <input
            className="crt-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Team sync"
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: adim, letterSpacing: 1, marginBottom: 8 }}>// DATE</div>
            <input className="crt-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: adim, letterSpacing: 1, marginBottom: 8 }}>// TIME</div>
            <input className="crt-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>

        {isEditing && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: dim }}>
            <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} />
            MARK COMPLETE
          </label>
        )}

        <div style={{ border: `1px solid ${adim}`, background: bgT, padding: 14, opacity: recurrenceDisabled ? 0.55 : 1 }}>
          <div style={{ fontSize: 10, color: adim, letterSpacing: 1, marginBottom: 10 }}>// RECURRENCE</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const).map((type) => (
              <button
                key={type}
                onClick={() => !recurrenceDisabled && setRecurrenceType(type)}
                disabled={recurrenceDisabled}
                style={{
                  padding: '6px 10px',
                  fontFamily: mono,
                  fontSize: 10,
                  background: recurrenceType === type ? 'rgba(255,176,0,0.12)' : 'transparent',
                  border: `1px solid ${recurrenceType === type ? acc : adim}`,
                  color: recurrenceType === type ? acc : dim,
                  cursor: recurrenceDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                {type}
              </button>
            ))}
          </div>

          {recurrenceType !== 'NONE' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: dim }}>EVERY</span>
                <input
                  className="crt-input"
                  type="number"
                  min={1}
                  value={recurrenceInterval}
                  disabled={recurrenceDisabled}
                  onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value) || 1))}
                  style={{ width: 64, textAlign: 'center' }}
                />
                <span style={{ fontSize: 10, color: dim }}>
                  {recurrenceType === 'DAILY' ? 'DAY(S)' : recurrenceType === 'WEEKLY' ? 'WEEK(S)' : 'MONTH(S)'}
                </span>
              </div>

              {recurrenceType === 'WEEKLY' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8 }}>
                    {DAYS.map((label, index) => (
                      <button
                        key={label}
                        onClick={() => !recurrenceDisabled && toggleDay(index)}
                        disabled={recurrenceDisabled}
                        style={{
                          padding: '6px 8px',
                          fontFamily: mono,
                          fontSize: 9,
                          background: recurrenceDays.includes(index) ? 'rgba(255,176,0,0.12)' : 'transparent',
                          border: `1px solid ${recurrenceDays.includes(index) ? acc : adim}`,
                          color: recurrenceDays.includes(index) ? acc : dim,
                          cursor: recurrenceDisabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 9, color: dim }}>
                    {weeklySummary || 'No days selected'}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: recurrenceEndType !== 'NEVER' ? 12 : 0 }}>
                {(['NEVER', 'ON_DATE', 'AFTER_COUNT'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => !recurrenceDisabled && setRecurrenceEndType(type)}
                    disabled={recurrenceDisabled}
                    style={{
                      padding: '6px 10px',
                      fontFamily: mono,
                      fontSize: 9,
                      background: recurrenceEndType === type ? 'rgba(255,176,0,0.12)' : 'transparent',
                      border: `1px solid ${recurrenceEndType === type ? acc : adim}`,
                      color: recurrenceEndType === type ? acc : dim,
                      cursor: recurrenceDisabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {type === 'ON_DATE' ? 'END ON DATE' : type === 'AFTER_COUNT' ? 'END AFTER COUNT' : 'NEVER END'}
                  </button>
                ))}
              </div>

              {recurrenceEndType === 'ON_DATE' && (
                <input className="crt-input" type="date" value={recurrenceEndDate} disabled={recurrenceDisabled} onChange={(e) => setRecurrenceEndDate(e.target.value)} />
              )}
              {recurrenceEndType === 'AFTER_COUNT' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    className="crt-input"
                    type="number"
                    min={1}
                    value={recurrenceCount}
                    disabled={recurrenceDisabled}
                    onChange={(e) => setRecurrenceCount(Math.max(1, Number(e.target.value) || 1))}
                    style={{ width: 72, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 10, color: dim }}>OCCURRENCES</span>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: vt, fontSize: 18, color: acc }}>
            {isEditing ? 'EDIT EVENT' : 'NEW EVENT'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="topbar-btn" onClick={onClose} style={{ padding: '8px 16px', fontSize: 10 }}>
              [ CANCEL ]
            </button>
            <button
              className="topbar-btn"
              onClick={handleSave}
              disabled={!canSave || saving}
              style={{ padding: '8px 18px', fontSize: 10, opacity: !canSave || saving ? 0.6 : 1 }}
            >
              {saving ? '[ SAVING ]' : '[ SAVE EVENT ]'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
