// ============================================================
// src/components/drawer/SkillDetailDrawer.tsx
// ============================================================
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOperator } from '@/hooks/useOperator';
import { logSession } from '@/services/sessionService';
import { STAT_META, StatKey, getStreakTier, STREAK_MULTIPLIERS, getStatLevel } from '@/types';
import { toast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  stat_keys: string[];
  default_split: number[];
  icon: string;
  level: number;
  xp: number;
  xp_to_next: number;
  notes: string | null;
  created_at: string;
}

interface SessionRow {
  id: string;
  duration_minutes: number;
  logged_at: string;
  notes: string | null;
  skill_xp_awarded: number;
}

interface Props {
  skillId: string;
  onClose?: () => void;
  onOpenLog?: () => void;
}

// ── Shared styles ─────────────────────────────────────────────

const mono      = "'IBM Plex Mono', monospace";
const vt        = "'VT323', monospace";
const accent    = 'hsl(var(--accent))';
const accentDim = 'hsl(var(--accent-dim))';
const dimText   = 'hsl(var(--text-dim))';
const bgSec     = 'hsl(var(--bg-secondary))';
const bgTer     = 'hsl(var(--bg-tertiary))';

const DURATION_PRESETS = [
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '45m', value: 45 },
  { label: '1h',  value: 60 },
  { label: '2h',  value: 120 },
];

const BASE_XP_PER_HOUR = 100;
const LEGACY_RATE = 0.5;

// ── Sub-components ────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontFamily: mono, fontSize: 9,
      color: accentDim, letterSpacing: 2,
      display: 'flex', alignItems: 'center', gap: 8,
      margin: '16px 0 8px',
    }}>
      {label}
      <div style={{ flex: 1, height: 1, background: 'rgba(153,104,0,0.3)' }} />
    </div>
  );
}

function XPBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: bgTer, border: '1px solid hsl(var(--accent-dim))', height: 6, flex: 1 }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: accent,
        boxShadow: '0 0 6px rgba(255,176,0,0.4)',
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      border: '1px solid #ff3300', padding: '10px 12px',
      background: 'rgba(255,51,0,0.06)', marginTop: 8,
    }}>
      <div style={{ fontFamily: mono, fontSize: 10, color: '#ff4400', marginBottom: 8 }}>
        DELETE SKILL? This cannot be undone. All sessions will be preserved in XP log.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onConfirm} style={{
          flex: 1, height: 30, background: 'transparent',
          border: '1px solid #ff4400', color: '#ff4400',
          fontFamily: mono, fontSize: 10, cursor: 'pointer',
        }}>[ CONFIRM DELETE ]</button>
        <button onClick={onCancel} style={{
          flex: 1, height: 30, background: 'transparent',
          border: '1px solid hsl(var(--accent-dim))', color: dimText,
          fontFamily: mono, fontSize: 10, cursor: 'pointer',
        }}>[ CANCEL ]</button>
      </div>
    </div>
  );
}

// ── Inline Log Panel ──────────────────────────────────────────

function InlineLogPanel({ skill, onDone }: { skill: Skill; onDone: () => void }) {
  const { user } = useAuth();
  const { data: op } = useOperator(user?.id);
  const queryClient = useQueryClient();

  const [duration, setDuration]     = useState(60);
  const [activePreset, setActivePreset] = useState<number | null>(60);
  const [notes, setNotes]           = useState('');
  const [isLegacy, setIsLegacy]     = useState(false);
  const [logYesterday, setLogYesterday] = useState(false);
  const [tagCourseId, setTagCourseId] = useState('');
  const [split, setSplit]           = useState<number[]>(
    skill.default_split?.length === 2 ? skill.default_split : [50, 50]
  );

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

  const statKeys = (skill.stat_keys ?? []) as StatKey[];
  const hasDualStat = statKeys.length === 2;

  // XP preview
  const streak     = op?.streak ?? 0;
  const streakTier = getStreakTier(streak);
  const mult       = isLegacy ? 1.0 : (STREAK_MULTIPLIERS[streakTier] ?? 1.0);
  const legacyFactor = isLegacy ? LEGACY_RATE : 1.0;
  const base       = Math.floor((duration / 60) * BASE_XP_PER_HOUR);
  const skillXp    = Math.round(base * mult * legacyFactor);
  const statTotal  = Math.round(base * 0.6 * mult * legacyFactor);
  const masterXp   = Math.round(base * 0.3 * mult * legacyFactor);
  const statXps    = hasDualStat
    ? [Math.round(statTotal * split[0] / 100), Math.round(statTotal * split[1] / 100)]
    : [statTotal];
  const totalXp    = skillXp + statTotal + masterXp;

  const logMutation = useMutation({
    mutationFn: logSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['stats', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['skills', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['xp-recent', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['xp-log-by-stat'] });
      queryClient.invalidateQueries({ queryKey: ['skill-sessions', skill.id] });
      queryClient.invalidateQueries({ queryKey: ['skill', skill.id] });
      queryClient.invalidateQueries({ queryKey: ['checkins-heatmap', user?.id] });
      toast({
        title: '✓ SESSION LOGGED',
        description: `${skill.name}  ${duration}min  +${totalXp} XP`,
      });
      onDone();
    },
    onError: (err) => {
      toast({ title: 'ERROR', description: String(err) });
    },
  });

  const handleSubmit = () => {
    if (!user) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const statSplit = hasDualStat
      ? [
          { stat: statKeys[0], percent: split[0] },
          { stat: statKeys[1], percent: split[1] },
        ]
      : [{ stat: statKeys[0], percent: 100 }];

    logMutation.mutate({
      userId: user.id,
      skillId: skill.id,
      skillName: skill.name,
      durationMinutes: duration,
      statSplit,
      notes: notes || undefined,
      isLegacy,
      loggedAt: logYesterday ? yesterday : undefined,
    });
  };

  const handleSplitChange = (idx: number, val: number) => {
    const clamped = Math.max(10, Math.min(90, val));
    const next = [...split];
    next[idx] = clamped;
    next[1 - idx] = 100 - clamped;
    setSplit(next);
  };

  return (
    <div style={{
      margin: '0 0 8px',
      border: '1px solid hsl(var(--accent-dim))',
      background: 'hsl(var(--bg-secondary))',
      padding: '14px 14px 12px',
    }}>

      {/* Duration */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: accentDim, letterSpacing: 2, marginBottom: 6 }}>
          DURATION
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {DURATION_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => { setDuration(p.value); setActivePreset(p.value); }}
              style={{
                height: 26,
                padding: '0 8px',
                background: activePreset === p.value ? 'rgba(255,176,0,0.12)' : 'transparent',
                border: `1px solid ${activePreset === p.value ? accent : 'rgba(153,104,0,0.4)'}`,
                color: activePreset === p.value ? accent : dimText,
                fontFamily: mono, fontSize: 10, cursor: 'pointer',
              }}
            >{p.label}</button>
          ))}
          <span style={{ color: dimText, fontSize: 10, margin: '0 2px' }}>or</span>
          <input
            type="text" inputMode="numeric"
            value={duration}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '');
              setDuration(Number(v) || 1);
              setActivePreset(null);
            }}
            style={{
              width: 44, textAlign: 'center',
              background: bgTer,
              border: '1px solid hsl(var(--accent-dim))',
              color: accent, fontFamily: mono, fontSize: 11,
              padding: '3px 4px', outline: 'none',
            }}
          />
          <span style={{ color: dimText, fontSize: 10 }}>min</span>
        </div>
      </div>

      {/* Stat split — only for dual-stat skills */}
      {hasDualStat && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: accentDim, letterSpacing: 2, marginBottom: 6 }}>
            STAT SPLIT
          </div>
          {statKeys.map((k, i) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: accent, width: 56, flexShrink: 0 }}>
                {STAT_META[k]?.icon} {k.toUpperCase()}
              </span>
              <input
                type="range" min={10} max={90}
                value={split[i]}
                onChange={e => handleSplitChange(i, Number(e.target.value))}
                style={{ flex: 1, accentColor: 'hsl(var(--accent))' }}
              />
              <span style={{ fontSize: 10, color: dimText, width: 30, textAlign: 'right', flexShrink: 0 }}>
                {split[i]}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: accentDim, letterSpacing: 2, marginBottom: 6 }}>
          NOTES
        </div>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="notes for this session..."
          maxLength={100}
          style={{
            width: '100%', background: bgTer,
            border: '1px solid hsl(var(--accent-dim))',
            color: accent, fontFamily: mono, fontSize: 11,
            padding: '5px 8px', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Tag to */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: accentDim, letterSpacing: 2, marginBottom: 6 }}>
          TAG TO
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <select
              value={tagCourseId}
              onChange={e => setTagCourseId(e.target.value)}
              style={{
                width: '100%', appearance: 'none',
                background: bgTer, border: `1px solid ${tagCourseId ? accentDim : 'rgba(153,104,0,0.3)'}`,
                color: tagCourseId ? accent : dimText,
                fontFamily: mono, fontSize: 10,
                padding: '5px 24px 5px 8px', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="">course</option>
              {(activeCourses ?? []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: dimText, fontSize: 8, pointerEvents: 'none' }}>▾</span>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <select disabled style={{
              width: '100%', appearance: 'none',
              background: bgTer, border: '1px solid rgba(153,104,0,0.2)',
              color: 'rgba(153,104,0,0.3)', fontFamily: mono, fontSize: 10,
              padding: '5px 24px 5px 8px', outline: 'none', cursor: 'not-allowed',
            }}>
              <option>no active projects</option>
            </select>
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(153,104,0,0.3)', fontSize: 8, pointerEvents: 'none' }}>▾</span>
          </div>
        </div>
      </div>

      {/* Options row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {[
          { label: 'LEGACY', value: isLegacy, set: setIsLegacy },
          { label: 'YESTERDAY', value: logYesterday, set: setLogYesterday },
        ].map(opt => (
          <div
            key={opt.label}
            onClick={() => opt.set(!opt.value)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <div style={{
              width: 12, height: 12,
              border: `1px solid ${opt.value ? accent : 'rgba(153,104,0,0.4)'}`,
              background: opt.value ? 'rgba(255,176,0,0.15)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, color: accent,
            }}>
              {opt.value ? '×' : ''}
            </div>
            <span style={{ fontFamily: mono, fontSize: 9, color: opt.value ? accent : dimText, letterSpacing: 1 }}>
              {opt.label}
            </span>
          </div>
        ))}
      </div>

      {/* XP preview + submit */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        borderTop: '1px solid rgba(153,104,0,0.3)', paddingTop: 10,
      }}>
        {/* XP numbers */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: accentDim, letterSpacing: 1, marginBottom: 3 }}>
            XP PREVIEW
          </div>
          <div style={{ fontFamily: mono, fontSize: 9, color: dimText, lineHeight: 1.7 }}>
            <span style={{ color: accent }}>+{skillXp}</span> skill ·{' '}
            <span style={{ color: accent }}>+{statTotal}</span>{' '}
            {hasDualStat
              ? `${statKeys[0].toUpperCase()} / ${statKeys[1].toUpperCase()}`
              : statKeys[0]?.toUpperCase()} ·{' '}
            <span style={{ color: accent }}>+{masterXp}</span> master
          </div>
          <div style={{ fontFamily: vt, fontSize: 15, color: 'hsl(var(--accent-bright))', marginTop: 2 }}>
            TOTAL +{totalXp} XP
            {mult > 1 && (
              <span style={{ fontFamily: mono, fontSize: 9, color: accentDim, marginLeft: 8 }}>
                {mult.toFixed(1)}×
              </span>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button
            onClick={handleSubmit}
            disabled={logMutation.isPending}
            style={{
              height: 34, padding: '0 16px',
              border: `1px solid ${accent}`,
              background: 'transparent', color: accent,
              fontFamily: mono, fontSize: 10, cursor: 'pointer',
              letterSpacing: 1, opacity: logMutation.isPending ? 0.5 : 1,
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = accent; e.currentTarget.style.color = 'hsl(var(--bg-primary))'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = accent; }}
          >
            {logMutation.isPending ? 'LOGGING...' : '>> LOG SESSION'}
          </button>
          <button
            onClick={onDone}
            style={{
              height: 26, padding: '0 16px',
              border: '1px solid rgba(153,104,0,0.4)',
              background: 'transparent', color: dimText,
              fontFamily: mono, fontSize: 9, cursor: 'pointer',
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function SkillDetailDrawer({ skillId, onClose, onOpenLog }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notesValue, setNotesValue]   = useState<string | null>(null);
  const [showDelete, setShowDelete]   = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue]     = useState('');
  const [showLog, setShowLog]         = useState(false);

  // ── Fetch skill ───────────────────────────────────────────

  const { data: skill, isLoading } = useQuery({
    queryKey: ['skill', skillId],
    enabled: !!skillId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('id', skillId)
        .single();
      if (error) throw error;
      return data as Skill;
    },
  });

  // ── Fetch recent sessions ─────────────────────────────────

  const { data: sessions } = useQuery({
    queryKey: ['skill-sessions', skillId],
    enabled: !!skillId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, duration_minutes, logged_at, notes, skill_xp_awarded')
        .eq('skill_id', skillId)
        .order('logged_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as SessionRow[];
    },
  });

  // ── Mutations ─────────────────────────────────────────────

  const saveName = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('skills').update({ name: name.trim() }).eq('id', skillId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill', skillId] });
      queryClient.invalidateQueries({ queryKey: ['skills', user?.id] });
      setEditingName(false);
    },
  });

  const deleteSkill = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('skills').delete().eq('id', skillId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', user?.id] });
      onClose?.();
    },
  });

  // ── Loading / not found ───────────────────────────────────

  if (isLoading) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dimText }}>LOADING...</div>;
  if (!skill)    return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dimText }}>SKILL NOT FOUND</div>;

  const statKeys = (skill.stat_keys ?? []) as StatKey[];
  const split    = skill.default_split ?? [];
  const { xpInLevel, xpForLevel } = getStatLevel(skill.xp);
  const xpPct    = xpForLevel > 0 ? Math.min(100, Math.round((xpInLevel / xpForLevel) * 100)) : 100;

  // ── Render ────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>

      {/* ── Header ── */}
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: '1px solid hsl(var(--accent-dim))',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 9, color: accentDim, letterSpacing: 2, marginBottom: 6 }}>// SKILL</div>

        {/* Name — editable */}
        {editingName ? (
          <input
            autoFocus value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && nameValue.trim()) saveName.mutate(nameValue.trim());
              if (e.key === 'Escape') setEditingName(false);
            }}
            onBlur={() => { if (nameValue.trim()) saveName.mutate(nameValue.trim()); else setEditingName(false); }}
            style={{
              fontFamily: vt, fontSize: 24,
              background: 'transparent', border: 'none',
              borderBottom: `1px solid ${accent}`,
              color: accent, width: '100%', outline: 'none', marginBottom: 6,
            }}
          />
        ) : (
          <div
            onClick={() => { setNameValue(skill.name); setEditingName(true); }}
            title="Click to rename"
            style={{
              fontFamily: vt, fontSize: 24, color: accent,
              textShadow: '0 0 10px rgba(255,176,0,0.3)',
              lineHeight: 1.1, marginBottom: 4, cursor: 'text',
            }}
          >
            {skill.icon} {skill.name}
          </div>
        )}

        {/* Stat tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {statKeys.map((k, i) => (
            <span key={k} style={{
              fontSize: 9, color: accentDim,
              border: '1px solid hsl(var(--accent-dim))',
              padding: '1px 6px', letterSpacing: 1,
            }}>
              {STAT_META[k]?.icon} {k.toUpperCase()}{split[i] != null ? ` ${split[i]}%` : ''}
            </span>
          ))}
        </div>

        {/* XP bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: vt, fontSize: 16, color: accent, flexShrink: 0 }}>LVL {skill.level}</span>
          <XPBar value={xpInLevel} max={xpForLevel} />
          <span style={{ fontSize: 10, color: dimText, flexShrink: 0 }}>{xpPct}%</span>
        </div>
        <div style={{ fontSize: 9, color: accentDim }}>
          {xpInLevel.toLocaleString()} / {xpForLevel.toLocaleString()} XP to LVL {skill.level + 1}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '4px 20px 20px',
        scrollbarWidth: 'thin',
        scrollbarColor: `${accentDim} ${bgSec}`,
      }}>

        {/* ── Log session — inline panel ── */}
        <SectionLabel label="LOG SESSION" />
        {showLog ? (
          <InlineLogPanel skill={skill} onDone={() => setShowLog(false)} />
        ) : (
          <button
            onClick={() => setShowLog(true)}
            style={{
              width: '100%', height: 36,
              border: `1px solid ${accent}`,
              background: 'transparent', color: accent,
              fontFamily: mono, fontSize: 11,
              cursor: 'pointer', marginBottom: 4, letterSpacing: 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = accent; e.currentTarget.style.color = 'hsl(var(--bg-primary))'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = accent; }}
          >
            [ &gt;&gt; LOG SESSION ]
          </button>
        )}

        {/* ── Recent sessions ── */}
        <SectionLabel label="RECENT SESSIONS" />
        {!sessions || sessions.length === 0 ? (
          <div style={{ fontSize: 10, color: dimText, opacity: 0.5 }}>No sessions logged yet.</div>
        ) : (
          sessions.map(s => {
            const date = new Date(s.logged_at).toLocaleDateString('en-CA').replace(/-/g, '.');
            return (
              <div key={s.id} style={{
                display: 'flex', gap: 10,
                fontFamily: mono, fontSize: 10,
                marginBottom: 5, alignItems: 'flex-start',
              }}>
                <span style={{ color: accentDim, flexShrink: 0 }}>&gt;</span>
                <span style={{ color: dimText, flexShrink: 0, width: 80 }}>{date}</span>
                <span style={{ color: accent, flexShrink: 0 }}>{s.duration_minutes} min</span>
                {s.notes && <span style={{ color: dimText, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.notes}</span>}
                <span style={{ color: '#44ff88', flexShrink: 0, marginLeft: 'auto' }}>+{s.skill_xp_awarded} XP</span>
              </div>
            );
          })
        )}

        {/* ── Stat split ── */}
        {statKeys.length > 0 && (
          <>
            <SectionLabel label="STAT SPLIT" />
            {statKeys.map((k, i) => {
              const pct = split[i] ?? Math.round(100 / statKeys.length);
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: accent, width: 64, flexShrink: 0 }}>
                    {STAT_META[k]?.icon} {k.toUpperCase()}
                  </span>
                  <div style={{ flex: 1, height: 5, background: bgTer, border: '1px solid hsl(var(--accent-dim))' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: accent, boxShadow: '0 0 4px rgba(255,176,0,0.4)' }} />
                  </div>
                  <span style={{ fontSize: 10, color: dimText, width: 32, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                </div>
              );
            })}
          </>
        )}

        {/* ── Notes ── */}
        <SectionLabel label="NOTES" />
        <textarea
          value={notesValue ?? (skill.notes ?? '')}
          onChange={e => setNotesValue(e.target.value)}
          onBlur={async e => {
            await supabase.from('skills').update({ notes: e.target.value.trim() || null }).eq('id', skillId);
            queryClient.invalidateQueries({ queryKey: ['skill', skillId] });
            queryClient.invalidateQueries({ queryKey: ['skills', user?.id] });
          }}
          placeholder="Add notes about this skill..."
          rows={3}
          style={{
            width: '100%', background: bgSec,
            border: '1px solid rgba(153,104,0,0.4)',
            color: dimText, fontFamily: mono, fontSize: 11,
            lineHeight: 1.6, padding: '8px 10px',
            outline: 'none', resize: 'vertical', boxSizing: 'border-box',
          }}
          onFocus={e => (e.target.style.borderColor = accentDim)}
          onBlurCapture={e => (e.target.style.borderColor = 'rgba(153,104,0,0.4)')}
        />

        {/* ── Actions ── */}
        <div style={{ height: 1, background: 'rgba(153,104,0,0.3)', margin: '20px 0 16px' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setNameValue(skill.name); setEditingName(true); }}
            style={{
              flex: 1, height: 32,
              border: '1px solid hsl(var(--accent-dim))',
              background: 'transparent', color: accentDim,
              fontFamily: mono, fontSize: 10, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = accentDim; e.currentTarget.style.color = accentDim; }}
          >[ RENAME ]</button>
          <button
            onClick={() => setShowDelete(v => !v)}
            style={{
              flex: 1, height: 32,
              border: '1px solid rgba(153,104,0,0.4)',
              background: 'transparent', color: dimText,
              fontFamily: mono, fontSize: 10, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4400'; e.currentTarget.style.color = '#ff4400'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)'; e.currentTarget.style.color = dimText; }}
          >[ DELETE ]</button>
        </div>

        {showDelete && (
          <DeleteConfirm
            onConfirm={() => deleteSkill.mutate()}
            onCancel={() => setShowDelete(false)}
          />
        )}
      </div>
    </div>
  );
}