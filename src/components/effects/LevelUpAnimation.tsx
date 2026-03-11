import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface LevelUpData {
  level: number;
  className: string;
  totalXP: number;
  unlocks: string[];
}

const listeners: ((data: LevelUpData) => void)[] = [];

export const triggerLevelUp = (data: LevelUpData) => {
  listeners.forEach(fn => fn(data));
};

const LEVEL_UP_ASCII = [
  '██╗     ███████╗██╗   ██╗███████╗██╗',
  '██║     ██╔════╝██║   ██║██╔════╝██║',
  '██║     █████╗  ██║   ██║█████╗  ██║',
  '██║     ██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║',
  '███████╗███████╗ ╚████╔╝ ███████╗███████╗',
  '╚══════╝╚══════╝  ╚═══╝  ╚══════╝╚══════╝',
];

const LevelUpAnimation = () => {
  const [data, setData] = useState<LevelUpData | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [showGlitch, setShowGlitch] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(0); // 0=nothing, 1=title, 2=level, 3=class, 4=bar, 5=unlocks, 6=button
  const [titleText, setTitleText] = useState('');
  const [barWidth, setBarWidth] = useState(0);
  const abortRef = useRef(false);

  useEffect(() => {
    const handler = (d: LevelUpData) => {
      setData(d);
      abortRef.current = false;
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  // Shift+L dev trigger
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'L') {
        triggerLevelUp({
          level: 7,
          className: 'ENGINEER',
          totalXP: 12000,
          unlocks: ['BLOOD-RED THEME NOW AVAILABLE', '+ SCREEN GLITCH TOGGLE'],
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const runSequence = useCallback(async () => {
    // Step 1: Flash
    setShowFlash(true);
    await sleep(300);
    setShowFlash(false);

    // Step 2: Glitch
    await sleep(200);
    setShowGlitch(true);
    await sleep(400);
    setShowGlitch(false);

    // Step 3: Show modal
    await sleep(200);
    setShowModal(true);

    // Typewriter "LEVEL UP"
    const text = 'LEVEL UP';
    for (let i = 0; i < text.length; i++) {
      if (abortRef.current) return;
      setTitleText(text.slice(0, i + 1));
      await sleep(60);
    }
    setStep(1);
    await sleep(400);

    if (abortRef.current) return;
    setStep(2); // level achieved
    await sleep(300);

    if (abortRef.current) return;
    setStep(3); // class name
    await sleep(300);

    // Bar fill
    if (abortRef.current) return;
    setStep(4);
    const startTime = Date.now();
    const duration = 800;
    const animateBar = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(elapsed / duration, 1);
      setBarWidth(pct * 100);
      if (pct < 1 && !abortRef.current) requestAnimationFrame(animateBar);
    };
    requestAnimationFrame(animateBar);
    await sleep(duration + 400);

    if (abortRef.current) return;
    setStep(5); // unlocks
    await sleep(600);

    if (abortRef.current) return;
    setStep(6); // button
  }, []);

  useEffect(() => {
    if (data) {
      setStep(0);
      setTitleText('');
      setBarWidth(0);
      setShowModal(false);
      runSequence();
    }
  }, [data, runSequence]);

  const dismiss = useCallback(() => {
    abortRef.current = true;
    setShowFlash(false);
    setShowGlitch(false);
    setShowModal(false);
    setData(null);
    setStep(0);
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showModal, dismiss]);

  // Apply glitch to app wrapper
  useEffect(() => {
    if (showGlitch) {
      document.getElementById('app-root')?.classList.add('glitch-active');
      return () => { document.getElementById('app-root')?.classList.remove('glitch-active'); };
    }
  }, [showGlitch]);

  if (!data && !showFlash) return null;

  return createPortal(
    <>
      {showFlash && <div className="level-flash-overlay" />}

      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10001,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="levelup-modal">
            {/* ASCII art LEVEL UP */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <pre style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px',
                lineHeight: '1.2',
                color: 'hsl(41 100% 50%)',
                textShadow: '0 0 8px rgba(255, 176, 0, 0.8), 0 0 20px rgba(255, 176, 0, 0.4)',
                textAlign: 'left',
                display: 'inline-block',
                margin: '0 auto 24px auto',
                whiteSpace: 'pre',
                letterSpacing: '0px',
              }}>
{`██╗     ███████╗██╗   ██╗███████╗██╗
██║     ██╔════╝██║   ██║██╔════╝██║
██║     █████╗  ██║   ██║█████╗  ██║
██║     ██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║
███████╗███████╗ ╚████╔╝ ███████╗███████╗
╚══════╝╚══════╝  ╚═══╝  ╚══════╝╚══════╝
                                          
    ██╗   ██╗██████╗ 
    ██║   ██║██╔══██╗
    ██║   ██║██████╔╝
    ██║   ██║██╔═══╝ 
    ╚██████╔╝██║     
     ╚═════╝ ╚═╝     `}
              </pre>
            </div>

            {/* Level achieved */}
            {step >= 2 && (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: 'hsl(41 100% 50%)', marginBottom: 12 }}>
                MASTER LEVEL {data!.level} ACHIEVED
              </div>
            )}

            {/* Class name */}
            {step >= 3 && (
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 28, color: 'hsl(41 100% 69%)', marginBottom: 20 }}>
                // {data!.className}
              </div>
            )}

            {/* XP bar */}
            {step >= 4 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '0 20px' }}>
                <div style={{ flex: 1, height: 10, background: '#1a0f00', border: '1px solid #261600', overflow: 'hidden' }}>
                  <div style={{
                    width: `${barWidth}%`, height: '100%',
                    background: 'hsl(41 100% 50%)',
                    boxShadow: '0 0 10px hsla(41 100% 50% / 0.6)',
                    transition: 'none',
                  }} />
                </div>
                <span style={{ fontFamily: "'VT323', monospace", fontSize: 16, color: 'hsl(41 100% 50%)', whiteSpace: 'nowrap' }}>
                  {data!.totalXP.toLocaleString()} XP
                </span>
              </div>
            )}

            {/* Unlocks */}
            {step >= 5 && data!.unlocks.map((u, i) => (
              <div key={i} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#44ff88', marginBottom: 4 }}>
                {i === 0 ? 'UNLOCK: ' : '        '}{u}
              </div>
            ))}

            {/* Acknowledge button */}
            {step >= 6 && (
              <button
                onClick={dismiss}
                style={{
                  marginTop: 24, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                  color: 'hsl(41 100% 50%)', background: 'none',
                  border: '1px solid hsl(41 100% 50%)', padding: '8px 24px',
                  cursor: 'pointer', letterSpacing: 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'hsl(41 100% 50%)'; e.currentTarget.style.color = '#0d0800'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'hsl(41 100% 50%)'; }}
              >
                {'>> ACKNOWLEDGE'}
              </button>
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

export default LevelUpAnimation;
