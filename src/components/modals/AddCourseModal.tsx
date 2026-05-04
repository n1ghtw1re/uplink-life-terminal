// ============================================================
// src/components/modals/AddCourseModal.tsx
// ============================================================
import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StatKey, STAT_META } from '@/types';
import { toast } from '@/hooks/use-toast';
import { getDB } from '@/lib/db';

const STAT_KEYS: StatKey[] = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];

interface Props {
  onClose: () => void;
}

// ── Skill Search Component ───────────────────────────────────
function SkillSearch({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string | null) => void }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mono = "'IBM Plex Mono', monospace";
  const acc = 'hsl(var(--accent))';
  const adim = 'hsl(var(--accent-dim))';
  const dim = 'hsl(var(--text-dim))';
  const bgS = 'hsl(var(--bg-secondary))';
  const bgT = 'hsl(var(--bg-tertiary))';

  const { data: allSkills = [] } = useQuery({
    queryKey: ['skills-for-course-link'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string; stat_keys: string }>(
        `SELECT id, name, stat_keys FROM skills WHERE active = true ORDER BY name;`
      );
      return res.rows;
    },
  });

  const selectedSkill = allSkills.find(s => s.id === selectedId);

  const filtered = useMemo(() => {
    if (!search.trim()) return allSkills.slice(0, 12);
    return allSkills.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).slice(0, 12);
  }, [search, allSkills]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {selectedSkill ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: bgS, border: `1px solid ${acc}` }}>
          <span style={{ fontSize: 10, color: acc, flex: 1, fontFamily: mono }}>{selectedSkill.name}</span>
          <span
            onClick={() => onSelect(null)}
            style={{ fontSize: 9, color: adim, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ff4400')}
            onMouseLeave={e => (e.currentTarget.style.color = adim)}
          >×</span>
        </div>
      ) : (
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search skills..."
          style={{ width: '100%', padding: '5px 8px', fontSize: 10, background: bgS, border: `1px solid ${open ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }}
        />
      )}
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: bgS, border: `1px solid ${adim}`, zIndex: 200, maxHeight: 160, overflowY: 'auto' as const, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', marginTop: 2 }}>
          {filtered.map(s => {
            let stats: string[] = [];
            try {
              const raw = s.stat_keys;
              if (Array.isArray(raw)) {
                stats = raw;
              } else if (typeof raw === 'string') {
                stats = JSON.parse(raw || '[]');
              }
            } catch { stats = []; }
            return (
              <div key={s.id} onMouseDown={() => { onSelect(s.id); setSearch(''); setOpen(false); }}
                style={{ padding: '6px 10px', fontSize: 10, cursor: 'pointer', color: dim, background: 'transparent', display: 'flex', justifyContent: 'space-between', fontFamily: mono, borderBottom: `1px solid rgba(153,104,0,0.15)` }}
                onMouseEnter={e => { e.currentTarget.style.background = bgT; e.currentTarget.style.color = acc; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = dim; }}>
                <span>{s.name}</span>
                <span style={{ fontSize: 9, opacity: 0.5 }}>{stats.join('/').toUpperCase()}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Reusable linked-item picker ───────────────────────────────
function LinkedIdsInput({ label, tableName, nameField, subField, selectedIds, onChange }: {
  label: string; tableName: string; nameField: string; subField: string;
  selectedIds: string[]; onChange: (ids: string[]) => void;
}) {
  const [search, setSearch]   = useState('');
  const [results, setResults] = useState<{ id: string; name: string; sub: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string; sub: string }[]>([]);
  const [open, setOpen]       = useState(false);
  const mono = "'IBM Plex Mono', monospace";
  const acc  = 'hsl(var(--accent))';
  const adim = 'hsl(var(--accent-dim))';
  const dim  = 'hsl(var(--text-dim))';
  const bgS  = 'hsl(var(--bg-secondary))';

  // Load names for already-selected IDs on mount / when selectedIds changes
  useEffect(() => {
    if (selectedIds.length === 0) { setSelected([]); return; }
    (async () => {
      const db  = await getDB();
      const res = await db.query<{ id: string; [k: string]: string }>(
        `SELECT id, ${nameField}, ${subField} FROM ${tableName} WHERE id = ANY($1::text[]);`,
        [selectedIds]
      );
      setSelected(res.rows.map(r => ({ id: r.id, name: r[nameField] ?? '', sub: r[subField] ?? '' })));
    })();
  }, [selectedIds.join(',')]);

  // Load search results when dropdown open
  useEffect(() => {
    if (!open) return;
    (async () => {
      const db  = await getDB();
      const q   = search.trim();
      const res = await db.query<{ id: string; [k: string]: string }>(
        `SELECT id, ${nameField}, ${subField} FROM ${tableName}
         ${q ? `WHERE LOWER(${nameField}) LIKE LOWER($1)` : ''}
         ORDER BY ${nameField} LIMIT 20;`,
        q ? [`%${q}%`] : []
      );
      setResults(res.rows.map(r => ({ id: r.id, name: r[nameField] ?? '', sub: r[subField] ?? '' })));
    })();
  }, [search, open]);

  const toggle = (item: { id: string; name: string; sub: string }) => {
    const next = selectedIds.includes(item.id)
      ? selectedIds.filter(x => x !== item.id)
      : [...selectedIds, item.id];
    onChange(next);
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 5 }}>{label}</div>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
          {selected.map(item => (
            <span key={item.id} onClick={() => toggle(item)}
              style={{ fontSize: 9, color: acc, border: `1px solid ${acc}`, padding: '2px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: mono }}>
              {item.name.toUpperCase()} <span style={{ opacity: 0.5 }}>×</span>
            </span>
          ))}
        </div>
      )}

      {/* Add button / search */}
      {!open ? (
        <span onClick={() => setOpen(true)}
          style={{ fontSize: 9, color: adim, cursor: 'pointer', border: `1px dashed ${adim}`, padding: '2px 10px', fontFamily: mono }}>
          + ADD
        </span>
      ) : (
        <div style={{ position: 'relative' }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Type to search..."
            style={{ width: '100%', padding: '5px 8px', fontSize: 10, background: bgS, border: `1px solid ${acc}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }}
          />
          {results.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: bgS, border: `1px solid ${adim}`, zIndex: 100, maxHeight: 150, overflowY: 'auto' as const }}>
              {results.map(r => {
                const isSel = selectedIds.includes(r.id);
                return (
                  <div key={r.id} onMouseDown={() => toggle(r)}
                    style={{ padding: '6px 10px', fontSize: 10, cursor: 'pointer', color: isSel ? acc : dim, background: isSel ? 'rgba(255,176,0,0.08)' : 'transparent', display: 'flex', justifyContent: 'space-between', fontFamily: mono }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,176,0,0.06)'}
                    onMouseLeave={e => { e.currentTarget.style.background = isSel ? 'rgba(255,176,0,0.08)' : 'transparent'; }}>
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

export default function AddCourseModal({ onClose }: Props) {
  const queryClient = useQueryClient();

  const [name, setName]         = useState('');
  const [provider, setProvider] = useState('');
  const [subject, setSubject]   = useState('');
  const [url, setUrl]           = useState('');
  const [notes, setNotes]       = useState('');
  const [certEarned, setCertEarned] = useState(false);
  const [isLegacy, setIsLegacy]     = useState(false);
  const [isOngoing, setIsOngoing]   = useState(false);
  const [saving, setSaving]         = useState(false);

  const [primaryStat, setPrimaryStat]   = useState<StatKey>('mind');
  const [secondaryStat, setSecondaryStat] = useState<StatKey | ''>('');
  const [split, setSplit]               = useState(50);
  const [linkedSkillId, setLinkedSkillId] = useState<string | null>(null);
  const [linkedToolIds, setLinkedToolIds]     = useState<string[]>([]);
  const [linkedAugmentIds, setLinkedAugmentIds] = useState<string[]>([]);
  const [linkedMediaIds, setLinkedMediaIds]   = useState<string[]>([]);
  const [modules, setModules]               = useState<string[]>(['']);

  const hasDual = secondaryStat !== '';

  const getLinkedStats = (): StatKey[] => {
    if (hasDual) return [primaryStat, secondaryStat as StatKey];
    return [primaryStat];
  };

  const getDefaultSplit = (): number[] => {
    if (hasDual) return [split, 100 - split];
    return [100];
  };


  const updateModule = (i: number, val: string) =>
    setModules(prev => prev.map((m, idx) => idx === i ? val : m));

  const removeModule = (i: number) =>
    setModules(prev => prev.filter((_, idx) => idx !== i));

  const addModule = () => setModules(prev => [...prev, '']);


  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { getDB } = await import('@/lib/db');
      const db = await getDB();
      const courseId = crypto.randomUUID();
      const now = new Date().toISOString();

      await db.exec(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS default_split JSONB NOT NULL DEFAULT '[100]';`);

      const linkedStats = getLinkedStats();
      const defaultSplit = getDefaultSplit();

      await db.query(
        `INSERT INTO courses
          (id, name, provider, subject, url, notes, linked_stats, default_split, linked_skill_ids, linked_tool_ids,
           linked_augment_ids, linked_media_ids, status, progress, cert_earned,
           is_legacy, is_ongoing, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [
          courseId, name.trim(),
          provider.trim() || null, subject.trim() || null,
          url.trim() || null, notes.trim() || null,
          JSON.stringify(linkedStats),
          JSON.stringify(defaultSplit),
          JSON.stringify(linkedSkillId ? [linkedSkillId] : []),
          JSON.stringify(linkedToolIds),
          JSON.stringify(linkedAugmentIds),
          JSON.stringify(linkedMediaIds),
          isLegacy ? 'COMPLETE' : 'ACTIVE',
          isLegacy ? 100 : 0,
          certEarned, isLegacy, isOngoing, now,
        ]
      );

      const validModules = modules
        .map((title, sort_order) => ({ title: title.trim(), sort_order }))
        .filter(m => m.title.length > 0);

      for (const m of validModules) {
        await db.query(
          `INSERT INTO course_sections (id, course_id, title, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [crypto.randomUUID(), courseId, m.title, m.sort_order]
        );
      }

      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses-all'] });
      queryClient.invalidateQueries({ queryKey: ['terminal-courses-list'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['operator'] });
      queryClient.invalidateQueries({ queryKey: ['xp-recent'] });

      toast({
        title: '✓ COURSE ADDED',
        description: `${name.trim()}${validModules.length > 0 ? ` — ${validModules.length} module${validModules.length !== 1 ? 's' : ''}` : ''}`,
      });
      onClose();
    } catch (err: any) {
      console.error('AddCourseModal error:', err);
      const msg = err?.message ?? err?.details ?? err?.hint ?? String(err);
      toast({ title: 'ERROR', description: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 13, fontSize: 11 }}>

      {/* Name */}
      <div>
        <div className="crt-field-label">
          COURSE NAME <span style={{ color: 'hsl(var(--accent))' }}>*</span>
        </div>
        <input
          className="crt-input"
          style={{ width: '100%' }}
          placeholder="e.g. Junior Cybersecurity Analyst"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          maxLength={100}
        />
      </div>

      {/* Provider + Subject */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div className="crt-field-label">PROVIDER</div>
          <input
            className="crt-input"
            style={{ width: '100%' }}
            placeholder="HackTheBox, Udemy..."
            value={provider}
            onChange={e => setProvider(e.target.value)}
            maxLength={60}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div className="crt-field-label">SUBJECT</div>
          <input
            className="crt-input"
            style={{ width: '100%' }}
            placeholder="Cybersecurity, React..."
            value={subject}
            onChange={e => setSubject(e.target.value)}
            maxLength={60}
          />
        </div>
      </div>

      {/* URL */}
      <div>
        <div className="crt-field-label">URL <span style={{ opacity: 0.5 }}>(optional)</span></div>
        <input
          className="crt-input"
          style={{ width: '100%' }}
          placeholder="https://..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          maxLength={500}
        />
      </div>

      {/* Primary stat */}
      <div>
        <div className="crt-field-label">PRIMARY STAT <span style={{ color: 'hsl(var(--accent))' }}>*</span></div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STAT_KEYS.map(k => (
            <button key={k} className="topbar-btn" style={{
              border: `1px solid ${primaryStat === k ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
              color: primaryStat === k ? 'hsl(var(--accent-bright))' : 'hsl(var(--text-dim))',
              boxShadow: primaryStat === k ? '0 0 6px rgba(255,176,0,0.3)' : 'none',
            }} onClick={() => { setPrimaryStat(k); if (secondaryStat === k) setSecondaryStat(''); }}>
              {STAT_META[k].icon} {STAT_META[k].name}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary stat */}
      <div>
        <div className="crt-field-label">SECONDARY STAT <span style={{ opacity: 0.5 }}>(optional)</span></div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="topbar-btn" style={{
            border: `1px solid ${secondaryStat === '' ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
            color: secondaryStat === '' ? 'hsl(var(--accent-bright))' : 'hsl(var(--text-dim))',
          }} onClick={() => setSecondaryStat('')}>NONE</button>
          {STAT_KEYS.filter(k => k !== primaryStat).map(k => (
            <button key={k} className="topbar-btn" style={{
              border: `1px solid ${secondaryStat === k ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
              color: secondaryStat === k ? 'hsl(var(--accent-bright))' : 'hsl(var(--text-dim))',
              boxShadow: secondaryStat === k ? '0 0 6px rgba(255,176,0,0.3)' : 'none',
            }} onClick={() => setSecondaryStat(k)}>
              {STAT_META[k].icon} {STAT_META[k].name}
            </button>
          ))}
        </div>
      </div>

      {/* Split slider */}
      {hasDual && (
        <div>
          <div className="crt-field-label">DEFAULT STAT SPLIT</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, color: 'hsl(var(--accent))', width: 80 }}>
              {STAT_META[secondaryStat as StatKey].icon} {STAT_META[secondaryStat as StatKey].name}
            </span>
            <input type="range" className="ql-split-slider" min={10} max={90} step={5}
              value={split} onChange={e => setSplit(Number(e.target.value))} style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: 'hsl(var(--accent))', width: 80, textAlign: 'right' }}>
              {STAT_META[primaryStat].icon} {STAT_META[primaryStat].name}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'hsl(var(--text-dim))', marginTop: 4 }}>
            <span>{100 - split}%</span><span>{split}%</span>
          </div>
        </div>
      )}

      {/* ── Linked Skill ── */}
      <div>
        <div className="crt-field-label">LINKED SKILL <span style={{ opacity: 0.5 }}>(optional — bonus XP goes to this skill)</span></div>
        <SkillSearch selectedId={linkedSkillId} onSelect={setLinkedSkillId} />
        <div style={{ fontSize: 9, color: 'hsl(var(--text-dim))', marginTop: 4 }}>
          If set, completion bonus XP splits 50% to this skill, 25% to stats, 25% to master.
        </div>
      </div>

      {/* ── Modules ── */}
      <div>
        <div className="crt-field-label">MODULES <span style={{ opacity: 0.5 }}>(optional — add top-level sections)</span></div>
        {modules.map((mod, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input
              className="crt-input"
              style={{ flex: 1 }}
              placeholder={`Module ${i + 1} name...`}
              value={mod}
              onChange={e => updateModule(i, e.target.value)}
            />
            {modules.length > 1 && (
              <button
                onClick={() => removeModule(i)}
                style={{ background: 'transparent', border: '1px solid rgba(153,104,0,0.4)', color: 'hsl(var(--text-dim))', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: '0 8px', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4400'; e.currentTarget.style.color = '#ff4400'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)'; e.currentTarget.style.color = 'hsl(var(--text-dim))'; }}
              >×</button>
            )}
          </div>
        ))}
        <button
          onClick={addModule}
          style={{ background: 'transparent', border: 'none', color: 'hsl(var(--accent-dim))', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, cursor: 'pointer', padding: 0, letterSpacing: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = 'hsl(var(--accent))'}
          onMouseLeave={e => e.currentTarget.style.color = 'hsl(var(--accent-dim))'}
        >+ ADD MODULE</button>
      </div>

      {/* ── Linked references (optional) ── */}
      <LinkedIdsInput
        label="LINKED TOOLS (optional)"
        tableName="tools"
        nameField="name"
        subField="type"
        selectedIds={linkedToolIds}
        onChange={setLinkedToolIds}
      />
      <LinkedIdsInput
        label="LINKED AUGMENTS (optional)"
        tableName="augments"
        nameField="name"
        subField="category"
        selectedIds={linkedAugmentIds}
        onChange={setLinkedAugmentIds}
      />
      <LinkedIdsInput
        label="LINKED MEDIA (optional)"
        tableName="media"
        nameField="title"
        subField="type"
        selectedIds={linkedMediaIds}
        onChange={setLinkedMediaIds}
      />

      {/* Checkboxes */}
      <div style={{ display: 'flex', gap: 20 }}>
        {([
          [certEarned, () => setCertEarned(!certEarned), 'CERTIFICATE EARNED'],
          [isOngoing,  () => setIsOngoing(!isOngoing),    'ONGOING COURSE (no finish XP)'],
          [isLegacy,   () => setIsLegacy(!isLegacy),     'LEGACY ENTRY'],
        ] as [boolean, () => void, string][]).map(([val, toggle, label]) => (
          <div
            key={label}
            style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
            onClick={toggle}
          >
            <span style={{
              width: 13, height: 13,
              border: `1px solid ${val ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: 'hsl(var(--accent))',
              background: val ? 'rgba(255,176,0,0.1)' : 'transparent',
              flexShrink: 0,
            }}>
              {val ? '×' : ''}
            </span>
            <span style={{ color: val ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))', fontSize: 10 }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {isLegacy && (
        <div style={{
          background: 'rgba(255,176,0,0.04)',
          border: '1px solid hsl(var(--accent-dim))',
          padding: '7px 10px',
          fontSize: 10,
          color: 'hsl(var(--text-dim))',
        }}>
          Legacy entries are marked COMPLETE and award reduced XP. Does not affect streaks.
        </div>
      )}

      {/* Notes */}
      <div>
        <div className="crt-field-label">NOTES <span style={{ opacity: 0.5 }}>(optional)</span></div>
        <input
          className="crt-input"
          style={{ width: '100%' }}
          placeholder="any notes..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          maxLength={300}
        />
      </div>

      {/* Actions */}
      <div style={{
        borderTop: '1px solid hsl(var(--accent-dim))',
        paddingTop: 11,
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
      }}>
        <button
          className="topbar-btn"
          style={{ color: 'hsl(var(--text-dim))' }}
          onClick={onClose}
          disabled={saving}
        >
          CANCEL
        </button>
        <button
          className="topbar-btn"
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          style={{ opacity: !name.trim() ? 0.4 : 1 }}
        >
          {saving ? '>> SAVING...' : '>> ADD COURSE'}
        </button>
      </div>
    </div>
  );
}