import { useState } from 'react';

// ─── DATA ─────────────────────────────────────────────────────────────────────

const PRIMARY   = 'ROCKERBOY';
const SECONDARY = 'WITCH';

const CLASSES = [
  { name: 'NETRUNNER',  value: 0.12, rare: false },
  { name: 'TECHIE',     value: 0.06, rare: false },
  { name: 'EDGERUNNER', value: 0.04, rare: false },
  { name: 'SOLO',       value: 0.02, rare: false },
  { name: 'NOMAD',      value: 0.02, rare: false },
  { name: 'MEDTECH',    value: 0.08, rare: false },
  { name: 'FIXER',      value: 0.14, rare: false },
  { name: 'EXEC',       value: 0.03, rare: false },
  { name: 'ROCKERBOY',  value: 0.42, rare: false },
  { name: 'AGITATOR',   value: 0.28, rare: false },
  { name: 'WITCH',      value: 0.35, rare: false },
  { name: 'SIGNAL',     value: 0.24, rare: false },
  { name: 'HERALD',     value: 0.19, rare: true  },
  { name: 'PROPHET',    value: 0.07, rare: true  },
  { name: 'AGITPROP',   value: 0.01, rare: true  },
];

const SORTED = [...CLASSES].sort((a, b) => b.value - a.value);

// ─── RADAR GEOMETRY ───────────────────────────────────────────────────────────

const N   = 15;
const CX  = 250;
const CY  = 250;
const CR  = 190;  // chart radius (outer ring)
const LR  = 238;  // label radius (outside ring)

// Cartesian point on a spoke at a given value (0–1)
function pt(index: number, value: number) {
  const a = (2 * Math.PI * index / N) - (Math.PI / 2);
  return { x: CX + CR * value * Math.cos(a), y: CY + CR * value * Math.sin(a) };
}

// Label position outside the ring
function lpt(index: number) {
  const a = (2 * Math.PI * index / N) - (Math.PI / 2);
  return { x: CX + LR * Math.cos(a), y: CY + LR * Math.sin(a) };
}

// SVG text-anchor based on x position
function anc(index: number) {
  const x = Math.cos((2 * Math.PI * index / N) - (Math.PI / 2));
  if (x < -0.15) return 'end';
  if (x >  0.15) return 'start';
  return 'middle';
}

// Polygon points string for a concentric grid ring
function ring(scale: number) {
  return Array.from({ length: N }, (_, i) => {
    const p = pt(i, scale);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
}

// Affinity polygon points string
function poly() {
  return CLASSES.map((cls, i) => {
    const p = pt(i, Math.max(cls.value, 0.05));
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
}

// ─── RADAR COMPONENT ──────────────────────────────────────────────────────────

const Radar = ({ hovered, onHover }: { hovered: string | null; onHover: (n: string | null) => void }) => (
  <svg
    viewBox="-55 -55 610 610"
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    style={{ overflow: 'visible', display: 'block' }}
  >
    {/* Grid rings */}
    {[0.2, 0.4, 0.6, 0.8, 1.0].map(s => (
      <polygon key={s} points={ring(s)} fill="none"
        stroke={s === 1.0 ? '#3a2000' : '#261600'}
        strokeWidth={s === 1.0 ? 1.5 : 0.8}
      />
    ))}

    {/* Spokes */}
    {CLASSES.map((_, i) => {
      const o = pt(i, 1.0);
      return <line key={i} x1={CX} y1={CY} x2={o.x} y2={o.y} stroke="#261600" strokeWidth={0.6} />;
    })}

    {/* Affinity polygon */}
    <polygon
      points={poly()}
      fill="rgba(255,176,0,0.13)"
      stroke="#ffb000"
      strokeWidth={2}
      strokeLinejoin="round"
      style={{ filter: 'drop-shadow(0 0 6px rgba(255,176,0,0.55))' }}
    />

    {/* Data dots */}
    {CLASSES.map((cls, i) => {
      const p    = pt(i, Math.max(cls.value, 0.05));
      const isPri = cls.name === PRIMARY;
      const isSec = cls.name === SECONDARY;
      const isHov = hovered === cls.name;
      const r    = isPri ? 6 : isSec ? 5 : cls.rare ? 4 : 3;
      const fill = isPri ? '#ffd060' : isSec ? '#ffb000' : cls.rare ? '#cc8800' : '#886600';
      return (
        <circle key={cls.name} cx={p.x} cy={p.y} r={isHov ? r + 2 : r} fill={fill}
          style={{ filter: isHov || isPri ? 'drop-shadow(0 0 6px rgba(255,208,96,1))' : 'drop-shadow(0 0 3px rgba(255,176,0,0.5))', cursor: 'pointer' }}
          onMouseEnter={() => onHover(cls.name)}
          onMouseLeave={() => onHover(null)}
        />
      );
    })}

    {/* Labels */}
    {CLASSES.map((cls, i) => {
      const pos   = lpt(i);
      const isPri = cls.name === PRIMARY;
      const isSec = cls.name === SECONDARY;
      const isHov = hovered === cls.name;
      const fill  = isPri ? '#ffd060' : isSec ? '#ffb000' : isHov ? '#ffb000' : cls.rare ? '#aa7700' : '#665500';
      const size  = isPri ? 12 : isSec ? 11 : 9;
      return (
        <text key={cls.name} x={pos.x} y={pos.y}
          textAnchor={anc(i)} dominantBaseline="middle"
          fill={fill} fontSize={size}
          fontWeight={isPri ? 'bold' : 'normal'}
          fontFamily="'IBM Plex Mono', monospace"
          style={{ filter: isPri || isHov ? 'drop-shadow(0 0 4px rgba(255,208,96,0.9))' : 'none', cursor: 'pointer' }}
          onMouseEnter={() => onHover(cls.name)}
          onMouseLeave={() => onHover(null)}
        >
          {cls.name}{cls.rare ? ' ✦' : ''}
        </text>
      );
    })}

    {/* Centre dot */}
    <circle cx={CX} cy={CY} r={3} fill="#ffb000" opacity={0.4} />

    {/* Hover tooltip */}
    {hovered && (() => {
      const cls = CLASSES.find(d => d.name === hovered);
      if (!cls) return null;
      return (
        <g>
          <rect x={CX - 52} y={CY - 14} width={104} height={20}
            fill="#1a0f00" stroke="#ffb000" strokeWidth={0.8} rx={1} />
          <text x={CX} y={CY - 4} textAnchor="middle" dominantBaseline="middle"
            fill="#ffd060" fontSize={9} fontFamily="'IBM Plex Mono', monospace">
            {cls.name}  {Math.round(cls.value * 100)}%
          </text>
        </g>
      );
    })()}
  </svg>
);

// ─── PAGE 2 ───────────────────────────────────────────────────────────────────

const CharSheetPage2 = () => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>

      {/* ── LEFT — RADAR ─────────────────────────────────────────── */}
      <div className="char-sheet-left" style={{
        flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 12 }}>
          // CLASS AFFINITY
        </div>

        {/* Radar fills remaining space */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <Radar hovered={hovered} onHover={setHovered} />
        </div>

        {/* Primary / secondary + last shift */}
        <div style={{ borderTop: '1px solid #261600', paddingTop: 10, marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 32, marginBottom: 6 }}>
            <div>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>PRIMARY: </span>
              <span className="font-display" style={{ fontSize: 16, color: 'hsl(var(--accent-bright))' }}>
                {PRIMARY}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>SECONDARY: </span>
              <span className="font-display" style={{ fontSize: 16, color: 'hsl(var(--accent-bright))' }}>
                {SECONDARY}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 9, color: 'hsl(41 100% 18%)' }}>
            LAST SHIFT: 3 DAYS AGO — WAS: SIGNAL // WITCH
          </div>
        </div>
      </div>

      {/* ── RIGHT — BREAKDOWN ────────────────────────────────────── */}
      <div className="char-sheet-right" style={{
        flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 12 }}>
          // CLASS BREAKDOWN
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {SORTED.map(cls => {
            const isPri = cls.name === PRIMARY;
            const isSec = cls.name === SECONDARY;
            const isHov = hovered === cls.name;
            const isLow = cls.value < 0.05;
            const pct   = Math.round(cls.value * 100);

            const nameColor = isPri || isHov
              ? 'hsl(var(--accent-bright))'
              : isLow ? 'hsl(41 100% 25%)' : 'hsl(var(--accent))';

            return (
              <div key={cls.name}
                style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: isLow && !isHov ? 0.5 : 1, cursor: 'pointer' }}
                onMouseEnter={() => setHovered(cls.name)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Arrow indicator */}
                <span style={{ width: 10, fontSize: 8, color: 'hsl(var(--accent-bright))' }}>
                  {isPri ? '▶' : isSec ? '▷' : ''}
                </span>

                {/* Name */}
                <span style={{
                  fontSize: isPri ? 11 : 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: nameColor,
                  width: 95, flexShrink: 0,
                }}>
                  {cls.name}{cls.rare ? ' ✦' : ''}
                </span>

                {/* Bar */}
                <div style={{ flex: 1, height: 4, background: 'hsl(30 100% 9%)', position: 'relative' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: isPri ? 'hsl(var(--accent-bright))' : 'hsl(var(--accent))',
                    boxShadow: isPri || isHov ? '0 0 6px rgba(255,176,0,0.6)' : '0 0 3px rgba(255,176,0,0.3)',
                  }} />
                </div>

                {/* Percentage */}
                <span style={{
                  fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                  color: isLow ? 'hsl(41 100% 20%)' : 'hsl(var(--text-dim))',
                  width: 28, textAlign: 'right', flexShrink: 0,
                }}>
                  {pct}%
                </span>

                {/* Tag */}
                {isPri && <span className="multiplier-tag" style={{ fontSize: 8 }}>PRIMARY</span>}
                {isSec && <span className="multiplier-tag" style={{ fontSize: 8 }}>SECONDARY</span>}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ fontSize: 9, color: 'hsl(41 100% 18%)', marginTop: 10, lineHeight: 1.8 }}>
          ✦ = RARE CLASS &nbsp;&nbsp; ▶ = PRIMARY &nbsp;&nbsp; ▷ = SECONDARY
        </div>
      </div>

    </div>
  );
};

export default CharSheetPage2;
