// ============================================================
// src/components/overlays/SkillsPage.tsx
// Full-page skills browser — tabbed by stat, sortable, drawer
// ============================================================
import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSkills, SkillOption } from '@/hooks/useSkills';
import { STAT_META, StatKey, getStatLevel } from '@/types';
import SkillDetailDrawer from '@/components/drawer/SkillDetailDrawer';
import AddSkillModal from '@/components/modals/AddSkillModal';

// ── Constants ─────────────────────────────────────────────────

const STAT_TABS: { key: StatKey; label: string }[] = [
  { key: 'body',  label: 'BODY' },
  { key: 'cool',  label: 'COOL' },
  { key: 'flow',  label: 'FLOW' },
  { key: 'ghost', label: 'GHOST' },
  { key: 'grit',  label: 'GRIT' },
  { key: 'mind',  label: 'MIND' },
  { key: 'wire',  label: 'WIRE' },
];

type SortKey = 'level' | 'name' | 'xp' | 'active';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'active', label: 'ACTIVE' },
  { key: 'level',  label: 'LEVEL' },
  { key: 'name',   label: 'A–Z' },
  { key: 'xp',     label: 'XP' },
];

// ── Styles ────────────────────────────────────────────────────

const mono  = "'IBM Plex Mono', monospace";
const vt    = "'VT323', monospace";
const acc   = 'hsl(var(--accent))';
const dim   = 'hsl(var(--text-dim))';
const adim  = 'hsl(var(--accent-dim))';
const bgP   = 'hsl(var(--bg-primary))';
const bgS   = 'hsl(var(--bg-secondary))';
const bgT   = 'hsl(var(--bg-tertiary))';

// ── Sub-components ────────────────────────────────────────────

function XPBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ flex: 1, height: 5, background: bgT, border: `1px solid ${adim}` }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: acc,
        boxShadow: '0 0 4px rgba(255,176,0,0.4)',
        transition: 'width 0.3s ease',
      }} />
    </div>
  );
}

function SkillRow({
  skill,
  onClick,
  onToggleActive,
}: {
  skill: SkillOption;
  onClick: () => void;
  onToggleActive?: (id: string, active: boolean) => void;
}) {
  const { xpInLevel, xpForLevel, level } = getStatLevel(skill.xp);
  const statIcons = skill.statKeys.map(k => STAT_META[k]?.icon ?? k).join(' ');
  const isActive  = (skill as any).active !== false;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 16px',
        background: bgS,
        border: `1px solid ${isActive ? 'rgba(153,104,0,0.4)' : 'rgba(153,104,0,0.15)'}`,
        cursor: 'pointer',
        transition: 'border-color 150ms, background 150ms',
        opacity: isActive ? 1 : 0.45,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = adim;
        e.currentTarget.style.background = 'rgba(255,176,0,0.04)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isActive ? 'rgba(153,104,0,0.4)' : 'rgba(153,104,0,0.15)';
        e.currentTarget.style.background = bgS;
      }}
    >
      {/* Active checkbox */}
      {onToggleActive && (
        <div
          onClick={e => { e.stopPropagation(); onToggleActive(skill.id, !isActive); }}
          title={isActive ? 'Click to deactivate' : 'Click to activate'}
          style={{
            width: 14, height: 14, flexShrink: 0,
            border: `1px solid ${isActive ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
            background: isActive ? 'rgba(255,176,0,0.2)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, color: 'hsl(var(--accent))', cursor: 'pointer',
          }}
        >{isActive ? '×' : ''}</div>
      )}
      {/* Name */}
      <span style={{
        fontFamily: mono, fontSize: 12, color: acc,
        flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {skill.name}
      </span>

      {/* Stat icons */}
      <span style={{ fontFamily: mono, fontSize: 11, color: adim, flexShrink: 0, width: 40, textAlign: 'center' }}>
        {statIcons}
      </span>

      {/* Level */}
      <span style={{ fontFamily: vt, fontSize: 16, color: acc, flexShrink: 0, width: 52 }}>
        LVL {level}
      </span>

      {/* XP bar */}
      <div style={{ width: 140, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <XPBar value={xpInLevel} max={xpForLevel} />
        <span style={{ fontFamily: mono, fontSize: 9, color: dim, width: 28, textAlign: 'right', flexShrink: 0 }}>
          {xpForLevel > 0 ? Math.round((xpInLevel / xpForLevel) * 100) : 100}%
        </span>
      </div>

      {/* Total XP */}
      <span style={{ fontFamily: mono, fontSize: 10, color: dim, flexShrink: 0, width: 72, textAlign: 'right' }}>
        {skill.xp.toLocaleString()} XP
      </span>

      {/* Arrow */}
      <span style={{ color: adim, fontSize: 10, flexShrink: 0 }}>›</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onOpenLog?: () => void;
}

export default function SkillsPage({ onClose, onOpenLog }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: skills, isLoading } = useSkills(user?.id);

  const [activeTab, setActiveTab]     = useState<StatKey | 'ALL'>('ALL');
  const [sortKey, setSortKey]         = useState<SortKey>('active');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [search, setSearch]             = useState('');

  // Count skills per stat
  const countForStat = (key: StatKey) =>
    (skills ?? []).filter(s => s.statKeys.includes(key)).length;
  const totalCount = (skills ?? []).length;

  // Filter + sort
  const filtered = useMemo(() => {
    const base = activeTab === 'ALL'
      ? (skills ?? [])
      : (skills ?? []).filter(s => s.statKeys.includes(activeTab));

    const searched = search.trim()
      ? base.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
      : base;

    return [...searched].sort((a, b) => {
      // Always sort active before inactive as secondary sort
      if (sortKey === 'active') {
        const aActive = (a as any).active !== false;
        const bActive = (b as any).active !== false;
        if (aActive !== bActive) return aActive ? -1 : 1;
        return a.name.localeCompare(b.name);
      }
      if (sortKey === 'name')  return a.name.localeCompare(b.name);
      if (sortKey === 'xp')    return b.xp - a.xp;
      if (sortKey === 'level') {
        const la = getStatLevel(a.xp).level;
        const lb = getStatLevel(b.xp).level;
        return lb !== la ? lb - la : b.xp - a.xp;
      }
      return 0;
    });
  }, [skills, activeTab, sortKey, search]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: bgP,
      display: 'flex', flexDirection: 'column',
      fontFamily: mono,
    }}>

      {/* ── Header ── */}
      <div style={{
        height: 56, flexShrink: 0,
        borderBottom: `1px solid ${adim}`,
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 16,
      }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// SKILLS</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>
          ALL SKILLS
        </span>
        <span style={{ fontFamily: mono, fontSize: 10, color: dim }}>
          {totalCount} total
        </span>
        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 8, fontSize: 10, color: adim, pointerEvents: 'none' }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search skills..."
            style={{
              padding: '4px 10px 4px 24px', fontSize: 10, width: 200,
              background: bgS, border: `1px solid ${search ? acc : adim}`,
              color: acc, fontFamily: mono, outline: 'none',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: 6, background: 'transparent',
              border: 'none', color: adim, cursor: 'pointer', fontSize: 12, padding: 0,
            }}>×</button>
          )}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: adim, letterSpacing: 1 }}>SORT:</span>
          {SORT_OPTIONS.map(s => (
            <button key={s.key} onClick={() => setSortKey(s.key)} style={{
              padding: '3px 8px', fontSize: 9,
              fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
              transition: 'all 150ms',
              border: `1px solid ${sortKey === s.key ? acc : adim}`,
              background: sortKey === s.key ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: sortKey === s.key ? acc : dim,
            }}>{s.label}</button>
          ))}
        </div>

        {/* Add skill */}
        <button
          onClick={() => setShowAddSkill(true)}
          style={{
            padding: '5px 14px', fontSize: 10,
            border: `1px solid ${acc}`,
            background: 'transparent', color: acc,
            fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = acc; e.currentTarget.style.color = bgP; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = acc; }}
        >
          [ + ADD SKILL ]
        </button>

        {/* Close */}
        <button onClick={onClose} style={{
          padding: '5px 12px', fontSize: 10,
          border: `1px solid ${adim}`,
          background: 'transparent', color: dim,
          fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
        }}>× CLOSE</button>
      </div>

      {/* ── Stat tabs ── */}
      <div style={{
        flexShrink: 0,
        borderBottom: `1px solid ${adim}`,
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 4,
        background: bgS,
      }}>
        {/* ALL tab */}
        <button
          onClick={() => setActiveTab('ALL')}
          style={{
            padding: '10px 14px', fontSize: 10,
            border: 'none', borderBottom: `2px solid ${activeTab === 'ALL' ? acc : 'transparent'}`,
            background: 'transparent',
            color: activeTab === 'ALL' ? acc : dim,
            fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
            transition: 'all 150ms',
          }}
        >
          ALL <span style={{ fontSize: 9, color: activeTab === 'ALL' ? adim : 'rgba(153,104,0,0.3)' }}>({totalCount})</span>
        </button>

        {STAT_TABS.map(({ key, label }) => {
          const count = countForStat(key);
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '10px 14px', fontSize: 10,
                border: 'none', borderBottom: `2px solid ${isActive ? acc : 'transparent'}`,
                background: 'transparent',
                color: isActive ? acc : dim,
                fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                transition: 'all 150ms',
                opacity: count === 0 ? 0.4 : 1,
              }}
            >
              {STAT_META[key]?.icon} {label}{' '}
              <span style={{ fontSize: 9, color: isActive ? adim : 'rgba(153,104,0,0.3)' }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* ── Content + drawer ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Skills list */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px 24px',
          scrollbarWidth: 'thin',
          scrollbarColor: `${adim} ${bgS}`,
        }}>
          {isLoading ? (
            <div style={{ color: dim, fontSize: 11 }}>LOADING...</div>
          ) : filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: 200, gap: 12,
            }}>
              <span style={{ fontFamily: vt, fontSize: 28, color: adim }}>NO SKILLS</span>
              <span style={{ fontSize: 10, color: dim }}>
                {activeTab === 'ALL'
                  ? 'No skills added yet.'
                  : `No skills linked to ${activeTab.toUpperCase()} yet.`}
              </span>
              <button
                onClick={() => setShowAddSkill(true)}
                style={{
                  marginTop: 8, padding: '6px 16px', fontSize: 10,
                  border: `1px solid ${acc}`, background: 'transparent', color: acc,
                  fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
                }}
              >[ + ADD SKILL ]</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map(skill => (
                <SkillRow
                  key={skill.id}
                  skill={skill}
                  onClick={() => setSelectedSkillId(selectedSkillId === skill.id ? null : skill.id)}
                  onToggleActive={async (id, active) => {
                    const { getDB } = await import('@/lib/db');
                    const db = await getDB();
                    await db.exec(`UPDATE skills SET active = ${active} WHERE id = '${id}';`);
                    queryClient.invalidateQueries({ queryKey: ['skills'] });
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Skill drawer — slides in from right */}
        <div style={{
          width: selectedSkillId ? 420 : 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 200ms ease',
          borderLeft: selectedSkillId ? `1px solid ${adim}` : 'none',
          display: 'flex', flexDirection: 'column',
        }}>
          {selectedSkillId && (
            <>
              {/* Drawer close bar */}
              <div style={{
                height: 36, flexShrink: 0,
                borderBottom: `1px solid ${adim}`,
                display: 'flex', alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '0 12px',
                background: bgS,
              }}>
                <button
                  onClick={() => setSelectedSkillId(null)}
                  style={{
                    background: 'transparent', border: 'none',
                    color: dim, fontFamily: mono, fontSize: 10,
                    cursor: 'pointer', letterSpacing: 1, padding: '2px 6px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = acc}
                  onMouseLeave={e => e.currentTarget.style.color = dim}
                >
                  × CLOSE
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <SkillDetailDrawer
                  skillId={selectedSkillId}
                  onClose={() => setSelectedSkillId(null)}
                  onOpenLog={onOpenLog}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Skill Modal — centered overlay */}
      {showAddSkill && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowAddSkill(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 680, maxWidth: 'calc(100vw - 40px)', maxHeight: '90vh', overflowY: 'auto',
            background: bgP,
            border: `1px solid ${adim}`,
            boxShadow: '0 0 40px rgba(255,176,0,0.1)',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '12px 20px',
              borderBottom: `1px solid ${adim}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: mono, fontSize: 10, color: acc, letterSpacing: 2 }}>// ADD SKILL</span>
              <button onClick={() => setShowAddSkill(false)} style={{
                background: 'transparent', border: 'none',
                color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer',
              }}>× CLOSE</button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <AddSkillModal onClose={() => setShowAddSkill(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}