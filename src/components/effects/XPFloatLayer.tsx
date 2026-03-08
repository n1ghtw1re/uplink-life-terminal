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
  const total = multiplier ? Math.round(amount * multiplier) : amount;
  const text = multiplier && multiplier !== 1
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
          className={`xp-float ${f.large ? 'xp-float-large' : ''}`}
          style={{
            left: f.x,
            top: f.y,
            transform: 'translateX(-50%)',
          }}
        >
          {f.text}
        </div>
      ))}
    </>,
    document.body
  );
};

export default XPFloatLayer;
