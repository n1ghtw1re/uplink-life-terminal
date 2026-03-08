import { useState } from 'react';

const statSections = [
  {
    icon: '▲', name: 'BODY', level: 4,
    skills: [
      { name: 'Weightlifting', level: 5, xpPct: 78 },
      { name: 'Running', level: 3, xpPct: 45 },
      { name: 'MMA', level: 4, xpPct: 62 },
    ],
  },
  {
    icon: '⬡', name: 'WIRE', level: 6,
    skills: [
      { name: 'Coding', level: 6, xpPct: 55 },
      { name: 'Web Dev', level: 5, xpPct: 88 },
    ],
  },
  {
    icon: '◈', name: 'MIND', level: 5,
    skills: [
      { name: 'Spanish', level: 4, xpPct: 33 },
      { name: 'Reading', level: 5, xpPct: 70 },
      { name: 'Online Courses', level: 3, xpPct: 20 },
    ],
  },
  {
    icon: '✦', name: 'FLOW', level: 5,
    skills: [
      { name: 'Music Production', level: 5, xpPct: 91 },
      { name: 'Creative Writing', level: 3, xpPct: 48 },
      { name: 'Drawing', level: 2, xpPct: 15 },
    ],
  },
  {
    icon: '░', name: 'GHOST', level: 3,
    skills: [
      { name: 'Meditation', level: 4, xpPct: 60 },
      { name: 'Breathwork', level: 2, xpPct: 30 },
    ],
  },
];

const dormantStats = [
  { icon: '◆', name: 'COOL' },
  { icon: '▣', name: 'GRIT' },
];

const CharSheetPage3 = () => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    BODY: false,
    WIRE: true,
    MIND: false,
    FLOW: false,
    GHOST: true,
  });

  const toggleCard = (name: string) => {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingRight: 4 }}>
      {/* Header */}
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#996800', marginBottom: 16 }}>
        // SKILLS
      </div>

      {/* Active stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, alignItems: 'start' }}>
        {statSections.map(stat => {
          const isExpanded = expanded[stat.name];
          return (
            <div
              key={stat.name}
              style={{
                background: '#1a0f00',
                border: '1px solid #261600',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#3a2000')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#261600')}
            >
              {/* Stat header — clickable */}
              <div
                onClick={() => toggleCard(stat.name)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#ffb000' }}>
                  {stat.icon} {stat.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: "'VT323', monospace", fontSize: 14, color: '#ffd060' }}>
                    LVL {stat.level}
                  </span>
                  <span style={{
                    fontSize: 10,
                    color: '#996800',
                    minWidth: 32,
                    textAlign: 'right',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2,
                  }}>
                    <span style={{
                      display: 'inline-block',
                      transition: 'transform 200ms ease',
                      transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                    }}>▾</span>
                    {!isExpanded && <span>({stat.skills.length})</span>}
                  </span>
                </div>
              </div>

              {/* Collapsible body */}
              <div style={{
                overflow: 'hidden',
                maxHeight: isExpanded ? 400 : 0,
                opacity: isExpanded ? 1 : 0,
                transition: 'max-height 200ms ease, opacity 200ms ease',
              }}>
                {/* Divider */}
                <div style={{ height: 1, background: '#261600', margin: '6px 0 8px' }} />
                {/* Skills */}
                {stat.skills.map((skill, si) => (
                  <div key={skill.name} style={{ marginBottom: si < stat.skills.length - 1 ? 8 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#996800' }}>
                        {skill.name}
                      </span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#ffd060' }}>
                        LVL {skill.level}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 4, background: '#261600', position: 'relative' }}>
                      <div
                        style={{
                          width: `${skill.xpPct}%`,
                          height: '100%',
                          background: '#ffb000',
                          boxShadow: '0 0 4px rgba(255,176,0,0.3)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dormant section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#332200', whiteSpace: 'nowrap' }}>
          ── DORMANT
        </span>
        <div style={{ flex: 1, height: 1, background: '#332200' }} />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {dormantStats.map(stat => (
          <div
            key={stat.name}
            style={{
              flex: 1,
              border: '1px solid #1a0f00',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: 0.35,
            }}
          >
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>
              {stat.icon} {stat.name}
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#664400' }}>
              DORMANT
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#332200', fontStyle: 'italic' }}>
              — no skills added
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CharSheetPage3;
