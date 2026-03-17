import { useEffect, useMemo, useRef, useState } from 'react';
import WidgetWrapper from '../WidgetWrapper';

interface WidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  isFocused?: boolean;
}

type ConversionCategory = 'length' | 'mass' | 'volume' | 'temperature' | 'time';

const CATEGORY_LABELS: Record<ConversionCategory, string> = {
  length: 'Length',
  mass: 'Mass',
  volume: 'Volume',
  temperature: 'Temperature',
  time: 'Time',
};

const UNIT_MAP: Record<ConversionCategory, Record<string, number>> = {
  length: {
    m: 1,
    km: 1000,
    cm: 0.01,
    mm: 0.001,
    in: 0.0254,
    ft: 0.3048,
    yd: 0.9144,
    mi: 1609.344,
  },
  mass: {
    kg: 1,
    g: 0.001,
    mg: 1e-6,
    lb: 0.45359237,
    oz: 0.028349523125,
  },
  volume: {
    L: 1,
    mL: 0.001,
    gal: 3.785411784,
    qt: 0.946352946,
    pt: 0.473176473,
    cup: 0.24,
    fl_oz: 0.0295735295625,
  },
  temperature: {
    // Temperature uses special formulas, map is only for label order
    C: 1,
    F: 1,
    K: 1,
  },
  time: {
    s: 1,
    min: 60,
    hr: 3600,
    day: 86400,
  },
};

const expandUnits = (category: ConversionCategory) => Object.keys(UNIT_MAP[category]);

const convert = (category: ConversionCategory, value: number, from: string, to: string) => {
  if (Number.isNaN(value)) return NaN;

  if (category === 'temperature') {
    const toCelsius = (v: number, u: string) => {
      if (u === 'C') return v;
      if (u === 'F') return (v - 32) * (5 / 9);
      if (u === 'K') return v - 273.15;
      return v;
    };
    const fromCelsius = (v: number, u: string) => {
      if (u === 'C') return v;
      if (u === 'F') return v * (9 / 5) + 32;
      if (u === 'K') return v + 273.15;
      return v;
    };
    const c = toCelsius(value, from);
    return fromCelsius(c, to);
  }

  const factors = UNIT_MAP[category];
  const fromFactor = factors[from];
  const toFactor = factors[to];
  if (fromFactor == null || toFactor == null) return NaN;

  const base = value * fromFactor;
  return base / toFactor;
};

const UnitConverterWidget = ({ onClose, onFullscreen, isFullscreen, isFocused }: WidgetProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [category, setCategory] = useState<ConversionCategory>('length');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('km');
  const [input, setInput] = useState('1');

  useEffect(() => {
    if (isFocused) {
      containerRef.current?.focus();
    }
  }, [isFocused]);

  const units = useMemo(() => expandUnits(category), [category]);

  const normalizedInput = useMemo(() => {
    const n = parseFloat(input);
    return Number.isFinite(n) ? n : 0;
  }, [input]);

  const result = useMemo(() => {
    const value = convert(category, normalizedInput, fromUnit, toUnit);
    if (!Number.isFinite(value)) return 'ERR';
    return value.toLocaleString(undefined, { maximumFractionDigits: 10 });
  }, [category, normalizedInput, fromUnit, toUnit]);

  const handleCategoryChange = (cat: ConversionCategory) => {
    setCategory(cat);
    const available = expandUnits(cat);
    setFromUnit(available[0]);
    setToUnit(available[1] ?? available[0]);
  };

  const handleSwap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  return (
    <WidgetWrapper title="UNIT CONVERTER" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      <div ref={containerRef} tabIndex={0} style={{ outline: 'none' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`topbar-btn ${category === key ? 'active' : ''}`}
              style={{ fontSize: 10, flex: 1 }}
              onClick={() => handleCategoryChange(key as ConversionCategory)}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
          <input
            className="crt-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ flex: 1, padding: '8px 10px', fontSize: 14 }}
          />
          <button className="topbar-btn" style={{ fontSize: 10, width: 40 }} onClick={handleSwap}>
            ⇄
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
          <select
            className="crt-input"
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value)}
            style={{ flex: 1 }}
          >
            {units.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          <span style={{ fontSize: 12, color: 'hsl(var(--text-dim))', width: 16, textAlign: 'center' }}>→</span>

          <select
            className="crt-input"
            value={toUnit}
            onChange={(e) => setToUnit(e.target.value)}
            style={{ flex: 1 }}
          >
            {units.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div style={{
          background: 'hsl(var(--bg-primary))',
          border: '1px solid hsl(var(--accent-dim))',
          padding: '10px',
          borderRadius: 4,
          fontFamily: 'VT323, monospace',
          fontSize: 22,
          color: 'hsl(var(--accent-bright))',
          minHeight: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ opacity: 0.7 }}>{normalizedInput.toLocaleString()}</span>
          <span style={{ fontSize: 28, fontWeight: 700 }}>{result}</span>
        </div>

        <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginTop: 8 }}>
          Convert between common units. Type a number, change units, or swap direction.
        </div>
      </div>
    </WidgetWrapper>
  );
};

export default UnitConverterWidget;
