import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOperator } from '@/hooks/useOperator';
import { useSkills, SkillOption } from '@/hooks/useSkills';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logSession } from '@/services/sessionService';
import { StatKey, STAT_META, getStreakTier, STREAK_MULTIPLIERS } from '@/types';
import { toast } from '@/hooks/use-toast';
import { triggerXPFloat } from '@/components/effects/XPFloatLayer';

const DURATION_PRESETS = [
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '45m', value: 45 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
];

const LEGACY_RATE = 0.5;
const BASE_XP_PER_HOUR = 100;

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
  const { user } = useAuth();
  const { data: op } = useOperator(user?.id);
  const { data: skills } = useSkills(user?.id);
  const queryClient = useQueryClient();
  console.log('QLC DEBUG', { user: user?.id, skills, op });

  const { data: activeCourses } = useQuery({
    queryKey: ['courses-active', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, name')
        .eq('user_id', user!.id)
        .eq('status', 'ACTIVE');
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const logMutation = useMutation({
    mutationFn: logSession,
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['operator', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['stats', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['xp-recent', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['checkins-heatmap', user?.id] });
      onSubmit?.(session.skillXpAwarded + session.masterXpAwarded);
    },
  });

  const [query, setQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<SkillOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [duration, setDuration] = useState(60);
  const [activePreset, setActivePreset] = useState<number | null>(60);
  const [split, setSplit] = useState<number[]>([50, 50]);
  const [notes, setNotes] = useState('');
  const [tagCourseId, setTagCourseId] = useState('');
  const [isLegacy, setIsLegacy] = useState(false);
  const [logYesterday, setLogYesterday] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const filtered = query.length > 0
    ? (skills ?? []).filter(s => fuzzyMatch(query, s.name)).slice(0, 6)
    : (skills ?? []).slice(0, 6);

  const selectSkill = useCallback((skill: SkillOption) => {
    setSelectedSkill(skill);
    setQuery(skill.name);
    setShowDropdown(false);
    setHighlightIdx(0);
    if (skill.statKeys.length === 2) {
      setSplit(skill.defaultSplit?.length === 2 ? skill.defaultSplit : [50, 50]);
    }
  }, []);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (showDropdown) { setShowDropdown(false); }
      else { setQuery(''); setSelectedSkill(null); }
      return;
    }
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && filtered[highlightIdx]) { e.preventDefault(); selectSkill(filtered[highlightIdx]); }
  };

  const handleSplitChange = (idx: number, val: number) => {
    const clamped = Math.max(10, Math.min(90, val));
    const newSplit = [...split];
    newSplit[idx] = clamped;
    newSplit[1 - idx] = 100 - clamped;
    setSplit(newSplit);
  };

  // XP preview — mirrors xpService logic
  const streak = op?.streak ?? 0;
  const streakTier = getStreakTier(streak);
  const mult = isLegacy ? 1.0 : (STREAK_MULTIPLIERS[streakTier] ?? 1.0);
  const legacyFactor = isLegacy ? LEGACY_RATE : 1.0;
  const baseAmount = Math.floor((duration / 60) * BASE_XP_PER_HOUR);
  const skillXp = Math.round(baseAmount * mult * legacyFactor);
  const statTotalXp = Math.round(baseAmount * 0.6 * mult * legacyFactor);
  const masterXp = Math.round(baseAmount * 0.3 * mult * legacyFactor);
  const hasDualStat = selectedSkill && selectedSkill.statKeys.length === 2;
  const statXps = hasDualStat
    ? [Math.round(statTotalXp * split[0] / 100), Math.round(statTotalXp * split[1] / 100)]
    : [statTotalXp];
  const totalXp = skillXp + statTotalXp + masterXp;

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
  console.log('SUBMIT', { selectedSkill, user, duration }); // ADD THIS
  if (!selectedSkill || !user) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top - 10;
    triggerXPFloat(cx, cy, skillXp, mult > 1 ? mult : undefined);
    setTimeout(() => triggerXPFloat(cx - 50, cy, statTotalXp, mult > 1 ? mult : undefined), 200);
    setTimeout(() => triggerXPFloat(cx + 50, cy, masterXp, mult > 1 ? mult : undefined), 400);

    const statSplit = selectedSkill.statKeys.length === 2
      ? [
          { stat: selectedSkill.statKeys[0], percent: split[0] },
          { stat: selectedSkill.statKeys[1], percent: split[1] },
        ]
      : [{ stat: selectedSkill.statKeys[0], percent: 100 }];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    logMutation.mutate({
      userId: user.id,
      skillId: selectedSkill.id,
      skillName: selectedSkill.name,
      durationMinutes: duration,
      statSplit,
      notes: notes || undefined,
      isLegacy,
      loggedAt: logYesterday ? yesterday : undefined,
    }, {
      onSuccess: () => {
        toast({
          title: '✓ SESSION LOGGED',
          description: `${selectedSkill.name}  ${duration}min  +${totalXp} XP${isLegacy ? ' [LEGACY]' : ` [${streakTier.replace('_', ' ')} ${mult}×]`}`,
        });
      },
      onError: (err) => {
        toast({ title: 'ERROR', description: String(err) });
      },
    });
  };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}.${String(yesterday.getMonth()+1).padStart(2,'0')}.${String(yesterday.getDate()).padStart(2,'0')}`;

  return (
    <div style={{ fontSize: 11 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        {/* LEFT COLUMN */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* SKILL */}
          <div style={{ marginBottom: 10, position: 'relative' }}>
            <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 4 }}>SKILL:</div>
            <input
              ref={inputRef}
              className="crt-input"
              style={{ width: '100%' }}
              placeholder={skills?.length === 0 ? 'no skills yet — add skills first' : 'start typing...'}
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
                    key={skill.id}
                    className={`ql-dropdown-item ${i === highlightIdx ? 'ql-dropdown-item--active' : ''}`}
                    onMouseEnter={() => setHighlightIdx(i)}
                    onClick={() => selectSkill(skill)}
                  >
                    <span style={{ color: 'hsl(var(--accent))', marginRight: 8 }}>{skill.icon}</span>
                    <span style={{ flex: 1 }}>{skill.name}</span>
                    <span style={{ color: 'hsl(var(--text-dim))', fontSize: 10 }}>
                      {skill.statKeys.map(k => k.toUpperCase()).join(' / ')}
                    </span>
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
                  onClick={() => { setDuration(p.value); setActivePreset(p.value); }}
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
                value={duration}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '');
                  setDuration(Number(v) || 1);
                  setActivePreset(null);
                }}
              />
              <span style={{ color: 'hsl(var(--text-dim))' }}>min</span>
            </div>
          </div>

          {/* STAT SPLIT */}
          {hasDualStat && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 4 }}>STAT SPLIT:</div>
              {selectedSkill.statKeys.map((statKey, idx) => (
                <div key={statKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 60, fontSize: 10, color: 'hsl(var(--accent))' }}>
                    {STAT_META[statKey]?.icon} {statKey.toUpperCase()}
                  </span>
                  <input
                    type="range"
                    className="ql-split-slider"
                    min={10} max={90}
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
                <select className="crt-select" value={tagCourseId} onChange={e => setTagCourseId(e.target.value)}>
                  <option value="">course</option>
                  {(activeCourses ?? []).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
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
        <div style={{ width: 1, background: '#261600', alignSelf: 'stretch', flexShrink: 0 }} />

        {/* RIGHT COLUMN */}
        <div style={{ width: 240, flexShrink: 0, alignSelf: 'start', paddingLeft: 8 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 6, fontSize: 10, letterSpacing: 1 }}>
              ── OPTIONS ───────────
            </div>
            <label className="crt-checkbox" style={{ marginBottom: 6, display: 'flex' }}>
              <span className="crt-checkbox-box" onClick={() => setIsLegacy(!isLegacy)}>{isLegacy ? '×' : ''}</span>
              <span style={{ color: isLegacy ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))' }}>LEGACY ENTRY</span>
            </label>
            <label className="crt-checkbox" style={{ display: 'flex' }}>
              <span className="crt-checkbox-box" onClick={() => setLogYesterday(!logYesterday)}>{logYesterday ? '×' : ''}</span>
              <span style={{ color: logYesterday ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))' }}>LOG FOR YESTERDAY</span>
            </label>
            {logYesterday && (
              <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginTop: 4, paddingLeft: 20 }}>
                DATE: {yesterdayStr}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid hsl(var(--accent-dim))', paddingTop: 8 }}>
            <div style={{ color: 'hsl(var(--text-dim))', marginBottom: 6, fontSize: 10, letterSpacing: 1 }}>
              ── XP PREVIEW ────────
            </div>
            <div style={{ color: 'hsl(var(--accent))', fontSize: 10, lineHeight: 1.8 }}>
              <div>SKILL{'  '}+{skillXp} XP{isLegacy && <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 8 }}>[LEGACY]</span>}</div>
              {selectedSkill ? (
                hasDualStat ? (
                  <>
                    <div>{selectedSkill.statKeys[0].toUpperCase()}{'  '}+{statXps[0]} XP</div>
                    <div>{selectedSkill.statKeys[1].toUpperCase()}{'  '}+{statXps[1]} XP</div>
                  </>
                ) : (
                  <div>{selectedSkill.statKeys[0].toUpperCase()}{'  '}+{statXps[0]} XP</div>
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
                  <span className="multiplier-tag pulse-glow">LEGENDARY {mult}×</span>
                ) : mult > 1 ? (
                  <span className="multiplier-tag">{streakTier.replace('_', ' ')} {mult}×</span>
                ) : null}
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

      {/* BUTTONS */}
      <div style={{ borderTop: '1px solid hsl(var(--accent-dim))', paddingTop: 8, marginTop: 12, display: 'flex', gap: 8 }}>
        <button
          className="topbar-btn"
          style={{ flex: 1, opacity: !selectedSkill ? 0.4 : 1 }}
          disabled={!selectedSkill || logMutation.isPending}
          onClick={handleSubmit}
        >
          {logMutation.isPending ? '>> LOGGING...' : '>> SUBMIT LOG'}
        </button>
        <button
          className="topbar-btn"
          style={{ flex: 1, color: 'hsl(var(--text-dim))' }}
          onClick={() => toast({ title: 'FULL FORM — COMING SOON', description: 'Detailed session logging will be available in a future build.' })}
        >
          OPEN FULL FORM
        </button>
      </div>
    </div>
  );
};

export default QuickLogOverlay;