import React, { useState } from 'react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ClassData {
  name: string;
  value: number;   // 0.0 → 1.0
  rare: boolean;
  primary?: boolean;
  secondary?: boolean;
}

interface RadarChartProps {
  data?: ClassData[];
  width?: number;
  height?: number;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const DEFAULT_DATA: ClassData[] = [
  { name: 'NETRUNNER',  value: 0.12, rare: false },
  { name: 'TECHIE',     value: 0.06, rare: false },
  { name: 'EDGERUNNER', value: 0.04, rare: false },
  { name: 'SOLO',       value: 0.02, rare: false },
  { name: 'NOMAD',      value: 0.02, rare: false },
  { name: 'MEDTECH',    value: 0.08, rare: false },
  { name: 'FIXER',      value: 0.14, rare: false },
  { name: 'EXEC',       value: 0.03, rare: false },
  { name: 'ROCKERBOY',  value: 0.42, rare: false, primary: true },
  { name: 'AGITATOR',   value: 0.28, rare: false },
  { name: 'WITCH',      value: 0.35, rare: false, secondary: true },
  { name: 'SIGNAL',     value: 0.24, rare: false },
  { name: 'HERALD',     value: 0.19, rare: true  },
  { name: 'PROPHET',    value: 0.07, rare: true  },
  { name: 'AGITPROP',   value: 0.01, rare: true  },
];

// ─── GEOMETRY HELPERS ─────────────────────────────────────────────────────────

const NUM_CLASSES = 15;

// Convert polar coordinates to cartesian
// index: 0-14, value: 0.0-1.0, radius: max radius in px
const polarToCartesian = (
  index: number,
  value: number,
  radius: number,
  cx: number,
  cy: number
): { x: number; y: number } => {
  // Start at top (−90°), go clockwise
  const angle = (2 * Math.PI * index / NUM_CLASSES) - (Math.PI / 2);
  return {
    x: cx + radius * value * Math.cos(angle),
    y: cy + radius * value * Math.sin(angle),
  };
};

// Get outer label position (beyond the chart radius)
const getLabelPosition = (
  index: number,
  labelRadius: number,
  cx: number,
  cy: number
): { x: number; y: number } => {
  const angle = (2 * Math.PI * index / NUM_CLASSES) - (Math.PI / 2);
  return {
    x: cx + labelRadius * Math.cos(angle),
    y: cy + labelRadius * Math.sin(angle),
  };
};

// Determine SVG text-anchor based on horizontal position
const getTextAnchor = (index: number): string => {
  const angle = (2 * Math.PI * index / NUM_CLASSES) - (Math.PI / 2);
  const x = Math.cos(angle);
  if (x < -0.2) return 'end';
  if (x > 0.2)  return 'start';
  return 'middle';
};

// Build a polygon points string for a grid ring
const buildGridRing = (
  scale: number,
  chartRadius: number,
  cx: number,
  cy: number
): string => {
  return Array.from({ length: NUM_CLASSES }, (_, i) => {
    const pt = polarToCartesian(i, scale, chartRadius, cx, cy);
    return `${pt.x},${pt.y}`;
  }).join(' ');
};

// Build the affinity polygon points string
const buildAffinityPolygon = (
  data: ClassData[],
  chartRadius: number,
  cx: number,
  cy: number
): string => {
  return data.map((cls, i) => {
    // Ensure minimum visibility for very low values
    const value = Math.max(cls.value, 0.04);
    const pt = polarToCartesian(i, value, chartRadius, cx, cy);
    return `${pt.x},${pt.y}`;
  }).join(' ');
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const RadarChart: React.FC<RadarChartProps> = ({
  data = DEFAULT_DATA,
  width = 500,
  height = 500,
}) => {
  const [hoveredClass, setHoveredClass] = useState<string | null>(null);

  // Chart geometry constants
  const cx = width / 2;
  const cy = height / 2;
  const chartRadius = Math.min(width, height) * 0.36;  // 36% of size = good fill
  const labelRadius  = Math.min(width, height) * 0.47; // labels sit outside ring

  // Grid ring scales
  const gridRings = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <svg
      viewBox={`-40 -40 ${width + 80} ${height + 80}`}
      width="100%"
      height="100%"
      style={{ overflow: 'visible', display: 'block' }}
    >
      {/* ── GRID RINGS ──────────────────────────────────────────────────── */}
      {gridRings.map((scale) => (
        <polygon
          key={`ring-${scale}`}
          points={buildGridRing(scale, chartRadius, cx, cy)}
          fill="none"
          stroke="#261600"
          strokeWidth={scale === 1.0 ? 1.5 : 1}
          opacity={scale === 1.0 ? 0.8 : 0.5}
        />
      ))}

      {/* ── GRID SPOKES ─────────────────────────────────────────────────── */}
      {data.map((_, i) => {
        const outer = polarToCartesian(i, 1.0, chartRadius, cx, cy);
        return (
          <line
            key={`spoke-${i}`}
            x1={cx} y1={cy}
            x2={outer.x} y2={outer.y}
            stroke="#261600"
            strokeWidth={0.5}
            opacity={0.6}
          />
        );
      })}

      {/* ── AFFINITY POLYGON ────────────────────────────────────────────── */}
      <polygon
        points={buildAffinityPolygon(data, chartRadius, cx, cy)}
        fill="rgba(255, 176, 0, 0.12)"
        stroke="#ffb000"
        strokeWidth={1.5}
        style={{
          filter: 'drop-shadow(0 0 5px rgba(255, 176, 0, 0.7))',
          transformOrigin: `${cx}px ${cy}px`,
          animation: 'radarDraw 500ms ease-out forwards',
        }}
      />

      {/* ── DATA POINTS ─────────────────────────────────────────────────── */}
      {data.map((cls, i) => {
        const value = Math.max(cls.value, 0.04);
        const pt = polarToCartesian(i, value, chartRadius, cx, cy);
        const isHovered = hoveredClass === cls.name;
        const r = cls.primary ? 5 : cls.secondary ? 4 : cls.rare ? 4 : 3;
        const fill = cls.primary
          ? '#ffd060'
          : cls.secondary
          ? '#ffb000'
          : cls.rare
          ? '#ffb000'
          : '#996800';

        return (
          <circle
            key={`point-${i}`}
            cx={pt.x}
            cy={pt.y}
            r={isHovered ? r + 2 : r}
            fill={fill}
            style={{
              filter: isHovered || cls.primary
                ? 'drop-shadow(0 0 6px rgba(255, 176, 0, 1))'
                : 'drop-shadow(0 0 3px rgba(255, 176, 0, 0.5))',
              cursor: 'pointer',
              transition: 'r 150ms ease',
            }}
            onMouseEnter={() => setHoveredClass(cls.name)}
            onMouseLeave={() => setHoveredClass(null)}
          />
        );
      })}

      {/* ── CLASS LABELS ────────────────────────────────────────────────── */}
      {data.map((cls, i) => {
        const pos = getLabelPosition(i, labelRadius, cx, cy);
        const anchor = getTextAnchor(i);
        const isHovered = hoveredClass === cls.name;

        // Colour logic
        const fill = cls.primary
          ? '#ffd060'
          : cls.secondary
          ? '#ffb000'
          : isHovered
          ? '#ffb000'
          : cls.rare
          ? '#cc8800'
          : '#664400';

        const fontSize = cls.primary ? 11 : cls.secondary ? 10 : 9;

        return (
          <g
            key={`label-${i}`}
            onMouseEnter={() => setHoveredClass(cls.name)}
            onMouseLeave={() => setHoveredClass(null)}
            style={{ cursor: 'pointer' }}
          >
            <text
              x={pos.x}
              y={pos.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill={fill}
              fontSize={fontSize}
              fontFamily="'IBM Plex Mono', monospace"
              fontWeight={cls.primary ? 'bold' : 'normal'}
              style={{
                filter: cls.primary || isHovered
                  ? 'drop-shadow(0 0 4px rgba(255, 176, 0, 0.8))'
                  : 'none',
                transition: 'fill 150ms ease',
              }}
            >
              {cls.name}{cls.rare ? ' ✦' : ''}
            </text>
          </g>
        );
      })}

      {/* ── CENTRE DOT ──────────────────────────────────────────────────── */}
      <circle
        cx={cx} cy={cy} r={3}
        fill="#ffb000"
        opacity={0.5}
      />

      {/* ── HOVER TOOLTIP ───────────────────────────────────────────────── */}
      {hoveredClass && (() => {
        const cls = data.find(d => d.name === hoveredClass);
        if (!cls) return null;
        return (
          <g transform={`translate(${cx - 40}, ${cy + chartRadius + 20})`}>
            <rect
              x={0} y={0} width={80} height={22}
              fill="#1a0f00"
              stroke="#ffb000"
              strokeWidth={0.5}
              rx={1}
            />
            <text
              x={40} y={11}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffd060"
              fontSize={9}
              fontFamily="'IBM Plex Mono', monospace"
            >
              {cls.name}  {Math.round(cls.value * 100)}%
            </text>
          </g>
        );
      })()}
    </svg>
  );
};

export default RadarChart;

/*
  CSS to add to your global stylesheet or component:

  @keyframes radarDraw {
    from {
      opacity: 0;
      transform: scale(0.2);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
*/
