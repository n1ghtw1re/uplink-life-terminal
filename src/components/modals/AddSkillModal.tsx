// ============================================================
// src/components/modals/AddSkillModal.tsx
// ============================================================
import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StatKey, STAT_META } from '@/types';
import { toast } from '@/hooks/use-toast';

const STAT_KEYS: StatKey[] = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];

const TOP_CATEGORIES = [
  'Physical','Knowledge','Creation','Career',
  'Social','Exploration','Inner Path','Home','Technology',
];

const mono  = "'IBM Plex Mono', monospace";
const acc   = 'hsl(var(--accent))';
const adim  = 'hsl(var(--accent-dim))';
const dim   = 'hsl(var(--text-dim))';
const bright= 'hsl(var(--accent-bright))';
const bgS   = 'hsl(var(--bg-secondary))';
const bgT   = 'hsl(var(--bg-tertiary))';

interface AddSkillModalProps { onClose: () => void; }

const AddSkillModal = ({ onClose }: AddSkillModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName]               = useState('');
  const [primaryStat, setPrimaryStat] = useState<StatKey>('wire');
  const [secondaryStat, setSecondaryStat] = useState<StatKey | ''>('');
  const [split, setSplit]             = useState(50);
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);

  // Lifepath selector state
  const [linkedLifepath, setLinkedLifepath] = useState<string>('');
  const [lpTab, setLpTab]             = useState('Physical');
  const [lpSearch, setLpSearch]       = useState('');

  const hasDual = secondaryStat !== '';

  // Fetch lifepaths
  const { data: lifepaths = [] } = useQuery({
    queryKey: ['lifepaths-for-skill'],
    queryFn: async () => {
      const { getDB } = await import('@/lib/db');
      const db  = await getDB();
      const res = await db.query(
        `SELECT id, name, category FROM lifepaths ORDER BY category, name;`
      );
      return res.rows as { id: string; name: string; category: string }[];
    },
  });

  // Filtered lifepaths for current tab + search
  const filteredLPs = useMemo(() => {
    const inTab = lifepaths.filter(lp => lp.category === lpTab);
    if (!lpSearch.trim()) return inTab;
    return inTab.filter(lp => lp.name.toLowerCase().includes(lpSearch.toLowerCase()));
  }, [lifepaths, lpTab, lpSearch]);

  // Also search across all categories when typing
  const searchAllLPs = useMemo(() => {
    if (!lpSearch.trim()) return [];
    return lifepaths.filter(lp =>
      lp.name.toLowerCase().includes(lpSearch.toLowerCase()) &&
      lp.category !== lpTab
    );
  }, [lifepaths, lpTab, lpSearch]);

  const selectedLP = lifepaths.find(lp => lp.id === linkedLifepath);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { getDB } = await import('@/lib/db');
      const db = await getDB();
      const existing = await db.query(
        `SELECT id FROM skills WHERE LOWER(name) = LOWER($1) LIMIT 1;`,
        [name.trim()]
      );
      if (existing.rows.length > 0) {
        toast({ title: 'DUPLICATE SKILL', description: `"${name.trim()}" already exists.` });
        setSaving(false);
        return;
      }
      const statKeys    = hasDual ? [primaryStat, secondaryStat as StatKey] : [primaryStat];
      const defaultSplit = hasDual ? [split, 100 - split] : [100];
      const { error } = await supabase.from('skills').insert({
        name: name.trim(),
        stat_keys:     JSON.stringify(statKeys),
        default_split: JSON.stringify(defaultSplit),
        notes:         notes || null,
        xp: 0, level: 1,
        is_custom: true, active: true,
        lifepath_id: linkedLifepath || null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['lifepath-skills-all'] });
      toast({ title: '✓ SKILL ADDED', description: name.trim() });
      onClose();
    } catch (err) {
      console.error('Add skill error:', err);
      toast({ title: 'ERROR', description: String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ fontSize: 11, display: 'grid', gap: 14 }}>

      {/* Name */}
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>
          SKILL NAME <span style={{ color: acc }}>*</span>
        </div>
        <input
          className="crt-input" style={{ width: '100%' }}
          placeholder="e.g. Skateboarding"
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus maxLength={60}
        />
      </div>

      {/* Primary stat */}
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>
          PRIMARY STAT <span style={{ color: acc }}>*</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STAT_KEYS.map(k => (
            <button key={k} className="topbar-btn" style={{
              border: `1px solid ${primaryStat === k ? acc : adim}`,
              color: primaryStat === k ? bright : dim,
              boxShadow: primaryStat === k ? '0 0 6px rgba(255,176,0,0.3)' : 'none',
            }} onClick={() => { setPrimaryStat(k); if (secondaryStat === k) setSecondaryStat(''); }}>
              {STAT_META[k].icon} {STAT_META[k].name}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary stat */}
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>
          SECONDARY STAT <span style={{ color: dim }}>(optional)</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="topbar-btn" style={{
            border: `1px solid ${secondaryStat === '' ? acc : adim}`,
            color: secondaryStat === '' ? bright : dim,
          }} onClick={() => setSecondaryStat('')}>NONE</button>
          {STAT_KEYS.filter(k => k !== primaryStat).map(k => (
            <button key={k} className="topbar-btn" style={{
              border: `1px solid ${secondaryStat === k ? acc : adim}`,
              color: secondaryStat === k ? bright : dim,
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
          <div style={{ color: dim, fontSize: 10, marginBottom: 8, letterSpacing: 1 }}>DEFAULT STAT SPLIT</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, color: acc, width: 80 }}>
              {STAT_META[secondaryStat as StatKey].icon} {STAT_META[secondaryStat as StatKey].name}
            </span>
            <input type="range" className="ql-split-slider" min={10} max={90} step={5}
              value={split} onChange={e => setSplit(Number(e.target.value))} style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: acc, width: 80, textAlign: 'right' }}>
              {STAT_META[primaryStat].icon} {STAT_META[primaryStat].name}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: dim, marginTop: 4 }}>
            <span>{100 - split}%</span><span>{split}%</span>
          </div>
          <div style={{ fontSize: 9, color: dim, marginTop: 4 }}>Can be overridden per session when logging.</div>
        </div>
      )}

      {/* Notes */}
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>
          NOTES <span style={{ color: dim }}>(optional)</span>
        </div>
        <input className="crt-input" style={{ width: '100%' }}
          placeholder="any notes about this skill..."
          value={notes} onChange={e => setNotes(e.target.value)} maxLength={200} />
      </div>

      {/* ── Lifepath selector — tabbed + searchable ── */}
      <div>
        <div style={{ color: dim, fontSize: 10, marginBottom: 8, letterSpacing: 1 }}>
          LINK TO LIFEPATH <span style={{ opacity: 0.5 }}>(optional)</span>
          {selectedLP && (
            <span style={{ marginLeft: 10, color: acc, fontSize: 9 }}>
              ● {selectedLP.category} › {selectedLP.name}
              <button onClick={() => setLinkedLifepath('')} style={{
                marginLeft: 6, background: 'transparent', border: 'none',
                color: dim, cursor: 'pointer', fontSize: 10, padding: 0,
              }}>×</button>
            </span>
          )}
        </div>

        {/* Search input */}
        <input
          className="crt-input"
          style={{ width: '100%', marginBottom: 8, boxSizing: 'border-box' }}
          placeholder="Search lifepaths..."
          value={lpSearch}
          onChange={e => setLpSearch(e.target.value)}
        />

        {/* Category tabs — scrollable */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 6,
          borderBottom: `1px solid ${adim}`, paddingBottom: 2,
        }}>
          {TOP_CATEGORIES.map(cat => {
            const count = lifepaths.filter(lp => lp.category === cat).length;
            return (
              <button key={cat} onClick={() => { setLpTab(cat); setLpSearch(''); }} style={{
                padding: '5px 10px', fontSize: 9, flexShrink: 0,
                border: 'none',
                borderBottom: `2px solid ${lpTab === cat && !lpSearch ? acc : 'transparent'}`,
                background: 'transparent',
                color: lpTab === cat && !lpSearch ? acc : dim,
                fontFamily: mono, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                {cat} {count > 0 && <span style={{ opacity: 0.5 }}>({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Lifepath list */}
        <div style={{
          maxHeight: 140, overflowY: 'auto', background: bgS,
          border: `1px solid ${adim}`,
          scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}`,
        }}>
          {/* "None" option */}
          <div
            onClick={() => setLinkedLifepath('')}
            style={{
              padding: '7px 12px', cursor: 'pointer', fontSize: 10,
              color: !linkedLifepath ? acc : dim,
              background: !linkedLifepath ? 'rgba(255,176,0,0.06)' : 'transparent',
              borderBottom: `1px solid rgba(153,104,0,0.2)`,
              fontFamily: mono,
            }}
            onMouseEnter={e => e.currentTarget.style.background = bgT}
            onMouseLeave={e => e.currentTarget.style.background = !linkedLifepath ? 'rgba(255,176,0,0.06)' : 'transparent'}
          >
            — No lifepath —
          </div>

          {/* Search results from other categories */}
          {lpSearch && searchAllLPs.map(lp => (
            <div key={lp.id}
              onClick={() => { setLinkedLifepath(lp.id); setLpSearch(''); setLpTab(lp.category); }}
              style={{
                padding: '7px 12px', cursor: 'pointer', fontSize: 10,
                color: linkedLifepath === lp.id ? acc : dim,
                background: linkedLifepath === lp.id ? 'rgba(255,176,0,0.06)' : 'transparent',
                borderBottom: `1px solid rgba(153,104,0,0.15)`,
                fontFamily: mono, display: 'flex', justifyContent: 'space-between',
              }}
              onMouseEnter={e => e.currentTarget.style.background = bgT}
              onMouseLeave={e => e.currentTarget.style.background = linkedLifepath === lp.id ? 'rgba(255,176,0,0.06)' : 'transparent'}
            >
              <span>{lp.name}</span>
              <span style={{ fontSize: 9, opacity: 0.5 }}>{lp.category}</span>
            </div>
          ))}

          {/* Current tab results */}
          {filteredLPs.length === 0 && !lpSearch && (
            <div style={{ padding: '10px 12px', fontSize: 10, color: dim, opacity: 0.6 }}>
              No lifepaths in {lpTab} yet
            </div>
          )}
          {filteredLPs.length === 0 && lpSearch && searchAllLPs.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 10, color: dim, opacity: 0.6 }}>
              No lifepaths matching "{lpSearch}"
            </div>
          )}
          {filteredLPs.map(lp => (
            <div key={lp.id}
              onClick={() => { setLinkedLifepath(lp.id); setLpSearch(''); }}
              style={{
                padding: '7px 12px', cursor: 'pointer', fontSize: 10,
                color: linkedLifepath === lp.id ? acc : dim,
                background: linkedLifepath === lp.id ? 'rgba(255,176,0,0.06)' : 'transparent',
                borderBottom: `1px solid rgba(153,104,0,0.15)`,
                fontFamily: mono,
              }}
              onMouseEnter={e => e.currentTarget.style.background = bgT}
              onMouseLeave={e => e.currentTarget.style.background = linkedLifepath === lp.id ? 'rgba(255,176,0,0.06)' : 'transparent'}
            >
              {lp.name}
              {linkedLifepath === lp.id && <span style={{ marginLeft: 8, fontSize: 9, color: acc }}>✓</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ borderTop: `1px solid ${adim}`, paddingTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{
          padding: '6px 16px', fontFamily: mono, fontSize: 10, letterSpacing: 1,
          cursor: 'pointer', background: 'transparent', border: `1px solid ${adim}`, color: dim,
        }}>CANCEL</button>
        <button disabled={!name.trim() || saving} onClick={handleSubmit} style={{
          padding: '6px 16px', fontFamily: mono, fontSize: 10, letterSpacing: 1,
          cursor: !name.trim() ? 'not-allowed' : 'pointer', background: 'transparent',
          border: `1px solid ${!name.trim() ? adim : acc}`,
          color: !name.trim() ? dim : acc, opacity: !name.trim() ? 0.5 : 1,
        }}>{saving ? '>> SAVING...' : '>> ADD SKILL'}</button>
      </div>
    </div>
  );
};

export default AddSkillModal;