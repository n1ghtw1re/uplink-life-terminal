// src/components/widgets/ProjectsWidget.tsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import WidgetWrapper from '../WidgetWrapper';
import Modal from '../Modal';
import AddProjectModal from '../modals/AddProjectModal';

type FilterKey = 'active' | 'all' | 'complete' | 'recent';
const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'active',   label: 'ACTIVE'   },
  { key: 'all',      label: 'ALL'      },
  { key: 'complete', label: 'COMPLETE' },
  { key: 'recent',   label: 'RECENT'   },
];

const mono  = "'IBM Plex Mono', monospace";
const acc   = 'hsl(var(--accent))';
const adim  = 'hsl(var(--accent-dim))';
const dim   = 'hsl(var(--text-dim))';
const green = '#44ff88';

const formatTotalTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

function statusColor(s: string) {
  if (s === 'ACTIVE')   return green;
  if (s === 'PAUSED')   return '#ffaa00';
  if (s === 'COMPLETE') return '#44ff88';
  return adim;
}

interface Props {
  onClose?: () => void; onFullscreen?: () => void; isFullscreen?: boolean;
  onOpenProjects?: () => void; onProjectClick?: (id: string) => void;
}

export default function ProjectsWidget({ onClose, onFullscreen, isFullscreen, onOpenProjects, onProjectClick }: Props) {
  const [filter, setFilter] = useState<FilterKey>('active');
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<{ id: string; name: string; type: string; status: string; created_at: string }>(
        `SELECT id, name, type, status, created_at FROM projects ORDER BY created_at DESC;`
      );
      return res.rows;
    },
  });

  const { data: projectTimes = {} } = useQuery({
    queryKey: ['project-total-times'],
    queryFn: async () => {
      const db  = await getDB();
      const sessionRes = await db.query<{ project_id: string; total_minutes: number }>(
        `SELECT project_id, COALESCE(SUM(duration_minutes), 0)::int AS total_minutes
         FROM sessions
         WHERE project_id IS NOT NULL
         GROUP BY project_id;`
      );
      const outputRes = await db.query<{ project_id: string; total_minutes: number }>(
        `SELECT project_id, COALESCE(SUM(duration_minutes), 0)::int AS total_minutes
         FROM output_logs
         WHERE project_id IS NOT NULL
         GROUP BY project_id;`
      );

      const totals: Record<string, number> = {};
      for (const row of sessionRes.rows) {
        totals[row.project_id] = (totals[row.project_id] ?? 0) + Number(row.total_minutes ?? 0);
      }
      for (const row of outputRes.rows) {
        totals[row.project_id] = (totals[row.project_id] ?? 0) + Number(row.total_minutes ?? 0);
      }
      return totals;
    },
  });

  const display = useMemo(() => {
    const searchFn = (value: string | null | undefined) => !search.trim() || (value ?? '').toLowerCase().includes(search.toLowerCase());
    const filteredProjects = projects.filter(p => searchFn(p.name) || searchFn(p.type) || searchFn(p.status));
    switch (filter) {
      case 'active':
        return [...filteredProjects]
          .filter(p => p.status === 'ACTIVE')
          .sort((a, b) => (projectTimes[b.id] ?? 0) - (projectTimes[a.id] ?? 0))
          .slice(0, 8);
      case 'complete': return filteredProjects.filter(p => p.status === 'COMPLETE').slice(0, 8);
      case 'recent':   return [...filteredProjects].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);
      default:         return filteredProjects.slice(0, 8);
    }
  }, [projects, filter, search, projectTimes]);

  return (
    <WidgetWrapper title="PROJECTS" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..."
          style={{ width: '100%', padding: '3px 8px 3px 20px', fontSize: 9, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }} />
        <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: adim, pointerEvents: 'none' }}>?</span>
        {search && <span onClick={() => setSearch('')} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: adim, cursor: 'pointer' }}>×</span>}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: '2px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer', letterSpacing: 1, border: `1px solid ${filter === f.key ? acc : adim}`, background: filter === f.key ? 'rgba(255,176,0,0.1)' : 'transparent', color: filter === f.key ? acc : dim }}>{f.label}</button>
        ))}
      </div>

      {display.length === 0 ? (
        <div style={{ fontSize: 10, color: dim, opacity: 0.6 }}>
          {search ? 'No projects match your search.' : `No projects${filter === 'active' ? ' active' : filter === 'complete' ? ' completed' : ''} yet.`}
        </div>
      ) : display.map(proj => {
        const totalMinutes = Number(projectTimes[proj.id] ?? 0);
        return (
          <div key={proj.id} onClick={() => onProjectClick?.(proj.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, cursor: onProjectClick ? 'pointer' : 'default' }}
            onMouseEnter={e => { if (onProjectClick) e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
            <span style={{ fontSize: 8, color: statusColor(proj.status), flexShrink: 0 }}>?</span>
            <span style={{ fontSize: 11, color: acc, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: mono }}>{proj.name}</span>
            <span style={{ fontSize: 9, color: dim, flexShrink: 0 }}>{formatTotalTime(totalMinutes)}</span>
          </div>
        );
      })}

      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = acc}
          onMouseLeave={e => e.currentTarget.style.color = adim}>+ ADD PROJECT</button>
        <button onClick={onOpenProjects} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = acc}
          onMouseLeave={e => e.currentTarget.style.color = adim}>VIEW ALL ›</button>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD PROJECT" width={640}>
        <AddProjectModal onClose={() => setShowAdd(false)} />
      </Modal>
    </WidgetWrapper>
  );
}
