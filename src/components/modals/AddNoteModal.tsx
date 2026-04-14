// ============================================================
// src/components/modals/AddNoteModal.tsx
// Modal for creating/editing notes with markdown support
// ============================================================
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { NoteService } from '@/services/noteService';
import { toast } from '@/hooks/use-toast';

interface Props {
  onClose: () => void;
  editingNote?: { id: string; name: string; content: string } | null;
  onSave?: () => void;
}

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgS = 'hsl(var(--bg-secondary))';
const bgT = 'hsl(var(--bg-tertiary))';

export default function AddNoteModal({ onClose, editingNote, onSave }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingNote) {
      setName(editingNote.name);
      setContent(editingNote.content);
    } else {
      setName('');
      setContent('');
    }
  }, [editingNote]);

  const handleSubmit = async () => {
    if (!name.trim() || !content.trim()) {
      toast({
        title: 'INVALID NOTE',
        description: 'Note name and content are required.',
        duration: 3000,
      });
      return;
    }

    setSaving(true);
    try {
      if (editingNote) {
        await NoteService.updateNote(editingNote.id, {
          name: name.trim(),
          content: content.trim(),
        });
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        queryClient.invalidateQueries({ queryKey: ['terminal-notes-list'] });
        toast({
          title: 'NOTE UPDATED',
          description: `"${name.trim()}" has been updated.`,
          duration: 2000,
        });
      } else {
        await NoteService.createNote({
          name: name.trim(),
          content: content.trim(),
        });
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        queryClient.invalidateQueries({ queryKey: ['terminal-notes-list'] });
        toast({
          title: 'NOTE CREATED',
          description: `"${name.trim()}" has been added to your notes.`,
          duration: 2000,
        });
      }
      await onSave?.();
      onClose();
    } catch (err) {
      console.error('Failed to save note:', err);
      toast({
        title: 'ERROR',
        description: 'Failed to save note. Please try again.',
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 16px' }}>
      {/* Name Field */}
      <div>
        <div style={{
          fontSize: 9,
          color: adim,
          letterSpacing: 2,
          marginBottom: 6,
          fontFamily: mono,
        }}>
          NOTE NAME
        </div>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter note name..."
          style={{
            width: '100%',
            padding: '8px 10px',
            fontSize: 11,
            fontFamily: mono,
            background: bgS,
            border: `1px solid ${adim}`,
            color: acc,
            outline: 'none',
            boxSizing: 'border-box' as const,
            transition: 'all 150ms',
          }}
          onFocus={e => e.currentTarget.style.borderColor = acc}
          onBlur={e => e.currentTarget.style.borderColor = adim}
        />
      </div>

      {/* Content Field */}
      <div>
        <div style={{
          fontSize: 9,
          color: adim,
          letterSpacing: 2,
          marginBottom: 6,
          fontFamily: mono,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>CONTENT (MARKDOWN)</span>
          <span style={{ fontSize: 8, color: dim }}>
            {content.length} chars
          </span>
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Enter note content... Markdown is supported."
          style={{
            width: '100%',
            minHeight: '200px',
            padding: '10px',
            fontSize: 10,
            fontFamily: mono,
            background: bgS,
            border: `1px solid ${adim}`,
            color: acc,
            outline: 'none',
            boxSizing: 'border-box' as const,
            resize: 'vertical' as const,
            transition: 'all 150ms',
          }}
          onFocus={e => e.currentTarget.style.borderColor = acc}
          onBlur={e => e.currentTarget.style.borderColor = adim}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button
          onClick={onClose}
          disabled={saving}
          style={{
            padding: '6px 14px',
            fontSize: 10,
            fontFamily: mono,
            background: 'transparent',
            border: `1px solid ${dim}`,
            color: dim,
            cursor: 'pointer',
            opacity: saving ? 0.5 : 1,
            transition: 'all 150ms',
          }}
          onMouseEnter={e => {
            if (!saving) {
              e.currentTarget.style.borderColor = acc;
              e.currentTarget.style.color = acc;
            }
          }}
          onMouseLeave={e => {
            if (!saving) {
              e.currentTarget.style.borderColor = dim;
              e.currentTarget.style.color = dim;
            }
          }}
        >
          CANCEL
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            padding: '6px 14px',
            fontSize: 10,
            fontFamily: mono,
            background: saving ? 'rgba(255,176,0,0.2)' : 'transparent',
            border: `1px solid ${acc}`,
            color: acc,
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.6 : 1,
            transition: 'all 150ms',
          }}
          onMouseEnter={e => {
            if (!saving) {
              e.currentTarget.style.background = 'rgba(255,176,0,0.08)';
            }
          }}
          onMouseLeave={e => {
            if (!saving) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          {saving ? 'SAVING...' : editingNote ? 'UPDATE' : 'CREATE'}
        </button>
      </div>
    </div>
  );
}
