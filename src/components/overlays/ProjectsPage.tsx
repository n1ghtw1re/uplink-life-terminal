// src/components/overlays/ProjectsPage.tsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import ProjectDetailDrawer from '@/components/drawer/ProjectDetailDrawer';
import Modal from '@/components/Modal';
import AddProjectModal from '@/components/modals/AddProjectModal';

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim  = 'hsl(var(--text-dim))';
const bgP  = 'hsl(var(--bg-primary))';
const bgS  = 'hsl(var(--bg-secondary))';
const bgT  = 'hsl(var(--bg-tertiary))';
const green = '#44ff88';

type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETE' | 'ARCHIVED';
type SortKey = 'status' | 'name' | 'progress' | 'recent';

const TABS: { key: ProjectStatus | 'ALL'; label: string }[] = [
  { key: 'ALL',      label: 'ALL'      },
  { key: 'ACTIVE',   label: 'ACTIVE'   },
  { key: 'PAUSED',   label: 'PAUSED'   },
  { key: 'COMPLETE', label: 'COMPLETE' },
  { key: 'ARCHIVED', label: 'ARCHIVED' },
];
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'status',   label: 'STATUS'   },
  { key: 'name',     label: 'A–Z'      },
  { key: 'progress', label: 'PROGRESS' },
  { key: 'recent',   label: 'RECENT'   },
];

function statusColor(s: string) {
  if (s === 'ACTIVE')   return green;
  if (s === 'PAUSED')   return '#ffaa00';
  if (s === 'COMPLETE') return '#44ff88';
  return adim;
}

interface Project {
  id: string; name: string; type: string; status: string;
  description: string | null; progress: number; created_at: string;
}

interface Props { onClose: () => void; }

export default function ProjectsPage({ onClose }: Props) {
  const [activeTab, setActiveTab]   = useState<ProjectStatus | 'ALL'>('ALL');
  const [sortKey, setSortKey]       = useState<SortKey>('status');
  const [search, setSearch]         = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd]       = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<Project>(`SELECT * FROM projects ORDER BY created_at DESC;`);
      return res.rows;
    },
  });

  // Get objective counts for progress
  const { data: objCounts = {} } = useQuery({
    queryKey: ['project-obj-counts'],
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<{ project_id: string; total: string; done: string }>(
        `SELECT project_id, COUNT(*) as total, COUNT(completed_at) as done FROM project_milestones GROUP BY project_id;`
      );
      return Object.fromEntries(res.rows.map(r => [r.project_id, { total: Number(r.total), done: Number(r.done) }]));
    },
  });

  const countFor = (key: ProjectStatus | 'ALL') =>
    key === 'ALL' ? projects.length : projects.filter(p => p.status === key).length;

  const filtered = useMemo(() => {
    let base = activeTab === 'ALL' ? projects : projects.filter(p => p.status === activeTab);
    if (search.trim()) base = base.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.description ?? '').toLowerCase().includes(search.toLowerCase()));
    return [...base].sort((a, b) => {
      if (sortKey === 'name')     return a.name.localeCompare(b.name);
      if (sortKey === 'progress') {
        const pa = objCounts[a.id] ? Math.round((objCounts[a.id].done / objCounts[a.id].total) * 100) : 0;
        const pb = objCounts[b.id] ? Math.round((objCounts[b.id].done / objCounts[b.id].total) * 100) : 0;
        return pb - pa;
      }
      if (sortKey === 'recent') return b.created_at.localeCompare(a.created_at);
      // status sort: ACTIVE first
      const order: Record<string, number> = { ACTIVE: 0, PAUSED: 1, COMPLETE: 2, ARCHIVED: 3 };
      return (order[a.status] ?? 4) - (order[b.status] ?? 4);
    });
  }, [projects, activeTab, sortKey, search, objCounts]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: bgP, display: 'flex', flexDirection: 'column', fontFamily: mono }}>

      {/* Header */}
      <div style={{ height: 56, flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// ARSENAL</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>PROJECTS</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: dim }}>{projects.filter(p => p.status === 'ACTIVE').length} active</span>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: adim, pointerEvents: 'none' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..."
            style={{ padding: '4px 10px 4px 24px', fontSize: 10, width: 180, background: bgS, border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: adim, cursor: 'pointer', fontSize: 12 }}>×</button>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: adim, letterSpacing: 1 }}>SORT:</span>
          {SORT_OPTIONS.map(s => (
            <button key={s.key} onClick={() => setSortKey(s.key)} style={{ padding: '3px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${sortKey === s.key ? acc : adim}`, background: sortKey === s.key ? 'rgba(255,176,0,0.1)' : 'transparent', color: sortKey === s.key ? acc : dim }}>{s.label}</button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '5px 16px', fontSize: 10, border: `1px solid ${acc}`, background: 'rgba(255,176,0,0.1)', color: acc, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>+ ADD</button>
        <button onClick={onClose} style={{ padding: '5px 12px', fontSize: 10, border: `1px solid ${adim}`, background: 'transparent', color: dim, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>× CLOSE</button>
      </div>

      {/* Tabs */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', padding: '0 16px', background: bgS }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setSelectedId(null); }} style={{ padding: '10px 14px', fontSize: 10, border: 'none', borderBottom: `2px solid ${activeTab === t.key ? acc : 'transparent'}`, background: 'transparent', color: activeTab === t.key ? acc : dim, fontFamily: mono, cursor: 'pointer' }}>
            {t.label} <span style={{ fontSize: 8, opacity: 0.6 }}>({countFor(t.key)})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          {isLoading ? (
            <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
          ) : filtered.length === 0 ? (
            <div style={{ fontSize: 10, color: dim, opacity: 0.6, marginTop: 40, textAlign: 'center' }}>
              {search ? `No projects matching "${search}"` : 'No projects yet. Add one to get started.'}
            </div>
          ) : filtered.map(proj => {
            const objs     = objCounts[proj.id];
            const pct      = objs && objs.total > 0 ? Math.round((objs.done / objs.total) * 100) : null;
            const isSelected = selectedId === proj.id;
            return (
              <div key={proj.id} onClick={() => setSelectedId(isSelected ? null : proj.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', marginBottom: 4, cursor: 'pointer', background: isSelected ? 'rgba(255,176,0,0.06)' : bgS, border: `1px solid ${isSelected ? acc : 'rgba(153,104,0,0.4)'}`, transition: 'border-color 150ms' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = adim; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)'; }}>
                <span style={{ fontSize: 9, color: statusColor(proj.status), border: `1px solid ${statusColor(proj.status)}`, padding: '1px 5px', letterSpacing: 1, flexShrink: 0 }}>{proj.status}</span>
                <span style={{ fontFamily: mono, fontSize: 11, color: acc, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.name}</span>
                <span style={{ fontSize: 9, color: adim, border: `1px solid ${adim}`, padding: '1px 5px', flexShrink: 0 }}>{proj.type}</span>
                {pct !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <div style={{ width: 60, height: 5, background: bgT, border: `1px solid ${adim}` }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: acc }} />
                    </div>
                    <span style={{ fontSize: 9, color: dim, width: 28, textAlign: 'right' }}>{pct}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Drawer */}
        <div style={{ width: selectedId ? 420 : 0, flexShrink: 0, overflow: 'hidden', transition: 'width 200ms ease', borderLeft: selectedId ? `1px solid ${adim}` : 'none' }}>
          {selectedId && <ProjectDetailDrawer projectId={selectedId} onClose={() => setSelectedId(null)} />}
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD PROJECT" width={640}>
        <AddProjectModal onClose={() => setShowAdd(false)} />
      </Modal>
    </div>
  );
}