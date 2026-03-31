// src/components/modals/AddResourceModal.tsx
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

const mono  = "'IBM Plex Mono', monospace";
const acc   = 'hsl(var(--accent))';
const adim  = 'hsl(var(--accent-dim))';
const dim   = 'hsl(var(--text-dim))';
const bright= 'hsl(var(--accent-bright))';
const bgS   = 'hsl(var(--bg-secondary))';

const CATEGORIES = [
  'Learning', 'Reference', 'Utilities', 'Inspiration', 
  'Media', 'Community', 'Assets', 'Business', 
  'Health', 'Productivity', 'Personal', 'Entertainment', 'Misc'
];

interface Props { onClose: () => void; }

export default function AddResourceModal({ onClose }: Props) {
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const [name, setName]               = useState('');
  const [category, setCategory]       = useState('Learning');
  const [url, setUrl]                 = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [nameError, setNameError]     = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setNameError('Name required'); return; }
    setSaving(true);
    try {
      const db = await getDB();

      // Duplicate check (optional but good practice)
      const existing = await db.query(`SELECT id FROM resources WHERE LOWER(title) = LOWER($1) LIMIT 1;`, [name.trim()]);
      if (existing.rows.length > 0) {
        setNameError(`"${name.trim()}" already exists`);
        setSaving(false);
        return;
      }

      const id  = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.query(
        `INSERT INTO resources (id, title, category, url, description, notes, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'UNREAD', $7);`,
        [id, name.trim(), category, url.trim() || null, description.trim() || null, notes.trim() || null, now]
      );

      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast({ title: '✓ RESOURCE ADDED', description: name.trim() });
      onClose();
    } catch (err) {
      toast({ title: 'ERROR', description: String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 14, fontSize: 11, fontFamily: mono }}>

      {/* Name */}
      <div>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>RESOURCE NAME <span style={{ color: acc }}>*</span></div>
        <input autoFocus value={name} onChange={e => { setName(e.target.value); setNameError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="e.g. React Docs, Cyberpunk Aesthetic Reference..."
          style={{ width: '100%', padding: '8px 12px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${nameError ? 'hsl(0,80%,55%)' : adim}`, color: acc, fontFamily: mono, outline: 'none' }}
        />
        {nameError && <div style={{ fontSize: 9, color: 'hsl(0,80%,55%)', marginTop: 4 }}>{nameError}</div>}
      </div>

      {/* Category / Type */}
      <div>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>TYPE</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} className="topbar-btn" style={{
              border: `1px solid ${category === c ? acc : adim}`,
              color: category === c ? bright : dim,
              boxShadow: category === c ? '0 0 6px rgba(255,176,0,0.3)' : 'none',
              padding: '4px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer', background: 'transparent'
            }}>{c.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* URL */}
      <div>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>URL <span style={{ color: dim, opacity: 0.6 }}>(optional)</span></div>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
          style={{ width: '100%', padding: '8px 12px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }}
        />
      </div>

      {/* Description */}
      <div>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>DESCRIPTION <span style={{ color: dim, opacity: 0.6 }}>(optional)</span></div>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..."
          style={{ width: '100%', padding: '8px 12px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }}
        />
      </div>

      {/* Notes */}
      <div>
        <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>NOTES <span style={{ color: dim, opacity: 0.6 }}>(optional)</span></div>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Personal notes..."
          style={{ width: '100%', padding: '8px 12px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }}
        />
      </div>

      {/* Buttons */}
      <div style={{ borderTop: `1px solid ${adim}`, paddingTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '6px 16px', fontFamily: mono, fontSize: 10, letterSpacing: 1, cursor: 'pointer', background: 'transparent', border: `1px solid ${adim}`, color: dim }}>CANCEL</button>
        <button onClick={handleSubmit} disabled={!name.trim() || saving} style={{
          padding: '6px 16px', fontFamily: mono, fontSize: 10, letterSpacing: 1,
          cursor: name.trim() ? 'pointer' : 'not-allowed', background: 'transparent',
          border: `1px solid ${name.trim() ? acc : adim}`,
          color: name.trim() ? acc : dim, opacity: !name.trim() ? 0.5 : 1,
        }}>{saving ? '>> SAVING...' : '>> ADD RESOURCE'}</button>
      </div>
    </div>
  );
}
