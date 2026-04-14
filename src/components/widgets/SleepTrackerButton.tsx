import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const green = '#44ff88';

const STORAGE_KEY = 'uplink_active_sleep_start';

function getStoredSleepStart(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function formatElapsed(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

interface SleepTrackerButtonProps {
  compact?: boolean;
  onLogged?: () => void;
}

export function SleepTrackerButton({ compact = false, onLogged }: SleepTrackerButtonProps) {
  const queryClient = useQueryClient();
  const [sleepStart, setSleepStart] = useState<string | null>(() => getStoredSleepStart());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!sleepStart) return;
    const updateElapsed = () => {
      const ms = Date.now() - new Date(sleepStart).getTime();
      setElapsed(ms);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [sleepStart]);

  const createSleepMutation = useMutation({
    mutationFn: async ({ startTime, endTime }: { startTime: string; endTime: string }) => {
      const db = await getDB();
      const durationMinutes = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
      const id = crypto.randomUUID();
      await db.query(
        `INSERT INTO sleep_sessions (id, start_time, end_time, duration_minutes, quality)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, startTime, endTime, durationMinutes, 4]
      );
      return durationMinutes;
    },
    onSuccess: (durationMinutes) => {
      localStorage.removeItem(STORAGE_KEY);
      setSleepStart(null);
      setElapsed(0);
      queryClient.invalidateQueries({ queryKey: ['sleep-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sleep-days'] });
      onLogged?.();
    },
  });

  const handleStartSleep = () => {
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, now);
    setSleepStart(now);
    setElapsed(0);
  };

  const handleWakeUp = () => {
    if (!sleepStart) return;
    const endTime = new Date().toISOString();
    createSleepMutation.mutate({ startTime: sleepStart, endTime });
  };

  if (sleepStart) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: compact ? '6px 0' : '8px 0',
      }}>
        <button
          onClick={handleWakeUp}
          disabled={createSleepMutation.isPending}
          style={{
            padding: compact ? '6px 16px' : '8px 24px',
            fontSize: compact ? 10 : 11,
            fontFamily: mono,
            fontWeight: 600,
            letterSpacing: 1,
            cursor: 'pointer',
            background: 'rgba(68, 255, 136, 0.1)',
            border: `1px solid ${green}`,
            color: green,
            borderRadius: 2,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(68, 255, 136, 0.2)';
            e.currentTarget.style.boxShadow = `0 0 10px rgba(68, 255, 136, 0.3)`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(68, 255, 136, 0.1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {createSleepMutation.isPending ? 'LOGGING...' : `WAKE UP +`}
        </button>
        {!compact && (
          <div style={{
            fontSize: 9,
            color: dim,
            fontFamily: mono,
          }}>
            sleeping: {formatElapsed(elapsed)}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleStartSleep}
      style={{
        width: '100%',
        padding: compact ? '6px 16px' : '8px 24px',
        fontSize: compact ? 10 : 11,
        fontFamily: mono,
        fontWeight: 600,
        letterSpacing: 1,
        cursor: 'pointer',
        background: 'rgba(255, 176, 0, 0.1)',
        border: `1px solid ${acc}`,
        color: acc,
        borderRadius: 2,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255, 176, 0, 0.2)';
        e.currentTarget.style.boxShadow = `0 0 10px rgba(255, 176, 0, 0.3)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255, 176, 0, 0.1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      START SLEEP
    </button>
  );
}

export { getStoredSleepStart };
