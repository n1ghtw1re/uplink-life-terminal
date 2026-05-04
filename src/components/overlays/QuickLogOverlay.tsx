// src/components/overlays/QuickLogOverlay.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { useSkills } from '@/hooks/useSkills';
import { previewXP, awardSessionXP, awardBonusXP, getLevelFromXP } from '@/services/xpService';
import { triggerXPFloat } from '@/components/effects/XPFloatLayer';
import { triggerLevelUp } from '@/components/effects/LevelUpAnimation';
import { refreshAppData } from '@/lib/refreshAppData';
import { STAT_META, StatKey } from '@/types';
import { toast } from '@/hooks/use-toast';
import OutputLogPanel from '@/components/overlays/OutputLogPanel';

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
interface TaggedCourse   { id: string; name: string; sections: { id: string; title: string; completed_at: string | null }[]; linked_skill_id?: string; linked_skill_name?: string; linked_stats?: string[]; }
interface TaggedProject  { id: string; name: string; objectives: { id: string; title: string; completed_at: string | null }[]; }
interface SessionTemplate {
  id: string;
  skill_id: string;
  skill_name: string;
  duration_minutes: number;
  stat_split: { stat: StatKey; percent: number }[];
  notes: string | null;
  is_legacy: boolean;
  logged_at: string;
  tool_ids: string[];
  augment_ids: string[];
  media_id: string | null;
  course_id: string | null;
  project_id: string | null;
  usage_count?: number;
}

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

function buildSessionStatSplit(
  keys: StatKey[],
  preferredSplit?: number[],
  existingSplit?: { stat: StatKey; percent: number }[]
) {
  const uniqueKeys = Array.from(new Set(keys)).filter((key): key is StatKey => STAT_KEYS.includes(key as StatKey)).slice(0, 2);
  if (uniqueKeys.length === 0) return [] as { stat: StatKey; percent: number }[];
  if (uniqueKeys.length === 1) return [{ stat: uniqueKeys[0], percent: 100 }];

  const [primary, secondary] = uniqueKeys;
  const existingPrimary = existingSplit?.find((entry) => entry.stat === primary)?.percent;
  const preferredPrimary = preferredSplit?.[0];
  const basePrimary = existingPrimary ?? preferredPrimary ?? 50;
  const clampedPrimary = Math.min(100, Math.max(0, Math.round(basePrimary / 5) * 5));

  return [
    { stat: primary, percent: clampedPrimary },
    { stat: secondary, percent: 100 - clampedPrimary },
  ];
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
function XPPreview({ duration, statSplit, toolIds, augIds, isLegacy, toolNames, augNames, media, mediaFinished, course, completedSections, markCourseComplete }: {
  duration: number; statSplit: { stat: string; percent: number }[];
  toolIds: string[]; augIds: string[]; isLegacy: boolean;
  toolNames: Record<string, string>; augNames: Record<string, string>;
  media?: TaggedMedia | null; mediaFinished?: boolean;
  course?: TaggedCourse | null; completedSections?: string[]; markCourseComplete?: boolean;
}) {
  if (!duration || statSplit.length === 0) return null;
  const p = previewXP({ durationMinutes: duration, statSplit, toolIds, augmentIds: augIds, isLegacy });

  const MEDIA_BONUS: Record<string, number> = { book: 100, comic: 50, film: 40, documentary: 50, tv: 75, album: 30, game: 60 };
  const mediaBonus = media && mediaFinished ? Math.floor((MEDIA_BONUS[media.type] ?? 40) * (isLegacy ? 0.5 : 1)) : 0;
  
  const sectionCount = completedSections?.length ?? 0;
  const hasLinkedSkill = !!course?.linked_skill_id;
  const basePerModule = Math.floor(100 * (isLegacy ? 0.5 : 1));
  const coursePrimaryStat = course?.linked_stats?.[0];
  
  const sectionSkill = hasLinkedSkill ? Math.floor(basePerModule * 0.5) : 0;
  const sectionStat = hasLinkedSkill ? Math.floor(basePerModule * 0.25) : Math.floor(basePerModule * 0.5);
  const sectionMaster = hasLinkedSkill ? Math.floor(basePerModule * 0.25) : Math.floor(basePerModule * 0.5);
  
  const totalModuleSkill = sectionSkill * sectionCount;
  const totalModuleStat = sectionStat * sectionCount;
  const totalModuleMaster = sectionMaster * sectionCount;
  const totalModuleXP = totalModuleSkill + totalModuleStat + totalModuleMaster;
  
  const completeSkill = hasLinkedSkill ? Math.floor(basePerModule * 0.5) : 0;
  const completeStat = hasLinkedSkill ? Math.floor(basePerModule * 0.25) : Math.floor(basePerModule * 0.5);
  const completeMaster = hasLinkedSkill ? Math.floor(basePerModule * 0.25) : Math.floor(basePerModule * 0.5);
  
  const totalCompleteXP = markCourseComplete ? (completeSkill + completeStat + completeMaster) : 0;
  const totalBonus = mediaBonus + totalModuleXP + totalCompleteXP;

  return (
    <div style={{ background: bgT, border: `1px solid ${adim}`, padding: '10px 12px', fontFamily: mono }}>
      <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>// XP PREVIEW</div>

      {/* Main XP */}
      <div style={{ marginBottom: toolIds.length > 0 || augIds.length > 0 || totalBonus > 0 ? 8 : 0 }}>
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

      {/* Completion Bonus XP */}
      {totalBonus > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: green }}>COMPLETION BONUS</span>
            <span style={{ fontFamily: vt, fontSize: 16, color: green }}>+{totalBonus}</span>
          </div>
          <div style={{ paddingLeft: 8 }}>
            {mediaBonus > 0 && (
              <div style={{ fontSize: 9, color: dim, display: 'flex', justifyContent: 'space-between' }}>
                <span>{media?.type.toUpperCase()} COMPLETE</span><span style={{ color: green }}>+{mediaBonus}</span>
              </div>
            )}
            {totalModuleXP > 0 && (
              <div style={{ fontSize: 9, color: dim, display: 'flex', justifyContent: 'space-between' }}>
                <span>{sectionCount} MODULE(S)</span><span style={{ color: green }}>+{totalModuleXP}</span>
              </div>
            )}
            {markCourseComplete && totalCompleteXP > 0 && (
              <div style={{ fontSize: 9, color: dim, display: 'flex', justifyContent: 'space-between' }}>
                <span>COURSE COMPLETE</span><span style={{ color: green }}>+{totalCompleteXP}</span>
              </div>
            )}
            {(totalModuleXP > 0 || totalCompleteXP > 0) && (
              <div style={{ marginTop: 4, fontSize: 9, color: adim, borderTop: `1px dashed rgba(153,104,0,0.3)`, paddingTop: 4 }}>
                {hasLinkedSkill && (
                  <>→ {course.linked_skill_name} SKILL +{totalModuleSkill}{markCourseComplete && <> +{completeSkill}</>}</>
                )}
                {course.linked_stats?.[0] && (
                  <>| {course.linked_stats[0].toUpperCase()} +{totalModuleStat}{markCourseComplete && <> +{completeStat}</>}</>
                )}
                | MASTER +{totalModuleMaster}{markCourseComplete && <> +{completeMaster}</>}
              </div>
            )}
          </div>
        </div>
      )}

      {isLegacy && <div style={{ fontSize: 9, color: '#ffaa00', marginTop: 6, letterSpacing: 1 }}>⚑ LEGACY — 50% XP</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
interface Props { open: boolean; onClose: () => void; initialTab?: 'quick' | 'output'; }

export default function QuickLogOverlay({ open, onClose, initialTab = 'quick' }: Props) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'quick' | 'output'>(initialTab);

  // Core
  const [statFilter, setStatFilter]   = useState<StatKey | null>(null);
  const [skillId, setSkillId]         = useState('');
  const [skillName, setSkillName]     = useState('');
  const [skillStatKeys, setSkillStatKeys] = useState<StatKey[]>([]);
  const [sessionStatKeys, setSessionStatKeys] = useState<StatKey[]>([]);
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
  const [templateTab, setTemplateTab] = useState<'recent' | 'mostUsed'>('recent');

  // Data queries
  const { data: allSkills = [] } = useSkills();
  const { data: allTools = [] }  = useQuery({
    queryKey: ['quick-log-tools'],
    queryFn: async () => {
      const db = await getDB();
      const r  = await db.query<{ id: string; name: string; type: string; active: boolean }>(`SELECT id, name, type, active FROM tools ORDER BY name;`);
      return r.rows.filter(t => t.active);
    },
  });
  const { data: allAugments = [] } = useQuery({
    queryKey: ['quick-log-augments'],
    queryFn: async () => {
      const db = await getDB();
      const r  = await db.query<{ id: string; name: string; category: string; active: boolean }>(`SELECT id, name, category, active FROM augments ORDER BY name;`);
      return r.rows.filter(a => a.active);
    },
  });
  const { data: allMedia = [] } = useQuery({
    queryKey: ['quick-log-media'],
    queryFn: async () => {
      const db = await getDB();
      const r  = await db.query<{ id: string; title: string; type: string; status: string; pages: number | null; page_current: number | null }>(`SELECT id, title, type, status, pages, page_current FROM media WHERE status != 'FINISHED' ORDER BY title;`);
      return r.rows;
    },
  });
  const { data: allCourses = [] } = useQuery({
    queryKey: ['quick-log-courses'],
    queryFn: async () => {
      const db = await getDB();
      const r  = await db.query<{ id: string; name: string; status: string }>(`SELECT id, name, status FROM courses WHERE status != 'COMPLETE' ORDER BY name;`);
      return r.rows;
    },
  });
  const { data: allProjects = [] } = useQuery({
    queryKey: ['quick-log-projects'],
    queryFn: async () => {
      const db = await getDB();
      const r  = await db.query<{ id: string; name: string; status: string }>(`SELECT id, name, status FROM projects WHERE status = 'ACTIVE' ORDER BY name;`);
      return r.rows;
    },
  });

  const { data: logTemplates = { recent: [] as SessionTemplate[], mostUsed: [] as SessionTemplate[] } } = useQuery({
    queryKey: ['quick-log-templates'],
    queryFn: async () => {
      const db = await getDB();
      const recentRes = await db.query<SessionTemplate>(
        `SELECT id, skill_id, skill_name, duration_minutes, stat_split, notes, is_legacy, logged_at,
                tool_ids, augment_ids, media_id, course_id, project_id
         FROM sessions
         ORDER BY logged_at DESC
         LIMIT 5;`
      );
      const mostUsedRes = await db.query<SessionTemplate>(
        `WITH ranked AS (
           SELECT id, skill_id, skill_name, duration_minutes, stat_split, notes, is_legacy, logged_at,
                  tool_ids, augment_ids, media_id, course_id, project_id,
                  COUNT(*) OVER (PARTITION BY skill_id) AS usage_count,
                  ROW_NUMBER() OVER (PARTITION BY skill_id ORDER BY logged_at DESC) AS rn
           FROM sessions
         )
         SELECT id, skill_id, skill_name, duration_minutes, stat_split, notes, is_legacy, logged_at,
                tool_ids, augment_ids, media_id, course_id, project_id, usage_count
         FROM ranked
         WHERE rn = 1
         ORDER BY usage_count DESC, logged_at DESC
         LIMIT 5;`
      );
      return { recent: recentRes.rows, mostUsed: mostUsedRes.rows };
    },
    enabled: open,
  });

  // Reset on close
  useEffect(() => {
    if (!open) return;
    setStatFilter(null); setSkillId(''); setSkillName(''); setSkillStatKeys([]); setSessionStatKeys([]); setSkillDefaultSplit([100]);
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
    setSessionStatKeys(skill.statKeys);
    setSkillDefaultSplit(skill.defaultSplit);
    const split = buildSessionStatSplit(skill.statKeys, skill.defaultSplit);
    setStatSplit(split);
  };

  // When course selected — load sections
  const handleSelectCourse = async (c: { id: string; name: string }) => {
    const db = await getDB();
    const r  = await db.query<{ id: string; title: string; completed_at: string | null }>(
      `SELECT id, title, completed_at FROM course_sections WHERE course_id = $1 ORDER BY sort_order;`, [c.id]
    );
    
    const courseRes = await db.query<{ linked_skill_ids: string; linked_stats: string }>(
      `SELECT linked_skill_ids, linked_stats FROM courses WHERE id = $1;`, [c.id]
    );
    
    let linked_skill_id: string | undefined;
    let linked_skill_name: string | undefined;
    let linked_stats: string[] = [];
    
    if (courseRes.rows[0]?.linked_skill_ids) {
      try {
        const raw = courseRes.rows[0].linked_skill_ids;
        const skillIds = Array.isArray(raw) ? raw : JSON.parse(raw);
        if (skillIds && skillIds.length > 0) {
          linked_skill_id = skillIds[0];
          const skillRes = await db.query<{ name: string }>(
            `SELECT name FROM skills WHERE id = $1;`, [linked_skill_id]
          );
          if (skillRes.rows[0]) {
            linked_skill_name = skillRes.rows[0].name;
          }
        }
      } catch { /* ignore parse errors */ }
    }
    
    if (courseRes.rows[0]?.linked_stats) {
      try {
        const raw = courseRes.rows[0].linked_stats;
        linked_stats = Array.isArray(raw) ? raw : JSON.parse(raw);
      } catch { linked_stats = []; }
    }
    
    setCourse({ id: c.id, name: c.name, sections: r.rows, linked_skill_id, linked_skill_name, linked_stats });
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

  const parseArray = <T,>(value: unknown): T[] => {
    if (Array.isArray(value)) return value as T[];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const applyTemplate = async (tpl: SessionTemplate) => {
    const split = parseArray<{ stat: StatKey; percent: number }>(tpl.stat_split);
    const resolvedSplit = split.length > 0 ? split : [{ stat: 'mind' as StatKey, percent: 100 }];
    const statKeys = resolvedSplit.map(s => s.stat);
    const splitPercents = resolvedSplit.map(s => s.percent);

    setSkillId(tpl.skill_id);
    setSkillName(tpl.skill_name);
    setSkillStatKeys(statKeys);
    setSessionStatKeys(statKeys);
    setSkillDefaultSplit(splitPercents);
    setStatSplit(resolvedSplit);
    setDuration(Math.max(1, tpl.duration_minutes || 1));
    setUseCustom(false);
    setCustomDuration('');
    setNotes(tpl.notes ?? '');
    setIsLegacy(Boolean(tpl.is_legacy));
    // Reset date to empty so it defaults to current time on submit
    setLogDate('');

    const toolIds = parseArray<string>(tpl.tool_ids);
    setTools(toolIds.map(id => {
      const match = allTools.find(t => t.id === id);
      return { id, name: match?.name ?? id, type: match?.type ?? '' };
    }));

    const augmentIds = parseArray<string>(tpl.augment_ids);
    setAugments(augmentIds.map(id => {
      const match = allAugments.find(a => a.id === id);
      return { id, name: match?.name ?? id, category: match?.category ?? '' };
    }));

    setMedia(null);
    setMediaPage('');
    setMediaFinished(false);
    if (tpl.media_id) {
      const db = await getDB();
      const r = await db.query<{ id: string; title: string; type: string; status: string; pages: number | null; page_current: number | null }>(
        `SELECT id, title, type, status, pages, page_current FROM media WHERE id = $1 LIMIT 1;`,
        [tpl.media_id]
      );
      const m = r.rows[0];
      if (m) {
        setMedia({ id: m.id, title: m.title, type: m.type, status: m.status, pages: m.pages ?? undefined, page_current: m.page_current ?? undefined });
        setMediaPage(m.page_current != null ? String(m.page_current) : '');
      }
    }

    setCourse(null);
    setCompletedSections([]);
    setMarkCourseComplete(false);
    if (tpl.course_id) {
      const db = await getDB();
      const courseRes = await db.query<{ id: string; name: string }>(`SELECT id, name FROM courses WHERE id = $1 LIMIT 1;`, [tpl.course_id]);
      const c = courseRes.rows[0];
      if (c) await handleSelectCourse({ id: c.id, name: c.name });
    }

    setProject(null);
    setCompletedObjectives([]);
    if (tpl.project_id) {
      const db = await getDB();
      const projRes = await db.query<{ id: string; name: string }>(`SELECT id, name FROM projects WHERE id = $1 LIMIT 1;`, [tpl.project_id]);
      const p = projRes.rows[0];
      if (p) await handleSelectProject({ id: p.id, name: p.name });
    }
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
  const primarySessionStat = sessionStatKeys[0] ?? null;
  const secondarySessionStat = sessionStatKeys[1] ?? '';

  const applySessionStats = (keys: StatKey[], preferredSplit?: number[]) => {
    const nextSplit = buildSessionStatSplit(keys, preferredSplit, statSplit);
    setSessionStatKeys(nextSplit.map((entry) => entry.stat));
    setStatSplit(nextSplit);
  };

  const handlePrimaryStatChange = (nextPrimary: StatKey) => {
    const secondary = secondarySessionStat && secondarySessionStat !== nextPrimary ? [secondarySessionStat as StatKey] : [];
    applySessionStats([nextPrimary, ...secondary], statSplit.map((entry) => entry.percent));
  };

  const handleSecondaryStatChange = (nextSecondary: StatKey | '') => {
    if (!primarySessionStat) return;
    if (!nextSecondary || nextSecondary === primarySessionStat) {
      applySessionStats([primarySessionStat], [100]);
      return;
    }
    const currentPrimaryPercent = statSplit.find((entry) => entry.stat === primarySessionStat)?.percent ?? 50;
    applySessionStats([primarySessionStat, nextSecondary], [currentPrimaryPercent, 100 - currentPrimaryPercent]);
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!skillId || !effectiveDuration) return;
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      const db        = await getDB();
      const sessionId = crypto.randomUUID();
      // Use logDate if set (local date), otherwise use now
      let loggedAt: string;
      if (logDate) {
        const parts = logDate.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        // Create date at noon in local timezone
        loggedAt = new Date(year, month, day, 12, 0, 0, 0).toISOString();
      } else {
        loggedAt = new Date().toISOString();
      }
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
      const xpResult = await awardSessionXP({ sessionId, skillId, skillName, durationMinutes: effectiveDuration, statSplit, toolIds, augmentIds: augIds, isLegacy });

      if (toolIds.length > 0 && xpResult.perToolXP > 0) {
        queryClient.setQueryData(['tools'], (prev: any[] | undefined) =>
          prev?.map((tool) => {
            if (!toolIds.includes(tool.id)) return tool;
            const nextXp = Number(tool.xp ?? 0) + xpResult.perToolXP;
            const nextLevel = getLevelFromXP(nextXp);
            return {
              ...tool,
              xp: nextXp,
              level: nextLevel.level,
              xpInLevel: nextLevel.xpInLevel,
              xpForLevel: nextLevel.xpForLevel,
            };
          }) ?? prev
        );

        queryClient.setQueryData(['tool-session-counts'], (prev: Record<string, number> | undefined) => {
          const next = { ...(prev ?? {}) };
          for (const toolId of toolIds) next[toolId] = (next[toolId] ?? 0) + 1;
          return next;
        });

        queryClient.setQueryData(['tool-last-session'], (prev: Record<string, string> | undefined) => {
          const next = { ...(prev ?? {}) };
          for (const toolId of toolIds) next[toolId] = loggedAt;
          return next;
        });
      }

      if (augIds.length > 0 && xpResult.perAugmentXP > 0) {
        queryClient.setQueryData(['augments'], (prev: any[] | undefined) =>
          prev?.map((augment) => {
            if (!augIds.includes(augment.id)) return augment;
            const nextXp = Number(augment.xp ?? 0) + xpResult.perAugmentXP;
            const nextLevel = getLevelFromXP(nextXp);
            return {
              ...augment,
              xp: nextXp,
              level: nextLevel.level,
              xpInLevel: nextLevel.xpInLevel,
              xpForLevel: nextLevel.xpForLevel,
            };
          }) ?? prev
        );

        queryClient.setQueryData(['augment-session-counts'], (prev: Record<string, number> | undefined) => {
          const next = { ...(prev ?? {}) };
          for (const augId of augIds) next[augId] = (next[augId] ?? 0) + 1;
          return next;
        });

        queryClient.setQueryData(['augment-last-session'], (prev: Record<string, string> | undefined) => {
          const next = { ...(prev ?? {}) };
          for (const augId of augIds) next[augId] = loggedAt;
          return next;
        });
      }

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
        const sectionBonus = Math.floor(100 * (isLegacy ? 0.5 : 1));
        const hasLinkedSkill = !!course.linked_skill_id;
        const coursePrimaryStat = course.linked_stats?.[0];
        
        for (const secId of completedSections) {
          await db.query(`UPDATE course_sections SET completed_at = $1 WHERE id = $2;`, [new Date().toISOString(), secId]);
          const sec = course.sections.find(s => s.id === secId);
          
          if (hasLinkedSkill && course.linked_skill_id) {
            const skillBonus = Math.floor(sectionBonus * 0.5);
            const statBonus = Math.floor(sectionBonus * 0.25);
            const masterBonus = Math.floor(sectionBonus * 0.25);
            await awardBonusXP({ source: 'course_section', sourceId: secId, skillId: course.linked_skill_id, amount: skillBonus, notes: `${course.name} — ${sec?.title ?? ''} [SKILL]` });
            if (coursePrimaryStat) await awardBonusXP({ source: 'course_section', sourceId: secId, statKey: coursePrimaryStat, amount: statBonus, notes: `${course.name} — ${sec?.title ?? ''} [STAT]` });
            await awardBonusXP({ source: 'course_section', sourceId: secId, amount: masterBonus, notes: `${course.name} — ${sec?.title ?? ''} [MASTER]` });
          } else if (coursePrimaryStat) {
            const statBonus = Math.floor(sectionBonus * 0.5);
            const masterBonus = Math.floor(sectionBonus * 0.5);
            await awardBonusXP({ source: 'course_section', sourceId: secId, statKey: coursePrimaryStat, amount: statBonus, notes: `${course.name} — ${sec?.title ?? ''}` });
            await awardBonusXP({ source: 'course_section', sourceId: secId, amount: masterBonus, notes: `${course.name} — ${sec?.title ?? ''}` });
          }
        }
        
        const totalSections = course.sections.length;
        const completedCount = course.sections.filter(s => s.completed_at || completedSections.includes(s.id)).length;
        const newProgress = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;
        await db.exec(`UPDATE courses SET progress = ${newProgress} WHERE id = '${course.id}';`);
      }
      if (course && markCourseComplete) {
        await db.exec(`UPDATE courses SET status = 'COMPLETE', progress = 100, completed_at = '${new Date().toISOString()}' WHERE id = '${course.id}';`);
        const courseBonus = Math.floor(100 * (isLegacy ? 0.5 : 1));
        const hasLinkedSkill = !!course.linked_skill_id;
        const coursePrimaryStat = course.linked_stats?.[0];
        
        if (hasLinkedSkill && course.linked_skill_id) {
          const skillBonus = Math.floor(courseBonus * 0.5);
          const statBonus = Math.floor(courseBonus * 0.25);
          const masterBonus = Math.floor(courseBonus * 0.25);
          await awardBonusXP({ source: 'course_complete', sourceId: course.id, skillId: course.linked_skill_id, amount: skillBonus, notes: `${course.name} — complete [SKILL]` });
          if (coursePrimaryStat) await awardBonusXP({ source: 'course_complete', sourceId: course.id, statKey: coursePrimaryStat, amount: statBonus, notes: `${course.name} — complete [STAT]` });
          await awardBonusXP({ source: 'course_complete', sourceId: course.id, amount: masterBonus, notes: `${course.name} — complete [MASTER]` });
        } else if (coursePrimaryStat) {
          const statBonus = Math.floor(courseBonus * 0.5);
          const masterBonus = Math.floor(courseBonus * 0.5);
          await awardBonusXP({ source: 'course_complete', sourceId: course.id, statKey: coursePrimaryStat, amount: statBonus, notes: `${course.name} — complete` });
          await awardBonusXP({ source: 'course_complete', sourceId: course.id, amount: masterBonus, notes: `${course.name} — complete` });
        }
      }

      // Project objectives
      if (project && completedObjectives.length > 0) {
        for (const objId of completedObjectives) {
          await db.query(`UPDATE project_milestones SET completed_at = $1 WHERE id = $2;`, [new Date().toISOString(), objId]);
        }
      }

        await refreshAppData(queryClient);

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

      <div style={{ width: '100%', maxWidth: 1060, maxHeight: '90vh', background: bgP, border: `1px solid ${adim}`, display: 'flex', flexDirection: 'column', fontFamily: mono, boxShadow: `0 0 40px rgba(255,176,0,0.1)` }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: vt, fontSize: 20, color: acc }}>// QUICK LOG</span>
            <button className="topbar-btn" onClick={() => setActiveTab('quick')} style={{ borderColor: activeTab === 'quick' ? acc : adim, color: activeTab === 'quick' ? acc : dim }}>QUICK LOG</button>
            <button className="topbar-btn" onClick={() => setActiveTab('output')} style={{ borderColor: activeTab === 'output' ? acc : adim, color: activeTab === 'output' ? acc : dim }}>OUTPUT</button>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${adim}`, color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer', padding: '3px 10px' }}>× CLOSE  ESC</button>
        </div>

        {activeTab === 'output' && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
            <OutputLogPanel onClose={onClose} />
          </div>
        )}

        {/* Body — two columns */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}`, display: activeTab === 'quick' ? 'block' : 'none' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0 }}>

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
                    <span onClick={() => { setSkillId(''); setSkillName(''); setSkillStatKeys([]); setSessionStatKeys([]); setStatSplit([]); }} style={{ fontSize: 9, color: adim, cursor: 'pointer' }}
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

              {skillId && primarySessionStat && (
                <div style={{ marginBottom: 12 }}>
                  <Label>SESSION STATS</Label>
                  <div style={{ fontSize: 9, color: dim, marginBottom: 8, lineHeight: 1.5 }}>
                    Override this log only. Skill preset:
                    <span style={{ color: adim }}> {skillStatKeys.map((key) => key.toUpperCase()).join(' / ') || 'NONE'}</span>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 6 }}>PRIMARY STAT</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {STAT_KEYS.map((key) => (
                        <button
                          key={`primary-${key}`}
                          onClick={() => handlePrimaryStatChange(key)}
                          style={{
                            padding: '3px 8px',
                            fontSize: 9,
                            fontFamily: mono,
                            cursor: 'pointer',
                            border: `1px solid ${primarySessionStat === key ? acc : adim}`,
                            background: primarySessionStat === key ? 'rgba(255,176,0,0.1)' : 'transparent',
                            color: primarySessionStat === key ? acc : dim,
                          }}
                        >
                          {STAT_META[key].icon} {STAT_META[key].name.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: secondarySessionStat ? 10 : 0 }}>
                    <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 6 }}>SECONDARY STAT</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      <button
                        onClick={() => handleSecondaryStatChange('')}
                        style={{
                          padding: '3px 8px',
                          fontSize: 9,
                          fontFamily: mono,
                          cursor: 'pointer',
                          border: `1px solid ${!secondarySessionStat ? acc : adim}`,
                          background: !secondarySessionStat ? 'rgba(255,176,0,0.1)' : 'transparent',
                          color: !secondarySessionStat ? acc : dim,
                        }}
                      >
                        NONE
                      </button>
                      {STAT_KEYS.filter((key) => key !== primarySessionStat).map((key) => (
                        <button
                          key={`secondary-${key}`}
                          onClick={() => handleSecondaryStatChange(key)}
                          style={{
                            padding: '3px 8px',
                            fontSize: 9,
                            fontFamily: mono,
                            cursor: 'pointer',
                            border: `1px solid ${secondarySessionStat === key ? acc : adim}`,
                            background: secondarySessionStat === key ? 'rgba(255,176,0,0.1)' : 'transparent',
                            color: secondarySessionStat === key ? acc : dim,
                          }}
                        >
                          {STAT_META[key].icon} {STAT_META[key].name.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {sessionStatKeys.length === 2 && statSplit.length === 2 && (
                    <>
                      <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 6 }}>
                        SPLIT: {statSplit[0].stat.toUpperCase()} {statSplit[0].percent}% / {statSplit[1].stat.toUpperCase()} {statSplit[1].percent}%
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, color: acc, width: 60, flexShrink: 0 }}>{statSplit[0].stat.toUpperCase()}</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={statSplit[0].percent}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            setStatSplit([
                              { stat: statSplit[0].stat, percent: val },
                              { stat: statSplit[1].stat, percent: 100 - val },
                            ]);
                          }}
                          style={{ flex: 1, accentColor: acc }}
                        />
                        <span style={{ fontSize: 10, color: dim, width: 36, textAlign: 'right', flexShrink: 0 }}>{statSplit[0].percent}%</span>
                      </div>
                    </>
                  )}
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

            {/* Right column — presets + XP preview */}
            <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: bgT, border: `1px solid ${adim}`, padding: '10px 12px', fontFamily: mono }}>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>// LOG TEMPLATES</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button
                    onClick={() => setTemplateTab('recent')}
                    style={{
                      padding: '3px 10px',
                      fontSize: 9,
                      fontFamily: mono,
                      cursor: 'pointer',
                      border: `1px solid ${templateTab === 'recent' ? acc : adim}`,
                      background: templateTab === 'recent' ? 'rgba(255,176,0,0.1)' : 'transparent',
                      color: templateTab === 'recent' ? acc : dim,
                    }}
                  >
                    RECENT
                  </button>
                  <button
                    onClick={() => setTemplateTab('mostUsed')}
                    style={{
                      padding: '3px 10px',
                      fontSize: 9,
                      fontFamily: mono,
                      cursor: 'pointer',
                      border: `1px solid ${templateTab === 'mostUsed' ? acc : adim}`,
                      background: templateTab === 'mostUsed' ? 'rgba(255,176,0,0.1)' : 'transparent',
                      color: templateTab === 'mostUsed' ? acc : dim,
                    }}
                  >
                    MOST USED
                  </button>
                </div>

                {(templateTab === 'recent' ? logTemplates.recent : logTemplates.mostUsed).length === 0 ? (
                  <div style={{ fontSize: 9, color: dim }}>No previous logs yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(templateTab === 'recent' ? logTemplates.recent : logTemplates.mostUsed).map((tpl) => (
                      <button
                        key={`${templateTab}-${tpl.id}`}
                        onClick={() => void applyTemplate(tpl)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                          padding: '5px 8px',
                          fontFamily: mono,
                          fontSize: 9,
                          border: `1px solid ${adim}`,
                          background: 'transparent',
                          color: dim,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = acc; e.currentTarget.style.color = acc; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = adim; e.currentTarget.style.color = dim; }}
                        title={templateTab === 'mostUsed' ? `${tpl.usage_count ?? 0} logs` : new Date(tpl.logged_at).toLocaleString()}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.skill_name}</span>
                        <span style={{ flexShrink: 0, color: adim }}>
                          {templateTab === 'mostUsed'
                            ? `${tpl.usage_count ?? 0}x`
                            : `${Math.max(1, tpl.duration_minutes || 0)}m`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <XPPreview
                duration={effectiveDuration}
                statSplit={statSplit}
                toolIds={tools.map(t => t.id)}
                augIds={augments.map(a => a.id)}
                isLegacy={isLegacy}
                toolNames={toolNames}
                augNames={augNames}
                media={media}
                mediaFinished={mediaFinished}
                course={course}
                completedSections={completedSections}
                markCourseComplete={markCourseComplete}
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
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${adim}`, flexShrink: 0, display: activeTab === 'quick' ? 'flex' : 'none', justifyContent: 'flex-end' }}>
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
