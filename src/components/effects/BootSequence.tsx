// ============================================================
// src/components/effects/BootSequence.tsx
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react';

interface BootSequenceProps {
  onComplete: () => void;
  callsign?: string;
  streakDays?: number;
  multiplier?: string;
  className?: string;
  isShort?: boolean;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface BootLine {
  text: string;
  style: 'title' | 'subtitle' | 'system' | 'ok' | 'welcome' | 'info' | 'dim' | 'blank';
  okTag?: boolean;
  delay: number;
  charDelay?: number;
}

const buildFullSequence = (callsign: string, streakDays: number, multiplier: string): BootLine[] => [
  { text: 'UPLINK OS v1.0.0', style: 'title', delay: 800, charDelay: 50 },
  { text: 'N1GHTW1RE COLLECTIVE', style: 'subtitle', delay: 400, charDelay: 35 },
  { text: '', style: 'blank', delay: 600 },
  { text: '> INITIALISING SYSTEM...', style: 'system', delay: 1000 },
  { text: '> LOADING OPERATOR PROFILE...', style: 'system', okTag: true, delay: 700 },
  { text: '> MOUNTING STAT MATRIX...', style: 'system', okTag: true, delay: 700 },
  { text: '> CALIBRATING XP ENGINE...', style: 'system', okTag: true, delay: 700 },
  { text: '> CHECKING STREAK INTEGRITY...', style: 'system', okTag: true, delay: 700 },
  { text: '> LOADING ARSENAL...', style: 'system', okTag: true, delay: 600 },
  { text: '> ESTABLISHING UPLINK...', style: 'system', okTag: true, delay: 900 },
  { text: '', style: 'blank', delay: 500 },
  { text: `> WELCOME BACK, ${callsign}`, style: 'welcome', delay: 700 },
  { text: `> STREAK: ${streakDays} DAYS [${multiplier}]`, style: 'info', delay: 600 },
  { text: '', style: 'blank', delay: 400 },
  { text: '> BOOTING DASHBOARD...', style: 'dim', delay: 1200 },
];

const buildShortSequence = (callsign: string, streakDays: number, multiplier: string): BootLine[] => [
  { text: 'UPLINK OS v1.0.0', style: 'title', delay: 300, charDelay: 40 },
  { text: '', style: 'blank', delay: 300 },
  { text: '> RESUMING SESSION...', style: 'system', okTag: true, delay: 500 },
  { text: `> OPERATOR: ${callsign}`, style: 'welcome', delay: 400 },
  { text: `> STREAK: ${streakDays} DAYS [${multiplier}]`, style: 'info', delay: 400 },
  { text: '', style: 'blank', delay: 300 },
  { text: '> UPLINK ACTIVE.', style: 'info', delay: 700 },
];

interface CompletedLine {
  text: string;
  style: BootLine['style'];
  okTag?: boolean;
}

const BootSequence = ({
  onComplete,
  callsign = 'OPERATOR',
  streakDays = 0,
  multiplier = 'STANDARD 1.0x',
  isShort = false,
}: BootSequenceProps) => {
  const [completedLines, setCompletedLines] = useState<CompletedLine[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [currentStyle, setCurrentStyle] = useState<BootLine['style']>('system');
  const [showCursor, setShowCursor] = useState(true);
  const [showSkip, setShowSkip] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const abortRef = useRef(false);
  const doneRef = useRef(false);

  const finishBoot = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFadingOut(true);
    setTimeout(() => onComplete(), 500);
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    abortRef.current = true;
    finishBoot();
  }, [finishBoot]);

  // Show skip hint after 3s
  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Key/click to skip
  useEffect(() => {
    const handler = () => { if (showSkip) handleSkip(); };
    window.addEventListener('keydown', handler);
    window.addEventListener('click', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('click', handler);
    };
  }, [showSkip, handleSkip]);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setShowCursor(c => !c), 530);
    return () => clearInterval(interval);
  }, []);

  // Run sequence
  useEffect(() => {
    const sequence = isShort
      ? buildShortSequence(callsign, streakDays, multiplier)
      : buildFullSequence(callsign, streakDays, multiplier);

    const run = async () => {
      for (const line of sequence) {
        if (abortRef.current) return;

        if (line.style === 'blank') {
          setCurrentText('');
          setCurrentStyle('blank');
          setCompletedLines(prev => [...prev, { text: '', style: 'blank' }]);
          await sleep(line.delay);
          continue;
        }

        setCurrentStyle(line.style);
        setCurrentText('');

        // Type out characters
        const charDelay = line.charDelay ?? 30;
        for (let i = 0; i < line.text.length; i++) {
          if (abortRef.current) return;
          setCurrentText(line.text.slice(0, i + 1));
          await sleep(charDelay);
        }

        // Line complete — move to completed list
        setCompletedLines(prev => [
          ...prev,
          { text: line.text, style: line.style, okTag: line.okTag },
        ]);
        setCurrentText('');

        await sleep(line.delay);
      }

      if (!abortRef.current) finishBoot();
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLineStyle = (style: BootLine['style']): React.CSSProperties => {
    switch (style) {
      case 'title':
        return {
          fontFamily: "'VT323', monospace",
          fontSize: 32,
          color: 'hsl(41, 100%, 69%)',
          textShadow: '0 0 12px hsla(41, 100%, 50%, 0.8), 0 0 30px hsla(41, 100%, 50%, 0.4)',
          lineHeight: 1.2,
        };
      case 'subtitle':
        return {
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          color: 'hsl(41, 100%, 30%)',
          letterSpacing: 4,
        };
      case 'welcome':
        return {
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 13,
          color: 'hsl(41, 100%, 69%)',
        };
      case 'info':
        return {
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          color: 'hsl(41, 100%, 50%)',
        };
      case 'dim':
        return {
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          color: 'hsl(41, 100%, 25%)',
        };
      case 'blank':
        return { height: 14, display: 'block' };
      default:
        return {
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          color: 'hsl(41, 100%, 50%)',
        };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: '#0d0800',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 500ms ease',
      }}
    >
      {/* CRT overlay */}
      <div
        className="crt-scanlines crt-vignette crt-flicker"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
      />

      <div style={{
        maxWidth: 680,
        width: '100%',
        padding: '0 32px',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Completed lines */}
        {completedLines.map((line, i) => (
          <div
            key={i}
            style={{
              ...getLineStyle(line.style),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 2,
            }}
          >
            <span>{line.text}</span>
            {line.okTag && (
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                color: '#44ff88',
                textShadow: '0 0 6px rgba(68, 255, 136, 0.6)',
                marginLeft: 16,
                flexShrink: 0,
              }}>
                [ OK ]
              </span>
            )}
          </div>
        ))}

        {/* Currently typing line */}
        {currentText && (
          <div style={{
            ...getLineStyle(currentStyle),
            display: 'flex',
            alignItems: 'baseline',
            marginBottom: 2,
          }}>
            <span>{currentText}</span>
            <span style={{
              color: 'hsl(41, 100%, 50%)',
              marginLeft: 1,
              opacity: showCursor ? 1 : 0,
            }}>█</span>
          </div>
        )}

        {/* Idle cursor between lines */}
        {!currentText && completedLines.length > 0 && !fadingOut && (
          <div style={{ ...getLineStyle(currentStyle), marginBottom: 2 }}>
            <span style={{
              color: 'hsl(41, 100%, 50%)',
              opacity: showCursor ? 1 : 0,
            }}>█</span>
          </div>
        )}
      </div>

      {/* Skip hint */}
      {showSkip && !fadingOut && (
        <div style={{
          position: 'absolute',
          bottom: 32,
          right: 32,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          color: 'hsl(41, 100%, 25%)',
          letterSpacing: 1,
          zIndex: 2,
        }}>
          [ PRESS ANY KEY TO SKIP ]
        </div>
      )}
    </div>
  );
};

export default BootSequence;