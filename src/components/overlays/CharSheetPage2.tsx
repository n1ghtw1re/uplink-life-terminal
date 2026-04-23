// ============================================================
// src/components/overlays/CharSheetPage2.tsx
// RECORDS (Career & Education)
// ============================================================
import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { useRecords } from '@/hooks/useRecords';
import type { BackgroundRecord } from '@/types';

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const dim  = 'hsl(var(--text-dim))';
const adim = 'hsl(var(--accent-dim))';
const bgS  = 'hsl(var(--bg-secondary))';
const bgT  = 'hsl(var(--bg-tertiary))';

type SortType = 'date' | 'alpha' | 'drag';

export default function CharSheetPage2() {
  const queryClient = useQueryClient();
  const { data: records = [], isLoading } = useRecords();

  const [search, setSearch] = useState('');
  const [sort, setSort]     = useState<SortType>('drag');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddCareer, setShowAddCareer] = useState(false);
  const [showAddEdu, setShowAddEdu] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [localSort, setLocalSort] = useState<'date' | 'alpha' | 'drag'>('drag');

  const updateSortOrder = useMutation({
    mutationFn: async (updates: { id: string; sortOrder: number }[]) => {
      const db = await getDB();
      for (const { id, sortOrder } of updates) {
        await db.query(`UPDATE background_records SET sort_order = $1 WHERE id = $2;`, [sortOrder, id]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['background_records'] });
    }
  });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string, type: 'CAREER' | 'EDUCATION') => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const list = type === 'CAREER' ? careerList : eduList;
    const draggingIndex = list.findIndex(r => r.id === draggingId);
    const targetIndex = list.findIndex(r => r.id === targetId);

    if (draggingIndex === -1 || targetIndex === -1) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const newList = [...list];
    const [removed] = newList.splice(draggingIndex, 1);
    newList.splice(targetIndex, 0, removed);

    const updates = newList.map((r, index) => ({ id: r.id, sortOrder: index }));
    updateSortOrder.mutate(updates);

    setDraggingId(null);
    setDragOverId(null);
    setLocalSort('drag');
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  // Sorting and filtering
  const filterAndSort = (items: BackgroundRecord[]) => {
    let res = items.filter(item => 
      !search.trim() || 
      item.title.toLowerCase().includes(search.toLowerCase()) || 
      item.organization.toLowerCase().includes(search.toLowerCase())
    );
    if (sort === 'alpha') {
      res = [...res].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'date') {
      res = [...res].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return res;
  };

  const careerList = useMemo(() => filterAndSort(records.filter(r => r.type === 'CAREER')), [records, search, sort]);
  const eduList    = useMemo(() => filterAndSort(records.filter(r => r.type === 'EDUCATION')), [records, search, sort]);

  const saveRecord = useMutation({
    mutationFn: async (payload: Omit<BackgroundRecord, 'id' | 'createdAt'> & { id?: string }) => {
      const db = await getDB();
      if (payload.id) {
        await db.query(
          `UPDATE background_records SET title = $1, organization = $2, date_str = $3, description = $4 WHERE id = $5;`,
          [payload.title, payload.organization, payload.dateStr, payload.description, payload.id]
        );
      } else {
        await db.query(
          `INSERT INTO background_records (type, title, organization, date_str, description) VALUES ($1, $2, $3, $4, $5);`,
          [payload.type, payload.title, payload.organization, payload.dateStr, payload.description]
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['background_records'] });
      setEditingId(null);
      setShowAddCareer(false);
      setShowAddEdu(false);
    }
  });

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const db = await getDB();
      await db.query(`DELETE FROM background_records WHERE id = $1;`, [id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['background_records'] });
    }
  });

  // Inner Form Component
  const RecordForm = ({ 
    initialData, 
    type, 
    onCancel 
  }: { 
    initialData?: BackgroundRecord, 
    type: 'CAREER' | 'EDUCATION', 
    onCancel: () => void 
  }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [org, setOrg] = useState(initialData?.organization || '');
    const [dateStr, setDateStr] = useState(initialData?.dateStr || '');
    const [desc, setDesc] = useState(initialData?.description || '');

    const handleSave = () => {
      if (!title.trim() || !org.trim() || !dateStr.trim()) return;
      saveRecord.mutate({
        id: initialData?.id,
        type,
        title: title.trim(),
        organization: org.trim(),
        dateStr: dateStr.trim(),
        description: desc.trim()
      });
    };

    return (
      <div style={{ padding: 16, background: bgT, border: `1px solid ${adim}`, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: acc, letterSpacing: 2 }}>
          // {initialData ? `EDIT ` : `NEW `} {type} RECORD
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 4 }}>
              {type === 'CAREER' ? 'TITLE / ROLE' : 'DEGREE / COURSE'}
            </div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={type === 'CAREER' ? "e.g. Senior Developer" : "e.g. B.S. Computer Science"} style={{ width: '100%', padding: '6px 10px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 4 }}>
              {type === 'CAREER' ? 'ORGANIZATION' : 'SCHOOL / INST.'}
            </div>
            <input value={org} onChange={e => setOrg(e.target.value)} placeholder="e.g. Uplink Global" style={{ width: '100%', padding: '6px 10px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 4 }}>DATES (e.g. 2020 - 2024 or 2024 - Present)</div>
          <input value={dateStr} onChange={e => setDateStr(e.target.value)} placeholder="Ex: 2022 - Present" style={{ width: '100%', padding: '6px 10px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }} />
        </div>
        <div>
          <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 4 }}>DESCRIPTION</div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe your responsibilities or achievements..." style={{ width: '100%', padding: '6px 10px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none', height: 60, resize: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onCancel} style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${adim}`, color: dim, fontFamily: mono, fontSize: 9, cursor: 'pointer' }}>CANCEL</button>
          <button onClick={handleSave} disabled={saveRecord.isPending} style={{ padding: '6px 16px', background: 'rgba(255,176,0,0.1)', border: `1px solid ${acc}`, color: acc, fontFamily: mono, fontSize: 9, cursor: 'pointer', letterSpacing: 1, opacity: saveRecord.isPending ? 0.5 : 1 }}>SAVE RECORD</button>
        </div>
      </div>
    );
  };

  const renderCard = (item: BackgroundRecord, type: 'CAREER' | 'EDUCATION') => {
    const isDragging = draggingId === item.id;
    const isDragOver = dragOverId === item.id;
    
    return (
    <div key={item.id} 
      draggable={sort === 'drag'}
      onDragStart={(e) => handleDragStart(e, item.id)}
      onDragOver={(e) => handleDragOver(e, item.id)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, item.id, type)}
      onDragEnd={handleDragEnd}
      style={{ 
        padding: '12px 16px', 
        background: isDragging ? 'rgba(255,176,0,0.1)' : isDragOver ? 'rgba(255,176,0,0.2)' : bgS, 
        border: isDragOver ? `2px solid ${acc}` : `1px solid rgba(153,104,0,0.3)`, 
        marginBottom: 10, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 6,
        position: 'relative', 
        overflow: 'hidden',
        cursor: sort === 'drag' ? 'grab' : 'default',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          {sort === 'drag' && (
            <div style={{ color: adim, fontSize: 14, marginTop: 2, cursor: 'grab' }}>⋮⋮</div>
          )}
          <div>
            <div style={{ fontFamily: vt, fontSize: 18, color: acc, letterSpacing: 1 }}>{item.title}</div>
            <div style={{ fontFamily: mono, fontSize: 10, color: adim, marginTop: -2 }}>
              <span style={{ color: dim }}>{item.organization}</span> <span style={{ opacity: 0.5 }}>//</span> {item.dateStr}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, opacity: 0.8 }} className="record-actions">
          <button onClick={() => setEditingId(item.id)} style={{ background: 'transparent', border: `1px solid ${adim}`, color: adim, fontFamily: mono, fontSize: 9, padding: '2px 6px', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.color = acc; e.currentTarget.style.borderColor = acc; }} onMouseLeave={e => { e.currentTarget.style.color = adim; e.currentTarget.style.borderColor = adim; }}>[ EDIT ]</button>
          <button onClick={() => { if (confirm('Delete this record?')) deleteRecord.mutate(item.id); }} style={{ background: 'transparent', border: `1px solid rgba(153,104,0,0.3)`, color: dim, fontFamily: mono, fontSize: 9, padding: '2px 6px', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.color = '#ff4400'; e.currentTarget.style.borderColor = '#ff4400'; }} onMouseLeave={e => { e.currentTarget.style.color = dim; e.currentTarget.style.borderColor = 'rgba(153,104,0,0.3)'; }}>[ DEL ]</button>
        </div>
      </div>
      {item.description && (
        <div style={{ fontFamily: mono, fontSize: 10, color: dim, lineHeight: 1.5, marginTop: 4, whiteSpace: 'pre-wrap' }}>
          {item.description}
        </div>
      )}
    </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>
      
      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${adim}` }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: adim, letterSpacing: 2 }}>// ARCHIVE FILTER</span>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: adim }}>⌕</span>
            <input 
              value={search} onChange={e => setSearch(e.target.value)} 
              placeholder="Search records..."
              style={{ padding: '4px 10px 4px 24px', fontSize: 10, width: 220, background: bgT, border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none' }}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: adim, letterSpacing: 2, marginRight: 4 }}>SORT:</span>
          <button onClick={() => setSort('drag')} style={{
            padding: '3px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
            border: `1px solid ${sort === 'drag' ? acc : adim}`,
            background: sort === 'drag' ? 'rgba(255,176,0,0.1)' : 'transparent',
            color: sort === 'drag' ? acc : dim,
          }}>DRAG</button>
          <button onClick={() => setSort('date')} style={{
            padding: '3px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
            border: `1px solid ${sort === 'date' ? acc : adim}`,
            background: sort === 'date' ? 'rgba(255,176,0,0.1)' : 'transparent',
            color: sort === 'date' ? acc : dim,
          }}>DATE</button>
          <button onClick={() => setSort('alpha')} style={{
            padding: '3px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
            border: `1px solid ${sort === 'alpha' ? acc : adim}`,
            background: sort === 'alpha' ? 'rgba(255,176,0,0.1)' : 'transparent',
            color: sort === 'alpha' ? acc : dim,
          }}>ALPHA</button>
        </div>
      </div>

      {/* Columns */}
      <div style={{ display: 'flex', flex: 1, gap: 24, minHeight: 0 }}>
        
        {/* Left Column: Career */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontFamily: vt, fontSize: 24, color: acc, letterSpacing: 2 }}>CAREER EXPERIENCE</span>
            <button onClick={() => { setShowAddCareer(true); setEditingId(null); }} style={{ background: 'transparent', border: 'none', color: acc, fontFamily: mono, fontSize: 10, cursor: 'pointer', letterSpacing: 1 }}>+ ADD RECORD</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8, scrollbarWidth: 'none' }}>
            {showAddCareer && <RecordForm type="CAREER" onCancel={() => setShowAddCareer(false)} />}
            
            {isLoading ? (
              <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
            ) : careerList.length === 0 && !showAddCareer ? (
              <div style={{ color: dim, fontSize: 10, marginTop: 20 }}>No career records found.</div>
            ) : careerList.map(item => (
               editingId === item.id 
                 ? <RecordForm key={item.id} type="CAREER" initialData={item} onCancel={() => setEditingId(null)} />
                 : renderCard(item, 'CAREER')
            ))}
          </div>
        </div>

        {/* Vertical Divider */}
        <div style={{ width: 1, background: `linear-gradient(to bottom, transparent, rgba(153,104,0,0.3) 10%, rgba(153,104,0,0.3) 90%, transparent)` }} />

        {/* Right Column: Education */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontFamily: vt, fontSize: 24, color: acc, letterSpacing: 2 }}>EDUCATION & TRAINING</span>
            <button onClick={() => { setShowAddEdu(true); setEditingId(null); }} style={{ background: 'transparent', border: 'none', color: acc, fontFamily: mono, fontSize: 10, cursor: 'pointer', letterSpacing: 1 }}>+ ADD RECORD</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8, scrollbarWidth: 'none' }}>
            {showAddEdu && <RecordForm type="EDUCATION" onCancel={() => setShowAddEdu(false)} />}
            
            {isLoading ? (
              <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
            ) : eduList.length === 0 && !showAddEdu ? (
              <div style={{ color: dim, fontSize: 10, marginTop: 20 }}>No education records found.</div>
            ) : eduList.map(item => (
               editingId === item.id 
                 ? <RecordForm key={item.id} type="EDUCATION" initialData={item} onCancel={() => setEditingId(null)} />
                 : renderCard(item, 'EDUCATION')
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
