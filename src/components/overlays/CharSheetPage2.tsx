import { useState } from 'react';

// ─── DATA ─────────────────────────────────────────────────────────────────────

const PRIMARY   = 'ROCKERBOY';
const SECONDARY = 'WITCH';

// Order MUST be clockwise from 12 o'clock — this determines where each
// class appears on the radar. Do not reorder.
const CLASSES = [
  { name: 'NETRUNNER',  value: 0.12, rare: false },  // 0 — top
  { name: 'TECHIE',     value: 0.06, rare: false },  // 1 — top-right
  { name: 'EDGERUNNER', value: 0.04, rare: false },  // 2
  { name: 'SOLO',       value: 0.02, rare: false },  // 3 — right
  { name: 'NOMAD',      value: 0.02, rare: false },  // 4
  { name: 'MEDTECH',    value: 0.08, rare: false },  // 5
  { name: 'FIXER',      value: 0.14, rare: false },  // 6 — bottom-right
  { name: 'EXEC',       value: 0.03, rare: false },  // 7
  { name: 'ROCKERBOY',  value: 0.42, rare: false },  // 8 — bottom
  { name: 'AGITATOR',   value: 0.28, rare: false },  // 9
  { name: 'WITCH',      value: 0.35, rare: false },  // 10 — left
  { name: 'SIGNAL',     value: 0.24, rare: false },  // 11
  { name: 'HERALD',     value: 0.19, rare: true  },  // 12 — top-left
  { name: 'PROPHET',    value: 0.07, rare: true  },  // 13
  { name: 'AGITPROP',   value: 0.01, rare: true  },  // 14
];

const SORTED = [...CLASSES].sort((a, b) => b.value - a.value);

// ─── RADAR GEOMETRY ───────────────────────────────────────────────────────────

const N  = 15;    // number of classes
const CX = 250;   // SVG centre x
const CY = 250;   // SVG centre y
const CR = 185;   // outer ring radius
const LR = 232;   // label ring radius (outside chart)

function spokePoint(index: number, value: number) {
  const angle = (2 * Math.PI * index / N) - (Math.PI / 2);
  return {
    x: CX + CR * value * Math.cos(angle),
    y: CY + CR * value * Math.sin(angle),
  };
}

function labelPoint(index: number) {
  const angle = (2 * Math.PI * index / N) - (Math.PI / 2);
  return {
    x: CX + LR * Math.cos(angle),
    y: CY + LR * Math.sin(angle),
  };
}

function textAnchor(index: number): 'start' | 'end' | 'middle' {
  const x = Math.cos((2 * Math.PI * index / N) - (Math.PI / 2));
  if (x < -0.2) return 'end';
  if (x >  0.2) return 'start';
  return 'middle';
}

function gridRingPoints(scale: number): string {
  return Array.from({ length: N }, (_, i) => {
    const p = spokePoint(i, scale);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
}

function affinityPoints(): string {
  return CLASSES.map((cls, i) => {
    const p = spokePoint(i, Math.max(cls.value, 0.05));
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
}

// ─── RADAR SVG ────────────────────────────────────────────────────────────────

const Radar = ({
  hovered,
  onHover,
}: {
  hovered: string | null;
  onHover: (n: string | null) => void;
}) => (
  <svg
    viewBox="-60 -60 620 640"
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    style={{ overflow: 'visible', display: 'block' }}
  >
    {/* Grid rings */}
    {[0.2, 0.4, 0.6, 0.8, 1.0].map(s => (
      <polygon key={s} points={gridRingPoints(s)} fill="none"
        stroke={s === 1.0 ? '#3a2000' : '#261600'}
        strokeWidth={s === 1.0 ? 1.5 : 0.8}
      />
    ))}

    {/* Spokes */}
    {CLASSES.map((_, i) => {
      const o = spokePoint(i, 1.0);
      return <line key={i} x1={CX} y1={CY} x2={o.x} y2={o.y} stroke="#261600" strokeWidth={0.6} />;
    })}

    {/* Affinity polygon */}
    <polygon
      points={affinityPoints()}
      fill="rgba(255,176,0,0.13)"
      stroke="#ffb000"
      strokeWidth={2}
      strokeLinejoin="round"
      style={{ filter: 'drop-shadow(0 0 6px rgba(255,176,0,0.55))' }}
    />

    {/* Data dots */}
    {CLASSES.map((cls, i) => {
      const p     = spokePoint(i, Math.max(cls.value, 0.05));
      const isPri = cls.name === PRIMARY;
      const isSec = cls.name === SECONDARY;
      const isHov = hovered === cls.name;
      const r     = isPri ? 6 : isSec ? 5 : cls.rare ? 4 : 3;
      const fill  = isPri ? '#ffd060' : isSec ? '#ffb000' : cls.rare ? '#cc8800' : '#886600';
      return (
        <circle key={cls.name} cx={p.x} cy={p.y} r={isHov ? r + 2 : r} fill={fill}
          style={{
            filter: isHov || isPri ? 'drop-shadow(0 0 6px rgba(255,208,96,1))' : 'drop-shadow(0 0 3px rgba(255,176,0,0.5))',
            cursor: 'pointer',
          }}
          onMouseEnter={() => onHover(cls.name)}
          onMouseLeave={() => onHover(null)}
        />
      );
    })}

    {/* Labels */}
    {CLASSES.map((cls, i) => {
      const pos   = labelPoint(i);
      const isPri = cls.name === PRIMARY;
      const isSec = cls.name === SECONDARY;
      const isHov = hovered === cls.name;
      const fill  = isPri ? '#ffd060' : isSec ? '#ffb000' : isHov ? '#ffb000' : cls.rare ? '#aa7700' : '#665500';
      const size  = isPri ? 12 : isSec ? 11 : 9;
      return (
        <text key={cls.name} x={pos.x} y={pos.y}
          textAnchor={textAnchor(i)} dominantBaseline="middle"
          fill={fill} fontSize={size}
          fontWeight={isPri ? 'bold' : 'normal'}
          fontFamily="'IBM Plex Mono', monospace"
          style={{
            filter: isPri || isHov ? 'drop-shadow(0 0 4px rgba(255,208,96,0.9))' : 'none',
            cursor: 'pointer',
          }}
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
    <div style={{ display: 'flex', height: '100%', gap: 0, overflow: 'hidden' }}>

      {/* LEFT — RADAR */}
      <div className="char-sheet-left" style={{
        flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 8, flexShrink: 0 }}>
          // CLASS AFFINITY
        </div>

        {/* flex: 1 + minHeight: 0 — lets SVG fill available space without overflowing */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Radar hovered={hovered} onHover={setHovered} />
        </div>

        {/* Primary / Secondary display */}
        <div style={{ borderTop: '1px solid #261600', paddingTop: 8, marginTop: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 24, marginBottom: 4 }}>
            <div>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>PRIMARY: </span>
              <span className="font-display" style={{ fontSize: 15, color: 'hsl(var(--accent-bright))' }}>
                {PRIMARY}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>SECONDARY: </span>
              <span className="font-display" style={{ fontSize: 15, color: 'hsl(var(--accent-bright))' }}>
                {SECONDARY}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 9, color: 'hsl(41 100% 18%)' }}>
            LAST SHIFT: 3 DAYS AGO — WAS: SIGNAL // WITCH
          </div>
        </div>
      </div>

      {/* RIGHT — BREAKDOWN */}
      <div className="char-sheet-right" style={{
        flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 8, flexShrink: 0 }}>
          // CLASS BREAKDOWN
        </div>

        {/* space-between evenly distributes all 15 rows across full height */}
        <div style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
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
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  opacity: isLow && !isHov ? 0.45 : 1,
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHovered(cls.name)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Arrow */}
                <span style={{ width: 8, fontSize: 7, color: 'hsl(var(--accent-bright))', flexShrink: 0 }}>
                  {isPri ? '▶' : isSec ? '▷' : ''}
                </span>

                {/* Name */}
                <span style={{
                  fontSize: isPri ? 10 : 9,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: nameColor,
                  width: 88, flexShrink: 0, lineHeight: 1,
                }}>
                  {cls.name}{cls.rare ? ' ✦' : ''}
                </span>

                {/* Bar track */}
                <div style={{ flex: 1, height: 3, background: 'hsl(30 100% 9%)', position: 'relative' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: isPri ? 'hsl(var(--accent-bright))' : 'hsl(var(--accent))',
                    boxShadow: isPri || isHov ? '0 0 5px rgba(255,176,0,0.6)' : '0 0 2px rgba(255,176,0,0.25)',
                  }} />
                </div>

                {/* Percentage */}
                <span style={{
                  fontSize: 9, fontFamily: "'IBM Plex Mono', monospace",
                  color: isLow ? 'hsl(41 100% 20%)' : 'hsl(var(--text-dim))',
                  width: 24, textAlign: 'right', flexShrink: 0, lineHeight: 1,
                }}>
                  {pct}%
                </span>

                {/* Tags */}
                {isPri && <span className="multiplier-tag" style={{ fontSize: 7, flexShrink: 0 }}>PRIMARY</span>}
                {isSec && <span className="multiplier-tag" style={{ fontSize: 7, flexShrink: 0 }}>SECONDARY</span>}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ fontSize: 8, color: 'hsl(41 100% 18%)', marginTop: 6, flexShrink: 0, lineHeight: 1.6 }}>
          ✦ = RARE CLASS &nbsp;&nbsp; ▶ = PRIMARY &nbsp;&nbsp; ▷ = SECONDARY
        </div>
      </div>

    </div>
  );
};

export default CharSheetPage2;
