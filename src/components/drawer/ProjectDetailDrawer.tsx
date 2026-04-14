// src/components/drawer/ProjectDetailDrawer.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getDB } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { SortableObjective } from '@/components/ui/SortableObjective';

const mono  = "'IBM Plex Mono', monospace";
const vt    = "'VT323', monospace";
const acc   = 'hsl(var(--accent))';
const adim  = 'hsl(var(--accent-dim))';
const dim   = 'hsl(var(--text-dim))';
const bgS   = 'hsl(var(--bg-secondary))';
const bgT   = 'hsl(var(--bg-tertiary))';
const green = '#44ff88';

const PROJECT_TYPES    = ['software','creative','business','research','physical','educational','other'];
const PROJECT_STATUSES = ['ACTIVE','PAUSED','COMPLETE','ARCHIVED'];

interface Project {
  id: string; name: string; type: string; status: string;
  url: string | null; description: string | null; notes: string | null;
  linked_tool_ids: string[]; linked_augment_ids: string[];
  linked_media_ids: string[]; linked_course_ids: string[];
  created_at: string;
}
interface Objective { id: string; title: string; completed_at: string | null; sort_order: number; }

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}>
      {label}<div style={{ flex: 1, height: 1, background: 'rgba(153,104,0,0.3)' }} />
    </div>
  );
}

function LinkedIdsInput({ label, tableName, nameField, subField, selectedIds, onChange }: {
  label: string; tableName: string; nameField: string; subField: string;
  selectedIds: string[]; onChange: (ids: string[]) => void;
}) {
  const [search, setSearch]     = useState('');
  const [results, setResults]   = useState<{ id: string; name: string; sub: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string; sub: string }[]>([]);
  const [open, setOpen]         = useState(false);

  useEffect(() => {
    if (selectedIds.length === 0) { setSelected([]); return; }
    (async () => {
      const db  = await getDB();
      const res = await db.query<{ id: string; [k: string]: string }>(
        `SELECT id, ${nameField}, ${subField} FROM ${tableName} WHERE id = ANY($1::text[]);`, [selectedIds]
      );
      setSelected(res.rows.map(r => ({ id: r.id, name: r[nameField] ?? '', sub: r[subField] ?? '' })));
    })();
  }, [selectedIds.join(',')]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const db  = await getDB();
      const q   = search.trim();
      const res = await db.query<{ id: string; [k: string]: string }>(
        `SELECT id, ${nameField}, ${subField} FROM ${tableName} ${q ? `WHERE LOWER(${nameField}) LIKE LOWER($1)` : ''} ORDER BY ${nameField} LIMIT 20;`,
        q ? [`%${q}%`] : []
      );
      setResults(res.rows.map(r => ({ id: r.id, name: r[nameField] ?? '', sub: r[subField] ?? '' })));
    })();
  }, [search, open]);

  const toggle = (item: { id: string; name: string; sub: string }) =>
    onChange(selectedIds.includes(item.id) ? selectedIds.filter(x => x !== item.id) : [...selectedIds, item.id]);

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 4 }}>{label}</div>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
          {selected.map(item => (
            <span key={item.id} onClick={() => toggle(item)}
              style={{ fontSize: 9, color: acc, border: `1px solid ${acc}`, padding: '2px 8px', cursor: 'pointer', fontFamily: mono }}>
              {item.name.toUpperCase()} <span style={{ opacity: 0.5 }}>x</span>
            </span>
          ))}
        </div>
      )}
      {!open ? (
        <span onClick={() => setOpen(true)} style={{ fontSize: 9, color: adim, cursor: 'pointer', border: `1px dashed ${adim}`, padding: '2px 10px', fontFamily: mono }}>+ ADD</span>
      ) : (
        <div style={{ position: 'relative' }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Search..."
            style={{ width: '100%', padding: '5px 8px', fontSize: 10, background: bgS, border: `1px solid ${acc}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }} />
          {results.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: bgS, border: `1px solid ${adim}`, zIndex: 100, maxHeight: 130, overflowY: 'auto' as const }}>
              {results.map(r => {
                const isSel = selectedIds.includes(r.id);
                return (
                  <div key={r.id} onMouseDown={() => toggle(r)}
                    style={{ padding: '5px 10px', fontSize: 10, cursor: 'pointer', color: isSel ? acc : dim, background: isSel ? 'rgba(255,176,0,0.08)' : 'transparent', display: 'flex', justifyContent: 'space-between', fontFamily: mono }}>
                    <span>{r.name} {isSel && '✓'}</span>
                    <span style={{ fontSize: 9, opacity: 0.5 }}>{r.sub}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LinkedRefs({ ids, tableName, nameField, subField, color }: {
  ids: string[]; tableName: string; nameField: string; subField: string; color: string;
}) {
  const { data: items = [] } = useQuery({
    queryKey: [`ref-${tableName}-${ids.join(',')}`],
    enabled: ids.length > 0,
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<{ id: string; [k: string]: string }>(
        `SELECT id, ${nameField}, ${subField} FROM ${tableName} WHERE id = ANY($1::text[]);`, [ids]
      );
      return res.rows.map(r => ({ id: r.id, name: r[nameField] ?? '', sub: r[subField] ?? '' }));
    },
  });
  if (items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {items.map(item => (
        <span key={item.id} style={{ fontSize: 9, color, border: `1px solid ${color}`, padding: '2px 8px', letterSpacing: 1, opacity: 0.8, fontFamily: mono }}>
          {item.name.toUpperCase()} <span style={{ opacity: 0.5 }}>{item.sub}</span>
        </span>
      ))}
    </div>
  );
}

function statusColor(s: string) {
  if (s === 'ACTIVE')   return green;
  if (s === 'COMPLETE') return '#44ff88';
  if (s === 'PAUSED')   return '#ffaa00';
  return adim;
}

interface Props { projectId: string; onClose?: () => void; }

export default function ProjectDetailDrawer({ projectId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing]         = useState(false);
  const [showDelete, setShowDelete]   = useState(false);
  const [newObjTitle, setNewObjTitle] = useState('');
  const [editName, setEditName]       = useState('');
  const [editType, setEditType]       = useState('');
  const [editStatus, setEditStatus]   = useState('');
  const [editUrl, setEditUrl]         = useState('');
  const [editDesc, setEditDesc]       = useState('');
  const [editNotes, setEditNotes]     = useState('');
  const [editToolIds, setEditToolIds]     = useState<string[]>([]);
  const [editAugIds, setEditAugIds]       = useState<string[]>([]);
  const [editMediaIds, setEditMediaIds]   = useState<string[]>([]);
  const [editCourseIds, setEditCourseIds] = useState<string[]>([]);
  const [optimisticOrder, setOptimisticOrder] = useState<string[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Reset edit/delete states when projectId changes
  useEffect(() => {
    setEditing(false);
    setShowDelete(false);
  }, [projectId]);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<Project>(`SELECT * FROM projects WHERE id = $1 LIMIT 1;`, [projectId]);
      return res.rows[0] ?? null;
    },
  });

  const { data: objectives = [] } = useQuery({
    queryKey: ['project-objectives', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<Objective>(
        `SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY sort_order;`, [projectId]
      );
      return res.rows;
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['project-sessions', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<{ id: string; skill_name: string; duration_minutes: number; logged_at: string }>(
        `SELECT id, skill_name, duration_minutes, logged_at FROM sessions WHERE project_id = $1 ORDER BY logged_at DESC LIMIT 10;`, [projectId]
      );
      return res.rows;
    },
  });

  const toggleObjective = useMutation({
    mutationFn: async (obj: Objective) => {
      const db  = await getDB();
      const now = obj.completed_at ? null : new Date().toISOString();
      await db.query(`UPDATE project_milestones SET completed_at = $1 WHERE id = $2;`, [now, obj.id]);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-objectives', projectId] });
    },
  });

  const addObjective = useMutation({
    mutationFn: async () => {
      if (!newObjTitle.trim()) return;
      const db = await getDB();
      await db.query(
        `INSERT INTO project_milestones (id,project_id,title,sort_order) VALUES ($1,$2,$3,$4)`,
        [crypto.randomUUID(), projectId, newObjTitle.trim(), objectives.length]
      );
      setNewObjTitle('');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-objectives', projectId] });
    },
  });

  const deleteObjective = useMutation({
    mutationFn: async (id: string) => {
      const db = await getDB();
      await db.exec(`DELETE FROM project_milestones WHERE id = '${id}'`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-objectives', projectId] });
    },
  });

  const reorderObjectives = useMutation({
    mutationFn: async ({ orderedIds }: { orderedIds: string[] }) => {
      const db = await getDB();
      for (let i = 0; i < orderedIds.length; i++) {
        await db.query(
          `UPDATE project_milestones SET sort_order = $1 WHERE id = $2`,
          [i, orderedIds[i]]
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-objectives', projectId] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = optimisticOrder ?? objectives.map(o => o.id);
      const oldIndex = ids.findIndex(id => id === active.id);
      const newIndex = ids.findIndex(id => id === over.id);
      const newOrder = arrayMove(ids, oldIndex, newIndex);
      setOptimisticOrder(newOrder);
      reorderObjectives.mutate({ orderedIds: newOrder });
    }
  };

  const saveEdit = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      await db.query(
        `UPDATE projects SET name=$1,type=$2,status=$3,url=$4,description=$5,notes=$6,
         linked_tool_ids=$7,linked_augment_ids=$8,linked_media_ids=$9,linked_course_ids=$10 WHERE id=$11`,
        [editName.trim(), editType, editStatus,
         editUrl.trim() || null, editDesc.trim() || null, editNotes.trim() || null,
         JSON.stringify(editToolIds), JSON.stringify(editAugIds),
         JSON.stringify(editMediaIds), JSON.stringify(editCourseIds), projectId]
      );
    },
      onSuccess: async () => {
        await refreshAppData(queryClient);
        setEditing(false);
        toast({ title: '✓ PROJECT UPDATED' });
      },
  });

  const deleteProject = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      await db.exec(`DELETE FROM projects WHERE id = '${projectId}'`);
    },
      onSuccess: async () => {
        await refreshAppData(queryClient);
        onClose?.();
      },
  });

  const startEdit = () => {
    if (!project) return;
    setEditName(project.name); setEditType(project.type); setEditStatus(project.status);
    setEditUrl(project.url ?? ''); setEditDesc(project.description ?? ''); setEditNotes(project.notes ?? '');
    setEditToolIds(project.linked_tool_ids ?? []);
    setEditAugIds(project.linked_augment_ids ?? []);
    setEditMediaIds(project.linked_media_ids ?? []);
    setEditCourseIds(project.linked_course_ids ?? []);
    setEditing(true);
  };

  if (isLoading) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>LOADING...</div>;
  if (!project)  return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>PROJECT NOT FOUND</div>;

  const doneCount  = objectives.filter(o => !!o.completed_at).length;
  const totalCount = objectives.length;
  const progress   = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${adim}`, flexShrink: 0 }}>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>// PROJECT</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <div style={{ fontFamily: vt, fontSize: 22, color: acc, flex: 1, lineHeight: 1.1 }}>{project.name.toUpperCase()}</div>
          <span style={{ fontSize: 9, color: statusColor(project.status), border: `1px solid ${statusColor(project.status)}`, padding: '2px 8px', letterSpacing: 1, flexShrink: 0 }}>{project.status}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: totalCount > 0 ? 10 : 0 }}>
          <span style={{ fontSize: 9, color: adim, border: `1px solid ${adim}`, padding: '1px 6px', letterSpacing: 1 }}>{project.type.toUpperCase()}</span>
          {project.url && <a href={project.url} target="_blank" rel="noreferrer" style={{ fontSize: 9, color: acc, opacity: 0.7 }}>{project.url.replace(/^https?:\/\//, '').slice(0, 40)}</a>}
        </div>
        {totalCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, background: bgT, border: `1px solid ${adim}`, height: 5 }}>
              <div style={{ width: `${progress}%`, height: '100%', background: acc, transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontSize: 9, color: dim }}>{doneCount}/{totalCount}</span>
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 20px 16px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>

        {project.description && (<><SectionLabel label="DESCRIPTION" /><div style={{ fontSize: 10, color: dim, lineHeight: 1.6 }}>{project.description}</div></>)}

        <SectionLabel label="OBJECTIVES" />
        {objectives.length === 0 && <div style={{ fontSize: 10, color: dim, opacity: 0.5, marginBottom: 8 }}>No objectives yet.</div>}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={(optimisticOrder ?? objectives.map(o => o.id))} strategy={verticalListSortingStrategy}>
            {(optimisticOrder ?? objectives.map(o => o.id)).map(id => {
              const obj = objectives.find(o => o.id === id);
              if (!obj) return null;
              return (
                <SortableObjective
                  key={obj.id}
                  id={obj.id}
                  title={obj.title}
                  completed={!!obj.completed_at}
                  onToggle={() => toggleObjective.mutate(obj)}
                  onDelete={() => deleteObjective.mutate(obj.id)}
                  mode="drawer"
                />
              );
            })}
          </SortableContext>
        </DndContext>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input value={newObjTitle} onChange={e => setNewObjTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addObjective.mutate()}
            placeholder="Add objective..."
            style={{ flex: 1, padding: '4px 8px', fontSize: 10, background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }} />
          <button onClick={() => addObjective.mutate()} disabled={!newObjTitle.trim()}
            style={{ padding: '4px 10px', fontSize: 9, border: `1px solid ${newObjTitle.trim() ? acc : adim}`, background: 'transparent', color: newObjTitle.trim() ? acc : dim, fontFamily: mono, cursor: 'pointer' }}>+ ADD</button>
        </div>

        {(project.linked_tool_ids ?? []).length > 0 && (<><SectionLabel label="TOOLS" /><LinkedRefs ids={project.linked_tool_ids} tableName="tools" nameField="name" subField="type" color={acc} /></>)}
        {(project.linked_augment_ids ?? []).length > 0 && (<><SectionLabel label="AUGMENTS" /><LinkedRefs ids={project.linked_augment_ids} tableName="augments" nameField="name" subField="category" color="#00cfff" /></>)}
        {(project.linked_media_ids ?? []).length > 0 && (<><SectionLabel label="MEDIA" /><LinkedRefs ids={project.linked_media_ids} tableName="media" nameField="title" subField="type" color="#cc88ff" /></>)}
        {(project.linked_course_ids ?? []).length > 0 && (<><SectionLabel label="COURSES" /><LinkedRefs ids={project.linked_course_ids} tableName="courses" nameField="name" subField="status" color="#44ffaa" /></>)}

        <SectionLabel label="RECENT ACTIVITY" />
        {sessions.length === 0
          ? <div style={{ fontSize: 10, color: dim, opacity: 0.5 }}>No sessions tagged to this project yet.</div>
          : sessions.map(s => (
            <div key={s.id} style={{ display: 'flex', gap: 10, fontSize: 10, marginBottom: 5, alignItems: 'center' }}>
              <span style={{ color: adim }}>›</span>
              <span style={{ color: dim, flexShrink: 0, width: 80 }}>{new Date(s.logged_at).toLocaleDateString('en-CA').replace(/-/g, '.')}</span>
              <span style={{ color: acc, flex: 1 }}>{s.skill_name}</span>
              <span style={{ color: dim, flexShrink: 0 }}>{s.duration_minutes}m</span>
            </div>
          ))
        }

        {project.notes && (<><SectionLabel label="NOTES" /><div style={{ fontSize: 10, color: dim, lineHeight: 1.6 }}>{project.notes}</div></>)}

        {editing && (
          <><SectionLabel label="EDIT PROJECT" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: bgS, border: `1px solid ${adim}`, padding: 12 }}>
            {(['NAME', 'URL', 'DESCRIPTION', 'NOTES'] as const).map((label) => {
              const val = label === 'NAME' ? editName : label === 'URL' ? editUrl : label === 'DESCRIPTION' ? editDesc : editNotes;
              const setter = label === 'NAME' ? setEditName : label === 'URL' ? setEditUrl : label === 'DESCRIPTION' ? setEditDesc : setEditNotes;
              return (
                <div key={label}>
                  <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 3 }}>{label}</div>
                  <input value={val} onChange={e => setter(e.target.value)}
                    style={{ width: '100%', padding: '5px 8px', fontSize: 10, background: bgT, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
              );
            })}
            <div>
              <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 4 }}>TYPE</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {PROJECT_TYPES.map(t => <button key={t} onClick={() => setEditType(t)} style={{ padding: '2px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${editType === t ? acc : adim}`, background: editType === t ? 'rgba(255,176,0,0.1)' : 'transparent', color: editType === t ? acc : dim }}>{t}</button>)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 4 }}>STATUS</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {PROJECT_STATUSES.map(s => <button key={s} onClick={() => setEditStatus(s)} style={{ padding: '2px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${editStatus === s ? acc : adim}`, background: editStatus === s ? 'rgba(255,176,0,0.1)' : 'transparent', color: editStatus === s ? acc : dim }}>{s}</button>)}
              </div>
            </div>
            <LinkedIdsInput label="TOOLS" tableName="tools" nameField="name" subField="type" selectedIds={editToolIds} onChange={setEditToolIds} />
            <LinkedIdsInput label="AUGMENTS" tableName="augments" nameField="name" subField="category" selectedIds={editAugIds} onChange={setEditAugIds} />
            <LinkedIdsInput label="MEDIA" tableName="media" nameField="title" subField="type" selectedIds={editMediaIds} onChange={setEditMediaIds} />
            <LinkedIdsInput label="COURSES" tableName="courses" nameField="name" subField="status" selectedIds={editCourseIds} onChange={setEditCourseIds} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending} style={{ flex: 1, padding: '6px', fontSize: 9, border: `1px solid ${acc}`, background: 'transparent', color: acc, fontFamily: mono, cursor: 'pointer' }}>{saveEdit.isPending ? 'SAVING...' : '✓ SAVE'}</button>
              <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '6px', fontSize: 9, border: `1px solid ${adim}`, background: 'transparent', color: dim, fontFamily: mono, cursor: 'pointer' }}>CANCEL</button>
            </div>
          </div></>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 20px', flexShrink: 0, borderTop: `1px solid rgba(153,104,0,0.3)` }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: showDelete ? 8 : 0 }}>
          <button onClick={editing ? () => setEditing(false) : startEdit}
            style={{ flex: 1, height: 30, border: `1px solid ${adim}`, background: 'transparent', color: editing ? acc : adim, fontFamily: mono, fontSize: 9, cursor: 'pointer', letterSpacing: 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = acc; e.currentTarget.style.color = acc; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = adim; e.currentTarget.style.color = editing ? acc : adim; }}>
            {editing ? '[ CANCEL EDIT ]' : '[ EDIT ]'}
          </button>
          <button onClick={() => setShowDelete(v => !v)}
            style={{ flex: 1, height: 30, border: '1px solid rgba(153,104,0,0.4)', background: 'transparent', color: dim, fontFamily: mono, fontSize: 9, cursor: 'pointer', letterSpacing: 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4400'; e.currentTarget.style.color = '#ff4400'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)'; e.currentTarget.style.color = dim; }}>
            [ DELETE ]
          </button>
        </div>
        {showDelete && (
          <div style={{ border: '1px solid #ff3300', padding: '10px 12px', background: 'rgba(255,51,0,0.06)' }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: '#ff4400', marginBottom: 8 }}>DELETE PROJECT? This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => deleteProject.mutate()} style={{ flex: 1, height: 28, background: 'transparent', border: '1px solid #ff4400', color: '#ff4400', fontFamily: mono, fontSize: 9, cursor: 'pointer' }}>[ CONFIRM ]</button>
              <button onClick={() => setShowDelete(false)} style={{ flex: 1, height: 28, background: 'transparent', border: `1px solid ${adim}`, color: dim, fontFamily: mono, fontSize: 9, cursor: 'pointer' }}>[ CANCEL ]</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
