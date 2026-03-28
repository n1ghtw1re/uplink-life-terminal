import { useEffect, useRef, useState } from 'react';

const CLOCK_ALERT_EVENT = 'uplink:clock-alert';
const CLOCK_SOUND_STATUS_EVENT = 'uplink:clock-sound-status';
const CLOCK_SOUND_STOP_EVENT = 'uplink:clock-sound-stop';
const CLOCK_ALERT_DURATION_MS = 4000;

export function triggerClockAlert(message: string, popup: boolean, glitch: boolean) {
  window.dispatchEvent(new CustomEvent(CLOCK_ALERT_EVENT, {
    detail: { message, popup, glitch },
  }));
}

export function syncClockSoundStatus(playing: boolean) {
  window.dispatchEvent(new CustomEvent(CLOCK_SOUND_STATUS_EVENT, {
    detail: { playing },
  }));
}

export function requestClockSoundStop() {
  window.dispatchEvent(new Event(CLOCK_SOUND_STOP_EVENT));
}

export default function ClockAlertOverlay() {
  const [notification, setNotification] = useState<string | null>(null);
  const [glitchActive, setGlitchActive] = useState(false);
  const [soundPlaying, setSoundPlaying] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const clearAlert = () => {
      setNotification(null);
      setGlitchActive(false);
      document.documentElement.classList.remove('glitch-active');
      document.documentElement.classList.remove('clock-alert-root');
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const handleAlert = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; popup: boolean; glitch: boolean }>).detail;
      const popup = Boolean(detail?.popup);
      const glitch = Boolean(detail?.glitch);

      setNotification(popup ? detail?.message ?? null : null);
      setGlitchActive(glitch);

      if (glitch) {
        document.documentElement.classList.add('glitch-active');
        document.documentElement.classList.add('clock-alert-root');
      } else {
        document.documentElement.classList.remove('glitch-active');
        document.documentElement.classList.remove('clock-alert-root');
      }

      if (!popup && !glitch) return;

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        clearAlert();
      }, CLOCK_ALERT_DURATION_MS);
    };

    const handleSoundStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ playing: boolean }>).detail;
      setSoundPlaying(Boolean(detail?.playing));
    };

    window.addEventListener(CLOCK_ALERT_EVENT, handleAlert as EventListener);
    window.addEventListener(CLOCK_SOUND_STATUS_EVENT, handleSoundStatus as EventListener);
    return () => {
      window.removeEventListener(CLOCK_ALERT_EVENT, handleAlert as EventListener);
      window.removeEventListener(CLOCK_SOUND_STATUS_EVENT, handleSoundStatus as EventListener);
      clearAlert();
    };
  }, []);

  if (!notification && !glitchActive && !soundPlaying) return null;

  return (
    <>
      <style>{`
        .clock-alert-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: hsl(var(--bg-primary) / 0.76);
          z-index: 2500;
          cursor: pointer;
          backdrop-filter: blur(2px);
        }

        .clock-alert-box {
          padding: 22px 26px;
          border: 1px solid hsl(var(--accent));
          background: hsl(var(--bg-secondary) / 0.94);
          border-radius: 12px;
          text-align: center;
          min-width: 300px;
          max-width: 380px;
          box-shadow: 0 0 24px rgba(0,0,0,0.55);
        }

        .clock-sound-fab {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 2500;
          border: 1px solid hsl(var(--accent));
          background: hsl(var(--bg-secondary) / 0.94);
          color: hsl(var(--accent-bright));
          padding: 8px 12px;
          font-size: 10px;
          letter-spacing: 0.08em;
          box-shadow: 0 0 18px rgba(0,0,0,0.35);
          cursor: pointer;
        }

        .clock-alert-text {
          font-family: 'VT323', monospace;
          font-size: 28px;
          letter-spacing: 0.08em;
          color: hsl(var(--accent-bright));
          text-shadow: 0 0 12px hsl(var(--accent-bright) / 0.8);
        }

        .clock-alert-overlay.clock-alert-glitch .clock-alert-box {
          animation: clock-alert-glitch 0.55s ease-in-out infinite;
        }

        .clock-alert-root #app-root {
          animation: clock-screen-glitch 0.6s steps(1, end) infinite;
        }

        @keyframes clock-alert-glitch {
          0% { transform: translate(0, 0) skewX(0deg); }
          20% { transform: translate(-3px, 2px) skewX(-3deg); }
          40% { transform: translate(3px, -2px) skewX(2deg); }
          60% { transform: translate(-2px, 1px) skewX(-2deg); }
          80% { transform: translate(2px, -1px) skewX(1deg); }
          100% { transform: translate(0, 0) skewX(0deg); }
        }

        @keyframes clock-screen-glitch {
          0% { filter: none; transform: translate(0, 0); }
          15% { filter: hue-rotate(90deg) saturate(1.6); transform: translate(4px, -1px); }
          30% { filter: contrast(1.25); transform: translate(-3px, 2px); }
          45% { filter: hue-rotate(180deg) saturate(1.4); transform: translate(2px, -2px); }
          60% { filter: none; transform: translate(-2px, 1px); }
          75% { filter: brightness(1.1); transform: translate(2px, 0); }
          100% { filter: none; transform: translate(0, 0); }
        }
      `}</style>
      {(notification || glitchActive) && (
        <div
          className={`clock-alert-overlay${glitchActive ? ' clock-alert-glitch' : ''}`}
          onClick={() => {
            setNotification(null);
            setGlitchActive(false);
            document.documentElement.classList.remove('glitch-active');
            document.documentElement.classList.remove('clock-alert-root');
            if (timeoutRef.current) {
              window.clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }}
        >
          <div className="clock-alert-box" onClick={(e) => e.stopPropagation()}>
            {notification && (
              <>
                <div className="clock-alert-text" aria-live="polite">{notification}</div>
                <div style={{ marginTop: 12, fontSize: 10, color: 'hsl(var(--text-dim))' }}>
                  (click anywhere to dismiss)
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {soundPlaying && !notification && !glitchActive && (
        <button className="clock-sound-fab" onClick={() => requestClockSoundStop()}>
          STOP SOUND
        </button>
      )}
    </>
  );
}
