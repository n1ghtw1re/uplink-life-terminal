// ============================================================
// src/components/overlays/LifepathPage.tsx
// ============================================================
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { STAT_META, StatKey } from '@/types';
import CreateLifepathModal from '@/components/modals/CreateLifepathModal';

const mono  = "'IBM Plex Mono', monospace";
const vt    = "'VT323', monospace";
const acc   = 'hsl(var(--accent))';
const dim   = 'hsl(var(--text-dim))';
const adim  = 'hsl(var(--accent-dim))';
const bgP   = 'hsl(var(--bg-primary))';
const bgS   = 'hsl(var(--bg-secondary))';
const bgT   = 'hsl(var(--bg-tertiary))';
const green = '#44ff88';

const TOP_CATEGORIES = ['Physical','Knowledge','Creation','Career','Social','Exploration','Inner Path','Home','Technology'];

const LIFEPATH_ICONS: Record<string, string> = {
  Physical: '▲', Knowledge: '◈', Creation: '✦', Career: '◆',
  Social: '◉', Exploration: '░', 'Inner Path': '⬡', Home: '▣', Technology: '⚙',
};

const LIFEPATH_DESC: Record<string, string> = {
  Physical: 'Physical capability, health, movement and sport',
  Knowledge: 'Learning, research, intellectual development',
  Creation: 'Creative expression, artistic production, making',
  Career: 'Professional development, business, leadership',
  Social: 'Human interaction, relationships, communication',
  Exploration: 'Travel, wilderness, discovery, nature',
  'Inner Path': 'Mindfulness, self-awareness, inner development',
  Home: 'Managing and maintaining your living environment',
  Technology: 'Computers, digital systems, software, hardware',
};

interface Lifepath { id: string; name: string; category: string; active: boolean; }
interface Skill { id: string; name: string; stat_keys: StatKey[]; lifepath_id: string; active: boolean; xp: number; }

interface Props { onClose: () => void; }

export default function LifepathPage({ onClose }: Props) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab]       = useState('Physical');
  const [showCreate, setShowCreate]     = useState(false);
  const [drawerLifepath, setDrawerLifepath] = useState<Lifepath | null>(null);
  const [showAddSkillSearch, setShowAddSkillSearch] = useState(false);
  const [showAddToolSearch, setShowAddToolSearch]   = useState(false);
  const [addToolSearch, setAddToolSearch]           = useState('');
  const [addSkillSearch, setAddSkillSearch]         = useState('');
  const [confirmDelete, setConfirmDelete]           = useState(false);

  // ── All lifepaths ─────────────────────────────────────────
  const { data: lifepaths = [] } = useQuery({
    queryKey: ['lifepaths'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<Lifepath>(
        `SELECT id, name, category, active FROM lifepaths ORDER BY name;`
      );
      return res.rows;
    },
  });

  // ── All skills (for active tab lifepaths) ─────────────────
  const { data: skills = [] } = useQuery({
    queryKey: ['lifepath-skills-all'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<Skill>(
        `SELECT id, name, stat_keys, lifepath_id, active, xp FROM skills ORDER BY name;`
      );
      return res.rows;
    },
  });

  // ── Tools for lifepath drawer ───────────────────────────
  const { data: allTools = [] } = useQuery({
    queryKey: ['tools-for-lifepath'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query(
        `SELECT t.id, t.name, t.type, t.active,
                COALESCE(
                  (SELECT json_agg(tl.lifepath_id)
                   FROM tool_lifepaths tl WHERE tl.tool_id = t.id),
                  '[]'::json
                ) as lifepath_ids
         FROM tools t ORDER BY t.name;`
      );
      return res.rows as { id: string; name: string; type: string; active: boolean; lifepath_ids: string[] }[];
    },
  });

  // ── Add/remove tool from lifepath ────────────────────────
  const addToolToLifepath = useMutation({
    mutationFn: async ({ toolId, lifepathId }: { toolId: string; lifepathId: string }) => {
      const db = await getDB();
      await db.query(
        `INSERT INTO tool_lifepaths (tool_id, lifepath_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
        [toolId, lifepathId]
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tools-for-lifepath'] }),
  });

  const removeToolFromLifepath = useMutation({
    mutationFn: async ({ toolId, lifepathId }: { toolId: string; lifepathId: string }) => {
      const db = await getDB();
      await db.query(`DELETE FROM tool_lifepaths WHERE tool_id = $1 AND lifepath_id = $2;`, [toolId, lifepathId]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tools-for-lifepath'] }),
  });

  // ── All skills for add-skill picker ─────────────────────
  const { data: allSkills = [] } = useQuery({
    queryKey: ['all-skills-flat'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<{ id: string; name: string; stat_keys: StatKey[]; lifepath_id: string | null }>(
        `SELECT id, name, stat_keys, lifepath_id FROM skills ORDER BY name;`
      );
      return res.rows;
    },
  });

  // ── Delete lifepath ───────────────────────────────────────
  const deleteLifepath = useMutation({
    mutationFn: async (id: string) => {
      const db = await getDB();
      await db.exec(`UPDATE skills SET lifepath_id = NULL WHERE lifepath_id = '${id}';`);
      await db.exec(`DELETE FROM lifepaths WHERE id = '${id}';`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifepaths'] });
      queryClient.invalidateQueries({ queryKey: ['lifepath-skills-all'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setDrawerLifepath(null);
      setConfirmDelete(false);
    },
  });

  // ── Add skill to lifepath ─────────────────────────────────
  const addSkillToLifepath = useMutation({
    mutationFn: async ({ skillId, lifepathId }: { skillId: string; lifepathId: string }) => {
      const db = await getDB();
      await db.exec(`UPDATE skills SET lifepath_id = '${lifepathId}', active = true WHERE id = '${skillId}';`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifepath-skills-all'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['all-skills-flat'] });
      setShowAddSkillSearch(false);
      setAddSkillSearch('');
    },
  });

  // ── Filter to active tab ──────────────────────────────────
  const tabLifepaths = lifepaths.filter(lp => lp.category === activeTab);
  const totalActive  = lifepaths.filter(lp => lp.active).length;

  // ── Toggle skill active ───────────────────────────────────
  const toggleSkill = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const db = await getDB();
      await db.exec(`UPDATE skills SET active = ${active} WHERE id = '${id}';`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifepath-skills-all'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });

  // ── Toggle lifepath active ────────────────────────────────
  const toggleLifepath = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const db = await getDB();
      await db.exec(`UPDATE lifepaths SET active = ${active} WHERE id = '${id}';`);
      await db.exec(`UPDATE skills SET active = ${active} WHERE lifepath_id = '${id}';`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifepaths'] });
      queryClient.invalidateQueries({ queryKey: ['lifepath-skills-all'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });

  // ── Drawer skills ─────────────────────────────────────────
  const drawerSkills = drawerLifepath
    ? skills.filter(s => s.lifepath_id === drawerLifepath.id)
    : [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: bgP, display: 'flex', flexDirection: 'column', fontFamily: mono }}>

      {/* Header */}
      <div style={{ height: 56, flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// LIFEPATH</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>LIFEPATH SYSTEM</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: dim }}>{totalActive} active paths</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowCreate(true)} style={{ padding: '5px 16px', fontSize: 10, border: `1px solid ${acc}`, background: 'rgba(255,176,0,0.1)', color: acc, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>+ CREATE</button>
        <button onClick={onClose} style={{ padding: '5px 12px', fontSize: 10, border: `1px solid ${adim}`, background: 'transparent', color: dim, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>× CLOSE</button>
      </div>

      {/* Category tabs */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 2, background: bgS, overflowX: 'auto' }}>
        {TOP_CATEGORIES.map(cat => {
          const count    = lifepaths.filter(lp => lp.category === cat).length;
          const isActive = activeTab === cat;
          return (
            <button key={cat} onClick={() => { setActiveTab(cat); setDrawerLifepath(null); }} style={{
              padding: '10px 14px', fontSize: 10, flexShrink: 0,
              border: 'none', borderBottom: `2px solid ${isActive ? acc : 'transparent'}`,
              background: 'transparent', color: isActive ? acc : dim,
              fontFamily: mono, cursor: 'pointer',
            }}>
              {LIFEPATH_ICONS[cat]} {cat}
              {count > 0 && <span style={{ marginLeft: 5, fontSize: 8, color: isActive ? acc : adim }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Lifepath list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>

          {/* Category description */}
          <div style={{ marginBottom: 20, padding: '12px 16px', background: bgS, border: `1px solid rgba(153,104,0,0.3)`, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: vt, fontSize: 28, color: adim }}>{LIFEPATH_ICONS[activeTab]}</span>
            <div>
              <div style={{ fontFamily: vt, fontSize: 18, color: acc, marginBottom: 2 }}>{activeTab.toUpperCase()}</div>
              <div style={{ fontSize: 10, color: dim }}>{LIFEPATH_DESC[activeTab]}</div>
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 9, color: adim }}>{tabLifepaths.length} lifepath{tabLifepaths.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Empty state */}
          {tabLifepaths.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 12 }}>
              <span style={{ fontFamily: vt, fontSize: 28, color: adim }}>NO LIFEPATHS</span>
              <span style={{ fontSize: 10, color: dim }}>Click + CREATE to add a {activeTab} lifepath</span>
            </div>
          )}

          {/* Lifepath cards */}
          {tabLifepaths.map(lp => {
            const lpSkills    = skills.filter(s => s.lifepath_id === lp.id);
            const activeCount = lpSkills.filter(s => s.active).length;
            const isSelected  = drawerLifepath?.id === lp.id;

            return (
              <div key={lp.id} style={{
                marginBottom: 8,
                border: `1px solid ${isSelected ? acc : lp.active ? 'rgba(255,176,0,0.25)' : 'rgba(153,104,0,0.25)'}`,
                background: isSelected ? 'rgba(255,176,0,0.06)' : lp.active ? 'rgba(255,176,0,0.03)' : bgS,
              }}>
                {/* Card header — click to open drawer */}
                <div
                  onClick={() => {
            setDrawerLifepath(isSelected ? null : lp);
            setShowAddSkillSearch(false);
            setAddSkillSearch('');
            setShowAddToolSearch(false);
            setAddToolSearch('');
            setConfirmDelete(false);
          }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: vt, fontSize: 18, color: lp.active ? acc : dim, marginBottom: 2 }}>
                      {lp.name.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 9, color: adim }}>
                      {activeCount}/{lpSkills.length} skills active
                    </div>
                  </div>

                  {/* Active toggle */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleLifepath.mutate({ id: lp.id, active: !lp.active }); }}
                    style={{
                      padding: '4px 12px', fontSize: 9,
                      border: `1px solid ${lp.active ? green : adim}`,
                      background: lp.active ? 'rgba(68,255,136,0.1)' : 'transparent',
                      color: lp.active ? green : dim,
                      fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                    }}
                  >{lp.active ? '● ACTIVE' : '○ INACTIVE'}</button>

                  <span style={{ color: adim, fontSize: 12 }}>{isSelected ? '›' : '›'}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Drawer — slides in from right inside the page */}
        <div style={{
          width: drawerLifepath ? 420 : 0,
          flexShrink: 0, overflow: 'hidden',
          transition: 'width 200ms ease',
          borderLeft: drawerLifepath ? `1px solid ${adim}` : 'none',
          background: bgS,
          display: 'flex', flexDirection: 'column',
        }}>
          {drawerLifepath && (
            <>
              {/* Drawer header */}
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${adim}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontFamily: vt, fontSize: 20, color: acc, flex: 1 }}>
                    {drawerLifepath.name.toUpperCase()}
                  </span>
                  <button onClick={() => setDrawerLifepath(null)} style={{ background: 'transparent', border: 'none', color: dim, cursor: 'pointer', fontSize: 14 }}>×</button>
                </div>
                <div style={{ fontSize: 9, color: adim }}>{drawerLifepath.category}</div>
                <div style={{ fontSize: 9, color: dim, marginTop: 4 }}>
                  {drawerSkills.filter(s => s.active).length}/{drawerSkills.length} skills active
                </div>
              </div>

              {/* Skills list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 10 }}>SKILLS</div>

                {drawerSkills.length === 0 && (
                  <div style={{ fontSize: 10, color: dim, opacity: 0.6 }}>No skills in this lifepath yet.</div>
                )}

                {drawerSkills.map(skill => {
                  const keys = Array.isArray(skill.stat_keys) ? skill.stat_keys : JSON.parse((skill.stat_keys as any) ?? '[]');
                  const statIcons = keys.map((k: StatKey) => `${STAT_META[k]?.icon ?? ''} ${k.toUpperCase()}`).join(' / ');
                  return (
                    <div key={skill.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', marginBottom: 4,
                      background: skill.active ? 'rgba(255,176,0,0.04)' : 'transparent',
                      border: `1px solid ${skill.active ? 'rgba(255,176,0,0.2)' : 'rgba(153,104,0,0.15)'}`,
                      opacity: skill.active ? 1 : 0.5,
                    }}>
                      {/* Checkbox */}
                      <div onClick={() => toggleSkill.mutate({ id: skill.id, active: !skill.active })}
                        style={{
                          width: 14, height: 14, flexShrink: 0, cursor: 'pointer',
                          border: `1px solid ${skill.active ? acc : adim}`,
                          background: skill.active ? 'rgba(255,176,0,0.2)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 8, color: acc,
                        }}
                      >{skill.active ? '×' : ''}</div>

                      <span style={{ flex: 1, fontSize: 11, color: skill.active ? acc : dim }}>{skill.name}</span>
                      <span style={{ fontSize: 9, color: adim, flexShrink: 0 }}>{statIcons}</span>
                      {skill.xp > 0 && <span style={{ fontSize: 9, color: dim }}>{skill.xp} XP</span>}
                    </div>
                  );
                })}
              </div>

              {/* Add skill search panel */}
              {showAddSkillSearch && (
                <div style={{ padding: '12px 16px', borderTop: `1px solid ${adim}`, flexShrink: 0 }}>
                  <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>ADD SKILL TO LIFEPATH</div>
                  <input
                    autoFocus
                    value={addSkillSearch}
                    onChange={e => setAddSkillSearch(e.target.value)}
                    placeholder="Search skills..."
                    style={{ width: '100%', padding: '6px 10px', fontSize: 10, boxSizing: 'border-box', background: bgP, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }}
                  />
                  {addSkillSearch && (
                    <div style={{ maxHeight: 160, overflowY: 'auto', background: bgP, border: `1px solid ${adim}`, borderTop: 'none', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
                      {allSkills
                        .filter(s =>
                          s.name.toLowerCase().includes(addSkillSearch.toLowerCase()) &&
                          s.lifepath_id !== drawerLifepath?.id &&
                          !drawerSkills.find(ds => ds.id === s.id)
                        )
                        .slice(0, 15)
                        .map(skill => {
                          const keys = Array.isArray(skill.stat_keys) ? skill.stat_keys : JSON.parse((skill.stat_keys as any) ?? '[]');
                          const statIcons = keys.map((k: StatKey) => `${STAT_META[k]?.icon ?? ''} ${k.toUpperCase()}`).join(' / ');
                          return (
                            <div key={skill.id}
                              onClick={() => addSkillToLifepath.mutate({ skillId: skill.id, lifepathId: drawerLifepath!.id })}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', cursor: 'pointer', borderBottom: `1px solid rgba(153,104,0,0.15)` }}
                              onMouseEnter={e => e.currentTarget.style.background = bgS}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <span style={{ flex: 1, fontSize: 10, color: acc }}>{skill.name}</span>
                              <span style={{ fontSize: 9, color: adim }}>{statIcons}</span>
                              <span style={{ fontSize: 9, color: '#44ff88' }}>+ ADD</span>
                            </div>
                          );
                        })
                      }
                      {allSkills.filter(s => s.name.toLowerCase().includes(addSkillSearch.toLowerCase()) && s.lifepath_id !== drawerLifepath?.id && !drawerSkills.find(ds => ds.id === s.id)).length === 0 && (
                        <div style={{ padding: '8px 10px', fontSize: 10, color: dim }}>No matching skills</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Delete confirm */}
              {confirmDelete && (
                <div style={{ padding: '12px 16px', borderTop: `1px solid ${adim}`, flexShrink: 0, background: 'rgba(255,60,60,0.05)', border: `1px solid rgba(255,60,60,0.3)` }}>
                  <div style={{ fontSize: 10, color: 'hsl(0,80%,55%)', marginBottom: 10 }}>
                    Delete "{drawerLifepath?.name}"? Skills will be unlinked but not deleted.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '6px', fontSize: 9, border: `1px solid ${adim}`, background: 'transparent', color: dim, fontFamily: mono, cursor: 'pointer' }}>
                      CANCEL
                    </button>
                    <button
                      onClick={() => drawerLifepath && deleteLifepath.mutate(drawerLifepath.id)}
                      disabled={deleteLifepath.isPending}
                      style={{ flex: 1, padding: '6px', fontSize: 9, border: `1px solid rgba(255,60,60,0.6)`, background: 'rgba(255,60,60,0.1)', color: 'hsl(0,80%,55%)', fontFamily: mono, cursor: 'pointer' }}
                    >
                      {deleteLifepath.isPending ? 'DELETING...' : 'CONFIRM DELETE'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tools section */}
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${adim}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: adim, letterSpacing: 2 }}>
                    TOOLS ({allTools.filter(t => (t.lifepath_ids as any)?.includes?.(drawerLifepath?.id)).length})
                  </div>
                  <button
                    onClick={() => { setShowAddToolSearch(!showAddToolSearch); setShowAddSkillSearch(false); }}
                    style={{ fontSize: 9, background: 'transparent', border: 'none', color: showAddToolSearch ? dim : acc, cursor: 'pointer', fontFamily: mono }}
                  >{showAddToolSearch ? '− CANCEL' : '+ ADD TOOL'}</button>
                </div>

                {/* Tool search */}
                {showAddToolSearch && (
                  <div style={{ marginBottom: 8 }}>
                    <input autoFocus value={addToolSearch} onChange={e => setAddToolSearch(e.target.value)}
                      placeholder="Search tools..."
                      style={{ width: '100%', padding: '5px 8px', fontSize: 10, boxSizing: 'border-box', background: bgP, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }}
                    />
                    {addToolSearch && (
                      <div style={{ maxHeight: 120, overflowY: 'auto', background: bgP, border: `1px solid ${adim}`, borderTop: 'none' }}>
                        {allTools
                          .filter(t => t.name.toLowerCase().includes(addToolSearch.toLowerCase()) &&
                            !(t.lifepath_ids as any)?.includes?.(drawerLifepath?.id))
                          .slice(0, 10)
                          .map(tool => (
                            <div key={tool.id}
                              onClick={() => { addToolToLifepath.mutate({ toolId: tool.id, lifepathId: drawerLifepath!.id }); setAddToolSearch(''); setShowAddToolSearch(false); }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', borderBottom: `1px solid rgba(153,104,0,0.15)` }}
                              onMouseEnter={e => e.currentTarget.style.background = bgS}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <span style={{ fontSize: 8, color: adim, border: `1px solid ${adim}`, padding: '1px 4px' }}>{tool.type.slice(0,3).toUpperCase()}</span>
                              <span style={{ flex: 1, fontSize: 10, color: acc }}>{tool.name}</span>
                              <span style={{ fontSize: 9, color: '#44ff88' }}>+ ADD</span>
                            </div>
                          ))
                        }
                        {allTools.filter(t => t.name.toLowerCase().includes(addToolSearch.toLowerCase()) && !(t.lifepath_ids as any)?.includes?.(drawerLifepath?.id)).length === 0 && (
                          <div style={{ padding: '6px 8px', fontSize: 10, color: dim }}>No matching tools</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Linked tools list */}
                <div style={{ maxHeight: 120, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
                  {allTools
                    .filter(t => (t.lifepath_ids as any)?.includes?.(drawerLifepath?.id))
                    .map(tool => (
                      <div key={tool.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid rgba(153,104,0,0.1)`, opacity: tool.active ? 1 : 0.5 }}>
                        <span style={{ fontSize: 8, color: adim, border: `1px solid ${adim}`, padding: '1px 4px', flexShrink: 0 }}>{tool.type.slice(0,3).toUpperCase()}</span>
                        <span style={{ flex: 1, fontSize: 10, color: tool.active ? acc : dim }}>{tool.name}</span>
                        <button
                          onClick={() => removeToolFromLifepath.mutate({ toolId: tool.id, lifepathId: drawerLifepath!.id })}
                          style={{ background: 'transparent', border: 'none', color: adim, cursor: 'pointer', fontSize: 11, padding: '0 2px' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'hsl(0,80%,55%)'}
                          onMouseLeave={e => e.currentTarget.style.color = adim}
                        >×</button>
                      </div>
                    ))
                  }
                  {allTools.filter(t => (t.lifepath_ids as any)?.includes?.(drawerLifepath?.id)).length === 0 && !showAddToolSearch && (
                    <div style={{ fontSize: 9, color: dim, opacity: 0.5 }}>No tools linked</div>
                  )}
                </div>
              </div>

              {/* Drawer footer */}
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${adim}`, flexShrink: 0, display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setShowAddSkillSearch(!showAddSkillSearch); setConfirmDelete(false); setAddSkillSearch(''); }}
                  style={{ flex: 1, padding: '7px', fontSize: 9, fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                    border: `1px solid ${showAddSkillSearch ? adim : acc}`,
                    background: showAddSkillSearch ? 'rgba(255,176,0,0.05)' : 'transparent',
                    color: showAddSkillSearch ? dim : acc,
                  }}
                >
                  {showAddSkillSearch ? '− CANCEL' : '+ ADD SKILL'}
                </button>
                <button
                  onClick={() => { setConfirmDelete(!confirmDelete); setShowAddSkillSearch(false); setAddSkillSearch(''); }}
                  style={{ flex: 1, padding: '7px', fontSize: 9, fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                    border: `1px solid ${confirmDelete ? 'rgba(255,60,60,0.6)' : 'rgba(255,60,60,0.4)'}`,
                    background: confirmDelete ? 'rgba(255,60,60,0.1)' : 'transparent',
                    color: 'hsl(0,80%,55%)',
                  }}
                >
                  {confirmDelete ? 'CANCEL DELETE' : 'DELETE LIFEPATH'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateLifepathModal
          initialCategory={activeTab}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}