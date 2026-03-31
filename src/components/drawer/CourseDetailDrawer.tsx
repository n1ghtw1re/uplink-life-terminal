// ============================================================
// src/components/drawer/CourseDetailDrawer.tsx
// ============================================================
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { refreshAppData } from '@/lib/refreshAppData';
// xpService imported dynamically in handlers
import { StatKey, STAT_META } from '@/types';

// ── Types ─────────────────────────────────────────────────────

interface Course {
  id: string;
  name: string;
  provider: string | null;
  subject: string | null;
  linked_stats: string[];
  linked_skill_ids: string[];
  status: string;
  progress: number;
  cert_earned: boolean;
  is_legacy: boolean;
  is_ongoing: boolean;
  linked_tool_ids: string[];
  linked_augment_ids: string[];
  linked_media_ids: string[];
  url: string | null;
  notes: string | null;
}

interface Section {
  id: string;
  title: string;
  sort_order: number;
  completed_at: string | null;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  section_id: string;
  title: string;
  type: 'lesson' | 'quiz' | 'assignment';
  sort_order: number;
  completed_at: string | null;
  score: number | null;
  passed: boolean | null;
}

interface Props {
  courseId: string;
  onClose?: () => void;
}

// ── Sub-components ────────────────────────────────────────────

function XPBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{
      background: 'hsl(var(--bg-tertiary))',
      border: '1px solid hsl(var(--accent-dim))',
      height: 6,
      flex: 1,
    }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        background: 'hsl(var(--accent))',
        boxShadow: '0 0 6px rgba(255,176,0,0.4)',
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'COMPLETE' ? '#44ff88'
    : status === 'ACTIVE' ? 'hsl(var(--accent))'
    : 'hsl(var(--text-dim))';
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 9,
      color,
      border: `1px solid ${color}`,
      padding: '1px 6px',
      letterSpacing: 1,
      flexShrink: 0,
    }}>
      {status}
    </span>
  );
}

function XPToast({ amount, label }: { amount: number; label: string }) {
  return (
    <span style={{
      fontFamily: "'VT323', monospace",
      fontSize: 13,
      color: 'hsl(var(--accent-bright))',
      textShadow: '0 0 8px rgba(255,176,0,0.8)',
    }}>
      +{amount} XP — {label}
    </span>
  );
}


// ── Linked IDs picker (for edit mode) ────────────────────────
function CourseLinkedIdsInput({ label, tableName, nameField, subField, selectedIds, onChange }: {
  label: string; tableName: string; nameField: string; subField: string;
  selectedIds: string[]; onChange: (ids: string[]) => void;
}) {
  const [search, setSearch]     = useState('');
  const [results, setResults]   = useState<{ id: string; name: string; sub: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string; sub: string }[]>([]);
  const [open, setOpen]         = useState(false);
  const mono = "'IBM Plex Mono', monospace";
  const acc  = 'hsl(var(--accent))';
  const adim = 'hsl(var(--accent-dim))';
  const dim  = 'hsl(var(--text-dim))';
  const bgS  = 'hsl(var(--bg-secondary))';

  useEffect(() => {
    if (selectedIds.length === 0) { setSelected([]); return; }
    (async () => {
      const db  = await import('@/lib/db').then(m => m.getDB());
      const res = await db.query<{ id: string; [k: string]: string }>(
        `SELECT id, ${nameField}, ${subField} FROM ${tableName} WHERE id = ANY($1::text[]);`,
        [selectedIds]
      );
      setSelected(res.rows.map(r => ({ id: r.id, name: r[nameField] ?? '', sub: r[subField] ?? '' })));
    })();
  }, [selectedIds.join(',')]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const db  = await import('@/lib/db').then(m => m.getDB());
      const q   = search.trim();
      const res = await db.query<{ id: string; [k: string]: string }>(
        `SELECT id, ${nameField}, ${subField} FROM ${tableName} ${q ? `WHERE LOWER(${nameField}) LIKE LOWER($1)` : ''} ORDER BY ${nameField} LIMIT 20;`,
        q ? [`%${q}%`] : []
      );
      setResults(res.rows.map(r => ({ id: r.id, name: r[nameField] ?? '', sub: r[subField] ?? '' })));
    })();
  }, [search, open]);

  const toggle = (item: { id: string; name: string; sub: string }) =>
    onChange(selectedIds.includes(item.id) ? selectedIds.filter(x => x !== item.id) : [...selectedIds, item.id]);

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 4 }}>{label}</div>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
          {selected.map(item => (
            <span key={item.id} onClick={() => toggle(item)}
              style={{ fontSize: 9, color: acc, border: `1px solid ${acc}`, padding: '2px 8px', cursor: 'pointer', fontFamily: mono }}>
              {item.name.toUpperCase()} <span style={{ opacity: 0.5 }}>×</span>
            </span>
          ))}
        </div>
      )}
      {!open ? (
        <span onClick={() => setOpen(true)} style={{ fontSize: 9, color: adim, cursor: 'pointer', border: `1px dashed ${adim}`, padding: '2px 10px', fontFamily: mono }}>+ ADD</span>
      ) : (
        <div style={{ position: 'relative' }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search..."
            style={{ width: '100%', padding: '5px 8px', fontSize: 10, background: bgS, border: `1px solid ${acc}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }}
          />
          {results.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: bgS, border: `1px solid ${adim}`, zIndex: 100, maxHeight: 130, overflowY: 'auto' as const }}>
              {results.map(r => {
                const isSel = selectedIds.includes(r.id);
                return (
                  <div key={r.id} onMouseDown={() => toggle(r)}
                    style={{ padding: '5px 10px', fontSize: 10, cursor: 'pointer', color: isSel ? acc : dim, background: isSel ? 'rgba(255,176,0,0.08)' : 'transparent', display: 'flex', justifyContent: 'space-between', fontFamily: mono }}>
                    <span>{r.name} {isSel && '✓'}</span>
                    <span style={{ fontSize: 9, opacity: 0.5 }}>{r.sub}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Linked references component ───────────────────────────────

function LinkedReferences({ toolIds, augmentIds, mediaIds, mono, accent, accentDim, dimText }: {
  toolIds: string[]; augmentIds: string[]; mediaIds: string[];
  mono: string; accent: string; accentDim: string; dimText: string;
}) {
  const { data: tools = [] } = useQuery({
    queryKey: ['ref-tools', toolIds.join(',')],
    enabled: toolIds.length > 0,
    queryFn: async () => {
      const db = await import('@/lib/db').then(m => m.getDB());
      if (toolIds.length === 0) return [];
      const res = await db.query<{ id: string; name: string; type: string }>(
        `SELECT id, name, type FROM tools WHERE id = ANY($1::text[]);`,
        [toolIds]
      );
      return res.rows;
    },
  });

  const { data: augments = [] } = useQuery({
    queryKey: ['ref-augments', augmentIds.join(',')],
    enabled: augmentIds.length > 0,
    queryFn: async () => {
      const db = await import('@/lib/db').then(m => m.getDB());
      if (augmentIds.length === 0) return [];
      const res = await db.query<{ id: string; name: string; category: string }>(
        `SELECT id, name, category FROM augments WHERE id = ANY($1::text[]);`,
        [augmentIds]
      );
      return res.rows;
    },
  });

  const { data: media = [] } = useQuery({
    queryKey: ['ref-media', mediaIds.join(',')],
    enabled: mediaIds.length > 0,
    queryFn: async () => {
      const db = await import('@/lib/db').then(m => m.getDB());
      if (mediaIds.length === 0) return [];
      const res = await db.query<{ id: string; title: string; type: string; status: string }>(
        `SELECT id, title, type, status FROM media WHERE id = ANY($1::text[]);`,
        [mediaIds]
      );
      return res.rows;
    },
  });

  const TagRow = ({ label, items, color }: { label: string; items: { id: string; name?: string; title?: string; sub: string }[]; color: string }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 9, color: accentDim, letterSpacing: 2, marginBottom: 6 }}>// {label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {items.map(item => (
          <span key={item.id} style={{ fontSize: 9, color, border: `1px solid ${color}`, padding: '2px 8px', letterSpacing: 1, opacity: 0.8 }}>
            {(item.name ?? item.title ?? '').toUpperCase()}
            <span style={{ opacity: 0.5, marginLeft: 4 }}>{item.sub}</span>
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '0 20px 12px', flexShrink: 0 }}>
      {tools.length > 0 && <TagRow label="LINKED TOOLS" color={accent}
        items={tools.map(t => ({ id: t.id, name: t.name, sub: t.type }))} />}
      {augments.length > 0 && <TagRow label="LINKED AUGMENTS" color="#00cfff"
        items={augments.map(a => ({ id: a.id, name: a.name, sub: a.category.split(' ')[0] }))} />}
      {media.length > 0 && <TagRow label="LINKED MEDIA" color="#cc88ff"
        items={media.map(m => ({ id: m.id, title: m.title, sub: `${m.type} · ${m.status}` }))} />}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export default function CourseDetailDrawer({ courseId, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [lastXP, setLastXP] = useState<{ amount: number; label: string } | null>(null);
  const [addingLessonToSection, setAddingLessonToSection] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonType, setNewLessonType] = useState<'lesson' | 'quiz' | 'assignment'>('lesson');
  const [addingSectionTitle, setAddingSectionTitle] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [notesValue, setNotesValue] = useState<string | null>(null); // null = uninitialized
  const [sectionsCollapsed, setSectionsCollapsed] = useState(false);
  const [editing, setEditing]           = useState(false);
  const [showDelete, setShowDelete]     = useState(false);
  const [editName, setEditName]         = useState('');
  const [editProvider, setEditProvider] = useState('');
  const [editSubject, setEditSubject]   = useState('');
  const [editUrl, setEditUrl]           = useState('');
  const [editStats, setEditStats]       = useState<string[]>([]);
  const [editToolIds, setEditToolIds]   = useState<string[]>([]);
  const [editAugIds, setEditAugIds]     = useState<string[]>([]);
  const [editMediaIds, setEditMediaIds] = useState<string[]>([]);

  // ── Fetch course ──────────────────────────────────────────

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      if (error) throw error;
      return data as Course;
    },
  });

  // ── Fetch sections + lessons ──────────────────────────────

  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['course-sections', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data: sectionRows, error: sErr } = await supabase
        .from('course_sections')
        .select('*')
        .eq('course_id', courseId)
        .order('sort_order');
      if (sErr) throw sErr;

      const { data: lessonRows, error: lErr } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('sort_order');
      if (lErr) throw lErr;

      return (sectionRows ?? []).map(s => ({
        ...s,
        lessons: (lessonRows ?? []).filter(l => l.section_id === s.id) as Lesson[],
      })) as Section[];
    },
  });

  // ── Recalculate + update progress ────────────────────────

  const updateProgress = async (updatedSections: Section[]) => {
    // Sections WITH lessons: each lesson is a progress unit
    // Sections WITHOUT lessons: the section itself is 1 progress unit (tickable directly)
    const withLessons    = updatedSections.filter(s => s.lessons.length > 0);
    const withoutLessons = updatedSections.filter(s => s.lessons.length === 0);

    const lessonTotal = withLessons.flatMap(s => s.lessons).length;
    const lessonDone  = withLessons.flatMap(s => s.lessons).filter(l => !!l.completed_at).length;
    const sectionDoneCount = withoutLessons.filter(s => !!s.completed_at).length;

    const total      = lessonTotal + withoutLessons.length;
    const done       = lessonDone + sectionDoneCount;
    const progress   = total > 0 ? Math.round((done / total) * 100) : 0;
    const isComplete = total > 0 && done === total;

    await supabase
      .from('courses')
      .update({
        progress,
        status:       isComplete ? 'COMPLETE' : 'ACTIVE',
        completed_at: isComplete ? new Date().toISOString() : null,
      })
      .eq('id', courseId);

    // Award course completion bonus — num_sections × 100, skip if ongoing
    if (isComplete && course && !course.is_ongoing) {
      const totalSecs   = updatedSections.length || 1;
      const courseBonus = Math.floor(totalSecs * 100 * (course.is_legacy ? 0.5 : 1.0));
      const statKeys    = (course.linked_stats ?? []) as StatKey[];
      if (statKeys.length > 0) {
        const { awardBonusXP } = await import('@/services/xpService');
        await awardBonusXP({
          source:   'course_complete',
          sourceId: courseId,
          statKey:  statKeys[0],
          amount:   courseBonus,
          notes:    `${course.name} — course complete`,
        });
      }
    }

    await refreshAppData(queryClient);
  };

  // ── Reverse bonus XP helper ─────────────────────────────────
  const reverseBonusXP = async (sourceId: string) => {
    const db = await import('@/lib/db').then(m => m.getDB());
    const logs = await db.query<{ tier: string; entity_id: string; amount: number }>(
      `SELECT tier, entity_id, amount FROM xp_log WHERE source = 'course_section' AND source_id = $1;`,
      [sourceId]
    );
    for (const log of logs.rows) {
      const amt = Number(log.amount);
      if (amt <= 0) continue;
      if (log.tier === 'skill') {
        await db.exec(`UPDATE skills SET xp = GREATEST(0, xp - ${amt}), level = ${levelCase(`GREATEST(0, xp - ${amt})`)} WHERE id = '${log.entity_id}';`);
      } else if (log.tier === 'stat') {
        await db.exec(`UPDATE stats SET xp = GREATEST(0, xp - ${amt}), level = ${levelCase(`GREATEST(0, xp - ${amt})`)} WHERE stat_key = '${log.entity_id}';`);
      } else if (log.tier === 'master') {
        await db.exec(`UPDATE master_progress SET total_xp = GREATEST(0, total_xp - ${amt}), level = ${levelCase(`GREATEST(0, total_xp - ${amt})`)} WHERE id = 1;`);
      }
    }
    await db.exec(`DELETE FROM xp_log WHERE source = 'course_section' AND source_id = $1;`, [sourceId]);
  };

  const levelCase = (col: string) => `
    CASE
      WHEN ${col} >= 438000 THEN (60 + FLOOR((${col} - 438000) / 13200) + 1)::int
      WHEN ${col} >= 424800 THEN 59
      WHEN ${col} >= 411800 THEN 58
      WHEN ${col} >= 399000 THEN 57
      WHEN ${col} >= 386400 THEN 56
      WHEN ${col} >= 374000 THEN 55
      WHEN ${col} >= 361800 THEN 54
      WHEN ${col} >= 349800 THEN 53
      WHEN ${col} >= 338000 THEN 52
      WHEN ${col} >= 326400 THEN 51
      WHEN ${col} >= 315000 THEN 50
      WHEN ${col} >= 303800 THEN 49
      WHEN ${col} >= 292800 THEN 48
      WHEN ${col} >= 282000 THEN 47
      WHEN ${col} >= 271400 THEN 46
      WHEN ${col} >= 261000 THEN 45
      WHEN ${col} >= 250800 THEN 44
      WHEN ${col} >= 240800 THEN 43
      WHEN ${col} >= 231000 THEN 42
      WHEN ${col} >= 221400 THEN 41
      WHEN ${col} >= 212000 THEN 40
      WHEN ${col} >= 202800 THEN 39
      WHEN ${col} >= 193800 THEN 38
      WHEN ${col} >= 185000 THEN 37
      WHEN ${col} >= 176400 THEN 36
      WHEN ${col} >= 168000 THEN 35
      WHEN ${col} >= 159800 THEN 34
      WHEN ${col} >= 151800 THEN 33
      WHEN ${col} >= 144000 THEN 32
      WHEN ${col} >= 136400 THEN 31
      WHEN ${col} >= 129000 THEN 30
      WHEN ${col} >= 121800 THEN 29
      WHEN ${col} >= 114800 THEN 28
      WHEN ${col} >= 108000 THEN 27
      WHEN ${col} >= 101400 THEN 26
      WHEN ${col} >= 95000 THEN 25
      WHEN ${col} >= 88800 THEN 24
      WHEN ${col} >= 82800 THEN 23
      WHEN ${col} >= 77000 THEN 22
      WHEN ${col} >= 71400 THEN 21
      WHEN ${col} >= 66000 THEN 20
      WHEN ${col} >= 60800 THEN 19
      WHEN ${col} >= 55800 THEN 18
      WHEN ${col} >= 51000 THEN 17
      WHEN ${col} >= 46400 THEN 16
      WHEN ${col} >= 42000 THEN 15
      WHEN ${col} >= 37800 THEN 14
      WHEN ${col} >= 33800 THEN 13
      WHEN ${col} >= 30000 THEN 12
      WHEN ${col} >= 26400 THEN 11
      WHEN ${col} >= 23000 THEN 10
      WHEN ${col} >= 19800 THEN 9
      WHEN ${col} >= 16800 THEN 8
      WHEN ${col} >= 14000 THEN 7
      WHEN ${col} >= 11400 THEN 6
      WHEN ${col} >= 9000 THEN 5
      WHEN ${col} >= 6800 THEN 4
      WHEN ${col} >= 4800 THEN 3
      WHEN ${col} >= 3000 THEN 2
      WHEN ${col} >= 1400 THEN 1
      ELSE 0
    END`;

  // ── Tick lesson complete ──────────────────────────────────

  const tickLesson = useMutation({
    mutationFn: async ({ lesson, section }: { lesson: Lesson; section: Section }) => {
      if (!course) return;

      const nowDone = !lesson.completed_at;
      const completedAt = nowDone ? new Date().toISOString() : null;

      // Update lesson
      await supabase
        .from('course_lessons')
        .update({ completed_at: completedAt })
        .eq('id', lesson.id);

      // Award XP on completion only
      if (nowDone) {
        const baseAmount = lesson.type === 'quiz'
          ? 30
          : lesson.type === 'assignment'
          ? 75
          : 15;

        // No per-lesson XP — bonus XP fires on section completion only

        // Check if section is now fully complete
        const updatedLessons = section.lessons.map(l =>
          l.id === lesson.id ? { ...l, completed_at: completedAt } : l
        );
        const sectionDone = updatedLessons.every(l => !!l.completed_at);

        if (sectionDone && !section.completed_at) {
          await supabase
            .from('course_sections')
            .update({ completed_at: new Date().toISOString() })
            .eq('id', section.id);

          const sectionBonus  = Math.floor(100 * (course.is_legacy ? 0.5 : 1.0));
          const { awardBonusXP } = await import('@/services/xpService');
          const linkedSkillIds = Array.isArray(course.linked_skill_ids) ? course.linked_skill_ids : [];
          const linkedSkillId = linkedSkillIds[0] || null;
          const coursePrimaryStat = statKeys[0];

          if (linkedSkillId && coursePrimaryStat) {
            const skillBonus = Math.floor(sectionBonus * 0.5);
            const statBonus = Math.floor(sectionBonus * 0.25);
            const masterBonus = Math.floor(sectionBonus * 0.25);
            await awardBonusXP({ source: 'course_section', sourceId: section.id, skillId: linkedSkillId, amount: skillBonus, notes: `${course.name} — ${section.title} [SKILL]`, tier: 'skill' });
            await awardBonusXP({ source: 'course_section', sourceId: section.id, statKey: coursePrimaryStat, amount: statBonus, notes: `${course.name} — ${section.title} [STAT]`, tier: 'stat' });
            await awardBonusXP({ source: 'course_section', sourceId: section.id, amount: masterBonus, notes: `${course.name} — ${section.title} [MASTER]`, tier: 'master' });
            setLastXP({ amount: sectionBonus, label: section.title });
          } else if (coursePrimaryStat) {
            const statBonus = Math.floor(sectionBonus * 0.5);
            const masterBonus = Math.floor(sectionBonus * 0.5);
            await awardBonusXP({ source: 'course_section', sourceId: section.id, statKey: coursePrimaryStat, amount: statBonus, notes: `${course.name} — ${section.title}`, tier: 'stat' });
            await awardBonusXP({ source: 'course_section', sourceId: section.id, amount: masterBonus, notes: `${course.name} — ${section.title}`, tier: 'master' });
            setLastXP({ amount: sectionBonus, label: section.title });
          }
          setTimeout(() => setLastXP(null), 3000);
        }

        // Update progress on parent course
        const updatedSections = (sections ?? []).map(s =>
          s.id === section.id ? { ...s, lessons: updatedLessons } : s
        );
        await updateProgress(updatedSections);

        await refreshAppData(queryClient);
      } else {
        // Unticking — remove XP if section was completed
        if (section.completed_at) {
          await reverseBonusXP(section.id);
        }

        // Unticking — just update progress
        const updatedSections = (sections ?? []).map(s =>
          s.id === section.id
            ? { ...s, lessons: s.lessons.map(l => l.id === lesson.id ? { ...l, completed_at: null } : l) }
            : s
        );
        await updateProgress(updatedSections);

        // Uncomplete the section too if we untick a lesson
        if (section.completed_at) {
          await supabase
            .from('course_sections')
            .update({ completed_at: null })
            .eq('id', section.id);
        }
      }
    },
      onSuccess: async () => {
        await refreshAppData(queryClient);
      },
  });

  // ── Tick section directly (only when it has no lessons) ──

  const tickSection = useMutation({
    mutationFn: async (section: Section) => {
      if (!course) return;
      const nowDone = !section.completed_at;
      const completedAt = nowDone ? new Date().toISOString() : null;

      await supabase
        .from('course_sections')
        .update({ completed_at: completedAt })
        .eq('id', section.id);

      if (nowDone) {
        const statKeys = (course.linked_stats ?? []) as StatKey[];
        const sectionBonus2  = Math.floor(100 * (course.is_legacy ? 0.5 : 1.0));
        const { awardBonusXP: awardBonusXP2 } = await import('@/services/xpService');
        const linkedSkillIds = Array.isArray(course.linked_skill_ids) ? course.linked_skill_ids : [];
        const linkedSkillId = linkedSkillIds[0] || null;
        const coursePrimaryStat = statKeys[0];

        if (linkedSkillId && coursePrimaryStat) {
          const skillBonus = Math.floor(sectionBonus2 * 0.5);
          const statBonus = Math.floor(sectionBonus2 * 0.25);
          const masterBonus = Math.floor(sectionBonus2 * 0.25);
          await awardBonusXP2({ source: 'course_section', sourceId: section.id, skillId: linkedSkillId, amount: skillBonus, notes: `${course.name} — ${section.title} [SKILL]`, tier: 'skill' });
          await awardBonusXP2({ source: 'course_section', sourceId: section.id, statKey: coursePrimaryStat, amount: statBonus, notes: `${course.name} — ${section.title} [STAT]`, tier: 'stat' });
          await awardBonusXP2({ source: 'course_section', sourceId: section.id, amount: masterBonus, notes: `${course.name} — ${section.title} [MASTER]`, tier: 'master' });
          setLastXP({ amount: sectionBonus2, label: section.title });
        } else if (coursePrimaryStat) {
          const statBonus = Math.floor(sectionBonus2 * 0.5);
          const masterBonus = Math.floor(sectionBonus2 * 0.5);
          await awardBonusXP2({ source: 'course_section', sourceId: section.id, statKey: coursePrimaryStat, amount: statBonus, notes: `${course.name} — ${section.title}`, tier: 'stat' });
          await awardBonusXP2({ source: 'course_section', sourceId: section.id, amount: masterBonus, notes: `${course.name} — ${section.title}`, tier: 'master' });
          setLastXP({ amount: sectionBonus2, label: section.title });
        }
        setTimeout(() => setLastXP(null), 3000);
      } else {
        // Unticking — reverse XP
        await reverseBonusXP(section.id);
      }

      const updatedSections = (sections ?? []).map(s =>
        s.id === section.id ? { ...s, completed_at: completedAt } : s
      );
      await updateProgress(updatedSections);
        await refreshAppData(queryClient);
      },
      onSuccess: async () => {
        await refreshAppData(queryClient);
      },
  });

  // ── Add lesson ────────────────────────────────────────────

  const addLesson = useMutation({
    mutationFn: async ({ sectionId, title, type }: { sectionId: string; title: string; type: 'lesson' | 'quiz' | 'assignment' }) => {
      const currentLessons = sections?.find(s => s.id === sectionId)?.lessons ?? [];
      const { error } = await supabase
        .from('course_lessons')
        .insert({
          section_id: sectionId,
          course_id:  courseId,
          title,
          type,
          sort_order: currentLessons.length,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-sections', courseId] });
      setAddingLessonToSection(null);
      setNewLessonTitle('');
      setNewLessonType('lesson');
    },
  });

  // ── Add section ───────────────────────────────────────────

  const addSection = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase
        .from('course_sections')
        .insert({
          course_id:  courseId,
          title,
          sort_order: sections?.length ?? 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-sections', courseId] });
      setShowAddSection(false);
      setAddingSectionTitle('');
    },
  });

  // ── Toggle section expand ─────────────────────────────────

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Shared styles ─────────────────────────────────────────

  const mono = "'IBM Plex Mono', monospace";
  const dimText = 'hsl(var(--text-dim))';
  const accent = 'hsl(var(--accent))';
  const accentDim = 'hsl(var(--accent-dim))';

  // ── Save edit ────────────────────────────────────────────
  const saveEdit = useMutation({
    mutationFn: async () => {
      const db = await import('@/lib/db').then(m => m.getDB());
      await db.query(
        `UPDATE courses SET
          name               = $1,
          provider           = $2,
          subject            = $3,
          url                = $4,
          linked_stats       = $5,
          linked_tool_ids    = $6,
          linked_augment_ids = $7,
          linked_media_ids   = $8
         WHERE id = $9`,
        [
          editName.trim(),
          editProvider.trim() || null,
          editSubject.trim()  || null,
          editUrl.trim()      || null,
          JSON.stringify(editStats),
          JSON.stringify(editToolIds),
          JSON.stringify(editAugIds),
          JSON.stringify(editMediaIds),
          courseId,
        ]
      );
    },
      onSuccess: async () => {
        await refreshAppData(queryClient);
        setEditing(false);
      },
  });

  // ── Delete course ─────────────────────────────────────────
  const deleteCourse = useMutation({
    mutationFn: async () => {
      const db = await import('@/lib/db').then(m => m.getDB());
      await db.exec(`DELETE FROM courses WHERE id = '${courseId}'`);
    },
      onSuccess: async () => {
        await refreshAppData(queryClient);
        onClose?.();
      },
  });

  const startEdit = () => {
    if (!course) return;
    setEditName(course.name);
    setEditProvider(course.provider ?? '');
    setEditSubject(course.subject ?? '');
    setEditUrl(course.url ?? '');
    setEditStats(course.linked_stats ?? []);
    setEditToolIds(course.linked_tool_ids ?? []);
    setEditAugIds(course.linked_augment_ids ?? []);
    setEditMediaIds(course.linked_media_ids ?? []);
    setEditing(true);
  };

  // ── Render ────────────────────────────────────────────────

  if (courseLoading || sectionsLoading) {
    return (
      <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dimText }}>
        LOADING...
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dimText }}>
        COURSE NOT FOUND
      </div>
    );
  }

  const sectionsWithLessons    = (sections ?? []).filter(s => s.lessons.length > 0);
  const sectionsWithoutLessons = (sections ?? []).filter(s => s.lessons.length === 0);
  const allLessons   = sectionsWithLessons.flatMap(s => s.lessons);
  const doneLessons  = allLessons.filter(l => !!l.completed_at).length;
  const totalLessons = allLessons.length;
  const doneSectionUnits = sectionsWithoutLessons.filter(s => !!s.completed_at).length;
  const totalUnits = totalLessons + sectionsWithoutLessons.length;
  const doneUnits  = doneLessons + doneSectionUnits;
  const statKeys   = (course.linked_stats ?? []) as StatKey[];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: mono,
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: '1px solid hsl(var(--accent-dim))',
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          color: accentDim,
          letterSpacing: 2,
          marginBottom: 6,
        }}>
          // COURSE
        </div>
        <div style={{
          fontFamily: "'VT323', monospace",
          fontSize: 22,
          color: accent,
          textShadow: '0 0 10px rgba(255,176,0,0.3)',
          lineHeight: 1.1,
          marginBottom: 4,
        }}>
          {course.name}
        </div>
        {course.provider && (
          <div style={{ fontSize: 10, color: dimText, marginBottom: course.url ? 4 : 10 }}>
            {course.provider}{course.subject ? ` — ${course.subject}` : ''}
          </div>
        )}
        {course.url && (
          <a
            href={course.url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block',
              fontSize: 10,
              color: accentDim,
              textDecoration: 'none',
              marginBottom: 10,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = accent)}
            onMouseLeave={e => (e.currentTarget.style.color = accentDim)}
          >
            ↗ {course.url}
          </a>
        )}

        {/* Stat tags */}
        {statKeys.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {statKeys.map(k => (
              <span key={k} style={{
                fontSize: 9,
                color: accentDim,
                border: '1px solid hsl(var(--accent-dim))',
                padding: '1px 6px',
                letterSpacing: 1,
              }}>
                {STAT_META[k]?.icon} {k.toUpperCase()}
              </span>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <XPBar value={course.progress} max={100} />
          <span style={{ fontSize: 10, color: dimText, flexShrink: 0 }}>
            {course.progress}%
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: dimText }}>
            {doneUnits} / {totalUnits} {totalLessons > 0 ? 'lessons' : 'modules'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {(sections ?? []).length > 0 && (
              <span
                onClick={() => setSectionsCollapsed(v => !v)}
                style={{ fontSize: 9, color: dimText, cursor: 'pointer', letterSpacing: 1, opacity: 0.7 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
              >
                {sectionsCollapsed ? '▾ SHOW MODULES' : '▴ HIDE MODULES'}
              </span>
            )}
            <StatusBadge status={course.status} />
          </div>
        </div>

        {/* XP toast */}
        {lastXP && (
          <div style={{ marginTop: 8 }}>
            <XPToast amount={lastXP.amount} label={lastXP.label} />
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--accent-dim)) hsl(var(--bg-secondary))' }}>

      {/* ── Sections + lessons ── */}
      {!sectionsCollapsed && (
      <div style={{
        padding: '8px 0',
      }}>
        <style>{`
          .course-scroll::-webkit-scrollbar { width: 4px; }
          .course-scroll::-webkit-scrollbar-track { background: hsl(var(--bg-secondary)); }
          .course-scroll::-webkit-scrollbar-thumb { background: hsl(var(--accent-dim)); }
          .course-scroll::-webkit-scrollbar-thumb:hover { background: hsl(var(--accent)); }
        `}</style>

        {(sections ?? []).length === 0 ? (
          <div style={{ padding: '20px', fontSize: 11, color: dimText, opacity: 0.6 }}>
            No sections yet. Add one below.
          </div>
        ) : (
          <>
            {/* Collapse / expand all */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 20px 6px' }}>
              {expandedSections.size > 0 ? (
                <span
                  onClick={() => setExpandedSections(new Set())}
                  style={{ fontSize: 9, color: dimText, cursor: 'pointer', letterSpacing: 1, opacity: 0.6 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                >
                  ▴ COLLAPSE ALL
                </span>
              ) : (
                <span
                  onClick={() => setExpandedSections(new Set((sections ?? []).map(s => s.id)))}
                  style={{ fontSize: 9, color: dimText, cursor: 'pointer', letterSpacing: 1, opacity: 0.6 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                >
                  ▾ EXPAND ALL
                </span>
              )}
            </div>

          {(sections ?? []).map(section => {
            const isExpanded   = expandedSections.has(section.id);
            const sectionDone  = section.lessons.length > 0
              ? section.lessons.every(l => !!l.completed_at)
              : !!section.completed_at;
            const lessonsDone  = section.lessons.filter(l => !!l.completed_at).length;

            return (
              <div key={section.id}>
                {/* Section header */}
                <div
                  onClick={() => toggleSection(section.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 20px',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(255,176,0,0.04)' : 'transparent',
                    borderBottom: '1px solid rgba(153,104,0,0.3)',
                    userSelect: 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,176,0,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = isExpanded ? 'rgba(255,176,0,0.04)' : 'transparent')}
                >
                  {/* Expand arrow — always present */}
                  <span style={{ fontSize: 10, color: accentDim, width: 10, flexShrink: 0 }}>
                    {isExpanded ? '▾' : '›'}
                  </span>

                  {/* Section checkbox — only when no lessons, stops propagation */}
                  {section.lessons.length === 0 && (
                    <div
                      role="checkbox"
                      aria-checked={sectionDone}
                      tabIndex={0}
                      onClick={e => { 
                        console.log('Section checkbox clicked', section.id, sectionDone);
                        e.stopPropagation(); tickSection.mutate(section); 
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          tickSection.mutate(section);
                        }
                      }}
                      style={{
                        width: 14,
                        height: 14,
                        border: `1px solid ${sectionDone ? '#44ff88' : accentDim}`,
                        background: sectionDone ? 'rgba(68,255,136,0.15)' : 'transparent',
                        cursor: 'pointer',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        pointerEvents: 'auto',
                        color: '#44ff88',
                      }}
                    >
                      {sectionDone ? '✓' : ''}
                    </div>
                  )}

                  <span
                    style={{
                      fontSize: 11,
                      color: sectionDone ? '#44ff88' : accent,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sectionDone ? '✓ ' : ''}{section.title}
                  </span>

                  {section.lessons.length > 0 ? (
                    <span style={{ fontSize: 9, color: dimText, flexShrink: 0 }}>
                      {lessonsDone}/{section.lessons.length}
                    </span>
                  ) : (
                    <span
                      onClick={() => setAddingLessonToSection(section.id)}
                      style={{ fontSize: 9, color: dimText, flexShrink: 0, cursor: 'pointer', opacity: 0.5 }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                    >
                      + lessons
                    </span>
                  )}
                </div>

                {/* Lessons */}
                {isExpanded && (
                  <div style={{ borderBottom: '1px solid rgba(153,104,0,0.2)' }}>
                    {section.lessons.length === 0 ? (
                      <div style={{ padding: '8px 20px 8px 40px', fontSize: 10, color: dimText, opacity: 0.5 }}>
                        No lessons yet.
                      </div>
                    ) : (
                      section.lessons.map(lesson => {
                        const isDone = !!lesson.completed_at;
                        const typeLabel = lesson.type === 'quiz' ? 'QUIZ'
                          : lesson.type === 'assignment' ? 'ASSIGN'
                          : 'LESSON';

                        return (
                          <div
                            key={lesson.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '7px 20px 7px 36px',
                              borderBottom: '1px solid rgba(153,104,0,0.15)',
                              opacity: tickLesson.isPending ? 0.7 : 1,
                            }}
                          >
                            {/* Checkbox */}
                            <div
                              role="checkbox"
                              aria-checked={isDone}
                              tabIndex={0}
                              onClick={(e) => { 
                                console.log('Checkbox clicked', lesson.id, isDone);
                                e.stopPropagation(); 
                                tickLesson.mutate({ lesson, section }); 
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  tickLesson.mutate({ lesson, section });
                                }
                              }}
                              style={{
                                width: 14,
                                height: 14,
                                border: `1px solid ${isDone ? '#44ff88' : accentDim}`,
                                background: isDone ? 'rgba(68,255,136,0.15)' : 'transparent',
                                cursor: 'pointer',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 9,
                                color: '#44ff88',
                                pointerEvents: 'auto',
                              }}
                            >
                              {isDone ? '✓' : ''}
                            </div>

                            {/* Title */}
                            <span style={{
                              fontSize: 11,
                              color: isDone ? dimText : accent,
                              flex: 1,
                              textDecoration: isDone ? 'line-through' : 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              opacity: isDone ? 0.6 : 1,
                            }}>
                              {lesson.title}
                            </span>

                            {/* Type badge */}
                            <span style={{
                              fontSize: 8,
                              color: accentDim,
                              border: '1px solid rgba(153,104,0,0.4)',
                              padding: '1px 4px',
                              flexShrink: 0,
                              letterSpacing: 1,
                            }}>
                              {typeLabel}
                            </span>

                            {/* XP amount */}
                            <span style={{ fontSize: 9, color: dimText, flexShrink: 0, width: 42, textAlign: 'right' }}>
                              +{lesson.type === 'quiz'
                                ? 30
                                : lesson.type === 'assignment'
                                ? 75
                                : 15} XP
                            </span>
                          </div>
                        );
                      })
                    )}

                    {/* Add lesson row */}
                    {addingLessonToSection === section.id ? (
                      <div style={{ padding: '8px 20px 8px 36px', display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          autoFocus
                          value={newLessonTitle}
                          onChange={e => setNewLessonTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newLessonTitle.trim()) {
                              addLesson.mutate({ sectionId: section.id, title: newLessonTitle.trim(), type: newLessonType });
                            }
                            if (e.key === 'Escape') {
                              setAddingLessonToSection(null);
                              setNewLessonTitle('');
                            }
                          }}
                          placeholder="lesson title..."
                          style={{
                            flex: 1,
                            background: 'hsl(var(--bg-tertiary))',
                            border: '1px solid hsl(var(--accent-dim))',
                            color: accent,
                            fontFamily: mono,
                            fontSize: 11,
                            padding: '4px 8px',
                            outline: 'none',
                          }}
                        />
                        <select
                          value={newLessonType}
                          onChange={e => setNewLessonType(e.target.value as any)}
                          style={{
                            background: 'hsl(var(--bg-tertiary))',
                            border: '1px solid hsl(var(--accent-dim))',
                            color: accentDim,
                            fontFamily: mono,
                            fontSize: 9,
                            padding: '4px 6px',
                            outline: 'none',
                          }}
                        >
                          <option value="lesson">LESSON</option>
                          <option value="quiz">QUIZ</option>
                          <option value="assignment">ASSIGN</option>
                        </select>
                        <button
                          onClick={() => {
                            if (newLessonTitle.trim()) {
                              addLesson.mutate({ sectionId: section.id, title: newLessonTitle.trim(), type: newLessonType });
                            }
                          }}
                          style={btnStyle(true)}
                        >
                          ADD
                        </button>
                        <button
                          onClick={() => { setAddingLessonToSection(null); setNewLessonTitle(''); }}
                          style={btnStyle(false)}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => setAddingLessonToSection(section.id)}
                        style={{
                          padding: '6px 20px 6px 36px',
                          fontSize: 10,
                          color: dimText,
                          cursor: 'pointer',
                          opacity: 0.5,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                      >
                        + ADD LESSON
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </>
        )}

        {/* ── Add section ── */}
        <div style={{ padding: '12px 20px' }}>
          {showAddSection ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                autoFocus
                value={addingSectionTitle}
                onChange={e => setAddingSectionTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && addingSectionTitle.trim()) {
                    addSection.mutate(addingSectionTitle.trim());
                  }
                  if (e.key === 'Escape') {
                    setShowAddSection(false);
                    setAddingSectionTitle('');
                  }
                }}
                placeholder="section title..."
                style={{
                  flex: 1,
                  background: 'hsl(var(--bg-tertiary))',
                  border: '1px solid hsl(var(--accent-dim))',
                  color: accent,
                  fontFamily: mono,
                  fontSize: 11,
                  padding: '5px 8px',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => { if (addingSectionTitle.trim()) addSection.mutate(addingSectionTitle.trim()); }}
                style={btnStyle(true)}
              >
                ADD
              </button>
              <button
                onClick={() => { setShowAddSection(false); setAddingSectionTitle(''); }}
                style={btnStyle(false)}
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddSection(true)}
              style={{
                background: 'transparent',
                border: '1px solid hsl(var(--accent-dim))',
                color: accentDim,
                fontFamily: mono,
                fontSize: 10,
                padding: '5px 12px',
                cursor: 'pointer',
                width: '100%',
                letterSpacing: 1,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = accent;
                e.currentTarget.style.color = accent;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = accentDim;
                e.currentTarget.style.color = accentDim;
              }}
            >
              [ + ADD SECTION ]
            </button>
          )}
        </div>
      </div>
      )} {/* end !sectionsCollapsed */}

      {/* ── Linked references ── */}
      {((course.linked_tool_ids ?? []).length > 0 ||
        (course.linked_augment_ids ?? []).length > 0 ||
        (course.linked_media_ids ?? []).length > 0) && (
        <LinkedReferences
          toolIds={course.linked_tool_ids ?? []}
          augmentIds={course.linked_augment_ids ?? []}
          mediaIds={course.linked_media_ids ?? []}
          mono={mono}
          accent={accent}
          accentDim={accentDim}
          dimText={dimText}
        />
      )}

      {/* ── Edit form ── */}
      {editing && (
        <div style={{ padding: '0 20px 16px', flexShrink: 0, borderBottom: `1px solid ${accentDim}` }}>
          <div style={{ fontSize: 9, color: accentDim, letterSpacing: 2, marginBottom: 10 }}>// EDIT COURSE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['NAME', editName, setEditName], ['PROVIDER', editProvider, setEditProvider], ['SUBJECT', editSubject, setEditSubject], ['URL', editUrl, setEditUrl]].map(([label, val, setter]) => (
              <div key={label as string}>
                <div style={{ fontSize: 9, color: accentDim, letterSpacing: 1, marginBottom: 3 }}>{label as string}</div>
                <input value={val as string} onChange={e => (setter as any)(e.target.value)}
                  style={{ width: '100%', padding: '5px 8px', fontSize: 11, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${accentDim}`, color: accent, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 9, color: accentDim, letterSpacing: 1, marginBottom: 4 }}>LINKED STATS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(['body','wire','mind','cool','grit','flow','ghost'] as string[]).map(k => {
                  const on = editStats.includes(k);
                  return (
                    <button key={k} onClick={() => setEditStats(prev => on ? prev.filter(s => s !== k) : [...prev, k])}
                      style={{ padding: '3px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${on ? accent : accentDim}`, background: on ? 'rgba(255,176,0,0.1)' : 'transparent', color: on ? accent : dimText }}>
                      {k.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
            <CourseLinkedIdsInput label="TOOLS" tableName="tools" nameField="name" subField="type" selectedIds={editToolIds} onChange={setEditToolIds} />
            <CourseLinkedIdsInput label="AUGMENTS" tableName="augments" nameField="name" subField="category" selectedIds={editAugIds} onChange={setEditAugIds} />
            <CourseLinkedIdsInput label="MEDIA" tableName="media" nameField="title" subField="type" selectedIds={editMediaIds} onChange={setEditMediaIds} />
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending}
                style={{ flex: 1, padding: '6px', fontSize: 9, border: `1px solid ${accent}`, background: 'transparent', color: accent, fontFamily: mono, cursor: 'pointer' }}>
                {saveEdit.isPending ? 'SAVING...' : '✓ SAVE'}
              </button>
              <button onClick={() => setEditing(false)}
                style={{ flex: 1, padding: '6px', fontSize: 9, border: `1px solid ${accentDim}`, background: 'transparent', color: dimText, fontFamily: mono, cursor: 'pointer' }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notes / description ── */}
      {!editing && (
      <div style={{ padding: '0 20px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 9, color: accentDim, letterSpacing: 2, marginBottom: 6 }}>
          // NOTES
        </div>
        <textarea
          value={notesValue ?? (course.notes ?? '')}
          onChange={e => setNotesValue(e.target.value)}
          onBlur={async e => {
            const val = e.target.value.trim();
            await supabase.from('courses').update({ notes: val || null }).eq('id', courseId);
            queryClient.invalidateQueries({ queryKey: ['course', courseId] });
          }}
          placeholder="Add notes or description..."
          rows={4}
          style={{ width: '100%', background: 'hsl(var(--bg-secondary))', border: '1px solid rgba(153,104,0,0.4)', color: 'hsl(var(--text-dim))', fontFamily: mono, fontSize: 11, lineHeight: 1.6, padding: '8px 10px', outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const }}
          onFocus={e => (e.target.style.borderColor = accentDim)}
        />
      </div>
      )}

      </div>{/* end scrollable body */}

      {/* ── Actions ── */}
      <div style={{ padding: '12px 20px 20px', flexShrink: 0, borderTop: `1px solid rgba(153,104,0,0.3)` }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: showDelete ? 8 : 0 }}>
          <button onClick={editing ? () => setEditing(false) : startEdit}
            style={{ flex: 1, height: 30, border: `1px solid ${accentDim}`, background: 'transparent', color: editing ? accent : accentDim, fontFamily: mono, fontSize: 9, cursor: 'pointer', letterSpacing: 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = accentDim; e.currentTarget.style.color = editing ? accent : accentDim; }}>
            {editing ? '[ CANCEL EDIT ]' : '[ EDIT ]'}
          </button>
          <button onClick={() => setShowDelete(v => !v)}
            style={{ flex: 1, height: 30, border: '1px solid rgba(153,104,0,0.4)', background: 'transparent', color: dimText, fontFamily: mono, fontSize: 9, cursor: 'pointer', letterSpacing: 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4400'; e.currentTarget.style.color = '#ff4400'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)'; e.currentTarget.style.color = dimText; }}>
            [ DELETE ]
          </button>
        </div>
        {showDelete && (
          <div style={{ border: '1px solid #ff3300', padding: '10px 12px', background: 'rgba(255,51,0,0.06)' }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: '#ff4400', marginBottom: 8 }}>DELETE COURSE? This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => deleteCourse.mutate()} style={{ flex: 1, height: 28, background: 'transparent', border: '1px solid #ff4400', color: '#ff4400', fontFamily: mono, fontSize: 9, cursor: 'pointer' }}>[ CONFIRM DELETE ]</button>
              <button onClick={() => setShowDelete(false)} style={{ flex: 1, height: 28, background: 'transparent', border: `1px solid ${accentDim}`, color: dimText, fontFamily: mono, fontSize: 9, cursor: 'pointer' }}>[ CANCEL ]</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared button style ───────────────────────────────────────

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    background: 'transparent',
    border: `1px solid ${primary ? 'hsl(var(--accent-dim))' : 'rgba(153,104,0,0.4)'}`,
    color: primary ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    padding: '4px 8px',
    cursor: 'pointer',
    flexShrink: 0,
  };
}
