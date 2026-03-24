// ============================================================
// src/effects/XPFloatLayer.tsx
// ============================================================
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface XPFloat {
  id: number;
  x: number;
  y: number;
  text: string;
  large?: boolean;
}

let floatId = 0;
const listeners: ((f: XPFloat) => void)[] = [];

export const triggerXPFloat = (
  x: number,
  y: number,
  amount: number,
  multiplier?: number,
  large?: boolean
) => {
  if (amount <= 0) return;
  const total = multiplier && multiplier !== 1 ? Math.round(amount * multiplier) : amount;
  const text  = multiplier && multiplier !== 1
    ? `+${amount} XP  ×${multiplier}  =  +${total} XP`
    : `+${total} XP`;

  const float: XPFloat = {
    id: floatId++,
    x,
    y,
    text: large ? `${text}  ★` : text,
    large,
  };
  listeners.forEach(fn => fn(float));
};

const XPFloatLayer = () => {
  const [floats, setFloats] = useState<XPFloat[]>([]);

  useEffect(() => {
    const handler = (f: XPFloat) => {
      setFloats(prev => [...prev, f]);
      setTimeout(() => {
        setFloats(prev => prev.filter(p => p.id !== f.id));
      }, f.large ? 1800 : 1400);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  if (floats.length === 0) return null;

  return createPortal(
    <>
      {floats.map(f => (
        <div
          key={f.id}
          style={{
            position: 'fixed',
            left: f.x,
            top: f.y,
            transform: 'translateX(-50%)',
            fontFamily: "'VT323', monospace",
            fontSize: f.large ? 22 : 16,
            color: 'hsl(var(--accent))',
            textShadow: '0 0 8px hsla(var(--accent-glow) / 0.8), 0 0 16px hsla(var(--accent-glow) / 0.4)',
            pointerEvents: 'none',
            zIndex: 99999,
            whiteSpace: 'nowrap',
            animation: `xpFloat ${f.large ? 1.8 : 1.4}s ease-out forwards`,
          }}
        >
          {f.text}
        </div>
      ))}
      <style>{`
        @keyframes xpFloat {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-52px); }
        }
      `}</style>
    </>,
    document.body
  );
};

export default XPFloatLayer;