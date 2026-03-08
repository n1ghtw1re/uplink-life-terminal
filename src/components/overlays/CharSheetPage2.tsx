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

const RadarChart = ({ hovered, onHover }: { hovered: string | null; onHover: (c: string | null) => void }) => {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const labelRadius = size * 0.48;
  const total = CLASS_ORDER.length;
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

  const dataPoints = CLASS_ORDER.map((cls, i) => getPoint(i, affinityData[cls], total, radius, cx, cy));
  const polygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }}>
      {/* Grid rings */}
      {rings.map(s => (
        <polygon key={s} points={getRingPoints(s, total, radius, cx, cy)}
          fill="none" stroke="hsl(30 100% 9%)" strokeWidth="1" />
      ))}
      {/* Spokes */}
      {CLASS_ORDER.map((_, i) => {
        const p = getPoint(i, 1, total, radius, cx, cy);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="hsl(30 100% 9%)" strokeWidth="0.5" opacity="0.6" />;
      })}
      {/* Affinity polygon */}
      <polygon points={polygonPoints} className="radar-polygon"
        fill="rgba(255, 176, 0, 0.15)" stroke="hsl(var(--accent))" strokeWidth="1.5"
        style={{ filter: 'drop-shadow(0 0 4px rgba(255, 176, 0, 0.6))' }} />
      {/* Data points */}
      <g className="radar-points">
        {CLASS_ORDER.map((cls, i) => {
          const p = dataPoints[i];
          const isRare = RARE_CLASSES.has(cls);
          const isHovered = hovered === cls;
          return (
            <circle key={cls} cx={p.x} cy={p.y}
              r={isRare ? 4 : 3}
              fill={isRare || isHovered ? 'hsl(var(--accent-bright))' : 'hsl(var(--accent))'}
              style={{ filter: isRare || isHovered ? 'drop-shadow(0 0 6px rgba(255, 176, 0, 0.9))' : 'none', cursor: 'pointer' }}
              onMouseEnter={() => onHover(cls)}
              onMouseLeave={() => onHover(null)}
            />
          );
        })}
      </g>
      {/* Labels */}
      {CLASS_ORDER.map((cls, i) => {
        const angle = (Math.PI * 2 * i / total) - Math.PI / 2;
        const lx = cx + labelRadius * Math.cos(angle);
        const ly = cy + labelRadius * Math.sin(angle);
        const isPrimary = cls === PRIMARY || cls === SECONDARY;
        const isRare = RARE_CLASSES.has(cls);
        const isHovered = hovered === cls;
        const cosA = Math.cos(angle);
        const anchor = Math.abs(cosA) < 0.1 ? 'middle' : cosA > 0 ? 'start' : 'end';
        const label = isRare ? `${cls} ✦` : cls;
        return (
          <text key={cls} x={lx} y={ly}
            textAnchor={anchor} dominantBaseline="central"
            fontFamily="'IBM Plex Mono', monospace"
            fontSize={isPrimary ? 9 : 8}
            fill={isHovered || isPrimary ? 'hsl(var(--accent-bright))' : isRare ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => onHover(cls)}
            onMouseLeave={() => onHover(null)}
          />
        );
      })}
      {/* Label text (separate for proper rendering) */}
      {CLASS_ORDER.map((cls, i) => {
        const angle = (Math.PI * 2 * i / total) - Math.PI / 2;
        const lx = cx + labelRadius * Math.cos(angle);
        const ly = cy + labelRadius * Math.sin(angle);
        const isPrimary = cls === PRIMARY || cls === SECONDARY;
        const isRare = RARE_CLASSES.has(cls);
        const isHovered = hovered === cls;
        const cosA = Math.cos(angle);
        const anchor = Math.abs(cosA) < 0.1 ? 'middle' : cosA > 0 ? 'start' : 'end';
        const label = isRare ? `${cls} ✦` : cls;
        return null; // handled above
      })}
    </svg>
  );
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

// Full radar with proper labels as text children
const RadarChartFull = ({ hovered, onHover }: { hovered: string | null; onHover: (c: string | null) => void }) => {
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];
  const dataPoints = CLASS_ORDER.map((cls, i) => getRadarPoint(i, affinityData[cls]));
  const polygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div style={{ overflow: 'visible', width: '100%', maxWidth: 400 }}>
      <svg viewBox="-30 -30 560 560" width="100%" height="100%" style={{ overflow: 'visible' }}>
        {rings.map(s => (
          <polygon key={s} points={getGridRing(s)} fill="none" stroke="hsl(30 100% 9%)" strokeWidth="1" />
        ))}
        {CLASS_ORDER.map((_, i) => {
          const p = getRadarPoint(i, 1);
          return <line key={i} x1={CENTER_X} y1={CENTER_Y} x2={p.x} y2={p.y} stroke="hsl(30 100% 9%)" strokeWidth="0.5" opacity="0.6" />;
        })}
        <polygon points={polygonPoints} className="radar-polygon"
          fill="rgba(255, 176, 0, 0.15)" stroke="hsl(var(--accent))" strokeWidth="1.5"
          style={{ filter: 'drop-shadow(0 0 4px rgba(255, 176, 0, 0.6))' }} />
        <g className="radar-points">
          {CLASS_ORDER.map((cls, i) => {
            const p = dataPoints[i];
            const isRare = RARE_CLASSES.has(cls);
            const isHovered = hovered === cls;
            return (
              <circle key={cls} cx={p.x} cy={p.y}
                r={isRare ? 4 : 3}
                fill={isRare || isHovered ? 'hsl(var(--accent-bright))' : 'hsl(var(--accent))'}
                style={{ filter: isRare || isHovered ? 'drop-shadow(0 0 6px rgba(255, 176, 0, 0.9))' : 'none', cursor: 'pointer' }}
                onMouseEnter={() => onHover(cls)}
                onMouseLeave={() => onHover(null)}
              />
            );
          })}
        </g>
        {CLASS_ORDER.map((cls, i) => {
          const lp = getLabelPoint(i);
          const isPrimary = cls === PRIMARY || cls === SECONDARY;
          const isRare = RARE_CLASSES.has(cls);
          const isHovered = hovered === cls;
          const anchor = getLabelAnchor(i);
          return (
            <text key={cls} x={lp.x} y={lp.y}
              textAnchor={anchor} dominantBaseline="central"
              fontFamily="'IBM Plex Mono', monospace"
              fontSize={isPrimary ? 8 : 7}
              fill={isHovered || isPrimary ? 'hsl(var(--accent-bright))' : isRare ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => onHover(cls)}
              onMouseLeave={() => onHover(null)}
            >
              {isRare ? `${cls} ✦` : cls}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default CharSheetPage2;
