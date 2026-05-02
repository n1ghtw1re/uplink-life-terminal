import { useEffect, useMemo, useRef, useState } from 'react';
import WidgetWrapper from '../WidgetWrapper';
import { syncClockSoundStatus, triggerClockAlert } from '@/components/effects/ClockAlertOverlay';

interface WidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  isFocused?: boolean;
}

type ClockTab = 'timer' | 'stopwatch' | 'pomodoro';
type PomodoroPhase = 'WORK' | 'BREAK';

const TIMER_PRESETS = [5, 10, 15, 25, 45, 60];

const POMODORO_BREAK_SOUND_SRC = '/music/peace_orchestra.mp3';
const POMODORO_VOLUME_STORAGE_KEY = 'uplink-pomodoro-volume';
const POMODORO_WORK_MIN_STORAGE_KEY = 'uplink-pomodoro-work-minutes';
let sharedPomodoroBreakAudio: HTMLAudioElement | null = null;

const getPomodoroBreakAudio = () => {
  if (sharedPomodoroBreakAudio) return sharedPomodoroBreakAudio;
  const audio = new Audio(POMODORO_BREAK_SOUND_SRC);
  audio.preload = 'auto';
  audio.loop = false;
  sharedPomodoroBreakAudio = audio;
  return audio;
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const formatStopwatch = (ms: number) => {
  const totalSecs = Math.floor(ms / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const millis = ms % 1000;
  if (hours > 0) {
    return `${String(hours)}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
};

const ClockWidget = ({ onClose, onFullscreen, isFullscreen, isFocused }: WidgetProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<ClockTab>('timer');

  const [timerDurationMin, setTimerDurationMin] = useState(15);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(15 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerNotify, setTimerNotify] = useState(true);
  const [timerGlitch, setTimerGlitch] = useState(true);

  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const stopwatchStartRef = useRef<number | null>(null);
  const stopwatchAccumulated = useRef(0);
  const [flags, setFlags] = useState<{ id: string; time: number }[]>([]);

  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('WORK');
  const [pomodoroCycles, setPomodoroCycles] = useState(0);
  const [pomodoroWorkMinutes, setPomodoroWorkMinutes] = useState(() => {
    try {
      const raw = localStorage.getItem(POMODORO_WORK_MIN_STORAGE_KEY);
      if (raw == null) return 25;
      const n = Number(raw);
      return Number.isFinite(n) ? Math.min(60, Math.max(0, Math.round(n))) : 25;
    } catch {
      return 25;
    }
  });
  const [pomodoroNotify, setPomodoroNotify] = useState(true);
  const [pomodoroGlitch, setPomodoroGlitch] = useState(true);
  const [pomodoroVolume, setPomodoroVolume] = useState(() => {
    try {
      const raw = localStorage.getItem(POMODORO_VOLUME_STORAGE_KEY);
      if (raw == null) return 0.7;
      const n = Number(raw);
      return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.7;
    } catch {
      return 0.7;
    }
  });

  const pomodoroBreakAudioRef = useRef<HTMLAudioElement | null>(null);
  const pomodoroVolumeRef = useRef(pomodoroVolume);
  const [pomodoroSoundPlaying, setPomodoroSoundPlaying] = useState(false);
  const [pendingClockAlert, setPendingClockAlert] = useState<null | { message: string; popup: boolean; glitch: boolean }>(null);

  useEffect(() => {
    pomodoroVolumeRef.current = pomodoroVolume;
    try {
      localStorage.setItem(POMODORO_VOLUME_STORAGE_KEY, String(pomodoroVolume));
    } catch {
      /* ignore */
    }
    const a = pomodoroBreakAudioRef.current;
    if (a) a.volume = pomodoroVolume;
  }, [pomodoroVolume]);

  useEffect(() => {
    const audio = getPomodoroBreakAudio();
    audio.volume = pomodoroVolumeRef.current;
    const syncPlaying = () => setPomodoroSoundPlaying(!audio.paused && !audio.ended);
    audio.addEventListener('play', syncPlaying);
    audio.addEventListener('playing', syncPlaying);
    audio.addEventListener('pause', syncPlaying);
    audio.addEventListener('ended', syncPlaying);
    pomodoroBreakAudioRef.current = audio;
    syncPlaying();
    return () => {
      audio.removeEventListener('play', syncPlaying);
      audio.removeEventListener('playing', syncPlaying);
      audio.removeEventListener('pause', syncPlaying);
      audio.removeEventListener('ended', syncPlaying);
      if (pomodoroBreakAudioRef.current === audio) {
        pomodoroBreakAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    syncClockSoundStatus(pomodoroSoundPlaying);
  }, [pomodoroSoundPlaying]);

  useEffect(() => {
    const handleStopSound = () => {
      stopPomodoroSound();
    };
    window.addEventListener('uplink:clock-sound-stop', handleStopSound);
    return () => {
      window.removeEventListener('uplink:clock-sound-stop', handleStopSound);
    };
  }, []);

  const playPomodoroCompleteSound = () => {
    const v = pomodoroVolumeRef.current;
    if (v <= 0) return;
    const audio = pomodoroBreakAudioRef.current ?? getPomodoroBreakAudio();
    pomodoroBreakAudioRef.current = audio;
    audio.volume = Math.min(1, Math.max(0, v));
    audio.pause();
    audio.currentTime = 0;
    setPomodoroSoundPlaying(true);
    void audio.play().catch(() => {});
  };

  const stopPomodoroSound = () => {
    const audio = pomodoroBreakAudioRef.current ?? sharedPomodoroBreakAudio;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPomodoroSoundPlaying(false);
    syncClockSoundStatus(false);
  };

  useEffect(() => {
    if (!pendingClockAlert) return;
    triggerClockAlert(pendingClockAlert.message, pendingClockAlert.popup, pendingClockAlert.glitch);
    setPendingClockAlert(null);
  }, [pendingClockAlert]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setTimerSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, timerNotify, timerGlitch]);

  useEffect(() => {
    if (!timerRunning) return;
    if (timerSecondsLeft !== 0) return;
    setTimerRunning(false);
    if (timerNotify || timerGlitch) {
      setPendingClockAlert({ message: 'Timer complete', popup: timerNotify, glitch: timerGlitch });
    }
  }, [timerRunning, timerSecondsLeft, timerNotify, timerGlitch]);

  useEffect(() => {
    if (isFocused) {
      containerRef.current?.focus();
    }
  }, [isFocused]);

  useEffect(() => {
    if (!stopwatchRunning) return;
    stopwatchStartRef.current = Date.now() - stopwatchAccumulated.current;
    const id = window.setInterval(() => {
      setStopwatchMs(Date.now() - (stopwatchStartRef.current ?? Date.now()));
    }, 47);
    return () => {
      window.clearInterval(id);
      stopwatchAccumulated.current = Date.now() - (stopwatchStartRef.current ?? Date.now());
    };
  }, [stopwatchRunning]);

  useEffect(() => {
    try {
      localStorage.setItem(POMODORO_WORK_MIN_STORAGE_KEY, String(pomodoroWorkMinutes));
    } catch {
      /* ignore */
    }
  }, [pomodoroWorkMinutes]);

  useEffect(() => {
    if (pomodoroRunning) return;
    if (pomodoroPhase !== 'WORK') return;
    setPomodoroSecondsLeft(pomodoroWorkMinutes * 60);
  }, [pomodoroWorkMinutes, pomodoroRunning, pomodoroPhase]);

  useEffect(() => {
    if (!pomodoroRunning) return;
    const id = window.setInterval(() => {
      setPomodoroSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [pomodoroRunning, pomodoroPhase, pomodoroNotify, pomodoroGlitch, pomodoroWorkMinutes]);

  useEffect(() => {
    if (!pomodoroRunning) return;
    if (pomodoroSecondsLeft !== 0) return;

    const nextPhase: PomodoroPhase = pomodoroPhase === 'WORK' ? 'BREAK' : 'WORK';
    if (pomodoroPhase === 'WORK') {
      setPomodoroCycles((c) => c + 1);
    }

    playPomodoroCompleteSound();
    setPomodoroPhase(nextPhase);
    setPomodoroSecondsLeft(nextPhase === 'WORK' ? pomodoroWorkMinutes * 60 : 5 * 60);

    if (pomodoroNotify || pomodoroGlitch) {
      setPendingClockAlert({
        message: nextPhase === 'BREAK' ? 'Break time!' : 'Back to work!',
        popup: pomodoroNotify,
        glitch: pomodoroGlitch,
      });
    }
  }, [pomodoroRunning, pomodoroSecondsLeft, pomodoroPhase, pomodoroNotify, pomodoroGlitch, pomodoroWorkMinutes]);

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
      <div ref={containerRef} tabIndex={0} style={{ outline: 'none', position: 'relative' }}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'hsl(var(--text-dim))' }}>
              <input type="checkbox" checked={timerNotify} onChange={(e) => setTimerNotify(e.target.checked)} />
              Notify
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'hsl(var(--text-dim))' }}>
              <input type="checkbox" checked={timerGlitch} onChange={(e) => setTimerGlitch(e.target.checked)} />
              Glitch
            </label>
          </div>
          <div style={{ fontSize: 10, marginTop: 8, color: 'hsl(var(--text-dim))' }}>
            Track workouts, tasks, or sessions with simple start/stop timing.
          </div>
        </div>
      )}

      {tab === 'stopwatch' && (
        <div>
          <div className="font-display text-glow-bright" style={{ fontSize: 36, lineHeight: 1, marginBottom: 10, fontVariantNumeric: 'tabular-nums' }}>
            {formatStopwatch(stopwatchMs)}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="topbar-btn" onClick={() => setStopwatchRunning((r) => !r)}>
              {stopwatchRunning ? 'STOP' : 'START'}
            </button>
            <button className="topbar-btn" onClick={() => {
              setStopwatchRunning(false);
              setStopwatchMs(0);
              stopwatchAccumulated.current = 0;
              stopwatchStartRef.current = null;
              setFlags([]);
            }}>
              RESET
            </button>
            <button className="topbar-btn" onClick={() => {
              setFlags((prev) => [...prev, { id: crypto.randomUUID(), time: stopwatchMs }]);
            }} disabled={stopwatchMs === 0}>
              FLAG
            </button>
          </div>
          {flags.length > 0 && (
            <div style={{
              marginTop: 10,
              maxHeight: 120,
              overflowY: 'auto',
              border: '1px solid hsl(var(--accent-dim))',
              background: 'hsl(var(--bg-tertiary))',
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr',
                padding: '4px 8px',
                borderBottom: '1px solid hsl(var(--accent-dim))',
                color: 'hsl(var(--text-dim))',
                fontWeight: 600,
                position: 'sticky',
                top: 0,
                background: 'hsl(var(--bg-tertiary))',
              }}>
                <span>#</span>
                <span>TIME</span>
              </div>
              {flags.map((f, i) => (
                <div key={f.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr',
                  padding: '3px 8px',
                  borderBottom: i < flags.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                  color: 'hsl(var(--text-primary))',
                }}>
                  <span style={{ color: 'hsl(var(--text-dim))' }}>{i + 1}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatStopwatch(f.time)}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 10, marginTop: 8, color: 'hsl(var(--text-dim))' }}>
            Track intervals, laps, or sets. Use FLAG to mark times while running.
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
                stopPomodoroSound();
                setPomodoroRunning(false);
                setPomodoroPhase('WORK');
                setPomodoroSecondsLeft(pomodoroWorkMinutes * 60);
                setPomodoroCycles(0);
              }}
            >
              RESET
            </button>
            <button className="topbar-btn" onClick={stopPomodoroSound} disabled={!pomodoroSoundPlaying}>
              STOP SOUND
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: 'hsl(var(--text-dim))', minWidth: 72 }}>WORK LENGTH</span>
            <input
              type="range"
              min={0}
              max={60}
              step={1}
              value={pomodoroWorkMinutes}
              onChange={(e) => setPomodoroWorkMinutes(Number(e.target.value))}
              aria-label="Pomodoro work duration in minutes"
              style={{ flex: 1, minWidth: 80, accentColor: 'hsl(var(--accent))' }}
            />
            <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))', width: 38, fontVariantNumeric: 'tabular-nums' }}>
              {pomodoroWorkMinutes}m
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'hsl(var(--text-dim))' }}>
              <input type="checkbox" checked={pomodoroNotify} onChange={(e) => setPomodoroNotify(e.target.checked)} />
              Notify
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'hsl(var(--text-dim))' }}>
              <input type="checkbox" checked={pomodoroGlitch} onChange={(e) => setPomodoroGlitch(e.target.checked)} />
              Glitch
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: 'hsl(var(--text-dim))', minWidth: 72 }}>BREAK SOUND</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(pomodoroVolume * 100)}
              onChange={(e) => setPomodoroVolume(Number(e.target.value) / 100)}
              aria-label="Pomodoro break sound volume"
              style={{ flex: 1, minWidth: 80, accentColor: 'hsl(var(--accent))' }}
            />
            <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))', width: 28, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(pomodoroVolume * 100)}%
            </span>
          </div>
          <div style={{ fontSize: 10, marginTop: 8, color: 'hsl(var(--text-dim))' }}>
            Structured work/rest cycles for focus and discipline. Work is adjustable (0-60m), break is fixed at 05:00. Sound plays on each phase completion.
          </div>
        </div>
      )}
      </div>
    </WidgetWrapper>
  );
};

export default ClockWidget;
