// ============================================================
// src/components/modals/CreateLifepathModal.tsx
// Create a new custom lifepath under one of the 9 categories
// ============================================================
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { STAT_META, StatKey } from '@/types';
import { useToast } from '@/hooks/use-toast';

const mono  = "'IBM Plex Mono', monospace";
const vt    = "'VT323', monospace";
const acc   = 'hsl(var(--accent))';
const dim   = 'hsl(var(--text-dim))';
const adim  = 'hsl(var(--accent-dim))';
const bgP   = 'hsl(var(--bg-primary))';
const bgS   = 'hsl(var(--bg-secondary))';
const bgT   = 'hsl(var(--bg-tertiary))';

const TOP_CATEGORIES = [
  'Physical','Knowledge','Creation','Career',
  'Social','Exploration','Inner Path','Home','Technology',
];

const STAT_KEYS: StatKey[] = ['body','wire','mind','cool','grit','flow','ghost'];

interface ExistingSkill {
  id: string;
  name: string;
  stat_keys: StatKey[];
  lifepath_id: string | null;
  subcategory: string | null;
}

interface NewSkillDraft {
  name: string;
  stat_keys: StatKey[];
  default_split: number[];
}

interface AddedSkill {
  type: 'existing' | 'new';
  id?: string;          // for existing
  draft?: NewSkillDraft; // for new
  name: string;
  stat_keys: StatKey[];
}

interface Props {
  onClose: () => void;
  initialCategory?: string;
}

export default function CreateLifepathModal({ onClose, initialCategory }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Step state ────────────────────────────────────────────
  const [step, setStep] = useState<'info' | 'skills'>(initialCategory ? 'info' : 'info');

  // ── Form state ────────────────────────────────────────────
  const [category, setCategory]     = useState(initialCategory ?? 'Physical');
  const [name, setName]             = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError]   = useState('');

  // ── Skills state ──────────────────────────────────────────
  const [addedSkills, setAddedSkills] = useState<AddedSkill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillTab, setSkillTab]       = useState('Physical');

  // New skill inline form
  const [showNewSkill, setShowNewSkill]   = useState(false);
  const [newSkillName, setNewSkillName]   = useState('');
  const [newSkillStats, setNewSkillStats] = useState<StatKey[]>(['body']);
  const [newSkillSplit, setNewSkillSplit] = useState<number[]>([100]);

  // ── Fetch existing skills for search ─────────────────────
  const { data: allSkills = [] } = useQuery({
    queryKey: ['all-skills-for-lifepath'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<ExistingSkill>(
        `SELECT id, name, stat_keys, lifepath_id, subcategory
         FROM skills ORDER BY name;`
      );
      return res.rows;
    },
  });

  const filteredSkills = allSkills.filter(s => {
    const matchSearch = !skillSearch || s.name.toLowerCase().includes(skillSearch.toLowerCase());
    const notAdded    = !addedSkills.find(a => a.id === s.id);
    return matchSearch && notAdded;
  });

  // ── Duplicate check ───────────────────────────────────────
  const checkDuplicate = async (n: string, cat: string) => {
    const db  = await getDB();
    const res = await db.query(
      `SELECT id FROM lifepaths WHERE LOWER(name) = LOWER($1) AND category = $2 LIMIT 1;`,
      [n, cat]
    );
    return res.rows.length > 0;
  };

  // ── Submit ────────────────────────────────────────────────
  const createLifepath = useMutation({
    mutationFn: async () => {
      const db  = await getDB();
      const id  = crypto.randomUUID();
      const now = new Date().toISOString();

      // Insert lifepath
      await db.query(
        `INSERT INTO lifepaths (id, name, category, active, sort_order)
         VALUES ($1, $2, $3, true, 0);`,
        [id, name.trim(), category]
      );

      // Insert skills
      for (const skill of addedSkills) {
        if (skill.type === 'existing' && skill.id) {
          // Link existing skill to this lifepath
          await db.exec(
            `UPDATE skills SET lifepath_id = '${id}', active = true WHERE id = '${skill.id}';`
          );
        } else if (skill.type === 'new' && skill.draft) {
          // Create new skill
          const sid = crypto.randomUUID();
          await db.query(
            `INSERT INTO skills (id, name, stat_keys, default_split, lifepath_id, is_custom, active, created_at)
             VALUES ($1, $2, $3, $4, $5, true, true, $6);`,
            [sid, skill.draft.name, JSON.stringify(skill.draft.stat_keys), JSON.stringify(skill.draft.default_split), id, now]
          );
        }
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifepaths'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['all-skills-for-lifepath'] });
      toast({ title: '✓ LIFEPATH CREATED', description: `${name.trim()} added to ${category}` });
      onClose();
    },
    onError: (err) => {
      toast({ title: 'ERROR', description: String(err) });
    },
  });

  const handleNext = async () => {
    if (!name.trim()) { setNameError('Name required'); return; }
    const isDupe = await checkDuplicate(name.trim(), category);
    if (isDupe) { setNameError(`"${name.trim()}" already exists in ${category}`); return; }
    setNameError('');
    setStep('skills');
  };

  const handleAddExisting = (skill: ExistingSkill) => {
    setAddedSkills(prev => [...prev, {
      type: 'existing', id: skill.id, name: skill.name,
      stat_keys: Array.isArray(skill.stat_keys) ? skill.stat_keys : JSON.parse(skill.stat_keys as any ?? '[]'),
    }]);
    setSkillSearch('');
  };

  const handleAddNewSkill = () => {
    if (!newSkillName.trim()) return;
    setAddedSkills(prev => [...prev, {
      type: 'new',
      name: newSkillName.trim(),
      stat_keys: newSkillStats,
      draft: { name: newSkillName.trim(), stat_keys: newSkillStats, default_split: newSkillSplit },
    }]);
    setNewSkillName('');
    setNewSkillStats(['body']);
    setNewSkillSplit([100]);
    setShowNewSkill(false);
  };

  const handleToggleNewStat = (stat: StatKey) => {
    setNewSkillStats(prev => {
      if (prev.includes(stat)) {
        if (prev.length === 1) return prev; // always keep at least 1
        const next = prev.filter(s => s !== stat);
        setNewSkillSplit(next.map(() => Math.floor(100 / next.length)));
        return next;
      } else {
        if (prev.length >= 2) return prev; // max 2 stats
        const next = [...prev, stat];
        setNewSkillSplit(next.map(() => Math.floor(100 / next.length)));
        return next;
      }
    });
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: mono,
    }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 680, maxHeight: '88vh',
          background: bgP, border: `1px solid ${adim}`,
          boxShadow: '0 0 40px rgba(255,176,0,0.12)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${adim}`,
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// LIFEPATH</span>
          <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>CREATE LIFEPATH</span>
          <div style={{ flex: 1 }} />
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {['info', 'skills'].map((s, i) => (
              <div key={s} style={{
                width: 24, height: 4,
                background: step === s ? acc : adim,
                opacity: step === s ? 1 : 0.4,
              }} />
            ))}
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: dim,
            fontFamily: mono, fontSize: 10, cursor: 'pointer', letterSpacing: 1, padding: '2px 8px',
          }}>× CLOSE</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>

          {step === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Category */}
              <div>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>TOP-LEVEL CATEGORY</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TOP_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)} style={{
                      padding: '6px 14px', fontSize: 10,
                      border: `1px solid ${category === cat ? acc : adim}`,
                      background: category === cat ? 'rgba(255,176,0,0.1)' : 'transparent',
                      color: category === cat ? acc : dim,
                      fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                    }}>{cat}</button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>
                  LIFEPATH NAME <span style={{ color: adim, opacity: 0.6 }}>(e.g. Strength Training)</span>
                </div>
                <input
                  autoFocus
                  value={name}
                  onChange={e => { setName(e.target.value); setNameError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleNext(); }}
                  placeholder="Enter lifepath name..."
                  style={{
                    width: '100%', padding: '8px 12px', fontSize: 11,
                    background: bgS, border: `1px solid ${nameError ? 'hsl(0,80%,55%)' : adim}`,
                    color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {nameError && (
                  <div style={{ fontSize: 9, color: 'hsl(0,80%,55%)', marginTop: 4 }}>{nameError}</div>
                )}
              </div>

              {/* Description */}
              <div>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>
                  DESCRIPTION <span style={{ color: adim, opacity: 0.6 }}>(optional)</span>
                </div>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe this lifepath..."
                  rows={3}
                  style={{
                    width: '100%', padding: '8px 12px', fontSize: 11, resize: 'vertical',
                    background: bgS, border: `1px solid ${adim}`,
                    color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {step === 'skills' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Added skills list */}
              <div>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>
                  SKILLS ADDED ({addedSkills.length})
                </div>
                {addedSkills.length === 0 && (
                  <div style={{ fontSize: 10, color: dim, padding: '8px 0', opacity: 0.6 }}>
                    No skills added yet — search below or create a new one.
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {addedSkills.map((skill, i) => {
                    const statIcons = skill.stat_keys.map(k => `${STAT_META[k]?.icon ?? ''} ${k.toUpperCase()}`).join(' / ');
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 12px', background: 'rgba(255,176,0,0.05)',
                        border: `1px solid rgba(255,176,0,0.2)`,
                      }}>
                        <span style={{ fontSize: 8, color: skill.type === 'new' ? '#44ff88' : adim }}>
                          {skill.type === 'new' ? '★ NEW' : '○ EXT'}
                        </span>
                        <span style={{ flex: 1, fontSize: 11, color: acc }}>{skill.name}</span>
                        <span style={{ fontSize: 9, color: adim }}>{statIcons}</span>
                        <button onClick={() => setAddedSkills(prev => prev.filter((_, j) => j !== i))}
                          style={{ background: 'transparent', border: 'none', color: dim, cursor: 'pointer', fontSize: 12, padding: '0 4px' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'hsl(0,80%,55%)'}
                          onMouseLeave={e => e.currentTarget.style.color = dim}
                        >×</button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: adim, opacity: 0.3 }} />

              {/* Search existing */}
              <div>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>SEARCH EXISTING SKILLS</div>
                <input
                  value={skillSearch}
                  onChange={e => setSkillSearch(e.target.value)}
                  placeholder="Type to search skills..."
                  style={{
                    width: '100%', padding: '8px 12px', fontSize: 11,
                    background: bgS, border: `1px solid ${adim}`,
                    color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {skillSearch && (
                  <div style={{
                    marginTop: 4, maxHeight: 200, overflowY: 'auto',
                    border: `1px solid ${adim}`, background: bgS,
                    scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}`,
                  }}>
                    {filteredSkills.length === 0 ? (
                      <div style={{ padding: '10px 12px', fontSize: 10, color: dim }}>
                        No matching skills — create one below
                      </div>
                    ) : filteredSkills.slice(0, 20).map(skill => {
                      const keys = Array.isArray(skill.stat_keys) ? skill.stat_keys : JSON.parse(skill.stat_keys as any ?? '[]');
                      const statIcons = keys.map((k: StatKey) => `${STAT_META[k]?.icon ?? ''} ${k.toUpperCase()}`).join(' / ');
                      return (
                        <div key={skill.id}
                          onClick={() => handleAddExisting(skill)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', cursor: 'pointer',
                            borderBottom: `1px solid rgba(153,104,0,0.2)`,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = bgT}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ flex: 1, fontSize: 11, color: acc }}>{skill.name}</span>
                          <span style={{ fontSize: 9, color: adim }}>{statIcons}</span>
                          <span style={{ fontSize: 9, color: '#44ff88' }}>+ ADD</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Create new skill inline */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: adim, letterSpacing: 2 }}>CREATE NEW SKILL</div>
                  <button
                    onClick={() => setShowNewSkill(!showNewSkill)}
                    style={{
                      padding: '3px 10px', fontSize: 9,
                      border: `1px solid ${showNewSkill ? adim : acc}`,
                      background: 'transparent', color: showNewSkill ? dim : acc,
                      fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                    }}
                  >{showNewSkill ? '− CANCEL' : '+ NEW SKILL'}</button>
                </div>

                {showNewSkill && (
                  <div style={{ padding: '14px', background: bgS, border: `1px solid ${adim}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input
                      autoFocus
                      value={newSkillName}
                      onChange={e => setNewSkillName(e.target.value)}
                      placeholder="Skill name..."
                      style={{
                        width: '100%', padding: '7px 10px', fontSize: 11,
                        background: bgP, border: `1px solid ${adim}`,
                        color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 6 }}>LINKED STATS (max 2)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {STAT_KEYS.map(stat => {
                          const meta    = STAT_META[stat];
                          const selected = newSkillStats.includes(stat);
                          return (
                            <button key={stat} onClick={() => handleToggleNewStat(stat)} style={{
                              padding: '4px 10px', fontSize: 9,
                              border: `1px solid ${selected ? acc : adim}`,
                              background: selected ? 'rgba(255,176,0,0.1)' : 'transparent',
                              color: selected ? acc : dim,
                              fontFamily: mono, cursor: 'pointer',
                            }}>
                              {meta?.icon} {stat.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {newSkillStats.length === 2 && (
                      <div>
                        <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 6 }}>
                          SPLIT: {newSkillStats[0].toUpperCase()} {newSkillSplit[0]}% / {newSkillStats[1].toUpperCase()} {100 - newSkillSplit[0]}%
                        </div>
                        <input type="range" min={10} max={90} value={newSkillSplit[0]}
                          onChange={e => setNewSkillSplit([Number(e.target.value), 100 - Number(e.target.value)])}
                          style={{ width: '100%', accentColor: acc }}
                        />
                      </div>
                    )}
                    <button
                      onClick={handleAddNewSkill}
                      disabled={!newSkillName.trim()}
                      style={{
                        padding: '7px 16px', fontSize: 10, alignSelf: 'flex-start',
                        border: `1px solid ${newSkillName.trim() ? acc : adim}`,
                        background: newSkillName.trim() ? 'rgba(255,176,0,0.1)' : 'transparent',
                        color: newSkillName.trim() ? acc : dim,
                        fontFamily: mono, cursor: newSkillName.trim() ? 'pointer' : 'not-allowed',
                        letterSpacing: 1,
                      }}
                    >+ ADD SKILL</button>
                  </div>
                )}
              </div>

              {/* Tools / Augments — placeholders */}
              <div style={{ opacity: 0.4 }}>
                <div style={{ height: 1, background: adim, opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 4 }}>ADD TOOLS</div>
                <div style={{ fontSize: 10, color: dim }}>Tools system coming soon — add tools after creation via the lifepath drawer.</div>
              </div>
              <div style={{ opacity: 0.4 }}>
                <div style={{ height: 1, background: adim, opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 4 }}>ADD AUGMENTS</div>
                <div style={{ fontSize: 10, color: dim }}>Augments system coming soon — add augments after creation via the lifepath drawer.</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: `1px solid ${adim}`,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          {step === 'skills' && (
            <button onClick={() => setStep('info')} style={{
              padding: '7px 16px', fontSize: 10,
              border: `1px solid ${adim}`, background: 'transparent', color: dim,
              fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
            }}>‹ BACK</button>
          )}
          <div style={{ flex: 1 }} />

          {step === 'info' ? (
            <>
              <button
                onClick={() => { if (!name.trim()) { setNameError('Name required'); return; } createLifepath.mutate(); }}
                disabled={!name.trim() || createLifepath.isPending}
                style={{
                  padding: '7px 20px', fontSize: 10,
                  border: `1px solid ${adim}`, background: 'transparent', color: dim,
                  fontFamily: mono, cursor: name.trim() ? 'pointer' : 'not-allowed', letterSpacing: 1,
                }}
              >CREATE EMPTY</button>
              <button onClick={handleNext} disabled={!name.trim()} style={{
                padding: '7px 20px', fontSize: 10,
                border: `1px solid ${name.trim() ? acc : adim}`,
                background: name.trim() ? 'rgba(255,176,0,0.1)' : 'transparent',
                color: name.trim() ? acc : dim,
                fontFamily: mono, cursor: name.trim() ? 'pointer' : 'not-allowed', letterSpacing: 1,
              }}>ADD SKILLS ›</button>
            </>
          ) : (
            <>
              <button
                onClick={() => createLifepath.mutate()}
                disabled={createLifepath.isPending}
                style={{
                  padding: '7px 20px', fontSize: 10,
                  border: `1px solid ${adim}`, background: 'transparent', color: dim,
                  fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                }}
              >SKIP — CREATE EMPTY</button>
              <button
                onClick={() => createLifepath.mutate()}
                disabled={createLifepath.isPending}
                style={{
                  padding: '7px 20px', fontSize: 10,
                  border: `1px solid ${acc}`, background: 'rgba(255,176,0,0.1)', color: acc,
                  fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                }}
              >{createLifepath.isPending ? 'CREATING...' : `CREATE WITH ${addedSkills.length} SKILL${addedSkills.length !== 1 ? 'S' : ''}`}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}