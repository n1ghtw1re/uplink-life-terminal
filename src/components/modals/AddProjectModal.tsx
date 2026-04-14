// src/components/modals/AddProjectModal.tsx
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getDB } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { SortableObjectiveInput } from '@/components/ui/SortableObjective';

const mono = "'IBM Plex Mono', monospace";
const acc  = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim  = 'hsl(var(--text-dim))';
const bgS  = 'hsl(var(--bg-secondary))';

const PROJECT_TYPES = ['software','creative','business','research','physical','educational','other'];
const PROJECT_STATUSES = ['ACTIVE','PAUSED','COMPLETE','ARCHIVED'];

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
              {item.name.toUpperCase()} <span style={{ opacity: 0.5 }}>×</span>
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

interface Props { onClose: () => void; }

interface ObjectiveItem { id: string; value: string; }

export default function AddProjectModal({ onClose }: Props) {
  const queryClient               = useQueryClient();
  const [name, setName]           = useState('');
  const [type, setType]           = useState('software');
  const [status, setStatus]       = useState('ACTIVE');
  const [url, setUrl]             = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes]         = useState('');
  const [objectives, setObjectives] = useState<ObjectiveItem[]>([{ id: crypto.randomUUID(), value: '' }]);
  const [toolIds, setToolIds]     = useState<string[]>([]);
  const [augIds, setAugIds]       = useState<string[]>([]);
  const [mediaIds, setMediaIds]   = useState<string[]>([]);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addObjective    = () => setObjectives(p => [...p, { id: crypto.randomUUID(), value: '' }]);
  const updateObjective = (id: string, v: string) => setObjectives(p => p.map(o => o.id === id ? { ...o, value: v } : o));
  const removeObjective = (id: string) => setObjectives(p => p.filter(o => o.id !== id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setObjectives(items => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const db  = await getDB();
      const id  = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.query(
        `INSERT INTO projects (id,name,type,status,url,description,notes,
           linked_tool_ids,linked_augment_ids,linked_media_ids,linked_course_ids,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [id, name.trim(), type, status,
         url.trim() || null, description.trim() || null, notes.trim() || null,
         JSON.stringify(toolIds), JSON.stringify(augIds),
         JSON.stringify(mediaIds), JSON.stringify(courseIds), now]
      );
       const validObjs = objectives.map((o, i) => ({ title: o.value.trim(), sort_order: i })).filter(o => o.title.length > 0);
      for (const obj of validObjs) {
        await db.query(
          `INSERT INTO project_milestones (id,project_id,title,sort_order) VALUES ($1,$2,$3,$4)`,
          [crypto.randomUUID(), id, obj.title, obj.sort_order]
        );
      }
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['terminal-projects-list'] });
      toast({ title: '✓ PROJECT ADDED', description: name.trim() });
      onClose();
    } catch (err) {
      toast({ title: 'ERROR', description: String(err) });
    } finally {
      setSaving(false);
    }
  };

  const fieldLabel = (label: string, optional = false) => (
    <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 5 }}>
      {label}{optional && <span style={{ opacity: 0.5 }}> (optional)</span>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 11, fontFamily: mono,
      maxHeight: '78vh', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}`, paddingRight: 4 }}>

      {/* Name */}
      <div>{fieldLabel('PROJECT NAME')}
        <input className="crt-input" style={{ width: '100%' }} placeholder="Project name..."
          value={name} onChange={e => setName(e.target.value)} autoFocus maxLength={100} />
      </div>

      {/* Type */}
      <div>{fieldLabel('TYPE')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {PROJECT_TYPES.map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              padding: '3px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer',
              border: `1px solid ${type === t ? acc : adim}`,
              background: type === t ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: type === t ? acc : dim,
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>{fieldLabel('STATUS')}
        <div style={{ display: 'flex', gap: 4 }}>
          {PROJECT_STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{
              padding: '3px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer',
              border: `1px solid ${status === s ? acc : adim}`,
              background: status === s ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: status === s ? acc : dim,
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* URL + Description */}
      <div>{fieldLabel('URL', true)}
        <input className="crt-input" style={{ width: '100%' }} placeholder="https://..."
          value={url} onChange={e => setUrl(e.target.value)} maxLength={300} />
      </div>
      <div>{fieldLabel('DESCRIPTION', true)}
        <input className="crt-input" style={{ width: '100%' }} placeholder="What is this project?"
          value={description} onChange={e => setDescription(e.target.value)} maxLength={200} />
      </div>

      {/* Objectives */}
      <div>{fieldLabel('OBJECTIVES', true)}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={objectives.map(o => o.id)} strategy={verticalListSortingStrategy}>
            {objectives.map((obj, i) => (
              <SortableObjectiveInput
                key={obj.id}
                id={obj.id}
                value={obj.value}
                index={i}
                onChange={(v) => updateObjective(obj.id, v)}
                onDelete={() => removeObjective(obj.id)}
                canDelete={objectives.length > 1}
              />
            ))}
          </SortableContext>
        </DndContext>
        <button onClick={addObjective} style={{ background: 'transparent', border: 'none', color: adim, fontFamily: mono, fontSize: 9, cursor: 'pointer', padding: 0, letterSpacing: 1, marginTop: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = acc}
          onMouseLeave={e => e.currentTarget.style.color = adim}>+ ADD OBJECTIVE</button>
      </div>

      {/* Linked refs */}
      <LinkedIdsInput label="LINKED TOOLS" tableName="tools" nameField="name" subField="type" selectedIds={toolIds} onChange={setToolIds} />
      <LinkedIdsInput label="LINKED AUGMENTS" tableName="augments" nameField="name" subField="category" selectedIds={augIds} onChange={setAugIds} />
      <LinkedIdsInput label="LINKED MEDIA" tableName="media" nameField="title" subField="type" selectedIds={mediaIds} onChange={setMediaIds} />
      <LinkedIdsInput label="LINKED COURSES" tableName="courses" nameField="name" subField="status" selectedIds={courseIds} onChange={setCourseIds} />

      {/* Notes */}
      <div>{fieldLabel('NOTES', true)}
        <input className="crt-input" style={{ width: '100%' }} placeholder="Additional notes..."
          value={notes} onChange={e => setNotes(e.target.value)} maxLength={300} />
      </div>

      {/* Submit */}
      <div style={{ borderTop: `1px solid ${adim}`, paddingTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '6px 16px', fontFamily: mono, fontSize: 10, letterSpacing: 1, cursor: 'pointer', background: 'transparent', border: `1px solid ${adim}`, color: dim }}>CANCEL</button>
        <button disabled={!name.trim() || saving} onClick={handleSubmit} style={{
          padding: '6px 16px', fontFamily: mono, fontSize: 10, letterSpacing: 1,
          cursor: name.trim() ? 'pointer' : 'not-allowed', background: 'transparent',
          border: `1px solid ${name.trim() ? acc : adim}`, color: name.trim() ? acc : dim, opacity: name.trim() ? 1 : 0.5,
        }}>{saving ? '>> SAVING...' : '>> ADD PROJECT'}</button>
      </div>
    </div>
  );
}