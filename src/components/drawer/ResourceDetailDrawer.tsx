// ============================================================
// src/components/drawer/ResourceDetailDrawer.tsx
// ============================================================
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { ResourceOption } from '@/hooks/useResources';

const mono  = "'IBM Plex Mono', monospace";
const vt    = "'VT323', monospace";
const acc   = 'hsl(var(--accent))';
const adim  = 'hsl(var(--accent-dim))';
const dim   = 'hsl(var(--text-dim))';
const bgS   = 'hsl(var(--bg-secondary))';
const bgT   = 'hsl(var(--bg-tertiary))';
const green = '#44ff88';

const CATEGORIES = [
  'Learning', 'Reference', 'Utilities', 'Inspiration', 
  'Media', 'Community', 'Assets', 'Business', 
  'Health', 'Productivity', 'Personal', 'Entertainment', 'Misc'
];

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 8px' }}>
      {label}<div style={{ flex: 1, height: 1, background: 'rgba(153,104,0,0.3)' }} />
    </div>
  );
}

// Support both embedded (in ResourcesPage) or standalone (in DetailDrawer)
interface Props { resourceId: string; onClose?: () => void; isPageEmbedded?: boolean; }

export default function ResourceDetailDrawer({ resourceId, onClose, isPageEmbedded }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing]     = useState(false);
  const [editName, setEditName]   = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUrl, setEditUrl]     = useState('');
  const [editDesc, setEditDesc]   = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    setEditing(false);
    setShowDelete(false);
  }, [resourceId]);

  const { data: resource, isLoading } = useQuery({
    queryKey: ['resource', resourceId],
    enabled: !!resourceId,
    queryFn: async () => {
      const db  = await getDB();
      const res = await db.query<ResourceOption>(`SELECT id, title, url, category, status, description, notes, created_at as "createdAt" FROM resources WHERE id = $1 LIMIT 1;`, [resourceId]);
      return res.rows[0] ?? null;
    },
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      await db.exec(`UPDATE resources SET
        title = '${editName.trim().replace(/'/g,"''")}',
        category = '${editCategory}',
        url = ${editUrl.trim() ? `'${editUrl.trim().replace(/'/g,"''")}'` : 'NULL'},
        description = ${editDesc.trim() ? `'${editDesc.trim().replace(/'/g,"''")}'` : 'NULL'},
        notes = ${editNotes.trim() ? `'${editNotes.trim().replace(/'/g,"''")}'` : 'NULL'}
        WHERE id = '${resourceId}';`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setEditing(false);
      toast({ title: '✓ RESOURCE UPDATED' });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const db = await getDB();
      await db.exec(`UPDATE resources SET status = '${newStatus}' WHERE id = '${resourceId}';`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const deleteResource = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      await db.exec(`DELETE FROM resources WHERE id = '${resourceId}';`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      onClose?.();
    },
  });

  const startEdit = () => {
    if (!resource) return;
    setEditName(resource.title); setEditCategory(resource.category);
    setEditUrl(resource.url ?? ''); setEditDesc(resource.description ?? ''); setEditNotes(resource.notes ?? '');
    setEditing(true);
  };

  if (isLoading) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>LOADING...</div>;
  if (!resource) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>RESOURCE NOT FOUND</div>;

  const isRead = resource.status === 'READ';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>

      {/* Header */}
      <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${adim}`, flexShrink: 0 }}>
        {!isPageEmbedded && <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>// RESOURCE</div>}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <div style={{ fontFamily: vt, fontSize: 24, color: isRead ? dim : acc, flex: 1, lineHeight: 1.1 }}>
            {resource.title.toUpperCase()}
          </div>
          <button onClick={() => toggleStatus.mutate(isRead ? 'UNREAD' : 'READ')} style={{
            padding: '2px 10px', fontSize: 9, letterSpacing: 1, flexShrink: 0,
            border: `1px solid ${isRead ? adim : acc}`,
            background: isRead ? 'transparent' : 'rgba(255,176,0,0.1)',
            color: isRead ? adim : acc, fontFamily: mono, cursor: 'pointer',
          }}>{isRead ? '● READ' : '○ UNREAD'}</button>
          {isPageEmbedded && onClose && (
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: dim, cursor: 'pointer', fontSize: 14 }}>×</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 9, color: adim, border: `1px solid ${adim}`, padding: '1px 6px', letterSpacing: 1 }}>
            {resource.category.toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: 9, color: adim }}>
          ADDED {new Date(resource.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>

        {editing ? (
          <>
            <SectionLabel label="EDIT RESOURCE" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: bgS, border: `1px solid ${adim}`, padding: 14 }}>
              {[['NAME', editName, setEditName], ['URL', editUrl, setEditUrl], ['DESCRIPTION', editDesc, setEditDesc], ['NOTES', editNotes, setEditNotes]].map(([label, val, setter]) => (
                <div key={label as string}>
                  <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 4 }}>{label as string}</div>
                  <input value={val as string} onChange={e => (setter as any)(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: 11, boxSizing: 'border-box', background: bgT, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 6 }}>CATEGORY</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setEditCategory(c)} style={{
                      padding: '3px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer',
                      border: `1px solid ${editCategory === c ? acc : adim}`,
                      background: editCategory === c ? 'rgba(255,176,0,0.1)' : 'transparent',
                      color: editCategory === c ? acc : dim,
                    }}>{c}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending} style={{ flex: 1, padding: '6px', fontSize: 9, border: `1px solid ${acc}`, background: 'transparent', color: acc, fontFamily: mono, cursor: 'pointer' }}>
                  {saveEdit.isPending ? 'SAVING...' : '✓ SAVE'}
                </button>
                <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '6px', fontSize: 9, border: `1px solid ${adim}`, background: 'transparent', color: dim, fontFamily: mono, cursor: 'pointer' }}>CANCEL</button>
              </div>
            </div>
          </>
        ) : (
          <>
            {resource.url && (<><SectionLabel label="LINK" /><a href={resource.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: acc, wordBreak: 'break-all' }}>{resource.url}</a></>)}
            {resource.description && (<><SectionLabel label="DESCRIPTION" /><div style={{ fontSize: 10, color: dim, lineHeight: 1.6 }}>{resource.description}</div></>)}
            {resource.notes && (<><SectionLabel label="NOTES" /><div style={{ fontSize: 10, color: dim, lineHeight: 1.6 }}>{resource.notes}</div></>)}
          </>
        )}

        <div style={{ height: 1, background: 'rgba(153,104,0,0.3)', margin: '20px 0 16px' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={startEdit} style={{ flex: 1, height: 32, border: `1px solid ${adim}`, background: 'transparent', color: adim, fontFamily: mono, fontSize: 10, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = acc; e.currentTarget.style.color = acc; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = adim; e.currentTarget.style.color = adim; }}
          >[ EDIT ]</button>
          
          <button onClick={() => toggleStatus.mutate(isRead ? 'UNREAD' : 'READ')} style={{ flex: 1, height: 32, border: `1px solid ${isRead ? 'rgba(255,60,60,0.4)' : green}`, background: 'transparent', color: isRead ? 'hsl(0,80%,55%)' : green, fontFamily: mono, fontSize: 10, cursor: 'pointer' }}>
            {isRead ? '[ MARK UNREAD ]' : '[ MARK READ ]'}
          </button>
          
          <button onClick={() => setShowDelete(v => !v)} style={{ flex: 1, height: 32, border: '1px solid rgba(153,104,0,0.4)', background: 'transparent', color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4400'; e.currentTarget.style.color = '#ff4400'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)'; e.currentTarget.style.color = dim; }}
          >[ DELETE ]</button>
        </div>
        {showDelete && (
          <div style={{ border: '1px solid #ff3300', padding: '10px 12px', background: 'rgba(255,51,0,0.06)', marginTop: 8 }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: '#ff4400', marginBottom: 8 }}>DELETE RESOURCE? This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => deleteResource.mutate()} style={{ flex: 1, height: 30, background: 'transparent', border: '1px solid #ff4400', color: '#ff4400', fontFamily: mono, fontSize: 10, cursor: 'pointer' }}>[ CONFIRM ]</button>
              <button onClick={() => setShowDelete(false)} style={{ flex: 1, height: 30, background: 'transparent', border: `1px solid ${adim}`, color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer' }}>[ CANCEL ]</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
