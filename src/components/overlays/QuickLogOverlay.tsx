// src/components/overlays/QuickLogOverlay.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { useSkills } from '@/hooks/useSkills';
import { previewXP, awardSessionXP, awardBonusXP } from '@/services/xpService';
import { triggerXPFloat } from '@/components/effects/XPFloatLayer';
import { triggerLevelUp } from '@/components/effects/LevelUpAnimation';
import { STAT_META, StatKey } from '@/types';
import { toast } from '@/hooks/use-toast';

// ── Constants ─────────────────────────────────────────────────
const mono  = "'IBM Plex Mono', monospace";
const vt    = "'VT323', monospace";
const acc   = 'hsl(var(--accent))';
const adim  = 'hsl(var(--accent-dim))';
const dim   = 'hsl(var(--text-dim))';
const bgP   = 'hsl(var(--bg-primary))';
const bgS   = 'hsl(var(--bg-secondary))';
const bgT   = 'hsl(var(--bg-tertiary))';
const green = '#44ff88';
const cyan  = '#00cfff';
const purple= '#cc88ff';
const teal  = '#44ffaa';

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];
const STAT_KEYS: StatKey[] = ['body','wire','mind','cool','grit','flow','ghost'];

// ── Types ─────────────────────────────────────────────────────
interface TaggedTool     { id: string; name: string; type: string; }
interface TaggedAugment  { id: string; name: string; category: string; }
interface TaggedMedia    { id: string; title: string; type: string; status: string; pages?: number; page_current?: number; }
interface TaggedCourse   { id: string; name: string; sections: { id: string; title: string; completed_at: string | null }[]; }
interface TaggedProject  { id: string; name: string; objectives: { id: string; title: string; completed_at: string | null }[]; }

// ── Small helpers ─────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 5, fontFamily: mono }}>{children}</div>;
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px', fontFamily: mono }}>
      <div style={{ height: 1, flex: 1, background: 'rgba(153,104,0,0.3)' }} />
      <span style={{ fontSize: 9, color: adim, letterSpacing: 2 }}>{label}</span>
      <div style={{ height: 1, flex: 1, background: 'rgba(153,104,0,0.3)' }} />
    </div>
  );
}

// ── Autosuggest search input ──────────────────────────────────
function AutoSearch<T extends { id: string; name: string; sub?: string }>({
  placeholder, onSelect, items, selectedIds = [], color = acc,
}: {
  placeholder: string;
  onSelect: (item: T) => void;
  items: T[];
  selectedIds?: string[];
  color?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 12);
    return items.filter(i => i.name.toLowerCase().includes(query.toLowerCase())).slice(0, 12);
  }, [query, items]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '6px 10px', fontSize: 10, background: bgS, border: `1px solid ${open ? color : adim}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: bgS, border: `1px solid ${adim}`, zIndex: 200, maxHeight: 160, overflowY: 'auto' as const, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          {filtered.map(item => {
            const isSel = selectedIds.includes(item.id);
            return (
              <div key={item.id} onMouseDown={() => { onSelect(item); setQuery(''); setOpen(false); }}
                style={{ padding: '6px 10px', fontSize: 10, cursor: 'pointer', color: isSel ? color : dim, background: isSel ? 'rgba(255,176,0,0.06)' : 'transparent', display: 'flex', justifyContent: 'space-between', fontFamily: mono, borderBottom: `1px solid rgba(153,104,0,0.15)` }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,176,0,0.08)'}
                onMouseLeave={e => { e.currentTarget.style.background = isSel ? 'rgba(255,176,0,0.06)' : 'transparent'; }}>
                <span>{item.name}</span>
                {item.sub && <span style={{ fontSize: 9, opacity: 0.5 }}>{item.sub}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tag chip ──────────────────────────────────────────────────
function Tag({ label, color, onRemove }: { label: string; color: string; onRemove: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, color, border: `1px solid ${color}`, padding: '2px 8px', fontFamily: mono, marginRight: 4, marginBottom: 4 }}>
      {label}
      <span onClick={onRemove} style={{ cursor: 'pointer', opacity: 0.6 }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>×</span>
    </span>
  );
}

// ── Collapsible tag section ───────────────────────────────────
function TagSection({ label, color, hasItems, children }: { label: string; color: string; hasItems: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 6 }}>
      <button onClick={() => setOpen(v => !v)} style={{
        background: 'transparent', border: `1px solid ${hasItems ? color : adim}`,
        color: hasItems ? color : adim, fontFamily: mono, fontSize: 9, cursor: 'pointer',
        padding: '3px 10px', letterSpacing: 1, width: '100%', textAlign: 'left',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{hasItems ? '●' : '○'} {label}</span>
        <span>{open ? '▴' : '▾'}</span>
      </button>
      {open && <div style={{ border: `1px solid rgba(153,104,0,0.3)`, borderTop: 'none', padding: '10px 12px', background: bgS }}>{children}</div>}
    </div>
  );
}

// ── XP Preview panel ──────────────────────────────────────────
function XPPreview({ duration, statSplit, toolIds, augIds, isLegacy, toolNames, augNames }: {
  duration: number; statSplit: { stat: string; percent: number }[];
  toolIds: string[]; augIds: string[]; isLegacy: boolean;
  toolNames: Record<string, string>; augNames: Record<string, string>;
}) {
  if (!duration || statSplit.length === 0) return null;
  const p = previewXP({ durationMinutes: duration, statSplit, toolIds, augmentIds: augIds, isLegacy });
  return (
    <div style={{ background: bgT, border: `1px solid ${adim}`, padding: '10px 12px', fontFamily: mono }}>
      <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>// XP PREVIEW</div>

      {/* Main XP */}
      <div style={{ marginBottom: toolIds.length > 0 || augIds.length > 0 ? 8 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: adim }}>MAIN XP</span>
          <span style={{ fontFamily: vt, fontSize: 16, color: acc }}>{p.skillXP + p.masterXP + p.statXP.reduce((a, s) => a + s.amount, 0)}</span>
        </div>
        <div style={{ paddingLeft: 8 }}>
          <div style={{ fontSize: 9, color: dim, display: 'flex', justifyContent: 'space-between' }}>
            <span>SKILL</span><span style={{ color: acc }}>+{p.skillXP}</span>
          </div>
          {p.statXP.map(s => (
            <div key={s.stat} style={{ fontSize: 9, color: dim, display: 'flex', justifyContent: 'space-between' }}>
              <span>{s.stat.toUpperCase()}</span><span style={{ color: acc }}>+{s.amount}</span>
            </div>
          ))}
          <div style={{ fontSize: 9, color: dim, display: 'flex', justifyContent: 'space-between' }}>
            <span>MASTER</span><span style={{ color: acc }}>+{p.masterXP}</span>
          </div>
        </div>
      </div>

      {/* Tool XP */}
      {toolIds.length > 0 && p.perToolXP > 0 && (
        <div style={{ marginBottom: augIds.length > 0 ? 8 : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: adim }}>TOOL XP</span>
            <span style={{ fontFamily: vt, fontSize: 16, color: cyan }}>{p.totalToolXP}</span>
          </div>
          <div style={{ paddingLeft: 8 }}>
            {toolIds.map(id => (
              <div key={id} style={{ fontSize: 9, color: dim, display: 'flex', justifyContent: 'space-between' }}>
                <span>{(toolNames[id] ?? id).toUpperCase()}</span><span style={{ color: cyan }}>+{p.perToolXP}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Augment XP */}
      {augIds.length > 0 && p.perAugmentXP > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: adim }}>AUGMENT XP</span>
            <span style={{ fontFamily: vt, fontSize: 16, color: purple }}>{p.totalAugmentXP}</span>
          </div>
          <div style={{ paddingLeft: 8 }}>
            {augIds.map(id => (
              <div key={id} style={{ fontSize: 9, color: dim, display: 'flex', justifyContent: 'space-between' }}>
                <span>{(augNames[id] ?? id).toUpperCase()}</span><span style={{ color: purple }}>+{p.perAugmentXP}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLegacy && <div style={{ fontSize: 9, color: '#ffaa00', marginTop: 6, letterSpacing: 1 }}>⚑ LEGACY — 50% XP</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
interface Props { open: boolean; onClose: () => void; }

export default function QuickLogOverlay({ open, onClose }: Props) {
  const queryClient = useQueryClient();

  // Core
  const [statFilter, setStatFilter]   = useState<StatKey | null>(null);
  const [skillId, setSkillId]         = useState('');
  const [skillName, setSkillName]     = useState('');
  const [skillStatKeys, setSkillStatKeys] = useState<StatKey[]>([]);
  const [skillDefaultSplit, setSkillDefaultSplit] = useState<number[]>([100]);
  const [duration, setDuration]       = useState(60);
  const [customDuration, setCustomDuration] = useState('');
  const [useCustom, setUseCustom]     = useState(false);
  const [statSplit, setStatSplit]     = useState<{ stat: StatKey; percent: number }[]>([]);
  const [notes, setNotes]             = useState('');
  const [isLegacy, setIsLegacy]       = useState(false);
  const [logDate, setLogDate]         = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const submitLock = React.useRef(false);

  // Tagged
  const [tools, setTools]         = useState<TaggedTool[]>([]);
  const [augments, setAugments]   = useState<TaggedAugment[]>([]);
  const [media, setMedia]         = useState<TaggedMedia | null>(null);
  const [mediaPage, setMediaPage] = useState('');
  const [mediaFinished, setMediaFinished] = useState(false);
  const [course, setCourse]       = useState<TaggedCourse | null>(null);
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [markCourseComplete, setMarkCourseComplete] = useState(false);
  const [project, setProject]     = useState<TaggedProject | null>(null);
  const [completedObjectives, setCompletedObjectives] = useState<string[]>([]);

  // Tool/augment filter
  const [toolTypeFilter, setToolTypeFilter]   = useState<string | null>(null);
  const [augClusterFilter, setAugClusterFilter] = useState<string | null>(null);

  // Data queries
  const { data: allSkills = [] } = useSkills();
  const { data: allTools = [] }  = useQuery({
    queryKey: ['tools'],
    queryFn: async () => {
      const db = await getDB();
      const r  = await db.query<{ id: string; name: string; type: string; active: boolean }>(`SELECT id, name, type, active FROM tools ORDER BY name;`);
      return r.rows.filter(t => t.active);
    },
  });
  const { data: allAugments = [] } = useQuery({
    queryKey: ['augments'],
    queryFn: async () => {
      const db = await getDB();
      const r  = await db.query<{ id: string; name: string; category: string; active: boolean }>(`SELECT id, name, category, active FROM augments ORDER BY name;`);
      return r.rows.filter(a => a.active);
    },
  });
  const { data: allMedia = [] } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const db = await getDB();
      const r  = await db.query<{ id: string; title: string; type: string; status: string; pages: number | null; page_current: number | null }>(`SELECT id, title, type, status, pages, page_current FROM media WHERE status != 'FINISHED' ORDER BY title;`);
      return r.rows;
    },
  });
  const { data: allCourses = [] } = useQuery({
    queryKey: ['courses-all'],
    queryFn: async () => {
      const db = await getDB();
      const r  = await db.query<{ id: string; name: string; status: string }>(`SELECT id, name, status FROM courses WHERE status != 'COMPLETE' ORDER BY name;`);
      return r.rows;
    },
  });
  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const db = await getDB();
      const r  = await db.query<{ id: string; name: string; status: string }>(`SELECT id, name, status FROM projects WHERE status = 'ACTIVE' ORDER BY name;`);
      return r.rows;
    },
  });

  // Reset on close
  useEffect(() => {
    if (!open) return;
    setStatFilter(null); setSkillId(''); setSkillName(''); setSkillStatKeys([]); setSkillDefaultSplit([100]);
    setDuration(60); setCustomDuration(''); setUseCustom(false); setStatSplit([]);
    setNotes(''); setIsLegacy(false); setLogDate('');
    setTools([]); setAugments([]); setMedia(null); setMediaPage(''); setMediaFinished(false);
    setCourse(null); setCompletedSections([]); setMarkCourseComplete(false);
    setProject(null); setCompletedObjectives([]);
    setToolTypeFilter(null); setAugClusterFilter(null);
  }, [open]);

  // When skill selected — set stat split from default
  const handleSelectSkill = (skill: { id: string; name: string; statKeys: StatKey[]; defaultSplit: number[] }) => {
    setSkillId(skill.id);
    setSkillName(skill.name);
    setSkillStatKeys(skill.statKeys);
    setSkillDefaultSplit(skill.defaultSplit);
    const split = skill.statKeys.map((stat, i) => ({ stat, percent: skill.defaultSplit[i] ?? Math.floor(100 / skill.statKeys.length) }));
    setStatSplit(split);
  };

  // When course selected — load sections
  const handleSelectCourse = async (c: { id: string; name: string }) => {
    const db = await getDB();
    const r  = await db.query<{ id: string; title: string; completed_at: string | null }>(
      `SELECT id, title, completed_at FROM course_sections WHERE course_id = $1 ORDER BY sort_order;`, [c.id]
    );
    setCourse({ id: c.id, name: c.name, sections: r.rows });
    setCompletedSections([]);
  };

  // When project selected — load objectives
  const handleSelectProject = async (p: { id: string; name: string }) => {
    const db = await getDB();
    const r  = await db.query<{ id: string; title: string; completed_at: string | null }>(
      `SELECT id, title, completed_at FROM project_milestones WHERE project_id = $1 ORDER BY sort_order;`, [p.id]
    );
    setProject({ id: p.id, name: p.name, objectives: r.rows });
    setCompletedObjectives([]);
  };

  const effectiveDuration = useCustom ? (parseInt(customDuration) || 0) : duration;

  // Filter skills by stat
  const filteredSkills = useMemo(() =>
    statFilter ? allSkills.filter(s => s.statKeys.includes(statFilter)) : allSkills,
    [allSkills, statFilter]
  );

  // Filter tools/augments
  const filteredTools    = useMemo(() => toolTypeFilter ? allTools.filter(t => t.type === toolTypeFilter) : allTools, [allTools, toolTypeFilter]);
  const filteredAugments = useMemo(() => augClusterFilter ? allAugments.filter(a => a.category === augClusterFilter) : allAugments, [allAugments, augClusterFilter]);

  const toolTypes    = useMemo(() => [...new Set(allTools.map(t => t.type))].sort(), [allTools]);
  const augClusters  = useMemo(() => [...new Set(allAugments.map(a => a.category))].sort(), [allAugments]);

  const toolNames = useMemo(() => Object.fromEntries(tools.map(t => [t.id, t.name])), [tools]);
  const augNames  = useMemo(() => Object.fromEntries(augments.map(a => [a.id, a.name])), [augments]);

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!skillId || !effectiveDuration) return;
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      const db        = await getDB();
      const sessionId = crypto.randomUUID();
      const loggedAt  = logDate ? new Date(logDate).toISOString() : new Date().toISOString();
      const toolIds   = tools.map(t => t.id);
      const augIds    = augments.map(a => a.id);

      // Calculate XP first so we can store it in the session record
      const factor    = isLegacy ? 0.5 : 1.0;
      const base      = effectiveDuration * 10 * factor;
      const skillXP   = Math.floor(base * 0.5);
      const masterXP  = Math.floor(base * 0.25);
      const perToolXP = toolIds.length > 0 ? Math.floor(base / toolIds.length) : 0;
      const perAugXP  = augIds.length > 0  ? Math.floor(base / augIds.length)  : 0;

      await db.query(
        `INSERT INTO sessions (id, skill_id, skill_name, duration_minutes, stat_split, notes,
          is_legacy, logged_at, skill_xp, master_xp,
          tool_ids, total_tool_xp, augment_ids, total_augment_xp,
          media_id, course_id, project_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [sessionId, skillId, skillName, effectiveDuration,
         JSON.stringify(statSplit), notes.trim() || null,
         isLegacy, loggedAt, skillXP, masterXP,
         JSON.stringify(toolIds), perToolXP * toolIds.length,
         JSON.stringify(augIds), perAugXP * augIds.length,
         media?.id ?? null, course?.id ?? null, project?.id ?? null]
      );

      // Award XP
      const xpResult = await awardSessionXP({ sessionId, skillId, durationMinutes: effectiveDuration, statSplit, toolIds, augmentIds: augIds, isLegacy });

      // Fire XP float animation — centre of screen
      const totalAwarded = xpResult.skillXP + xpResult.masterXP;
      triggerXPFloat(window.innerWidth / 2, window.innerHeight / 2 - 60, xpResult.skillXP, undefined, false);
      if (xpResult.masterXP > 0) setTimeout(() => triggerXPFloat(window.innerWidth / 2 + 60, window.innerHeight / 2 - 80, xpResult.masterXP, undefined, false), 200);
      if (xpResult.perToolXP > 0 && toolIds.length > 0) setTimeout(() => triggerXPFloat(window.innerWidth / 2 - 60, window.innerHeight / 2 - 40, xpResult.perToolXP * toolIds.length, undefined, false), 400);

      // Fire level up animation if master leveled up
      if (xpResult.masterLeveledUp) {
        setTimeout(() => {
          triggerLevelUp({
            level: xpResult.newMasterLevel,
            className: 'OPERATOR',
            totalXP: xpResult.masterTotalXP,
            unlocks: xpResult.newMasterLevel === 3  ? ['GREEN PHOSPHOR THEME'] :
                     xpResult.newMasterLevel === 5  ? ['DOS CLASSIC THEME'] :
                     xpResult.newMasterLevel === 7  ? ['BLOOD RED THEME'] :
                     xpResult.newMasterLevel === 9  ? ['ICE BLUE THEME'] :
                     xpResult.newMasterLevel === 10 ? ['CUSTOM TERMINAL PROMPT'] : [],
          });
        }, 800);
      }

      // Media updates
      if (media) {
        const updates: string[] = [];
        if (mediaPage && media.type === 'book') updates.push(`page_current = ${parseInt(mediaPage)}`);
        if (mediaFinished) {
          updates.push(`status = 'FINISHED'`, `completed_at = '${new Date().toISOString()}'`);
        }
        if (updates.length > 0) {
          await db.exec(`UPDATE media SET ${updates.join(', ')} WHERE id = '${media.id}';`);
        }
        if (mediaFinished && statSplit.length > 0) {
          const MEDIA_BONUS: Record<string, number> = { book: 100, comic: 50, film: 40, documentary: 50, tv: 75, album: 30, game: 60 };
          const bonus = Math.floor((MEDIA_BONUS[media.type] ?? 40) * (isLegacy ? 0.5 : 1));
          await awardBonusXP({ source: `${media.type}_complete`, sourceId: media.id, statKey: statSplit[0].stat, amount: bonus, notes: media.title });
        }
      }

      // Course section completions
      if (course && completedSections.length > 0) {
        const totalSections = course.sections.length || 1;
        const sectionBonus  = Math.floor(totalSections * 100 * (isLegacy ? 0.5 : 1));
        for (const secId of completedSections) {
          await db.query(`UPDATE course_sections SET completed_at = $1 WHERE id = $2;`, [new Date().toISOString(), secId]);
          if (statSplit.length > 0) {
            const sec = course.sections.find(s => s.id === secId);
            await awardBonusXP({ source: 'course_section', sourceId: secId, statKey: statSplit[0].stat, amount: sectionBonus, notes: `${course.name} — ${sec?.title ?? ''}` });
          }
        }
      }
      if (course && markCourseComplete) {
        await db.exec(`UPDATE courses SET status = 'COMPLETE', progress = 100, completed_at = '${new Date().toISOString()}' WHERE id = '${course.id}';`);
        const totalSections = course.sections.length || 1;
        const courseBonus   = Math.floor(totalSections * 100 * (isLegacy ? 0.5 : 1));
        if (statSplit.length > 0) await awardBonusXP({ source: 'course_complete', sourceId: course.id, statKey: statSplit[0].stat, amount: courseBonus, notes: `${course.name} — complete` });
      }

      // Project objectives
      if (project && completedObjectives.length > 0) {
        for (const objId of completedObjectives) {
          await db.query(`UPDATE project_milestones SET completed_at = $1 WHERE id = $2;`, [new Date().toISOString(), objId]);
        }
      }

      // Invalidate everything — broad sweep so all widgets update immediately
      queryClient.invalidateQueries();

      toast({ title: '✓ SESSION LOGGED', description: `${skillName} — ${effectiveDuration}m` });
      onClose();
    } catch (err) {
      toast({ title: 'ERROR', description: String(err) });
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  };

  if (!open) return null;

  const canSubmit = !!skillId && effectiveDuration > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div style={{ width: '100%', maxWidth: 760, maxHeight: '90vh', background: bgP, border: `1px solid ${adim}`, display: 'flex', flexDirection: 'column', fontFamily: mono, boxShadow: `0 0 40px rgba(255,176,0,0.1)` }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontFamily: vt, fontSize: 20, color: acc }}>// QUICK LOG</span>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${adim}`, color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer', padding: '3px 10px' }}>× CLOSE  ESC</button>
        </div>

        {/* Body — two columns */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 0 }}>

            {/* Left column — form */}
            <div style={{ padding: '16px 20px', borderRight: `1px solid ${adim}` }}>

              {/* Stat filter */}
              <div style={{ marginBottom: 12 }}>
                <Label>FILTER BY STAT</Label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {STAT_KEYS.map(k => {
                    const m   = STAT_META[k];
                    const on  = statFilter === k;
                    return (
                      <button key={k} onClick={() => setStatFilter(on ? null : k)} style={{ padding: '3px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${on ? acc : adim}`, background: on ? 'rgba(255,176,0,0.1)' : 'transparent', color: on ? acc : dim }}>
                        {m.icon} {k.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Skill */}
              <div style={{ marginBottom: 12 }}>
                <Label>SKILL <span style={{ color: acc }}>*</span></Label>
                {skillId ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: bgS, border: `1px solid ${acc}` }}>
                    <span style={{ flex: 1, fontSize: 11, color: acc }}>{skillName}</span>
                    <span onClick={() => { setSkillId(''); setSkillName(''); setSkillStatKeys([]); setStatSplit([]); }} style={{ fontSize: 9, color: adim, cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ff4400'}
                      onMouseLeave={e => e.currentTarget.style.color = adim}>× CHANGE</span>
                  </div>
                ) : (
                  <AutoSearch
                    placeholder="Type skill name..."
                    items={filteredSkills.map(s => ({ id: s.id, name: s.name, sub: s.statKeys.join('/').toUpperCase() }))}
                    onSelect={(item) => {
                      const skill = allSkills.find(s => s.id === item.id);
                      if (skill) handleSelectSkill(skill);
                    }}
                    color={acc}
                  />
                )}
              </div>

              {/* Duration */}
              <div style={{ marginBottom: 12 }}>
                <Label>DURATION <span style={{ color: acc }}>*</span></Label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                  {DURATION_PRESETS.map(d => (
                    <button key={d} onClick={() => { setDuration(d); setUseCustom(false); }} style={{ padding: '3px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${!useCustom && duration === d ? acc : adim}`, background: !useCustom && duration === d ? 'rgba(255,176,0,0.1)' : 'transparent', color: !useCustom && duration === d ? acc : dim }}>{d}m</button>
                  ))}
                  <button onClick={() => setUseCustom(true)} style={{ padding: '3px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${useCustom ? acc : adim}`, background: useCustom ? 'rgba(255,176,0,0.1)' : 'transparent', color: useCustom ? acc : dim }}>CUSTOM</button>
                </div>
                {useCustom && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input value={customDuration} onChange={e => setCustomDuration(e.target.value.replace(/\D/g, ''))} autoFocus placeholder="minutes" style={{ width: 80, padding: '5px 8px', fontSize: 11, background: bgS, border: `1px solid ${acc}`, color: acc, fontFamily: mono, outline: 'none' }} />
                    <span style={{ fontSize: 10, color: dim }}>minutes</span>
                  </div>
                )}
              </div>

              {/* Stat split — only if 2 stats */}
              {skillStatKeys.length === 2 && (
                <div style={{ marginBottom: 12 }}>
                  <Label>STAT SPLIT</Label>
                  {statSplit.map((s, i) => (
                    <div key={s.stat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 9, color: acc, width: 50, flexShrink: 0 }}>{s.stat.toUpperCase()}</span>
                      <input type="range" min={0} max={100} value={s.percent}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          setStatSplit([{ stat: statSplit[0].stat, percent: i === 0 ? val : 100 - val }, { stat: statSplit[1].stat, percent: i === 0 ? 100 - val : val }]);
                        }}
                        style={{ flex: 1, accentColor: acc }} />
                      <span style={{ fontSize: 10, color: dim, width: 32, textAlign: 'right', flexShrink: 0 }}>{s.percent}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              <div style={{ marginBottom: 12 }}>
                <Label>NOTES <span style={{ opacity: 0.5 }}>(optional)</span></Label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Session notes..."
                  style={{ width: '100%', padding: '6px 10px', fontSize: 10, background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>

              {/* Options */}
              <div style={{ marginBottom: 14, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 9, color: isLegacy ? '#ffaa00' : adim, letterSpacing: 1 }}>
                  <span onClick={() => setIsLegacy(v => !v)} style={{ width: 13, height: 13, border: `1px solid ${isLegacy ? '#ffaa00' : adim}`, background: isLegacy ? 'rgba(255,170,0,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0 }}>{isLegacy ? '✓' : ''}</span>
                  LEGACY ENTRY (50% XP)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, color: adim, letterSpacing: 1 }}>DATE:</span>
                  <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    style={{ padding: '2px 6px', fontSize: 9, background: bgS, border: `1px solid ${logDate ? acc : adim}`, color: logDate ? acc : dim, fontFamily: mono, outline: 'none', colorScheme: 'dark' }} />
                  {logDate && <span onClick={() => setLogDate('')} style={{ fontSize: 9, color: adim, cursor: 'pointer' }}>× TODAY</span>}
                </div>
              </div>

              <SectionDivider label="TAGGED" />

              {/* Tools */}
              <TagSection label="TOOLS" color={acc} hasItems={tools.length > 0}>
                {tools.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {tools.map(t => <Tag key={t.id} label={t.name} color={acc} onRemove={() => setTools(p => p.filter(x => x.id !== t.id))} />)}
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
                  {toolTypes.map(type => (
                    <button key={type} onClick={() => setToolTypeFilter(toolTypeFilter === type ? null : type)} style={{ padding: '2px 6px', fontSize: 8, fontFamily: mono, cursor: 'pointer', border: `1px solid ${toolTypeFilter === type ? acc : adim}`, background: toolTypeFilter === type ? 'rgba(255,176,0,0.1)' : 'transparent', color: toolTypeFilter === type ? acc : dim }}>{type}</button>
                  ))}
                </div>
                <AutoSearch
                  placeholder="Search tools..."
                  items={filteredTools.map(t => ({ id: t.id, name: t.name, sub: t.type }))}
                  selectedIds={tools.map(t => t.id)}
                  onSelect={item => { if (!tools.find(t => t.id === item.id)) setTools(p => [...p, { id: item.id, name: item.name, type: item.sub ?? '' }]); }}
                  color={acc}
                />
              </TagSection>

              {/* Augments */}
              <TagSection label="AUGMENTS" color={cyan} hasItems={augments.length > 0}>
                {augments.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {augments.map(a => <Tag key={a.id} label={a.name} color={cyan} onRemove={() => setAugments(p => p.filter(x => x.id !== a.id))} />)}
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
                  {augClusters.map(c => (
                    <button key={c} onClick={() => setAugClusterFilter(augClusterFilter === c ? null : c)} style={{ padding: '2px 6px', fontSize: 8, fontFamily: mono, cursor: 'pointer', border: `1px solid ${augClusterFilter === c ? cyan : adim}`, background: augClusterFilter === c ? 'rgba(0,207,255,0.1)' : 'transparent', color: augClusterFilter === c ? cyan : dim }}>{c.split(' ')[0]}</button>
                  ))}
                </div>
                <AutoSearch
                  placeholder="Search augments..."
                  items={filteredAugments.map(a => ({ id: a.id, name: a.name, sub: a.category.split(' ')[0] }))}
                  selectedIds={augments.map(a => a.id)}
                  onSelect={item => { if (!augments.find(a => a.id === item.id)) setAugments(p => [...p, { id: item.id, name: item.name, category: item.sub ?? '' }]); }}
                  color={cyan}
                />
              </TagSection>

              {/* Media */}
              <TagSection label="MEDIA" color={purple} hasItems={!!media}>
                {media ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, color: purple, flex: 1 }}>{media.title}</span>
                      <span onClick={() => { setMedia(null); setMediaPage(''); setMediaFinished(false); }} style={{ fontSize: 9, color: adim, cursor: 'pointer' }}>× REMOVE</span>
                    </div>
                    {media.type === 'book' && media.pages && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 9, color: adim }}>PAGE:</span>
                        <input value={mediaPage} onChange={e => setMediaPage(e.target.value.replace(/\D/g, ''))} placeholder={String(media.page_current ?? 0)}
                          style={{ width: 60, padding: '3px 6px', fontSize: 10, background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }} />
                        <span style={{ fontSize: 9, color: dim }}>/ {media.pages}</span>
                      </div>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 9, color: mediaFinished ? green : adim, letterSpacing: 1 }}>
                      <span onClick={() => setMediaFinished(v => !v)} style={{ width: 13, height: 13, border: `1px solid ${mediaFinished ? green : adim}`, background: mediaFinished ? 'rgba(68,255,136,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{mediaFinished ? '✓' : ''}</span>
                      MARK FINISHED {mediaFinished && '— bonus XP on submit'}
                    </label>
                  </div>
                ) : (
                  <AutoSearch
                    placeholder="Search media..."
                    items={allMedia.map(m => ({ id: m.id, name: m.title, sub: m.type }))}
                    onSelect={item => {
                      const m = allMedia.find(x => x.id === item.id);
                      if (m) setMedia({ id: m.id, title: m.title, type: m.type, status: m.status, pages: m.pages ?? undefined, page_current: m.page_current ?? undefined });
                    }}
                    color={purple}
                  />
                )}
              </TagSection>

              {/* Course */}
              <TagSection label="COURSE" color={teal} hasItems={!!course}>
                {course ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, color: teal, flex: 1 }}>{course.name}</span>
                      <span onClick={() => { setCourse(null); setCompletedSections([]); setMarkCourseComplete(false); }} style={{ fontSize: 9, color: adim, cursor: 'pointer' }}>× REMOVE</span>
                    </div>
                    {course.sections.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 5 }}>COMPLETE MODULES:</div>
                        {course.sections.filter(s => !s.completed_at).map(s => (
                          <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 9, color: completedSections.includes(s.id) ? teal : dim, marginBottom: 4 }}>
                            <span onClick={() => setCompletedSections(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}
                              style={{ width: 13, height: 13, border: `1px solid ${completedSections.includes(s.id) ? teal : adim}`, background: completedSections.includes(s.id) ? 'rgba(68,255,170,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0 }}>
                              {completedSections.includes(s.id) ? '✓' : ''}
                            </span>
                            {s.title}
                          </label>
                        ))}
                      </div>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 9, color: markCourseComplete ? green : adim, letterSpacing: 1 }}>
                      <span onClick={() => setMarkCourseComplete(v => !v)} style={{ width: 13, height: 13, border: `1px solid ${markCourseComplete ? green : adim}`, background: markCourseComplete ? 'rgba(68,255,136,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{markCourseComplete ? '✓' : ''}</span>
                      MARK ENTIRE COURSE COMPLETE
                    </label>
                  </div>
                ) : (
                  <AutoSearch
                    placeholder="Search courses..."
                    items={allCourses.map(c => ({ id: c.id, name: c.name, sub: c.status }))}
                    onSelect={item => handleSelectCourse(item)}
                    color={teal}
                  />
                )}
              </TagSection>

              {/* Project */}
              <TagSection label="PROJECT" color="#ffaa00" hasItems={!!project}>
                {project ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, color: '#ffaa00', flex: 1 }}>{project.name}</span>
                      <span onClick={() => { setProject(null); setCompletedObjectives([]); }} style={{ fontSize: 9, color: adim, cursor: 'pointer' }}>× REMOVE</span>
                    </div>
                    {project.objectives.filter(o => !o.completed_at).length > 0 && (
                      <div>
                        <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 5 }}>COMPLETE OBJECTIVES:</div>
                        {project.objectives.filter(o => !o.completed_at).map(o => (
                          <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 9, color: completedObjectives.includes(o.id) ? '#ffaa00' : dim, marginBottom: 4 }}>
                            <span onClick={() => setCompletedObjectives(p => p.includes(o.id) ? p.filter(x => x !== o.id) : [...p, o.id])}
                              style={{ width: 13, height: 13, border: `1px solid ${completedObjectives.includes(o.id) ? '#ffaa00' : adim}`, background: completedObjectives.includes(o.id) ? 'rgba(255,170,0,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0 }}>
                              {completedObjectives.includes(o.id) ? '✓' : ''}
                            </span>
                            {o.title}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <AutoSearch
                    placeholder="Search projects..."
                    items={allProjects.map(p => ({ id: p.id, name: p.name, sub: p.status }))}
                    onSelect={item => handleSelectProject(item)}
                    color="#ffaa00"
                  />
                )}
              </TagSection>

            </div>{/* end left column */}

            {/* Right column — XP preview */}
            <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <XPPreview
                duration={effectiveDuration}
                statSplit={statSplit}
                toolIds={tools.map(t => t.id)}
                augIds={augments.map(a => a.id)}
                isLegacy={isLegacy}
                toolNames={toolNames}
                augNames={augNames}
              />
              {!skillId && (
                <div style={{ fontSize: 9, color: adim, textAlign: 'center', marginTop: 20, lineHeight: 1.8 }}>
                  SELECT A SKILL AND DURATION<br />TO SEE XP PREVIEW
                </div>
              )}
            </div>

          </div>{/* end grid */}
        </div>{/* end scrollable body */}

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${adim}`, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <button disabled={!canSubmit || submitting} onClick={handleSubmit} style={{
            padding: '8px 32px', fontFamily: mono, fontSize: 11, letterSpacing: 2,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            border: `1px solid ${canSubmit ? acc : adim}`,
            background: canSubmit ? 'rgba(255,176,0,0.1)' : 'transparent',
            color: canSubmit ? acc : dim, opacity: canSubmit ? 1 : 0.5,
            transition: 'all 150ms',
          }}
            onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.background = acc; e.currentTarget.style.color = bgP; } }}
            onMouseLeave={e => { e.currentTarget.style.background = canSubmit ? 'rgba(255,176,0,0.1)' : 'transparent'; e.currentTarget.style.color = canSubmit ? acc : dim; }}
          >{submitting ? '>> LOGGING...' : '>> SUBMIT LOG'}</button>
        </div>

      </div>
    </div>
  );
}