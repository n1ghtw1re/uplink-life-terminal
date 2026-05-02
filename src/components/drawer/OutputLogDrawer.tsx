import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { STAT_META, StatKey } from '@/types';
import { toast } from '@/hooks/use-toast';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';

interface Props {
  outputLogId: string;
  onClose?: () => void;
}

export default function OutputLogDrawer({ outputLogId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [duration, setDuration] = useState(60);
  const [intensity, setIntensity] = useState(5);
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['output-log', outputLogId],
    enabled: !!outputLogId,
    queryFn: async () => {
      const db = await getDB();
      const logRes = await db.query<any>(`SELECT * FROM output_logs WHERE id = $1 LIMIT 1;`, [outputLogId]);
      const log = logRes.rows[0] ?? null;
      if (!log) return null;
      const rows = await db.query<any>(
        `SELECT ole.*, e.name AS exercise_name
         FROM output_log_exercises ole
         JOIN exercises e ON e.id = ole.exercise_id
         WHERE ole.output_log_id = $1;`,
        [outputLogId]
      );
      return { log, rows: rows.rows };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      await db.query(`UPDATE output_logs SET duration_minutes = $1, intensity = $2, notes = $3 WHERE id = $4;`, [duration, intensity, notes.trim() || null, outputLogId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setEditing(false);
      toast({ title: 'OUTPUT LOG UPDATED' });
    },
    onError: (e) => toast({ title: 'ERROR', description: String(e) }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      await db.query(`DELETE FROM output_logs WHERE id = $1;`, [outputLogId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      onClose?.();
    },
  });

  if (isLoading) return <div style={{ padding: 20, color: dim, fontFamily: mono, fontSize: 11 }}>LOADING...</div>;
  if (!data?.log) return <div style={{ padding: 20, color: dim, fontFamily: mono, fontSize: 11 }}>OUTPUT LOG NOT FOUND</div>;

  const log = data.log;
  const rows = data.rows as any[];
  const statSplit = Array.isArray(log.stat_split) ? log.stat_split : JSON.parse(log.stat_split || '[]');
  const date = new Date(log.created_at).toLocaleString();

  const startEdit = () => {
    setDuration(Number(log.duration_minutes ?? 60));
    setIntensity(Number(log.intensity ?? 5));
    setNotes(log.notes ?? '');
    setEditing(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${adim}` }}>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2 }}>// OUTPUT</div>
        <div style={{ fontSize: 20, color: acc }}>{String(log.target_type).toUpperCase()} LOG</div>
        <div style={{ fontSize: 10, color: dim }}>{date}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        {!editing && (
          <>
            <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>// SUMMARY</div>
            <div style={{ fontSize: 10, color: dim, marginBottom: 3 }}>Duration: <span style={{ color: acc }}>{log.duration_minutes}m</span></div>
            <div style={{ fontSize: 10, color: dim, marginBottom: 3 }}>Intensity: <span style={{ color: acc }}>{log.intensity}/10</span></div>
            <div style={{ fontSize: 10, color: dim, marginBottom: 10 }}>
              Stats: <span style={{ color: acc }}>
                {statSplit.map((s: any) => `${STAT_META[s.stat as StatKey]?.name ?? s.stat} ${s.percent}%`).join(' / ')}
              </span>
            </div>
            {log.notes && <div style={{ fontSize: 10, color: dim, marginBottom: 10 }}>{log.notes}</div>}
            <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>// EXERCISE DETAILS</div>
            {rows.map((r) => {
              const details = typeof r.details_json === 'string' ? JSON.parse(r.details_json) : (r.details_json ?? {});
              const totals = details.totals ?? {};
              const summary = totals.totalReps != null
                ? `${totals.setCount ?? 0} sets | reps ${totals.totalReps ?? 0} | weight ${totals.totalWeight ?? 0}`
                : `${totals.setCount ?? 0} sets | total ${totals.total ?? 0}`;
              return (
                <div key={r.id} style={{ border: `1px solid rgba(153,104,0,0.25)`, padding: '6px 8px', marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: acc }}>{r.exercise_name}</div>
                  <div style={{ fontSize: 9, color: dim }}>{summary}</div>
                  <div style={{ fontSize: 9, color: adim }}>+{r.xp_awarded} XP</div>
                </div>
              );
            })}
          </>
        )}

        {editing && (
          <div style={{ border: `1px solid ${adim}`, padding: 10, display: 'grid', gap: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: adim, marginBottom: 4 }}>DURATION</div>
              <input className="crt-input" type="number" min={1} value={duration} onChange={e => setDuration(Math.max(1, Number(e.target.value || 1)))} style={{ width: '100%' }} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: adim, marginBottom: 4 }}>INTENSITY ({intensity}/10)</div>
              <input type="range" min={1} max={10} value={intensity} onChange={e => setIntensity(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: adim, marginBottom: 4 }}>NOTES</div>
              <textarea className="crt-input" value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', minHeight: 80 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="topbar-btn" onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? 'SAVING...' : 'SAVE'}</button>
              <button className="topbar-btn" onClick={() => setEditing(false)}>CANCEL</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${adim}`, padding: '12px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {!editing && <button className="topbar-btn" onClick={startEdit}>EDIT</button>}
        {!editing && (
          <button className="topbar-btn" onClick={() => {
            if (!confirmDelete) return setConfirmDelete(true);
            deleteMutation.mutate();
          }} style={{ borderColor: confirmDelete ? '#ff5555' : adim, color: confirmDelete ? '#ff5555' : dim }}>
            {confirmDelete ? 'CONFIRM DELETE' : 'DELETE'}
          </button>
        )}
      </div>
    </div>
  );
}
