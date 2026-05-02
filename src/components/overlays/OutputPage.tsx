import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import OutputLogDrawer from '@/components/drawer/OutputLogDrawer';

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const dim = 'hsl(var(--text-dim))';
const adim = 'hsl(var(--accent-dim))';
const bgP = 'hsl(var(--bg-primary))';
const bgS = 'hsl(var(--bg-secondary))';

type SortKey = 'date' | 'type' | 'duration' | 'intensity';
type PageTab = 'logs' | 'stats';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date', label: 'DATE' },
  { key: 'type', label: 'TYPE' },
  { key: 'duration', label: 'DURATION' },
  { key: 'intensity', label: 'INTENSITY' },
];

interface Props {
  onClose: () => void;
}

export default function OutputPage({ onClose }: Props) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<'all' | 'exercise' | 'workout'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<PageTab>('logs');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['output-logs-all'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<any>(
        `SELECT ol.*,
          (CASE WHEN ol.target_type = 'exercise' THEN e.name ELSE w.name END) AS target_name
         FROM output_logs ol
         LEFT JOIN exercises e ON ol.target_type = 'exercise' AND e.id = ol.target_id
         LEFT JOIN workouts w ON ol.target_type = 'workout' AND w.id = ol.target_id
         ORDER BY ol.created_at DESC;`
      );
      return res.rows;
    },
  });

  const filtered = useMemo(() => {
    let base = logs;
    if (filterType !== 'all') base = base.filter((l: any) => l.target_type === filterType);
    if (search.trim()) {
      const s = search.toLowerCase();
      base = base.filter((l: any) => String(l.target_name ?? '').toLowerCase().includes(s) || String(l.target_type).toLowerCase().includes(s));
    }
    return [...base].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortKey === 'type') cmp = String(a.target_type).localeCompare(String(b.target_type));
      if (sortKey === 'duration') cmp = Number(a.duration_minutes ?? 0) - Number(b.duration_minutes ?? 0);
      if (sortKey === 'intensity') cmp = Number(a.intensity ?? 0) - Number(b.intensity ?? 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [logs, filterType, search, sortKey, sortDir]);

  const totalDuration = useMemo(() => logs.reduce((sum: number, l: any) => sum + Number(l.duration_minutes ?? 0), 0), [logs]);
  const avgIntensity = useMemo(() => logs.length ? (logs.reduce((sum: number, l: any) => sum + Number(l.intensity ?? 0), 0) / logs.length) : 0, [logs]);

  const handleSortClick = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const sortIndicator = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: bgP, display: 'flex', flexDirection: 'column', fontFamily: mono }}>
      <div style={{ height: 56, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px' }}>
        <span style={{ fontSize: 9, color: adim, letterSpacing: 2 }}>// BIOSYSTEM</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>OUTPUT</span>
        <span style={{ fontSize: 10, color: dim }}>{logs.length} entries</span>
        <div style={{ flex: 1 }} />
        <button className="topbar-btn" onClick={onClose}>ESC</button>
      </div>

      <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${adim}`, padding: '8px 24px', background: bgS }}>
        <button className="topbar-btn" onClick={() => setTab('logs')} style={{ borderColor: tab === 'logs' ? acc : adim, color: tab === 'logs' ? acc : dim }}>LOGS</button>
        <button className="topbar-btn" onClick={() => setTab('stats')} style={{ borderColor: tab === 'stats' ? acc : adim, color: tab === 'stats' ? acc : dim }}>STATS</button>
      </div>

      {tab === 'logs' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${adim}`, padding: '8px 24px', background: bgS }}>
            <span style={{ fontSize: 9, color: adim, letterSpacing: 1 }}>FILTER:</span>
            {(['all', 'exercise', 'workout'] as const).map(t => (
              <button key={t} className="topbar-btn" onClick={() => setFilterType(t)} style={{ borderColor: filterType === t ? acc : adim, color: filterType === t ? acc : dim }}>{t.toUpperCase()}</button>
            ))}
            <span style={{ marginLeft: 12, fontSize: 9, color: adim, letterSpacing: 1 }}>SORT:</span>
            {SORT_OPTIONS.map(s => (
              <button key={s.key} className="topbar-btn" onClick={() => handleSortClick(s.key)} style={{ borderColor: sortKey === s.key ? acc : adim, color: sortKey === s.key ? acc : dim }}>
                {s.label}{sortIndicator(s.key)}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="TARGET..." style={{ width: 180, padding: '4px 8px', fontSize: 10, border: `1px solid ${adim}`, background: bgP, color: acc, fontFamily: mono }} />
          </div>

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              {isLoading && <div style={{ padding: 24, color: dim, textAlign: 'center' }}>Loading output logs...</div>}
              {!isLoading && filtered.length === 0 && <div style={{ padding: 24, color: dim, textAlign: 'center' }}>{search ? 'No logs match search' : 'No output logs yet'}</div>}
              {!isLoading && filtered.map((log: any) => {
                const active = selectedId === log.id;
                const date = new Date(log.created_at).toLocaleDateString('en-CA');
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedId(log.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '10px 16px',
                      background: active ? 'rgba(255,176,0,0.06)' : bgS,
                      border: `1px solid ${active ? acc : 'rgba(153,104,0,0.4)'}`,
                      cursor: 'pointer', marginBottom: 4,
                    }}
                  >
                    <span style={{ width: 100, fontSize: 11, color: acc }}>{date}</span>
                    <span style={{ width: 72, fontSize: 10, color: dim }}>{String(log.target_type).toUpperCase()}</span>
                    <span style={{ flex: 1, fontSize: 11, color: acc, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.target_name ?? log.target_id}</span>
                    <span style={{ width: 74, textAlign: 'right', fontSize: 10, color: dim }}>{log.duration_minutes}m</span>
                    <span style={{ width: 78, textAlign: 'right', fontSize: 10, color: dim }}>INT {log.intensity}</span>
                    <span style={{ fontSize: 10, color: adim }}>›</span>
                  </div>
                );
              })}
            </div>

            <div style={{ width: selectedId ? 460 : 0, transition: 'width 200ms ease', borderLeft: selectedId ? `1px solid ${adim}` : 'none', overflow: 'hidden' }}>
              {selectedId && <OutputLogDrawer outputLogId={selectedId} onClose={() => setSelectedId(null)} />}
            </div>
          </div>
        </>
      )}

      {tab === 'stats' && (
        <div style={{ flex: 1, padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
            <div style={{ border: `1px solid ${adim}`, padding: 12 }}>
              <div style={{ fontSize: 9, color: adim, letterSpacing: 1 }}>TOTAL LOGS</div>
              <div style={{ fontFamily: vt, fontSize: 28, color: acc }}>{logs.length}</div>
            </div>
            <div style={{ border: `1px solid ${adim}`, padding: 12 }}>
              <div style={{ fontSize: 9, color: adim, letterSpacing: 1 }}>TOTAL DURATION</div>
              <div style={{ fontFamily: vt, fontSize: 28, color: acc }}>{totalDuration}m</div>
            </div>
            <div style={{ border: `1px solid ${adim}`, padding: 12 }}>
              <div style={{ fontSize: 9, color: adim, letterSpacing: 1 }}>AVG INTENSITY</div>
              <div style={{ fontFamily: vt, fontSize: 28, color: acc }}>{avgIntensity.toFixed(1)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
