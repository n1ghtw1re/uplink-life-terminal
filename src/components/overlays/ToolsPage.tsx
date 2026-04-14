// ============================================================
// src/components/overlays/ToolsPage.tsx
// ============================================================
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { getLevelFromXP, getXPDisplayValues } from '@/services/xpService';
import { useTools, ToolOption } from '@/hooks/useTools';
import Modal from '@/components/Modal';
import AddToolModal from '@/components/modals/AddToolModal';

const mono  = "'IBM Plex Mono', monospace";
const vt    = "'VT323', monospace";
const acc   = 'hsl(var(--accent))';
const adim  = 'hsl(var(--accent-dim))';
const dim   = 'hsl(var(--text-dim))';
const bgP   = 'hsl(var(--bg-primary))';
const bgS   = 'hsl(var(--bg-secondary))';
const bgT   = 'hsl(var(--bg-tertiary))';
const green = '#44ff88';

type SortKey = 'name' | 'xp' | 'level' | 'active';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'active', label: 'ACTIVE' },
  { key: 'level',  label: 'LEVEL'  },
  { key: 'name',   label: 'A–Z'    },
  { key: 'xp',     label: 'XP'     },
];

const TYPE_COLORS: Record<string, string> = {
  equipment: '#ff9944', facility: adim, framework: '#cc88ff',
  hardware: '#44ff88', instrument: '#ffdd44', language: '#ff9944',
  platform: '#00cfff', software: acc, vehicle: '#44ddff',
};

function XPBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: bgT, border: `1px solid ${adim}`, height: 5, flex: 1 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: acc, boxShadow: '0 0 4px rgba(255,176,0,0.4)', transition: 'width 0.3s' }} />
    </div>
  );
}

interface Props { onClose: () => void; onToolClick?: (id: string) => void; }

export default function ToolsPage({ onClose, onToolClick }: Props) {
  const queryClient = useQueryClient();
  const { data: tools = [], isLoading } = useTools();

  const [sortKey, setSortKey]         = useState<SortKey>('active');
  const [search, setSearch]           = useState('');
  const [showAdd, setShowAdd]         = useState(false);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter]   = useState<string>('ALL');

  // Tool types present in data
  const types = ['ALL', ...Array.from(new Set(tools.map(t => t.type))).sort()];

  // Filter + sort
  const filtered = useMemo(() => {
    let base = tools;
    if (typeFilter !== 'ALL') base = base.filter(t => t.type === typeFilter);
    if (search.trim()) base = base.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    return [...base].sort((a, b) => {
      if (sortKey === 'active') {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      }
      if (sortKey === 'name')  return a.name.localeCompare(b.name);
      if (sortKey === 'xp')    return b.xp - a.xp;
      if (sortKey === 'level') return b.level !== a.level ? b.level - a.level : b.xp - a.xp;
      return 0;
    });
  }, [tools, sortKey, search, typeFilter]);

  // Overall tool progress
  const { data: toolProgress } = useQuery({
    queryKey: ['tool-progress'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<{ total_xp: number; level: number }>(
        `SELECT total_xp, level FROM tool_progress WHERE id = 1;`
      );
      return res.rows[0] ?? { total_xp: 0, level: 1 };
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const db = await getDB();
      await db.exec(`UPDATE tools SET active = ${active} WHERE id = '${id}';`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tools'] }),
  });

  const selectedTool = tools.find(t => t.id === selectedToolId);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: bgP, display: 'flex', flexDirection: 'column', fontFamily: mono }}>

      {/* Header */}
      <div style={{ height: 56, flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// ARSENAL</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>TOOLS</span>
        <span style={{ fontSize: 10, color: dim }}>{tools.filter(t => t.active).length} active</span>
        {toolProgress && (
          <span style={{ fontSize: 10, color: adim }}>
            TOOL LVL {toolProgress.level} — {toolProgress.total_xp.toLocaleString()} XP
          </span>
        )}
        <div style={{ flex: 1 }} />
        {/* Search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 8, fontSize: 10, color: adim, pointerEvents: 'none' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools..."
            style={{ padding: '4px 10px 4px 24px', fontSize: 10, width: 180, background: bgS, border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, background: 'transparent', border: 'none', color: adim, cursor: 'pointer', fontSize: 12, padding: 0 }}>×</button>}
        </div>
        {/* Sort */}
        <div style={{ display: 'flex', gap: 4 }}>
          {SORT_OPTIONS.map(s => (
            <button key={s.key} onClick={() => setSortKey(s.key)} style={{
              padding: '3px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
              border: `1px solid ${sortKey === s.key ? acc : adim}`,
              background: sortKey === s.key ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: sortKey === s.key ? acc : dim,
            }}>{s.label}</button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '5px 16px', fontSize: 10, border: `1px solid ${acc}`, background: 'rgba(255,176,0,0.1)', color: acc, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>+ ADD TOOL</button>
        <button onClick={onClose} style={{ padding: '5px 12px', fontSize: 10, border: `1px solid ${adim}`, background: 'transparent', color: dim, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>× CLOSE</button>
      </div>

      {/* Type filter tabs */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 2, background: bgS, overflowX: 'auto' }}>
        {types.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{
            padding: '8px 14px', fontSize: 10, flexShrink: 0, border: 'none',
            borderBottom: `2px solid ${typeFilter === t ? (TYPE_COLORS[t] ?? acc) : 'transparent'}`,
            background: 'transparent', color: typeFilter === t ? (TYPE_COLORS[t] ?? acc) : dim,
            fontFamily: mono, cursor: 'pointer',
          }}>{t.toUpperCase()}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Tool list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          {isLoading ? (
            <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
          ) : filtered.length === 0 ? (
            <div style={{ fontSize: 10, color: dim, opacity: 0.6, paddingTop: 20 }}>
              {search ? `No tools matching "${search}"` : 'No tools yet — click + ADD TOOL'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map(tool => {
                const { xpInLevel, xpForLevel } = getLevelFromXP(tool.xp);
                const pct      = xpForLevel > 0 ? Math.round((xpInLevel / xpForLevel) * 100) : 0;
                const isSelected = selectedToolId === tool.id;
                const typeColor  = TYPE_COLORS[tool.type] ?? adim;

                return (
                  <div key={tool.id}
                    onClick={() => setSelectedToolId(isSelected ? null : tool.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '10px 16px', cursor: 'pointer',
                      background: isSelected ? 'rgba(255,176,0,0.04)' : bgS,
                      border: `1px solid ${isSelected ? acc : 'rgba(153,104,0,0.4)'}`,
                      opacity: tool.active ? 1 : 0.45,
                      transition: 'border-color 150ms',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = adim; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)'; }}
                  >
                    {/* Active checkbox */}
                    <div onClick={e => { e.stopPropagation(); toggleActive.mutate({ id: tool.id, active: !tool.active }); }}
                      style={{ width: 14, height: 14, flexShrink: 0, border: `1px solid ${tool.active ? acc : adim}`, background: tool.active ? 'rgba(255,176,0,0.2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: acc, cursor: 'pointer' }}
                    >{tool.active ? '×' : ''}</div>

                    {/* Type badge */}
                    <span style={{ fontSize: 8, color: typeColor, border: `1px solid ${typeColor}`, padding: '1px 5px', letterSpacing: 1, flexShrink: 0, opacity: 0.8 }}>
                      {tool.type.toUpperCase()}
                    </span>

                    {/* Name */}
                    <span style={{ flex: 1, fontSize: 12, color: tool.active ? acc : dim, fontFamily: mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tool.name}
                    </span>

                    {/* Level */}
                    <span style={{ fontFamily: vt, fontSize: 16, color: acc, flexShrink: 0, width: 52 }}>LVL {tool.level}</span>

                    {/* XP bar */}
                    <div style={{ width: 120, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <XPBar value={xpInLevel} max={xpForLevel} />
                      <span style={{ fontSize: 9, color: dim, width: 28, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                    </div>

                    {/* Total XP */}
                    <span style={{ fontSize: 10, color: dim, width: 72, textAlign: 'right', flexShrink: 0 }}>
                      {tool.xp.toLocaleString()} XP
                    </span>

                    <span style={{ color: adim, fontSize: 10, flexShrink: 0 }}>›</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer */}
        <div style={{ width: selectedTool ? 420 : 0, flexShrink: 0, overflow: 'hidden', transition: 'width 200ms ease', borderLeft: selectedTool ? `1px solid ${adim}` : 'none', background: bgS, display: 'flex', flexDirection: 'column' }}>
          {selectedTool && (
            <ToolDrawerContent
              tool={selectedTool}
              onClose={() => setSelectedToolId(null)}
              onUpdated={() => queryClient.invalidateQueries({ queryKey: ['tools'] })}
            />
          )}
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD TOOL" width={680}>
        <AddToolModal onClose={() => setShowAdd(false)} />
      </Modal>
    </div>
  );
}

// ── Tool drawer content ───────────────────────────────────────

function ToolDrawerContent({ tool, onClose, onUpdated }: { tool: ToolOption; onClose: () => void; onUpdated: () => void }) {
  const queryClient = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue]     = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editType, setEditType] = useState(tool.type);
  const [editUrl, setEditUrl] = useState(tool.url || '');
  const [editDesc, setEditDesc] = useState(tool.description || '');
  const [editNotes, setEditNotes] = useState(tool.notes || '');

  const { xpInLevel, xpForLevel } = getLevelFromXP(tool.xp);
  const pct = xpForLevel > 0 ? Math.round((xpInLevel / xpForLevel) * 100) : 0;

  // Reset editing states when tool changes
  useEffect(() => {
    setEditing(false);
    setEditingName(false);
    setEditType(tool.type);
    setEditUrl(tool.url || '');
    setEditDesc(tool.description || '');
    setEditNotes(tool.notes || '');
  }, [tool.id]);

  // Linked lifepaths
  const { data: linkedLPs = [] } = useQuery({
    queryKey: ['tool-lifepaths', tool.id],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query(
        `SELECT l.id, l.name, l.category FROM lifepaths l
         JOIN tool_lifepaths tl ON tl.lifepath_id = l.id
         WHERE tl.tool_id = $1 ORDER BY l.name;`,
        [tool.id]
      );
      return res.rows as { id: string; name: string; category: string }[];
    },
  });

  // Recent sessions using this tool
  const { data: sessions = [] } = useQuery({
    queryKey: ['tool-sessions', tool.id],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query(
        `SELECT s.logged_at, s.duration_minutes, s.skill_name, s.total_tool_xp
         FROM sessions s
         WHERE s.tool_ids::jsonb @> $1::jsonb
         ORDER BY s.logged_at DESC LIMIT 8;`,
        [JSON.stringify([tool.id])]
      );
      return res.rows as { logged_at: string; duration_minutes: number; skill_name: string; total_tool_xp: number }[];
    },
  });

  const saveName = useMutation({
    mutationFn: async (name: string) => {
      const db = await getDB();
      await db.exec(`UPDATE tools SET name = '${name.replace(/'/g,"''")}' WHERE id = '${tool.id}';`);
    },
    onSuccess: () => { onUpdated(); setEditingName(false); },
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      await db.query(
        `UPDATE tools SET name=$1, type=$2, url=$3, description=$4, notes=$5 WHERE id=$6`,
        [nameValue.trim() || tool.name, editType, editUrl || null, editDesc || null, editNotes || null, tool.id]
      );
    },
    onSuccess: () => { onUpdated(); setEditing(false); setEditingName(false); },
  });

  const toggleActive = useMutation({
    mutationFn: async (active: boolean) => {
      const db = await getDB();
      await db.exec(`UPDATE tools SET active = ${active} WHERE id = '${tool.id}';`);
    },
    onSuccess: onUpdated,
  });

  const deleteTool = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      await db.exec(`DELETE FROM tools WHERE id = '${tool.id}';`);
    },
    onSuccess: () => { onUpdated(); onClose(); },
  });

  const typeColor = TYPE_COLORS[tool.type] ?? adim;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${adim}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 9, color: adim, letterSpacing: 2 }}>// TOOL</span>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => toggleActive.mutate(!tool.active)}
            style={{ padding: '2px 10px', fontSize: 9, letterSpacing: 1, border: `1px solid ${tool.active ? green : adim}`, background: tool.active ? 'rgba(68,255,136,0.1)' : 'transparent', color: tool.active ? green : dim, fontFamily: mono, cursor: 'pointer' }}
          >{tool.active ? '● ACTIVE' : '○ INACTIVE'}</button>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: dim, cursor: 'pointer', fontSize: 14 }}>×</button>
        </div>

        {/* Name */}
        {editingName ? (
          <input autoFocus value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && nameValue.trim()) saveName.mutate(nameValue.trim()); if (e.key === 'Escape') setEditingName(false); }}
            onBlur={() => { if (nameValue.trim()) saveName.mutate(nameValue.trim()); else setEditingName(false); }}
            style={{ fontFamily: vt, fontSize: 22, background: 'transparent', border: 'none', borderBottom: `1px solid ${acc}`, color: acc, width: '100%', outline: 'none', marginBottom: 6 }}
          />
        ) : (
          <div title="Click to rename"
            style={{ fontFamily: vt, fontSize: 22, color: acc, cursor: 'text', marginBottom: 4 }}>
            {tool.name}
          </div>
        )}

        {/* Type + URL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 8, color: typeColor, border: `1px solid ${typeColor}`, padding: '1px 6px', letterSpacing: 1 }}>{tool.type.toUpperCase()}</span>
          {tool.url && <a href={tool.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: adim, textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = acc} onMouseLeave={e => e.currentTarget.style.color = adim}>{tool.url}</a>}
        </div>

        {/* XP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: vt, fontSize: 16, color: acc, flexShrink: 0 }}>LVL {tool.level}</span>
          <div style={{ flex: 1, background: bgT, border: `1px solid ${adim}`, height: 6 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: acc, boxShadow: '0 0 4px rgba(255,176,0,0.4)' }} />
          </div>
          <span style={{ fontSize: 10, color: dim }}>{pct}%</span>
        </div>
        <div style={{ fontSize: 9, color: adim }}>{getXPDisplayValues(tool.xp).totalXP.toLocaleString()} / {getXPDisplayValues(tool.xp).totalXPToNextLevel.toLocaleString()} XP</div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>

        {/* Edit Form */}
        {editing ? (
          <div>
            <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>NAME</div>
            <input className="crt-input" value={nameValue} onChange={e => setNameValue(e.target.value)} placeholder="Tool name" style={{ width: '100%', marginBottom: 12 }} />

            <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>TYPE</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
              {['equipment','facility','framework','hardware','instrument','language','platform','software','vehicle'].map(t => (
                <button key={t} onClick={() => setEditType(t)} style={{
                  padding: '3px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer',
                  border: `1px solid ${editType === t ? acc : adim}`,
                  background: editType === t ? 'rgba(255,176,0,0.1)' : 'transparent',
                  color: editType === t ? acc : dim,
                }}>{t}</button>
              ))}
            </div>

            <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>URL (optional)</div>
            <input className="crt-input" value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="https://..." style={{ width: '100%', marginBottom: 12 }} />

            <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>DESCRIPTION (optional)</div>
            <textarea className="crt-input" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description..." rows={2} style={{ width: '100%', marginBottom: 12, resize: 'vertical' }} />

            <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>NOTES (optional)</div>
            <textarea className="crt-input" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes..." rows={2} style={{ width: '100%', marginBottom: 12, resize: 'vertical' }} />

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending} style={{ flex: 1, padding: '6px', fontSize: 9, border: `1px solid ${acc}`, background: 'transparent', color: acc, fontFamily: mono, cursor: 'pointer' }}>
                {saveEdit.isPending ? 'SAVING...' : '✓ SAVE'}
              </button>
              <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '6px', fontSize: 9, border: `1px solid ${adim}`, background: 'transparent', color: dim, fontFamily: mono, cursor: 'pointer' }}>CANCEL</button>
            </div>
          </div>
        ) : (
          <>
            {/* Description */}
            {tool.description && (
              <>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 2, margin: '8px 0 6px' }}>DESCRIPTION</div>
                <div style={{ fontSize: 10, color: dim, lineHeight: 1.6 }}>{tool.description}</div>
              </>
            )}

            {/* Linked lifepaths */}
            <div style={{ fontSize: 9, color: adim, letterSpacing: 2, margin: '16px 0 6px' }}>LINKED LIFEPATHS</div>
            {linkedLPs.length === 0 ? (
              <div style={{ fontSize: 10, color: dim, opacity: 0.6 }}>Not linked to any lifepath</div>
            ) : linkedLPs.map(lp => (
              <div key={lp.id} style={{ fontSize: 10, color: dim, padding: '3px 0' }}>
                <span style={{ color: adim }}>{lp.category} › </span>{lp.name}
              </div>
            ))}

        {/* Recent sessions */}
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, margin: '16px 0 6px' }}>RECENT SESSIONS</div>
        {sessions.length === 0 ? (
          <div style={{ fontSize: 10, color: dim, opacity: 0.6 }}>No sessions logged with this tool yet</div>
        ) : sessions.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 10, marginBottom: 5, alignItems: 'center' }}>
            <span style={{ color: adim }}>›</span>
            <span style={{ color: dim, flexShrink: 0, width: 70 }}>{new Date(s.logged_at).toLocaleDateString('en-CA').replace(/-/g, '.')}</span>
            <span style={{ color: acc, flexShrink: 0 }}>{s.duration_minutes}min</span>
            <span style={{ color: dim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.skill_name}</span>
            <span style={{ color: green, flexShrink: 0 }}>+{Math.round(s.total_tool_xp / Math.max(1, 1))} XP</span>
          </div>
        ))}

        {/* Notes */}
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, margin: '16px 0 6px' }}>NOTES</div>
        <textarea
          value={editingNotes ?? (tool.notes ?? '')}
          onChange={e => setEditingNotes(e.target.value)}
          onBlur={async e => {
            const db = await getDB();
            const val = e.target.value.trim() || null;
            await db.exec(`UPDATE tools SET notes = ${val ? `'${val.replace(/'/g,"''")}'` : 'NULL'} WHERE id = '${tool.id}';`);
            onUpdated();
          }}
          placeholder="Add notes about this tool..."
          rows={3}
          style={{ width: '100%', background: bgS, border: `1px solid rgba(153,104,0,0.4)`, color: dim, fontFamily: mono, fontSize: 11, lineHeight: 1.6, padding: '8px 10px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
          </>
        )}

        {/* Actions */}
        <div style={{ height: 1, background: 'rgba(153,104,0,0.3)', margin: '16px 0' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setNameValue(tool.name); setEditType(tool.type); setEditUrl(tool.url || ''); setEditDesc(tool.description || ''); setEditNotes(tool.notes || ''); setEditing(true); }}
            style={{ flex: 1, height: 32, border: `1px solid ${adim}`, background: 'transparent', color: adim, fontFamily: mono, fontSize: 10, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = acc; e.currentTarget.style.color = acc; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = adim; e.currentTarget.style.color = adim; }}
          >[ EDIT ]</button>
          <button onClick={() => toggleActive.mutate(!tool.active)}
            style={{ flex: 1, height: 32, border: `1px solid ${tool.active ? 'rgba(255,60,60,0.4)' : green}`, background: 'transparent', color: tool.active ? 'hsl(0,80%,55%)' : green, fontFamily: mono, fontSize: 10, cursor: 'pointer' }}
          >{tool.active ? '[ DEACTIVATE ]' : '[ ACTIVATE ]'}</button>
          <button onClick={() => setConfirmDelete(v => !v)}
            style={{ flex: 1, height: 32, border: `1px solid rgba(153,104,0,0.4)`, background: 'transparent', color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4400'; e.currentTarget.style.color = '#ff4400'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)'; e.currentTarget.style.color = dim; }}
          >[ DELETE ]</button>
        </div>

        {confirmDelete && (
          <div style={{ border: '1px solid #ff3300', padding: '10px 12px', background: 'rgba(255,51,0,0.06)', marginTop: 8 }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: '#ff4400', marginBottom: 8 }}>DELETE TOOL? XP log entries are preserved.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => deleteTool.mutate()} style={{ flex: 1, height: 30, background: 'transparent', border: '1px solid #ff4400', color: '#ff4400', fontFamily: mono, fontSize: 10, cursor: 'pointer' }}>[ CONFIRM ]</button>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, height: 30, background: 'transparent', border: `1px solid ${adim}`, color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer' }}>[ CANCEL ]</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}