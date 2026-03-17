import { useEffect, useMemo, useRef, useState } from 'react';
import WidgetWrapper from '../WidgetWrapper';

interface WidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  isFocused?: boolean;
}

type ClockTab = 'timer' | 'stopwatch' | 'pomodoro';
type PomodoroPhase = 'WORK' | 'BREAK';

const TIMER_PRESETS = [5, 10, 15, 25, 45, 60];

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const ClockWidget = ({ onClose, onFullscreen, isFullscreen, isFocused }: WidgetProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<ClockTab>('timer');

  const [timerDurationMin, setTimerDurationMin] = useState(15);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(15 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);

  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('WORK');
  const [pomodoroCycles, setPomodoroCycles] = useState(0);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (isFocused) {
      containerRef.current?.focus();
    }
  }, [isFocused]);

  useEffect(() => {
    if (!stopwatchRunning) return;
    const id = window.setInterval(() => {
      setStopwatchSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [stopwatchRunning]);

  useEffect(() => {
    if (!pomodoroRunning) return;
    const id = window.setInterval(() => {
      setPomodoroSecondsLeft((prev) => {
        if (prev <= 1) {
          const nextPhase: PomodoroPhase = pomodoroPhase === 'WORK' ? 'BREAK' : 'WORK';
          if (pomodoroPhase === 'WORK') setPomodoroCycles((c) => c + 1);
          setPomodoroPhase(nextPhase);
          return nextPhase === 'WORK' ? 25 * 60 : 5 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [pomodoroRunning, pomodoroPhase]);

  const timerProgress = useMemo(() => {
    const total = Math.max(1, timerDurationMin * 60);
    const pct = ((total - timerSecondsLeft) / total) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [timerDurationMin, timerSecondsLeft]);

  const setTimerDuration = (minutes: number) => {
    const safe = Math.max(1, Math.min(180, minutes));
    setTimerDurationMin(safe);
    setTimerSecondsLeft(safe * 60);
    setTimerRunning(false);
  };

  return (
    <WidgetWrapper title="CLOCK" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      <div ref={containerRef} tabIndex={0} style={{ outline: 'none' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button className={`topbar-btn ${tab === 'timer' ? 'active' : ''}`} onClick={() => setTab('timer')}>
          TIMER
        </button>
        <button className={`topbar-btn ${tab === 'stopwatch' ? 'active' : ''}`} onClick={() => setTab('stopwatch')}>
          STOPWATCH
        </button>
        <button className={`topbar-btn ${tab === 'pomodoro' ? 'active' : ''}`} onClick={() => setTab('pomodoro')}>
          POMODORO
        </button>
      </div>

      {tab === 'timer' && (
        <div>
          <div className="font-display text-glow-bright" style={{ fontSize: 42, lineHeight: 1, marginBottom: 8 }}>
            {formatTime(timerSecondsLeft)}
          </div>
          <div style={{ height: 8, border: '1px solid hsl(var(--accent-dim))', background: 'hsl(var(--bg-tertiary))', marginBottom: 8 }}>
            <div style={{ width: `${timerProgress}%`, height: '100%', background: 'hsl(var(--accent))', boxShadow: '0 0 8px hsl(var(--accent-glow) / 0.5)', transition: 'width 0.2s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {TIMER_PRESETS.map((preset) => (
              <button key={preset} className="topbar-btn" onClick={() => setTimerDuration(preset)}>
                {preset}m
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>CUSTOM (MIN)</span>
            <input
              className="crt-input"
              type="number"
              min={1}
              max={180}
              value={timerDurationMin}
              onChange={(e) => setTimerDuration(Number(e.target.value || 1))}
              style={{ width: 70, padding: '4px 6px', fontSize: 10 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="topbar-btn" onClick={() => setTimerRunning((r) => !r)}>
              {timerRunning ? 'PAUSE' : 'START'}
            </button>
            <button className="topbar-btn" onClick={() => { setTimerRunning(false); setTimerSecondsLeft(timerDurationMin * 60); }}>
              RESET
            </button>
          </div>
          <div style={{ fontSize: 10, marginTop: 8, color: 'hsl(var(--text-dim))' }}>
            Track workouts, tasks, or sessions with simple start/stop timing.
          </div>
        </div>
      )}

      {tab === 'stopwatch' && (
        <div>
          <div className="font-display text-glow-bright" style={{ fontSize: 42, lineHeight: 1, marginBottom: 10 }}>
            {formatTime(stopwatchSeconds)}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="topbar-btn" onClick={() => setStopwatchRunning((r) => !r)}>
              {stopwatchRunning ? 'STOP' : 'START'}
            </button>
            <button className="topbar-btn" onClick={() => { setStopwatchRunning(false); setStopwatchSeconds(0); }}>
              RESET
            </button>
          </div>
          <div style={{ fontSize: 10, marginTop: 8, color: 'hsl(var(--text-dim))' }}>
            Track workouts, tasks, or sessions with simple start/stop timing.
          </div>
        </div>
      )}

      {tab === 'pomodoro' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="text-glow" style={{ fontSize: 11, color: pomodoroPhase === 'WORK' ? 'hsl(var(--accent))' : 'hsl(var(--text-primary))' }}>
              {pomodoroPhase === 'WORK' ? 'WORK PHASE' : 'BREAK PHASE'}
            </span>
            <span style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>CYCLES: {pomodoroCycles}</span>
          </div>
          <div className="font-display text-glow-bright" style={{ fontSize: 42, lineHeight: 1, marginBottom: 10 }}>
            {formatTime(pomodoroSecondsLeft)}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <button className="topbar-btn" onClick={() => setPomodoroRunning((r) => !r)}>
              {pomodoroRunning ? 'PAUSE' : 'START'}
            </button>
            <button
              className="topbar-btn"
              onClick={() => {
                setPomodoroRunning(false);
                setPomodoroPhase('WORK');
                setPomodoroSecondsLeft(25 * 60);
                setPomodoroCycles(0);
              }}
            >
              RESET
            </button>
          </div>
          <div style={{ fontSize: 10, marginTop: 8, color: 'hsl(var(--text-dim))' }}>
            Structured work/rest cycles for focus and discipline. Work 25:00, break 05:00.
          </div>
        </div>
      )}
      </div>
    </WidgetWrapper>
  );
};

export default ClockWidget;
