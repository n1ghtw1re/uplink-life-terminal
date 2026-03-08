import { useState } from 'react';

const CLASS_ORDER = [
  'NETRUNNER', 'TECHIE', 'EDGERUNNER', 'SOLO', 'NOMAD', 'MEDTECH',
  'FIXER', 'EXEC', 'ROCKERBOY', 'AGITATOR', 'WITCH', 'SIGNAL',
  'HERALD', 'PROPHET', 'AGITPROP',
] as const;

const RARE_CLASSES = new Set(['HERALD', 'PROPHET', 'AGITPROP']);

const affinityData: Record<string, number> = {
  NETRUNNER: 0.12, TECHIE: 0.06, EDGERUNNER: 0.04, SOLO: 0.02,
  NOMAD: 0.02, MEDTECH: 0.08, FIXER: 0.14, EXEC: 0.03,
  ROCKERBOY: 0.42, AGITATOR: 0.28, WITCH: 0.35, SIGNAL: 0.24,
  HERALD: 0.19, PROPHET: 0.07, AGITPROP: 0.01,
};

const PRIMARY = 'ROCKERBOY';
const SECONDARY = 'WITCH';

const SVG_SIZE = 500;
const CENTER_X = 250;
const CENTER_Y = 250;
const CHART_RADIUS = 160;
const LABEL_RADIUS = 195;
const NUM_CLASSES = 15;

const getRadarPoint = (index: number, value: number) => {
  const angle = (2 * Math.PI * index / NUM_CLASSES) - (Math.PI / 2);
  return { x: CENTER_X + CHART_RADIUS * value * Math.cos(angle), y: CENTER_Y + CHART_RADIUS * value * Math.sin(angle) };
};

const getLabelPoint = (index: number) => {
  const angle = (2 * Math.PI * index / NUM_CLASSES) - (Math.PI / 2);
  return { x: CENTER_X + LABEL_RADIUS * Math.cos(angle), y: CENTER_Y + LABEL_RADIUS * Math.sin(angle) };
};

const getGridRing = (scale: number) =>
  Array.from({ length: NUM_CLASSES }, (_, i) => {
    const angle = (2 * Math.PI * i / NUM_CLASSES) - (Math.PI / 2);
    return `${CENTER_X + CHART_RADIUS * scale * Math.cos(angle)},${CENTER_Y + CHART_RADIUS * scale * Math.sin(angle)}`;
  }).join(' ');

const getLabelAnchor = (index: number) => {
  const angle = (2 * Math.PI * index / NUM_CLASSES) - (Math.PI / 2);
  const x = Math.cos(angle);
  if (x < -0.3) return 'end';
  if (x > 0.3) return 'start';
  return 'middle';
};




// Sort classes by affinity descending
const sortedClasses = [...CLASS_ORDER].sort((a, b) => affinityData[b] - affinityData[a]);

const CharSheetPage2 = () => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* LEFT — RADAR */}
      <div className="char-sheet-left" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 16 }}>// CLASS AFFINITY</div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RadarChartFull hovered={hovered} onHover={setHovered} />
        </div>

        {/* Primary / Secondary */}
        <div style={{ borderTop: '1px solid hsl(30 100% 9%)', paddingTop: 12, marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 32, marginBottom: 8 }}>
            <div>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>PRIMARY: </span>
              <span className="font-display" style={{ fontSize: 16, color: 'hsl(var(--accent-bright))' }}>{PRIMARY}</span>
            </div>
            <div>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>SECONDARY: </span>
              <span className="font-display" style={{ fontSize: 16, color: 'hsl(var(--accent-bright))' }}>{SECONDARY}</span>
            </div>
          </div>
          <div style={{ fontSize: 9, color: 'hsl(41 100% 18%)' }}>
            LAST SHIFT: 3 DAYS AGO — WAS: SIGNAL // WITCH
          </div>
        </div>
      </div>

      {/* RIGHT — BREAKDOWN */}
      <div className="char-sheet-right" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 12 }}>// CLASS BREAKDOWN</div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {sortedClasses.map(cls => {
            const val = affinityData[cls];
            const pct = Math.round(val * 100);
            const isPrimary = cls === PRIMARY;
            const isSecondary = cls === SECONDARY;
            const isRare = RARE_CLASSES.has(cls);
            const isLow = val < 0.05;
            const isHov = hovered === cls;

            const nameColor = isPrimary || isHov
              ? 'hsl(var(--accent-bright))'
              : isLow ? 'hsl(41 100% 25%)' : 'hsl(var(--accent))';

            return (
              <div key={cls}
                style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: isLow && !isHov ? 0.6 : 1, cursor: 'pointer' }}
                onMouseEnter={() => setHovered(cls)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Indicator */}
                <span style={{ width: 10, fontSize: 8, color: 'hsl(var(--accent-bright))' }}>
                  {isPrimary ? '▶' : isSecondary ? '▷' : ''}
                </span>

                {/* Name */}
                <span style={{
                  fontSize: isPrimary ? 11 : 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: nameColor,
                  width: 90,
                  flexShrink: 0,
                }}>
                  {cls}{isRare ? ' ✦' : ''}
                </span>

                {/* Bar */}
                <div style={{
                  flex: 1,
                  height: 4,
                  background: 'hsl(30 100% 9%)',
                  position: 'relative',
                }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: isPrimary ? 'hsl(var(--accent-bright))' : 'hsl(var(--accent))',
                    boxShadow: isPrimary || isHov ? '0 0 6px hsl(var(--accent-glow) / 0.6)' : '0 0 4px hsl(var(--accent-glow) / 0.3)',
                  }} />
                </div>

                {/* Percentage */}
                <span style={{
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: isLow ? 'hsl(41 100% 20%)' : 'hsl(var(--text-dim))',
                  width: 30,
                  textAlign: 'right',
                  flexShrink: 0,
                }}>
                  {pct}%
                </span>

                {/* Tag */}
                {isPrimary && <span className="multiplier-tag" style={{ fontSize: 8 }}>PRIMARY</span>}
                {isSecondary && <span className="multiplier-tag" style={{ fontSize: 8 }}>SECONDARY</span>}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ fontSize: 9, color: 'hsl(41 100% 18%)', marginTop: 12, lineHeight: 1.8 }}>
          ✦ = RARE CLASS &nbsp;&nbsp; ▶ = PRIMARY &nbsp;&nbsp; ▷ = SECONDARY
        </div>
      </div>
    </div>
  );
};

// Full radar with corrected geometry and label spacing
const RadarChartFull = ({ hovered: _hovered, onHover: _onHover }: { hovered: string | null; onHover: (c: string | null) => void }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const NUM_CLASSES = 15;
  const SVG_WIDTH = 500;
  const SVG_HEIGHT = 500;
  const cx = SVG_WIDTH / 2;
  const cy = SVG_HEIGHT / 2;
  const chartRadius = 180;
  const labelRadius = 225;

  const affinityData = [
    { name: 'NETRUNNER', value: 0.12, rare: false, primary: false, secondary: false },
    { name: 'TECHIE', value: 0.06, rare: false, primary: false, secondary: false },
    { name: 'EDGERUNNER', value: 0.04, rare: false, primary: false, secondary: false },
    { name: 'SOLO', value: 0.02, rare: false, primary: false, secondary: false },
    { name: 'NOMAD', value: 0.02, rare: false, primary: false, secondary: false },
    { name: 'MEDTECH', value: 0.08, rare: false, primary: false, secondary: false },
    { name: 'FIXER', value: 0.14, rare: false, primary: false, secondary: false },
    { name: 'EXEC', value: 0.03, rare: false, primary: false, secondary: false },
    { name: 'ROCKERBOY', value: 0.42, rare: false, primary: true, secondary: false },
    { name: 'AGITATOR', value: 0.28, rare: false, primary: false, secondary: false },
    { name: 'WITCH', value: 0.35, rare: false, primary: false, secondary: true },
    { name: 'SIGNAL', value: 0.24, rare: false, primary: false, secondary: false },
    { name: 'HERALD', value: 0.19, rare: true, primary: false, secondary: false },
    { name: 'PROPHET', value: 0.07, rare: true, primary: false, secondary: false },
    { name: 'AGITPROP', value: 0.01, rare: true, primary: false, secondary: false },
  ];

  const polarToCartesian = (index: number, value: number) => {
    const angle = (2 * Math.PI * index / NUM_CLASSES) - (Math.PI / 2);
    return {
      x: cx + chartRadius * value * Math.cos(angle),
      y: cy + chartRadius * value * Math.sin(angle),
    };
  };

  const getLabelPos = (index: number) => {
    const angle = (2 * Math.PI * index / NUM_CLASSES) - (Math.PI / 2);
    return {
      x: cx + labelRadius * Math.cos(angle),
      y: cy + labelRadius * Math.sin(angle),
    };
  };

  const getAnchor = (index: number): string => {
    const angle = (2 * Math.PI * index / NUM_CLASSES) - (Math.PI / 2);
    const x = Math.cos(angle);
    if (x < -0.2) return 'end';
    if (x > 0.2) return 'start';
    return 'middle';
  };

  const gridRing = (scale: number): string =>
    Array.from({ length: NUM_CLASSES }, (_, i) => {
      const pt = polarToCartesian(i, scale);
      return `${pt.x},${pt.y}`;
    }).join(' ');

  const affinityPolygon = (): string =>
    affinityData.map((cls, i) => {
      const value = Math.max(cls.value, 0.04);
      const pt = polarToCartesian(i, value);
      return `${pt.x},${pt.y}`;
    }).join(' ');

  return (
    <svg
      viewBox="-50 -50 600 600"
      width="100%"
      height="100%"
      style={{ overflow: 'visible', display: 'block' }}
    >
      {[0.2, 0.4, 0.6, 0.8, 1.0].map(scale => (
        <polygon
          key={scale}
          points={gridRing(scale)}
          fill="none"
          stroke="#261600"
          strokeWidth={scale === 1.0 ? 1.5 : 1}
          opacity={scale === 1.0 ? 0.9 : 0.5}
        />
      ))}

      {affinityData.map((_, i) => {
        const outer = polarToCartesian(i, 1.0);
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={outer.x} y2={outer.y}
            stroke="#261600"
            strokeWidth={0.5}
            opacity={0.6}
          />
        );
      })}

      <polygon
        points={affinityPolygon()}
        fill="rgba(255, 176, 0, 0.12)"
        stroke="#ffb000"
        strokeWidth={2}
        className="radar-polygon"
        style={{ filter: 'drop-shadow(0 0 5px rgba(255,176,0,0.6))' }}
      />

      {affinityData.map((cls, i) => {
        const pt = polarToCartesian(i, Math.max(cls.value, 0.04));
        const r = cls.primary ? 6 : cls.secondary ? 5 : cls.rare ? 4 : 3;
        const fill = cls.primary ? '#ffd060' : cls.secondary ? '#ffb000' : cls.rare ? '#cc8800' : '#996800';
        return (
          <circle
            key={cls.name}
            cx={pt.x} cy={pt.y} r={hovered === cls.name ? r + 2 : r}
            fill={fill}
            style={{ filter: 'drop-shadow(0 0 4px rgba(255,176,0,0.7))', cursor: 'pointer' }}
            onMouseEnter={() => setHovered(cls.name)}
            onMouseLeave={() => setHovered(null)}
          />
        );
      })}

      {affinityData.map((cls, i) => {
        const pos = getLabelPos(i);
        const isHovered = hovered === cls.name;
        const fill = cls.primary ? '#ffd060'
          : cls.secondary ? '#ffb000'
          : isHovered ? '#ffb000'
          : cls.rare ? '#cc8800'
          : '#664400';
        const fontSize = cls.primary ? 11 : cls.secondary ? 10 : 9;
        return (
          <text
            key={cls.name}
            x={pos.x} y={pos.y}
            textAnchor={getAnchor(i)}
            dominantBaseline="middle"
            fill={fill}
            fontSize={fontSize}
            fontFamily="'IBM Plex Mono', monospace"
            fontWeight={cls.primary ? 'bold' : 'normal'}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(cls.name)}
            onMouseLeave={() => setHovered(null)}
          >
            {cls.name}{cls.rare ? ' ✦' : ''}
          </text>
        );
      })}

      <circle cx={cx} cy={cy} r={3} fill="#ffb000" opacity={0.4} />
    </svg>
  );
};

export default CharSheetPage2;
