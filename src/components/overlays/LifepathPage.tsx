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
                  onClick={() => setDrawerLifepath(isSelected ? null : lp)}
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

              {/* Drawer footer */}
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${adim}`, flexShrink: 0, display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, padding: '7px', fontSize: 9, border: `1px solid ${acc}`, background: 'transparent', color: acc, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>
                  + ADD SKILL
                </button>
                <button style={{ flex: 1, padding: '7px', fontSize: 9, border: `1px solid rgba(255,60,60,0.4)`, background: 'transparent', color: 'hsl(0,80%,55%)', fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>
                  DELETE LIFEPATH
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