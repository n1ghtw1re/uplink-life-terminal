// ============================================================
// src/components/modals/AddToolModal.tsx
// ============================================================
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

const mono  = "'IBM Plex Mono', monospace";
const acc   = 'hsl(var(--accent))';
const adim  = 'hsl(var(--accent-dim))';
const dim   = 'hsl(var(--text-dim))';
const bright= 'hsl(var(--accent-bright))';
const bgS   = 'hsl(var(--bg-secondary))';
const bgT   = 'hsl(var(--bg-tertiary))';

const TOOL_TYPES = ['equipment', 'facility', 'framework', 'hardware', 'instrument', 'language', 'platform', 'software', 'vehicle'];
const TOP_CATEGORIES = ['Physical','Knowledge','Creation','Career','Social','Exploration','Inner Path','Home','Technology'];

interface Props { onClose: () => void; initialLifepathId?: string; }

export default function AddToolModal({ onClose, initialLifepathId }: Props) {
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const [name, setName]           = useState('');
  const [type, setType]           = useState('software');
  const [url, setUrl]             = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [nameError, setNameError] = useState('');

  // Lifepath multi-select
  const [lpTab, setLpTab]               = useState('Physical');
  const [lpSearch, setLpSearch]         = useState('');
  const [selectedLPs, setSelectedLPs]   = useState<string[]>(initialLifepathId ? [initialLifepathId] : []);

  const { data: lifepaths = [] } = useQuery({
    queryKey: ['lifepaths-for-tool'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query(`SELECT id, name, category FROM lifepaths ORDER BY category, name;`);
      return res.rows as { id: string; name: string; category: string }[];
    },
  });

  const filteredLPs = useMemo(() => {
    const inTab = lifepaths.filter(lp => lp.category === lpTab);
    if (!lpSearch.trim()) return inTab;
    return inTab.filter(lp => lp.name.toLowerCase().includes(lpSearch.toLowerCase()));
  }, [lifepaths, lpTab, lpSearch]);

  const allSearchLPs = useMemo(() => {
    if (!lpSearch.trim()) return [];
    return lifepaths.filter(lp => lp.name.toLowerCase().includes(lpSearch.toLowerCase()) && lp.category !== lpTab);
  }, [lifepaths, lpTab, lpSearch]);

  const toggleLP = (id: string) => {
    setSelectedLPs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setNameError('Name required'); return; }
    setSaving(true);
    try {
      const db = await getDB();

      // Duplicate check
      const existing = await db.query(`SELECT id FROM tools WHERE LOWER(name) = LOWER($1) LIMIT 1;`, [name.trim()]);
      if (existing.rows.length > 0) {
        setNameError(`"${name.trim()}" already exists`);
        setSaving(false);
        return;
      }

      const id  = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.query(
        `INSERT INTO tools (id, name, type, url, description, notes, is_custom, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, true, $7);`,
        [id, name.trim(), type, url.trim() || null, description.trim() || null, notes.trim() || null, now]
      );

      // Link to lifepaths
      for (const lpId of selectedLPs) {
        await db.query(
          `INSERT INTO tool_lifepaths (tool_id, lifepath_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
          [id, lpId]
        );
      }

      queryClient.invalidateQueries({ queryKey: ['tools'] });
      queryClient.invalidateQueries({ queryKey: ['tools-for-lifepath'] });
      queryClient.invalidateQueries({ queryKey: ['terminal-tools-list'] });
      toast({ title: '✓ TOOL ADDED', description: name.trim() });
      onClose();
    } catch (err) {
      toast({ title: 'ERROR', description: String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 14, fontSize: 11, fontFamily: mono }}>

      {/* Name */}
      <div>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>TOOL NAME <span style={{ color: acc }}>*</span></div>
        <input autoFocus value={name} onChange={e => { setName(e.target.value); setNameError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="e.g. VS Code, Arduino, Photoshop..."
          style={{ width: '100%', padding: '8px 12px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${nameError ? 'hsl(0,80%,55%)' : adim}`, color: acc, fontFamily: mono, outline: 'none' }}
        />
        {nameError && <div style={{ fontSize: 9, color: 'hsl(0,80%,55%)', marginTop: 4 }}>{nameError}</div>}
      </div>

      {/* Type */}
      <div>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>TYPE</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TOOL_TYPES.map(t => (
            <button key={t} onClick={() => setType(t)} className="topbar-btn" style={{
              border: `1px solid ${type === t ? acc : adim}`,
              color: type === t ? bright : dim,
              boxShadow: type === t ? '0 0 6px rgba(255,176,0,0.3)' : 'none',
            }}>{t.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* URL */}
      <div>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>URL <span style={{ color: dim, opacity: 0.6 }}>(optional)</span></div>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
          style={{ width: '100%', padding: '8px 12px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }}
        />
      </div>

      {/* Description */}
      <div>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>DESCRIPTION <span style={{ color: dim, opacity: 0.6 }}>(optional)</span></div>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of what this tool does..."
          style={{ width: '100%', padding: '8px 12px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }}
        />
      </div>

      {/* Notes */}
      <div>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>NOTES <span style={{ color: dim, opacity: 0.6 }}>(optional)</span></div>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Personal notes..."
          style={{ width: '100%', padding: '8px 12px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }}
        />
      </div>

      {/* Lifepath multi-select */}
      <div>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>
          LINK TO LIFEPATH(S) <span style={{ color: dim, opacity: 0.6 }}>(optional)</span>
          {selectedLPs.length > 0 && (
            <span style={{ marginLeft: 8, color: acc }}>{selectedLPs.length} selected</span>
          )}
        </div>

        {/* Selected tags */}
        {selectedLPs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {selectedLPs.map(id => {
              const lp = lifepaths.find(l => l.id === id);
              return lp ? (
                <span key={id} style={{ fontSize: 9, padding: '2px 8px', border: `1px solid ${acc}`, color: acc, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {lp.name}
                  <button onClick={() => toggleLP(id)} style={{ background: 'transparent', border: 'none', color: adim, cursor: 'pointer', padding: 0, fontSize: 10 }}>×</button>
                </span>
              ) : null;
            })}
          </div>
        )}

        <input value={lpSearch} onChange={e => setLpSearch(e.target.value)} placeholder="Search lifepaths..."
          style={{ width: '100%', padding: '6px 10px', fontSize: 10, boxSizing: 'border-box', background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none', marginBottom: 6 }}
        />

        {/* Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, borderBottom: `1px solid ${adim}`, marginBottom: 4 }}>
          {TOP_CATEGORIES.map(cat => {
            const count = lifepaths.filter(lp => lp.category === cat).length;
            const sel   = lifepaths.filter(lp => lp.category === cat && selectedLPs.includes(lp.id)).length;
            return (
              <button key={cat} onClick={() => { setLpTab(cat); setLpSearch(''); }} style={{
                padding: '4px 10px', fontSize: 9, flexShrink: 0,
                border: 'none', borderBottom: `2px solid ${lpTab === cat && !lpSearch ? acc : 'transparent'}`,
                background: 'transparent', color: lpTab === cat && !lpSearch ? acc : dim,
                fontFamily: mono, cursor: 'pointer',
              }}>
                {cat} {sel > 0 && <span style={{ color: acc }}>({sel})</span>}{sel === 0 && count > 0 && <span style={{ opacity: 0.4 }}>({count})</span>}
              </button>
            );
          })}
        </div>

        {/* LP list */}
        <div style={{ maxHeight: 120, overflowY: 'auto', background: bgS, border: `1px solid ${adim}`, scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          {[...allSearchLPs, ...filteredLPs].map(lp => {
            const sel = selectedLPs.includes(lp.id);
            const isOther = allSearchLPs.includes(lp);
            return (
              <div key={lp.id} onClick={() => toggleLP(lp.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', background: sel ? 'rgba(255,176,0,0.06)' : 'transparent', borderBottom: `1px solid rgba(153,104,0,0.15)` }}
                onMouseEnter={e => e.currentTarget.style.background = sel ? 'rgba(255,176,0,0.08)' : bgT}
                onMouseLeave={e => e.currentTarget.style.background = sel ? 'rgba(255,176,0,0.06)' : 'transparent'}
              >
                <div style={{ width: 12, height: 12, border: `1px solid ${sel ? acc : adim}`, background: sel ? 'rgba(255,176,0,0.2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: acc, flexShrink: 0 }}>
                  {sel ? '×' : ''}
                </div>
                <span style={{ flex: 1, fontSize: 10, color: sel ? acc : dim }}>{lp.name}</span>
                {isOther && <span style={{ fontSize: 9, color: adim, opacity: 0.6 }}>{lp.category}</span>}
                {sel && <span style={{ fontSize: 9, color: acc }}>✓</span>}
              </div>
            );
          })}
          {filteredLPs.length === 0 && allSearchLPs.length === 0 && (
            <div style={{ padding: '8px 10px', fontSize: 10, color: dim, opacity: 0.6 }}>No lifepaths in {lpTab}</div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ borderTop: `1px solid ${adim}`, paddingTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '6px 16px', fontFamily: mono, fontSize: 10, letterSpacing: 1, cursor: 'pointer', background: 'transparent', border: `1px solid ${adim}`, color: dim }}>CANCEL</button>
        <button onClick={handleSubmit} disabled={!name.trim() || saving} style={{
          padding: '6px 16px', fontFamily: mono, fontSize: 10, letterSpacing: 1,
          cursor: name.trim() ? 'pointer' : 'not-allowed', background: 'transparent',
          border: `1px solid ${name.trim() ? acc : adim}`,
          color: name.trim() ? acc : dim, opacity: !name.trim() ? 0.5 : 1,
        }}>{saving ? '>> SAVING...' : '>> ADD TOOL'}</button>
      </div>
    </div>
  );
}