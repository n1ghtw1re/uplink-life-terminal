// src/components/modals/AddAugmentModal.tsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { toast } from '@/hooks/use-toast';

const CLUSTERS = [
  'Architecture & Code',
  'Core Intelligence',
  'Data & Strategy',
  'Identity & Safety',
  'Linguistic & Narrative',
  'Sonic & Acoustic',
  'Visual & Cinematic',
  'Workflow & Context',
];

const mono = "'IBM Plex Mono', monospace";
const acc  = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim  = 'hsl(var(--text-dim))';
const bgS  = 'hsl(var(--bg-secondary))';

interface Props { onClose: () => void; }

export default function AddAugmentModal({ onClose }: Props) {
  const queryClient = useQueryClient();
  const [name, setName]           = useState('');
  const [category, setCategory]   = useState('Core Intelligence');
  const [url, setUrl]             = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const db = await getDB();
      // Duplicate check
      const existing = await db.query(
        `SELECT id FROM augments WHERE LOWER(name) = LOWER($1) LIMIT 1;`, [name.trim()]
      );
      if (existing.rows.length > 0) {
        toast({ title: 'DUPLICATE', description: `"${name.trim()}" already exists.` });
        setSaving(false);
        return;
      }
      const id  = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.query(
        `INSERT INTO augments (id, name, category, url, description, notes, xp, level, active, is_custom, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,0,1,true,true,$7);`,
        [id, name.trim(), category,
         url.trim() || null, description.trim() || null, notes.trim() || null, now]
      );
      queryClient.invalidateQueries({ queryKey: ['augments'] });
      toast({ title: '✓ AUGMENT ADDED', description: name.trim() });
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
        <div style={{ fontSize: 10, color: dim, letterSpacing: 1, marginBottom: 5 }}>
          AUGMENT NAME <span style={{ color: acc }}>*</span>
        </div>
        <input className="crt-input" style={{ width: '100%' }}
          placeholder="e.g. Claude, Midjourney..."
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus maxLength={80}
        />
      </div>

      {/* Cluster */}
      <div>
        <div style={{ fontSize: 10, color: dim, letterSpacing: 1, marginBottom: 8 }}>
          CLUSTER <span style={{ color: acc }}>*</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CLUSTERS.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{
              padding: '5px 12px', fontSize: 9, fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
              border: `1px solid ${category === c ? acc : adim}`,
              background: category === c ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: category === c ? acc : dim,
            }}>{c}</button>
          ))}
        </div>
      </div>

      {/* URL */}
      <div>
        <div style={{ fontSize: 10, color: dim, letterSpacing: 1, marginBottom: 5 }}>
          URL <span style={{ opacity: 0.5 }}>(optional)</span>
        </div>
        <input className="crt-input" style={{ width: '100%' }}
          placeholder="https://..."
          value={url} onChange={e => setUrl(e.target.value)} maxLength={300}
        />
      </div>

      {/* Description */}
      <div>
        <div style={{ fontSize: 10, color: dim, letterSpacing: 1, marginBottom: 5 }}>
          DESCRIPTION <span style={{ opacity: 0.5 }}>(optional)</span>
        </div>
        <input className="crt-input" style={{ width: '100%' }}
          placeholder="What does this augment do?"
          value={description} onChange={e => setDescription(e.target.value)} maxLength={200}
        />
      </div>

      {/* Notes */}
      <div>
        <div style={{ fontSize: 10, color: dim, letterSpacing: 1, marginBottom: 5 }}>
          NOTES <span style={{ opacity: 0.5 }}>(optional)</span>
        </div>
        <input className="crt-input" style={{ width: '100%' }}
          placeholder="Personal notes..."
          value={notes} onChange={e => setNotes(e.target.value)} maxLength={200}
        />
      </div>

      {/* Buttons */}
      <div style={{ borderTop: `1px solid ${adim}`, paddingTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{
          padding: '6px 16px', fontFamily: mono, fontSize: 10, letterSpacing: 1,
          cursor: 'pointer', background: 'transparent', border: `1px solid ${adim}`, color: dim,
        }}>CANCEL</button>
        <button disabled={!name.trim() || saving} onClick={handleSubmit} style={{
          padding: '6px 16px', fontFamily: mono, fontSize: 10, letterSpacing: 1,
          cursor: name.trim() ? 'pointer' : 'not-allowed', background: 'transparent',
          border: `1px solid ${name.trim() ? acc : adim}`,
          color: name.trim() ? acc : dim, opacity: name.trim() ? 1 : 0.5,
        }}>{saving ? '>> SAVING...' : '>> ADD AUGMENT'}</button>
      </div>
    </div>
  );
}