import { useEffect, useMemo, useRef, useState } from 'react';
import WidgetWrapper from '../WidgetWrapper';

interface WidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  isFocused?: boolean;
}

const BUTTONS = [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '-'],
  ['0', '.', '=', '+'],
];

const CalculatorWidget = ({ onClose, onFullscreen, isFullscreen, isFocused }: WidgetProps) => {
  const [display, setDisplay] = useState('0');
  const [memory, setMemory] = useState<string | null>(null);

  const displayRef = useRef(display);
  const memoryRef = useRef(memory);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    memoryRef.current = memory;
  }, [memory]);

  const evaluate = (expr: string) => {
    try {
      // Replace unicode symbols with JS operators
      const safe = expr.replace(/×/g, '*').replace(/÷/g, '/');
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${safe})`)();
      return typeof result === 'number' && Number.isFinite(result) ? String(result) : 'ERR';
    } catch {
      return 'ERR';
    }
  };

  const handleButton = (val: string) => {
    if (val === 'C') {
      setDisplay('0');
      setMemory(null);
      return;
    }

    if (val === '=') {
      const result = evaluate(displayRef.current);
      setDisplay(result);
      setMemory(result);
      return;
    }

    if (val === 'MS') {
      setMemory(displayRef.current);
      return;
    }

    if (val === 'MR') {
      if (memoryRef.current !== null) setDisplay(memoryRef.current);
      return;
    }

    setDisplay((prev) => {
      if (prev === 'ERR') return val;
      if (prev === '0' && /[0-9.]/.test(val)) return val;
      return prev + val;
    });
  };

  const clearEntry = () => setDisplay('0');

  const backspace = () => {
    setDisplay((prev) => {
      if (prev === 'ERR' || prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleKey = (event: KeyboardEvent) => {
    const key = event.key;
    const isNum = /^[0-9]$/.test(key);
    const isOperator = ['+', '-', '*', '/'].includes(key);
    const isDot = key === '.';
    const isEnter = key === 'Enter';
    const isBackspace = key === 'Backspace';
    const isEscape = key === 'Escape';

    if (isNum) {
      event.preventDefault();
      handleButton(key);
      return;
    }

    if (isOperator) {
      event.preventDefault();
      const mapped = key === '*' ? '×' : key === '/' ? '÷' : key;
      handleButton(mapped);
      return;
    }

    if (isDot) {
      event.preventDefault();
      handleButton('.');
      return;
    }

    if (isEnter) {
      event.preventDefault();
      handleButton('=');
      return;
    }

    if (isBackspace) {
      event.preventDefault();
      backspace();
      return;
    }

    if (isEscape) {
      event.preventDefault();
      clearEntry();
      return;
    }

    // Numpad support
    if (event.code.startsWith('Numpad')) {
      event.preventDefault();
      const n = event.code.replace('Numpad', '');
      if (/^[0-9]$/.test(n)) {
        handleButton(n);
      } else if (n === 'Decimal') {
        handleButton('.');
      } else if (n === 'Add') {
        handleButton('+');
      } else if (n === 'Subtract') {
        handleButton('-');
      } else if (n === 'Multiply') {
        handleButton('×');
      } else if (n === 'Divide') {
        handleButton('÷');
      } else if (n === 'Enter') {
        handleButton('=');
      }
    }
  };

  useEffect(() => {
    if (!focused) return;
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [focused]);

  useEffect(() => {
    if (isFocused) {
      containerRef.current?.focus();
      setFocused(true);
    }
  }, [isFocused]);

  const hasError = display === 'ERR';

  const displayText = useMemo(() => {
    if (hasError) return 'ERR';
    return display;
  }, [display, hasError]);

  return (
    <WidgetWrapper title="CALCULATOR" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      <div
        ref={containerRef}
        tabIndex={0}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={() => setFocused(false)}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>MEM: {memory ?? '—'}</span>
          <button className="topbar-btn" style={{ padding: '2px 6px', fontSize: 10 }} onClick={clearEntry}>
            CE
          </button>
        </div>

        <div
          style={{
            background: 'hsl(var(--bg-primary))',
            border: '1px solid hsl(var(--accent-dim))',
            padding: '10px',
            borderRadius: 4,
            fontFamily: 'VT323, monospace',
            fontSize: 24,
            color: 'hsl(var(--text-primary))',
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            overflow: 'hidden',
          }}
        >
          {displayText}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          <button className="topbar-btn" style={{ fontSize: 11 }} onClick={() => handleButton('C')}>
            C
          </button>
          <button className="topbar-btn" style={{ fontSize: 11 }} onClick={() => handleButton('MS')}>
            MS
          </button>
          <button className="topbar-btn" style={{ fontSize: 11 }} onClick={() => handleButton('MR')}>
            MR
          </button>
          <button className="topbar-btn" style={{ fontSize: 11 }} onClick={() => handleButton('÷')}>
            ÷
          </button>

          {BUTTONS.flat().map((label) => (
            <button
              key={label}
              className="topbar-btn"
              style={{ fontSize: 14 }}
              onClick={() => handleButton(label)}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>
          Basic calculator with memory store/recall. Works with all themes.
        </div>
      </div>
    </WidgetWrapper>
  );
};

export default CalculatorWidget;
