import { useState, useRef, useEffect, useCallback } from 'react';
import { skills, courses, operatorData } from '@/data/mockData';
import type { Skill } from '@/data/mockData';
import { toast } from '@/hooks/use-toast';
import { triggerXPFloat } from '@/components/effects/XPFloatLayer';

const DURATION_PRESETS = [
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '45m', value: 45 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
];

const STAT_ICONS: Record<string, string> = {
  BODY: '▲', WIRE: '⬡', MIND: '◈', COOL: '◆', GRIT: '▣', FLOW: '✦', GHOST: '░',
};

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

interface QuickLogOverlayProps {
  onSubmit?: (xp: number) => void;
}

const QuickLogOverlay = ({ onSubmit }: QuickLogOverlayProps) => {
  const [query, setQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [duration, setDuration] = useState(60);
  const [activePreset, setActivePreset] = useState<number | null>(60);
  const [split, setSplit] = useState<number[]>([50, 50]);
  const [notes, setNotes] = useState('');
  const [tagCourse, setTagCourse] = useState('');
  const [isLegacy, setIsLegacy] = useState(false);
  const [logYesterday, setLogYesterday] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const filtered = query.length > 0
    ? skills.filter(s => fuzzyMatch(query, s.name)).slice(0, 6)
    : skills.slice(0, 6);

  const selectSkill = useCallback((skill: Skill) => {
    setSelectedSkill(skill);
    setQuery(skill.name);
    setShowDropdown(false);
    setHighlightIdx(0);
    if (skill.stats.length === 2) {
      setSplit(skill.defaultSplit || [50, 50]);
    }
  }, []);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (showDropdown) {
        setShowDropdown(false);
      } else {
        setQuery('');
        setSelectedSkill(null);
      }
      return;
    }
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[highlightIdx]) {
      e.preventDefault();
      selectSkill(filtered[highlightIdx]);
    }
  };

  const handleDurationPreset = (val: number) => {
    setDuration(val);
    setActivePreset(val);
  };

  const handleCustomDuration = (val: number) => {
    setDuration(val);
    setActivePreset(null);
  };

  const handleSplitChange = (idx: number, val: number) => {
    const clamped = Math.max(10, Math.min(90, val));
    const newSplit = [...split];
    newSplit[idx] = clamped;
    newSplit[1 - idx] = 100 - clamped;
    setSplit(newSplit);
  };

  // XP calculations
  const mult = isLegacy ? 1.0 : operatorData.multiplier;
  const legacyFactor = isLegacy ? 0.6 : 1.0;
  const baseSkillXp = duration * 2;
  const skillXp = Math.round(baseSkillXp * mult * legacyFactor);
  const statTotalXp = Math.round(baseSkillXp * 0.6 * mult * legacyFactor);
  const masterXp = Math.round(baseSkillXp * 0.3 * mult * legacyFactor);

  const statXps = selectedSkill?.stats.length === 2
    ? [Math.round(statTotalXp * split[0] / 100), Math.round(statTotalXp * split[1] / 100)]
    : [statTotalXp];

  const totalXp = skillXp + statTotalXp + masterXp;

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!selectedSkill) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top - 10;

    // Cascade: skill XP, stat XP, master XP
    triggerXPFloat(cx, cy, skillXp, mult > 1 ? mult : undefined);
    setTimeout(() => triggerXPFloat(cx - 50, cy, statTotalXp, mult > 1 ? mult : undefined), 200);
    setTimeout(() => triggerXPFloat(cx + 50, cy, masterXp, mult > 1 ? mult : undefined), 400);

    setSubmitting(true);
    setTimeout(() => {
      onSubmit?.(totalXp);
      toast({
        title: '✓ SESSION LOGGED',
        description: `${selectedSkill.name}  ${duration}min  +${totalXp} XP  ${!isLegacy ? `[ON FIRE ${mult}×]` : '[LEGACY]'}`,
      });
      setSubmitting(false);
    }, 300);
  };

  const handleFullForm = () => {
    toast({
      title: 'FULL FORM — COMING SOON',
      description: 'Detailed session logging will be available in a future build.',
    });
  };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}.${String(yesterday.getMonth() + 1).padStart(2, '0')}.${String(yesterday.getDate()).padStart(2, '0')}`;

  const activeCourses = courses.filter(c => c.status === 'ACTIVE');
  const hasDualStat = selectedSkill && selectedSkill.stats.length === 2;

  return (
    <div style={{ fontSize: 11 }}>
      {/* TWO-COLUMN LAYOUT */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* LEFT COLUMN — Core fields */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* SKILL FIELD */}
          <div style={{ marginBottom: 10, position: 'relative' }}>
            <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 4 }}>SKILL:</div>
            <input
              ref={inputRef}
              className="crt-input"
              style={{ width: '100%' }}
              placeholder="start typing..."
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setShowDropdown(true);
                setHighlightIdx(0);
                if (!e.target.value) setSelectedSkill(null);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleInputKeyDown}
            />
            {showDropdown && filtered.length > 0 && (
              <div className="ql-dropdown">
                {filtered.map((skill, i) => (
                  <div
                    key={skill.name}
                    className={`ql-dropdown-item ${i === highlightIdx ? 'ql-dropdown-item--active' : ''}`}
                    onMouseEnter={() => setHighlightIdx(i)}
                    onClick={() => selectSkill(skill)}
                  >
                    <span style={{ color: 'hsl(var(--accent))', marginRight: 8 }}>{skill.icon}</span>
                    <span style={{ flex: 1 }}>{skill.name}</span>
                    <span style={{ color: 'hsl(var(--text-dim))', fontSize: 10 }}>{skill.stats.join(' / ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DURATION */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 4 }}>DURATION:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              {DURATION_PRESETS.map(p => (
                <button
                  key={p.value}
                  className={`ql-preset-btn ${activePreset === p.value ? 'ql-preset-btn--active' : ''}`}
                  onClick={() => handleDurationPreset(p.value)}
                >
                  {p.label}
                </button>
              ))}
              <span style={{ color: 'hsl(var(--text-dim))', margin: '0 4px' }}>or</span>
              <input
                className="crt-input ql-no-spinners"
                style={{ width: 50, textAlign: 'center' }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={duration}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '');
                  handleCustomDuration(Number(v) || 1);
                }}
              />
              <span style={{ color: 'hsl(var(--text-dim))' }}>min</span>
            </div>
          </div>

          {/* STAT SPLIT */}
          {hasDualStat && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 4 }}>STAT SPLIT:</div>
              {selectedSkill.stats.map((stat, idx) => (
                <div key={stat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 50, fontSize: 10, color: 'hsl(var(--accent))' }}>
                    {STAT_ICONS[stat] || '?'} {stat}
                  </span>
                  <input
                    type="range"
                    className="ql-split-slider"
                    min={10}
                    max={90}
                    value={split[idx]}
                    onChange={e => handleSplitChange(idx, Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ width: 30, textAlign: 'right', fontSize: 10, color: 'hsl(var(--text-dim))' }}>
                    {split[idx]}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* NOTES */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 4 }}>NOTES:</div>
            <input
              className="crt-input"
              style={{ width: '100%' }}
              placeholder="notes for this session..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* TAG TO */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 4 }}>TAG TO:</div>
              <div className="crt-select-wrapper">
                <select
                  className="crt-select"
                  value={tagCourse}
                  onChange={e => setTagCourse(e.target.value)}
                >
                  <option value="">course</option>
                  {activeCourses.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 4 }}>&nbsp;</div>
              <div className="crt-select-wrapper">
                <select className="crt-select" disabled>
                  <option>no active projects</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{
          width: 1,
          background: '#261600',
          alignSelf: 'stretch',
          flexShrink: 0,
        }} />

        {/* RIGHT COLUMN — Options + XP Preview */}
        <div style={{ width: 240, flexShrink: 0, alignSelf: 'start', paddingLeft: 8 }}>
          {/* Toggles */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 6, fontSize: 10, letterSpacing: 1 }}>
              ── OPTIONS ───────────
            </div>
            <label className="crt-checkbox" style={{ marginBottom: 6, display: 'flex' }}>
              <span className="crt-checkbox-box" onClick={() => setIsLegacy(!isLegacy)}>
                {isLegacy ? '×' : ''}
              </span>
              <span style={{ color: isLegacy ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))' }}>
                LEGACY ENTRY
              </span>
            </label>
            <label className="crt-checkbox" style={{ display: 'flex' }}>
              <span className="crt-checkbox-box" onClick={() => setLogYesterday(!logYesterday)}>
                {logYesterday ? '×' : ''}
              </span>
              <span style={{ color: logYesterday ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))' }}>
                LOG FOR YESTERDAY
              </span>
            </label>
            {logYesterday && (
              <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginTop: 4, paddingLeft: 20 }}>
                DATE: {yesterdayStr}
              </div>
            )}
          </div>

          {/* XP PREVIEW */}
          <div style={{
            borderTop: '1px solid hsl(var(--accent-dim))',
            paddingTop: 8,
          }}>
            <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 6, fontSize: 10, letterSpacing: 1 }}>
              ── XP PREVIEW ────────
            </div>
            <div style={{ color: 'hsl(var(--accent))', fontSize: 10, lineHeight: 1.8 }}>
              <div>
                SKILL{'  '}+{skillXp} XP{isLegacy && <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>[LEGACY]</span>}
              </div>
              {selectedSkill ? (
                selectedSkill.stats.length === 2 ? (
                  <>
                    <div>{selectedSkill.stats[0]}{'  '}+{statXps[0]} XP</div>
                    <div>{selectedSkill.stats[1]}{'  '}+{statXps[1]} XP</div>
                  </>
                ) : (
                  <div>{selectedSkill.stats[0]}{'  '}+{statXps[0]} XP</div>
                )
              ) : (
                <div style={{ color: 'hsl(var(--text-dim))' }}>STAT{'  '}+{statTotalXp} XP</div>
              )}
              <div>MASTER{'  '}+{masterXp} XP</div>
              <div style={{ borderTop: '1px solid #261600', marginTop: 6, paddingTop: 6, fontSize: 10 }}>
                MULT: {mult.toFixed(1)}×
                {isLegacy ? (
                  <span className="multiplier-tag" style={{ opacity: 0.5 }}>LEGACY</span>
                ) : mult >= 3 ? (
                  <span className="multiplier-tag pulse-glow" style={{ borderColor: 'hsl(var(--accent))', color: 'hsl(var(--accent))' }}>LEGENDARY {mult}×</span>
                ) : (
                  <span className="multiplier-tag">ON FIRE</span>
                )}
              </div>
              <div style={{ marginTop: 4 }}>
                <span style={{ fontSize: 13, color: 'hsl(var(--accent-bright))' }}>TOTAL: </span>
                <span className="font-display text-glow-bright" style={{ fontSize: 16, color: 'hsl(var(--accent-bright))' }}>
                  +{totalXp} XP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BUTTONS — full width bottom */}
      <div style={{
        borderTop: '1px solid hsl(var(--accent-dim))',
        paddingTop: 8,
        marginTop: 12,
        display: 'flex',
        gap: 8,
      }}>
        <button
          className="topbar-btn"
          style={{ flex: 1, opacity: !selectedSkill ? 0.4 : 1 }}
          disabled={!selectedSkill || submitting}
          onClick={handleSubmit}
        >
          {submitting ? '>> LOGGING...' : '>> SUBMIT LOG'}
        </button>
        <button
          className="topbar-btn"
          style={{ flex: 1, color: 'hsl(var(--text-dim))' }}
          onClick={handleFullForm}
        >
          OPEN FULL FORM
        </button>
      </div>
    </div>
  );
};

export default QuickLogOverlay;
