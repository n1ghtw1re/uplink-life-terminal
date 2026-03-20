// ============================================================
// src/components/widgets/ToolsWidget.tsx
// ============================================================
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { useTools } from '@/hooks/useTools';
import { getLevelFromXP } from '@/services/xpService';
import WidgetWrapper from '../WidgetWrapper';
import Modal from '../Modal';
import AddToolModal from '../modals/AddToolModal';

type FilterKey = 'active' | 'recent' | 'most_used' | 'new';

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'active',    label: 'ACTIVE'    },
  { key: 'recent',    label: 'RECENT'    },
  { key: 'most_used', label: 'MOST USED' },
  { key: 'new',       label: 'NEW'       },
];

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim  = 'hsl(var(--text-dim))';

interface Props {
  onClose?: () => void; onFullscreen?: () => void;
  isFullscreen?: boolean; onOpenTools?: () => void;
  onToolClick?: (id: string) => void;
}

export default function ToolsWidget({ onClose, onFullscreen, isFullscreen, onOpenTools, onToolClick }: Props) {
  const { data: tools = [], isLoading } = useTools();
  const [showAdd, setShowAdd]   = useState(false);
  const [filter, setFilter]     = useState<FilterKey>('active');

  const { data: sessionCounts = {} } = useQuery({
    queryKey: ['tool-session-counts'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<{ tool_id: string; count: string }>(
        `SELECT tool_id, COUNT(*) as count
         FROM (
           SELECT jsonb_array_elements_text(tool_ids::jsonb) as tool_id FROM sessions
         ) t GROUP BY tool_id;`
      );
      return Object.fromEntries(res.rows.map(r => [r.tool_id, Number(r.count)]));
    },
  });

  const { data: lastSessions = {} } = useQuery({
    queryKey: ['tool-last-session'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<{ tool_id: string; last: string }>(
        `SELECT tool_id, MAX(logged_at) as last
         FROM (
           SELECT jsonb_array_elements_text(tool_ids::jsonb) as tool_id, logged_at FROM sessions
         ) t GROUP BY tool_id;`
      );
      return Object.fromEntries(res.rows.map(r => [r.tool_id, r.last]));
    },
  });

  const displayTools = useMemo(() => {
    const all = tools;
    switch (filter) {
      case 'active':
        return all.filter(t => t.active).sort((a, b) => b.level !== a.level ? b.level - a.level : b.xp - a.xp).slice(0, 8);
      case 'recent':
        return all.filter(t => t.active && lastSessions[t.id]).sort((a, b) => (lastSessions[b.id] ?? '').localeCompare(lastSessions[a.id] ?? '')).slice(0, 8);
      case 'most_used':
        return all.filter(t => t.active && (sessionCounts[t.id] ?? 0) > 0).sort((a, b) => (sessionCounts[b.id] ?? 0) - (sessionCounts[a.id] ?? 0)).slice(0, 8);
      case 'new':
        return all.filter(t => t.active && !sessionCounts[t.id]).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8);
      default: return [];
    }
  }, [tools, filter, sessionCounts, lastSessions]);

  return (
    <WidgetWrapper title="TOOLS" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '2px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
            border: `1px solid ${filter === f.key ? acc : adim}`,
            background: filter === f.key ? 'rgba(255,176,0,0.1)' : 'transparent',
            color: filter === f.key ? acc : dim,
          }}>{f.label}</button>
        ))}
      </div>

      {/* Tool list */}
      {isLoading ? (
        <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
      ) : displayTools.length === 0 ? (
        <div style={{ fontSize: 10, color: dim, opacity: 0.6 }}>
          {filter === 'recent'    && 'No tools used yet'}
          {filter === 'most_used' && 'No sessions with tools yet'}
          {filter === 'new'       && 'All active tools have been used'}
          {filter === 'active'    && 'No active tools'}
        </div>
      ) : (
        <div>
          {displayTools.map(tool => {
            const { xpInLevel, xpForLevel } = getLevelFromXP(tool.xp);
            const pct   = xpForLevel > 0 ? Math.round((xpInLevel / xpForLevel) * 100) : 0;
            const count = sessionCounts[tool.id];
            const last  = lastSessions[tool.id];

            return (
              <div key={tool.id} onClick={() => onToolClick?.(tool.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, cursor: onToolClick ? 'pointer' : 'default' }}
                onMouseEnter={e => { if (onToolClick) e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <span style={{ fontSize: 8, color: adim, border: `1px solid ${adim}`, padding: '1px 4px', letterSpacing: 0.5, flexShrink: 0 }}>
                  {tool.type.slice(0,3).toUpperCase()}
                </span>
                <span style={{ fontSize: 11, color: acc, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: mono }}>
                  {tool.name}
                </span>
                {filter === 'most_used' && count && <span style={{ fontSize: 9, color: adim, flexShrink: 0 }}>{count}×</span>}
                {filter === 'recent' && last && <span style={{ fontSize: 9, color: adim, flexShrink: 0 }}>{new Date(last).toLocaleDateString('en', { month: 'numeric', day: 'numeric' })}</span>}
                <span style={{ fontFamily: vt, fontSize: 14, color: acc, flexShrink: 0, width: 42 }}>LVL {tool.level}</span>
                <div style={{ width: 60, height: 5, flexShrink: 0, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${adim}` }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: acc }} />
                </div>
                <span style={{ fontFamily: mono, fontSize: 9, color: dim, width: 28, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = acc} onMouseLeave={e => e.currentTarget.style.color = adim}
        >+ ADD TOOL</button>
        <button onClick={onOpenTools} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = acc} onMouseLeave={e => e.currentTarget.style.color = adim}
        >VIEW ALL ›</button>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD TOOL" width={680}>
        <AddToolModal onClose={() => setShowAdd(false)} />
      </Modal>
    </WidgetWrapper>
  );
}