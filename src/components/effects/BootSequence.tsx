import { useState, useEffect, useCallback, useRef } from 'react';

interface BootSequenceProps {
  onComplete: () => void;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface BootLine {
  text: string;
  style: 'title' | 'subtitle' | 'system' | 'ok' | 'welcome' | 'info' | 'dim' | 'blank';
  okTag?: boolean;
  delay: number; // delay AFTER this line completes
  charDelay?: number; // ms per char, default 40
}

const FULL_SEQUENCE: BootLine[] = [
  { text: 'UPLINK OS v1.0.0', style: 'title', delay: 800, charDelay: 50 },
  { text: 'N1GHTW1RE COLLECTIVE', style: 'subtitle', delay: 400, charDelay: 35 },
  { text: '', style: 'blank', delay: 600 },
  { text: '> INITIALISING SYSTEM...', style: 'system', delay: 1200 },
  { text: '> LOADING OPERATOR PROFILE...', style: 'system', okTag: true, delay: 800 },
  { text: '> MOUNTING STAT MATRIX...', style: 'system', okTag: true, delay: 800 },
  { text: '> CALIBRATING XP ENGINE...', style: 'system', okTag: true, delay: 800 },
  { text: '> CHECKING STREAK INTEGRITY...', style: 'system', okTag: true, delay: 800 },
  { text: '> LOADING ARSENAL...', style: 'system', okTag: true, delay: 600 },
  { text: '> ESTABLISHING UPLINK...', style: 'system', okTag: true, delay: 1000 },
  { text: '', style: 'blank', delay: 600 },
  { text: '> WELCOME BACK, VOID_SIGNAL', style: 'welcome', delay: 800 },
  { text: '> STREAK: 14 DAYS [ON FIRE 2.0×]', style: 'info', delay: 600 },
  { text: '> CURRENT CLASS: ROCKERBOY // WITCH', style: 'info', delay: 1200 },
  { text: '', style: 'blank', delay: 600 },
  { text: '> BOOTING DASHBOARD...', style: 'dim', delay: 1500 },
];

const SHORT_SEQUENCE: BootLine[] = [
  { text: 'UPLINK OS v1.0.0', style: 'title', delay: 400, charDelay: 50 },
  { text: '', style: 'blank', delay: 400 },
  { text: '> RESUMING SESSION...', style: 'system', okTag: true, delay: 600 },
  { text: '> OPERATOR: VOID_SIGNAL', style: 'welcome', delay: 400 },
  { text: '> STREAK: 14 DAYS [ON FIRE 2.0×]', style: 'info', delay: 400 },
  { text: '', style: 'blank', delay: 400 },
  { text: '> UPLINK ACTIVE.', style: 'info', delay: 800 },
];

interface CompletedLine {
  text: string;
  style: BootLine['style'];
  okTag?: boolean;
}

const BootSequence = ({ onComplete }: BootSequenceProps) => {
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
    setTimeout(() => onComplete(), 400);
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    abortRef.current = true;
    finishBoot();
  }, [finishBoot]);

  useEffect(() => {
    const skipTimer = setTimeout(() => setShowSkip(true), 3000);
    return () => clearTimeout(skipTimer);
  }, []);

  useEffect(() => {
    const handleKey = () => {
      if (showSkip) handleSkip();
    };
    const handleClick = () => {
      if (showSkip) handleSkip();
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('click', handleClick);
    };
  }, [showSkip, handleSkip]);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setShowCursor(c => !c), 530);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const hasBooted = localStorage.getItem('uplink_booted');
    const sequence = hasBooted ? SHORT_SEQUENCE : FULL_SEQUENCE;
    if (!hasBooted) localStorage.setItem('uplink_booted', 'true');

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

        const charDelay = line.charDelay ?? 40;
        for (let i = 0; i < line.text.length; i++) {
          if (abortRef.current) return;
          setCurrentText(line.text.slice(0, i + 1));
          await sleep(charDelay);
        }

        setCompletedLines(prev => [...prev, { text: line.text, style: line.style, okTag: line.okTag }]);
        setCurrentText('');
        await sleep(line.delay);
      }

      if (!abortRef.current) finishBoot();
    };

    run();
  }, [finishBoot]);

  const getLineStyle = (style: BootLine['style']): React.CSSProperties => {
    switch (style) {
      case 'title':
        return { fontFamily: "'VT323', monospace", fontSize: 28, color: 'hsl(41 100% 69%)', textShadow: '0 0 12px hsla(41 100% 50% / 0.8), 0 0 30px hsla(41 100% 50% / 0.4)' };
      case 'subtitle':
        return { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'hsl(41 100% 30%)', letterSpacing: 4 };
      case 'welcome':
        return { fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: 'hsl(41 100% 69%)' };
      case 'info':
        return { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'hsl(41 100% 50%)' };
      case 'dim':
        return { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'hsl(41 100% 30%)' };
      case 'blank':
        return { height: 16 };
      default:
        return { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'hsl(41 100% 50%)' };
    }
  };

  return (
    <div
      className={`boot-sequence-overlay ${fadingOut ? 'boot-fade-out' : ''}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: '#0d0800',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* CRT effects on top */}
      <div className="crt-scanlines crt-vignette crt-flicker" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ maxWidth: 680, width: '100%', padding: '0 24px', position: 'relative', zIndex: 2 }}>
        {/* Completed lines */}
        {completedLines.map((line, i) => (
          <div key={i} style={{ ...getLineStyle(line.style), display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', minHeight: line.style === 'blank' ? 16 : undefined }}>
            <span>{line.text}</span>
            {line.okTag && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#44ff88', marginLeft: 16, flexShrink: 0 }}>[ OK ]</span>
            )}
          </div>
        ))}

        {/* Current typing line */}
        {currentText && (
          <div style={{ ...getLineStyle(currentStyle), display: 'flex', alignItems: 'baseline' }}>
            <span>{currentText}</span>
            <span style={{ color: 'hsl(41 100% 50%)', marginLeft: 1, opacity: showCursor ? 1 : 0 }}>█</span>
          </div>
        )}

        {/* Cursor on empty line when idle between lines */}
        {!currentText && completedLines.length > 0 && !fadingOut && (
          <div style={{ ...getLineStyle(currentStyle) }}>
            <span style={{ color: 'hsl(41 100% 50%)', opacity: showCursor ? 1 : 0 }}>█</span>
          </div>
        )}
      </div>

      {/* Skip hint */}
      {showSkip && !fadingOut && (
        <div className="boot-skip">[ PRESS ANY KEY TO SKIP ]</div>
      )}
    </div>
  );
};

export default BootSequence;
