import { useState } from 'react';
import ProgressBar from '../ProgressBar';

const op = {
  callsign: 'VOID_SIGNAL',
  level: 6,
  title: 'SPECIALIST',
  xp: 7820,
  xpToNext: 12000,
  streak: 14,
  multiplier: 2.0,
  shields: [true, true, false],
  classPrimary: 'ROCKERBOY',
  classSecondary: 'WITCH',
  augmentation: 74,
};

const statData = [
  { icon: '▲', name: 'BODY', level: 4, xp: 4200, xpToNext: 6500, streak: 9, dormant: false },
  { icon: '⬡', name: 'WIRE', level: 6, xp: 9100, xpToNext: 12000, streak: 14, dormant: false },
  { icon: '◈', name: 'MIND', level: 5, xp: 6800, xpToNext: 9000, streak: 14, dormant: false },
  { icon: '◆', name: 'COOL', level: null, xp: 0, xpToNext: 0, streak: 0, dormant: true },
  { icon: '▣', name: 'GRIT', level: null, xp: 0, xpToNext: 0, streak: 0, dormant: true },
  { icon: '✦', name: 'FLOW', level: 5, xp: 5900, xpToNext: 9000, streak: 12, dormant: false },
  { icon: '░', name: 'GHOST', level: 3, xp: 2100, xpToNext: 4500, streak: 6, dormant: false },
];

const CharSheetPage1 = () => {
  const [customDesignation, setCustomDesignation] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const startEdit = () => {
    setEditValue(customDesignation || '');
    setEditing(true);
  };

  const saveEdit = () => {
    const v = editValue.trim();
    setCustomDesignation(v || null);
    setEditing(false);
  };

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* LEFT — IDENTITY */}
      <div className="char-sheet-left" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 20 }}>// IDENTITY</div>

        {/* Callsign */}
        <div style={{ marginBottom: 24 }}>
          <div className="char-label">CALLSIGN</div>
          <div className="font-display text-glow-bright" style={{ fontSize: 28, color: 'hsl(var(--accent-bright))' }}>
            {op.callsign}
          </div>
        </div>

        {/* Class */}
        <div style={{ marginBottom: 24 }}>
          <div className="char-label">CLASS</div>
          <div>
            <span className="font-display" style={{ fontSize: 22, color: 'hsl(var(--accent-bright))' }}>{op.classPrimary}</span>
            <span className="font-display" style={{ fontSize: 22, color: 'hsl(var(--accent))' }}> // {op.classSecondary}</span>
          </div>
          <div style={{ fontSize: 9, color: 'hsl(var(--text-dim))', fontStyle: 'italic', marginTop: 2 }}>(generated)</div>
        </div>

        {/* Custom Designation */}
        <div style={{ marginBottom: 24 }}>
          <div className="char-label">CUSTOM DESIGNATION</div>
          {editing ? (
            <input
              className="crt-input"
              autoFocus
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
              style={{ fontSize: 14, width: '100%', maxWidth: 280 }}
            />
          ) : customDesignation ? (
            <div>
              <span className="font-display" style={{ fontSize: 18, color: 'hsl(var(--accent-bright))' }}>{customDesignation}</span>
              <button className="widget-btn" onClick={startEdit} style={{ marginLeft: 8, fontSize: 9 }}>[ edit ]</button>
            </div>
          ) : (
            <div
              onClick={startEdit}
              style={{ color: 'hsl(var(--text-dim))', fontStyle: 'italic', cursor: 'pointer', fontSize: 11 }}
            >
              [ not set — click to edit ]
            </div>
          )}
        </div>

        {/* Master Level */}
        <div style={{ marginBottom: 24 }}>
          <div className="char-label">MASTER LEVEL</div>
          <div className="font-display" style={{ fontSize: 24, color: 'hsl(var(--accent-bright))' }}>
            LVL {op.level} // {op.title}
          </div>
          <div style={{ marginTop: 6 }}>
            <ProgressBar value={op.xp} max={op.xpToNext} width="100%" height={10} />
          </div>
          <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginTop: 4 }}>
            {op.xp.toLocaleString()} / {op.xpToNext.toLocaleString()} XP
          </div>
        </div>

        {/* Streak */}
        <div style={{ marginBottom: 24 }}>
          <div className="char-label">STREAK</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="font-display" style={{ fontSize: 20, color: 'hsl(var(--accent-bright))' }}>
              {op.streak} DAYS
            </span>
            <span className="multiplier-tag">ON FIRE {op.multiplier}×</span>
          </div>
        </div>

        {/* Shields */}
        <div style={{ marginBottom: 24 }}>
          <div className="char-label">SHIELDS</div>
          <div style={{ fontSize: 20, letterSpacing: 4 }}>
            {op.shields.map((s, i) => (
              <span key={i} style={{ color: s ? 'hsl(var(--accent-bright))' : 'hsl(var(--text-dim))' }} className={s ? 'text-glow' : ''}>
                {s ? '▣' : '□'}
              </span>
            ))}
          </div>
        </div>

        {/* Augmentation */}
        <div>
          <div className="char-label">AUGMENTATION SCORE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <ProgressBar value={op.augmentation} max={100} width="100%" height={10} />
            </div>
            <span style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>{op.augmentation} / 100</span>
          </div>
        </div>
      </div>

      {/* RIGHT — STATS */}
      <div className="char-sheet-right" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 20 }}>// STATS</div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {statData.map(s => (
            <div key={s.name} style={{ opacity: s.dormant ? 0.35 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11 }}>
                  <span style={{ marginRight: 6, fontSize: 13 }}>{s.icon}</span>
                  {s.name}
                </span>
                {s.dormant ? (
                  <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>DORMANT</span>
                ) : (
                  <span className="font-display" style={{ fontSize: 14, color: 'hsl(var(--accent-bright))' }}>LVL {s.level}</span>
                )}
              </div>
              <ProgressBar value={s.xp} max={s.xpToNext || 1} width="100%" height={6} />
              {!s.dormant && (
                <div style={{ fontSize: 9, color: 'hsl(var(--text-dim))', marginTop: 3 }}>
                  {s.xp.toLocaleString()} / {s.xpToNext.toLocaleString()} XP &nbsp;&nbsp; STK: {s.streak}d
                </div>
              )}
              {s.dormant && (
                <div style={{ fontSize: 9, color: 'hsl(var(--text-dim))', marginTop: 3 }}>DORMANT</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CharSheetPage1;
