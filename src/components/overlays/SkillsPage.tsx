// ============================================================
// src/components/overlays/SkillsPage.tsx
// Full-page skills browser — tabbed by stat, sortable, drawer
// ============================================================
import { useState, useMemo } from 'react';
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

type SortKey = 'level' | 'name' | 'xp';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'level', label: 'LEVEL' },
  { key: 'name',  label: 'A–Z' },
  { key: 'xp',    label: 'XP' },
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
}: {
  skill: SkillOption;
  onClick: () => void;
}) {
  const { xpInLevel, xpForLevel, level } = getStatLevel(skill.xp);
  const statIcons = skill.statKeys.map(k => STAT_META[k]?.icon ?? k).join(' ');

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 16px',
        background: bgS,
        border: `1px solid rgba(153,104,0,0.4)`,
        cursor: 'pointer',
        transition: 'border-color 150ms, background 150ms',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = adim;
        e.currentTarget.style.background = 'rgba(255,176,0,0.04)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)';
        e.currentTarget.style.background = bgS;
      }}
    >
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
}

export default function SkillsPage({ onClose }: Props) {
  const { user } = useAuth();
  const { data: skills, isLoading } = useSkills(user?.id);

  const [activeTab, setActiveTab]     = useState<StatKey | 'ALL'>('ALL');
  const [sortKey, setSortKey]         = useState<SortKey>('name');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [showAddSkill, setShowAddSkill] = useState(false);

  // Count skills per stat
  const countForStat = (key: StatKey) =>
    (skills ?? []).filter(s => s.statKeys.includes(key)).length;
  const totalCount = (skills ?? []).length;

  // Filter + sort
  const filtered = useMemo(() => {
    const base = activeTab === 'ALL'
      ? (skills ?? [])
      : (skills ?? []).filter(s => s.statKeys.includes(activeTab));

    return [...base].sort((a, b) => {
      if (sortKey === 'name')  return a.name.localeCompare(b.name);
      if (sortKey === 'xp')    return b.xp - a.xp;
      if (sortKey === 'level') {
        const la = getStatLevel(a.xp).level;
        const lb = getStatLevel(b.xp).level;
        return lb !== la ? lb - la : b.xp - a.xp;
      }
      return 0;
    });
  }, [skills, activeTab, sortKey]);

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

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: adim, letterSpacing: 1 }}>SORT:</span>
          {SORT_OPTIONS.map(s => (
            <button key={s.key} onClick={() => setSortKey(s.key)} style={{
              padding: '3px 8px', fontSize: 9,
              border: `1px solid ${sortKey === s.key ? acc : adim}`,
              background: sortKey === s.key ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: sortKey === s.key ? acc : dim,
              fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
              transition: 'all 150ms',
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
                  onClick={() => setSelectedSkillId(
                    selectedSkillId === skill.id ? null : skill.id
                  )}
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
            width: 520, maxHeight: '85vh', overflowY: 'auto',
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