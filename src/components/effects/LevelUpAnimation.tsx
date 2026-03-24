// ============================================================
// src/effects/LevelUpAnimation.tsx
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface LevelUpData {
  level: number;
  className: string;
  totalXP: number;
  unlocks: string[];
}

const listeners: ((data: LevelUpData) => void)[] = [];

export const triggerLevelUp = (data: LevelUpData) => {
  listeners.forEach(fn => fn(data));
};

const LevelUpAnimation = () => {
  const [data, setData]           = useState<LevelUpData | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [showGlitch, setShowGlitch] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep]           = useState(0);
  const [titleText, setTitleText] = useState('');
  const [barWidth, setBarWidth]   = useState(0);
  const abortRef                  = useRef(false);

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

  const runSequence = useCallback(async () => {
    setShowFlash(true);
    await sleep(300);
    setShowFlash(false);

    await sleep(200);
    setShowGlitch(true);
    await sleep(400);
    setShowGlitch(false);

    await sleep(200);
    setShowModal(true);

    // Typewriter
    const text = 'LEVEL UP';
    for (let i = 0; i < text.length; i++) {
      if (abortRef.current) return;
      setTitleText(text.slice(0, i + 1));
      await sleep(60);
    }
    setStep(1);
    await sleep(400);

    if (abortRef.current) return;
    setStep(2);
    await sleep(300);

    if (abortRef.current) return;
    setStep(3);
    await sleep(300);

    // Bar fill
    if (abortRef.current) return;
    setStep(4);
    const startTime = Date.now();
    const duration  = 800;
    const animateBar = () => {
      const pct = Math.min((Date.now() - startTime) / duration, 1);
      setBarWidth(pct * 100);
      if (pct < 1 && !abortRef.current) requestAnimationFrame(animateBar);
    };
    requestAnimationFrame(animateBar);
    await sleep(duration + 400);

    if (abortRef.current) return;
    setStep(5);
    await sleep(600);

    if (abortRef.current) return;
    setStep(6);
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
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showModal, dismiss]);

  // Apply glitch class to root
  useEffect(() => {
    const root = document.getElementById('root') ?? document.getElementById('app-root');
    if (!root) return;
    if (showGlitch) {
      root.classList.add('glitch-active');
      return () => root.classList.remove('glitch-active');
    }
  }, [showGlitch]);

  if (!data && !showFlash) return null;

  const acc  = 'hsl(var(--accent))';
  const accB = 'hsl(var(--accent-bright))';
  const bg   = 'hsl(var(--bg-primary))';
  const mono = "'IBM Plex Mono', monospace";
  const vt   = "'VT323', monospace";

  return createPortal(
    <>
      {/* Flash overlay */}
      {showFlash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10002,
          background: acc, opacity: 0.3,
          animation: 'levelFlash 300ms ease-out forwards',
        }} />
      )}

      {/* Modal */}
      {showModal && data && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10001,
          background: 'rgba(0,0,0,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={step >= 6 ? dismiss : undefined}>
          <div style={{
            background: bg,
            border: `1px solid ${acc}`,
            boxShadow: `0 0 40px hsla(var(--accent-glow) / 0.3), 0 0 80px hsla(var(--accent-glow) / 0.1)`,
            padding: '40px 48px',
            minWidth: 480,
            maxWidth: 600,
            textAlign: 'center',
            fontFamily: mono,
          }}>

            {/* ASCII art */}
            <pre style={{
              fontFamily: mono, fontSize: 11, lineHeight: 1.2,
              color: acc,
              textShadow: `0 0 8px hsla(var(--accent-glow) / 0.8), 0 0 20px hsla(var(--accent-glow) / 0.4)`,
              textAlign: 'left', display: 'inline-block',
              margin: '0 auto 24px auto', whiteSpace: 'pre',
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
     ╚═════╝ ╚═╝`}
            </pre>

            {/* Typewriter title */}
            {step >= 1 && (
              <div style={{ fontFamily: vt, fontSize: 32, color: accB, marginBottom: 8, letterSpacing: 3,
                textShadow: `0 0 12px hsla(var(--accent-glow) / 0.8)` }}>
                {titleText}
                <span style={{ animation: 'blink 1s step-end infinite', color: acc }}>█</span>
              </div>
            )}

            {/* Level */}
            {step >= 2 && (
              <div style={{ fontFamily: mono, fontSize: 13, color: acc, marginBottom: 8, letterSpacing: 2 }}>
                MASTER LEVEL {data.level} ACHIEVED
              </div>
            )}

            {/* Class */}
            {step >= 3 && (
              <div style={{ fontFamily: vt, fontSize: 26, color: accB, marginBottom: 20, letterSpacing: 2 }}>
                // {data.className}
              </div>
            )}

            {/* XP bar */}
            {step >= 4 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '0 8px' }}>
                <div style={{ flex: 1, height: 10, background: 'hsl(var(--bg-tertiary))', border: `1px solid hsl(var(--accent-dim))`, overflow: 'hidden' }}>
                  <div style={{
                    width: `${barWidth}%`, height: '100%',
                    background: acc,
                    boxShadow: `0 0 10px hsla(var(--accent-glow) / 0.6)`,
                  }} />
                </div>
                <span style={{ fontFamily: vt, fontSize: 16, color: acc, whiteSpace: 'nowrap' }}>
                  {data.totalXP.toLocaleString()} XP
                </span>
              </div>
            )}

            {/* Unlocks */}
            {step >= 5 && data.unlocks.length > 0 && data.unlocks.map((u, i) => (
              <div key={i} style={{ fontFamily: mono, fontSize: 11, color: '#44ff88', marginBottom: 4, letterSpacing: 1 }}>
                {i === 0 ? '▸ UNLOCK: ' : '          '}{u}
              </div>
            ))}

            {/* Acknowledge */}
            {step >= 6 && (
              <button onClick={dismiss} style={{
                marginTop: 24, fontFamily: mono, fontSize: 12,
                color: acc, background: 'none',
                border: `1px solid ${acc}`, padding: '8px 28px',
                cursor: 'pointer', letterSpacing: 2,
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = acc; e.currentTarget.style.color = bg; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = acc; }}>
                {'>> ACKNOWLEDGE'}
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes levelFlash {
          0%   { opacity: 0.3; }
          100% { opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        .glitch-active {
          animation: glitch 400ms ease;
        }
        @keyframes glitch {
          0%   { transform: translate(0); filter: none; }
          20%  { transform: translate(-3px, 1px); filter: hue-rotate(90deg); }
          40%  { transform: translate(3px, -1px); filter: brightness(1.4); }
          60%  { transform: translate(-2px, 2px); filter: hue-rotate(-90deg); }
          80%  { transform: translate(2px, -2px); filter: brightness(0.8); }
          100% { transform: translate(0); filter: none; }
        }
      `}</style>
    </>,
    document.body
  );
};

export default LevelUpAnimation;