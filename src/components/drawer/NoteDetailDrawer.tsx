// ============================================================
// src/components/drawer/NoteDetailDrawer.tsx
// Note detail — standalone (overlay + fixed panel) or embedded in DetailDrawer
// ============================================================

import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNotes, type Note } from '@/hooks/useNotes';
import { NoteService } from '@/services/noteService';
import Modal from '@/components/Modal';
import AddNoteModal from '@/components/modals/AddNoteModal';

interface Props {
  noteId: string;
  /** Optional cached row for instant header/content while list refetches */
  note?: Note | null;
  onClose: () => void;
  /** When true, only inner column — used inside global DetailDrawer shell */
  embedded?: boolean;
}

// ── Styles ────────────────────────────────────────────────────

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgP = 'hsl(var(--bg-primary))';
const bgS = 'hsl(var(--bg-secondary))';

export default function NoteDetailDrawer({ noteId, note: noteProp, onClose, embedded = false }: Props) {
  const { notes, isLoading, refetch } = useNotes();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deleteConfirmNote, setDeleteConfirmNote] = useState<Note | null>(null);

  const note = useMemo(() => {
    const fromList = notes?.find(n => n.id === noteId);
    if (fromList) return fromList;
    if (noteProp?.id === noteId) return noteProp;
    return null;
  }, [notes, noteId, noteProp]);

  const handleModalSave = async () => {
    await refetch();
    setEditingNote(null);
    setShowAddModal(false);
  };

  const handleDeleteNote = async () => {
    if (!deleteConfirmNote) return;
    try {
      await NoteService.deleteNote(deleteConfirmNote.id);
      await refetch();
      setDeleteConfirmNote(null);
      onClose();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  if (!note && isLoading) {
    const loadingBody = (
      <div style={{ padding: 16, fontFamily: mono, fontSize: 10, color: dim }}>
        Loading…
      </div>
    );
    return embedded ? loadingBody : (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998 }} />
        <div
          style={{
            position: 'fixed', right: 0, top: 0, width: 460, height: '100%', zIndex: 999,
            background: bgP, border: `1px solid ${adim}`, borderRight: 'none', display: 'flex', flexDirection: 'column',
          }}
        >
          {loadingBody}
        </div>
      </>
    );
  }

  if (!note) {
    const notFound = (
      <div style={{ padding: 16, fontFamily: mono, fontSize: 10, color: dim }}>
        Note not found.
        {!embedded && (
          <button type="button" className="topbar-btn" style={{ marginTop: 12, display: 'block' }} onClick={onClose}>
            CLOSE
          </button>
        )}
      </div>
    );
    return embedded ? notFound : (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998 }} />
        <div
          style={{
            position: 'fixed', right: 0, top: 0, width: 460, height: '100%', zIndex: 999,
            background: bgP, border: `1px solid ${adim}`, borderRight: 'none',
          }}
        >
          {notFound}
        </div>
      </>
    );
  }

  const formattedDate = new Date(note.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const inner = (
    <>
      <div
        style={{
          padding: embedded ? '12px 16px' : '16px',
          borderBottom: `1px solid ${adim}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: mono,
              fontSize: 12,
              color: acc,
              margin: '0 0 4px 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {note.name}
          </h3>
          <p style={{ fontFamily: mono, fontSize: 8, color: dim, margin: 0 }}>{formattedDate}</p>
        </div>
        {!embedded && (
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: mono,
              fontSize: 12,
              background: 'transparent',
              border: 'none',
              color: adim,
              cursor: 'pointer',
              padding: '0 4px',
              marginLeft: 8,
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: embedded ? '12px 16px' : '16px',
          fontFamily: mono,
          fontSize: 11,
          lineHeight: 1.5,
          color: acc,
        }}
      >
        <ReactMarkdown
          components={{
            p: ({ children }) => <p style={{ marginBottom: '1em' }}>{children}</p>,
            h1: ({ children }) => (
              <h1 style={{ fontSize: '1.4em', fontWeight: 'bold', marginBottom: '0.5em', marginTop: '1em' }}>{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 style={{ fontSize: '1.2em', fontWeight: 'bold', marginBottom: '0.5em', marginTop: '1em' }}>{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 style={{ fontSize: '1.1em', fontWeight: 'bold', marginBottom: '0.5em', marginTop: '1em' }}>{children}</h3>
            ),
            ul: ({ children }) => <ul style={{ marginBottom: '1em', paddingLeft: '1.5em' }}>{children}</ul>,
            ol: ({ children }) => <ol style={{ marginBottom: '1em', paddingLeft: '1.5em' }}>{children}</ol>,
            li: ({ children }) => <li style={{ marginBottom: '0.25em' }}>{children}</li>,
            code: ({ children }) => (
              <code style={{ background: bgS, padding: '0.1em 0.3em', borderRadius: '3px', fontSize: '0.9em' }}>{children}</code>
            ),
            pre: ({ children }) => (
              <pre style={{ background: bgS, padding: '1em', borderRadius: '5px', overflow: 'auto', marginBottom: '1em', fontSize: '0.9em' }}>
                {children}
              </pre>
            ),
            blockquote: ({ children }) => (
              <blockquote style={{ borderLeft: `3px solid ${acc}`, paddingLeft: '1em', marginBottom: '1em', fontStyle: 'italic' }}>
                {children}
              </blockquote>
            ),
            strong: ({ children }) => <strong style={{ fontWeight: 'bold' }}>{children}</strong>,
            em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
          }}
        >
          {note.content}
        </ReactMarkdown>
      </div>

      <div
        style={{
          padding: embedded ? '10px 16px' : '12px 16px',
          borderTop: `1px solid ${adim}`,
          display: 'flex',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setEditingNote(note);
            setShowAddModal(true);
          }}
          style={{
            flex: 1,
            fontFamily: mono,
            fontSize: 10,
            padding: '8px 12px',
            background: 'transparent',
            border: `1px solid ${adim}`,
            color: adim,
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = acc;
            e.currentTarget.style.color = acc;
            e.currentTarget.style.background = 'rgba(255,176,0,0.04)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = adim;
            e.currentTarget.style.color = adim;
            e.currentTarget.style.background = 'transparent';
          }}
        >
          EDIT
        </button>
        <button
          type="button"
          onClick={() => setDeleteConfirmNote(note)}
          style={{
            flex: 1,
            fontFamily: mono,
            fontSize: 10,
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid #ff4444',
            color: '#ff4444',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,68,68,0.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          DELETE
        </button>
      </div>

      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingNote(null);
        }}
        title={editingNote ? 'EDIT NOTE' : 'ADD NOTE'}
        width={500}
      >
        <AddNoteModal
          onClose={() => {
            setShowAddModal(false);
            setEditingNote(null);
          }}
          editingNote={editingNote}
          onSave={handleModalSave}
        />
      </Modal>

      <Modal open={deleteConfirmNote !== null} onClose={() => setDeleteConfirmNote(null)} title="DELETE NOTE" width={350}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: mono, fontSize: 10, color: dim, marginBottom: 12 }}>Delete this note?</p>
          <p style={{ fontFamily: mono, fontSize: 9, color: acc, marginBottom: 16 }}>&quot;{deleteConfirmNote?.name}&quot;</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => setDeleteConfirmNote(null)}
              style={{
                fontFamily: mono,
                fontSize: 9,
                padding: '6px 12px',
                background: 'transparent',
                border: `1px solid ${dim}`,
                color: dim,
                cursor: 'pointer',
              }}
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleDeleteNote}
              style={{
                fontFamily: mono,
                fontSize: 9,
                padding: '6px 12px',
                background: 'rgba(255,68,68,0.1)',
                border: '1px solid #ff4444',
                color: '#ff4444',
                cursor: 'pointer',
              }}
            >
              DELETE
            </button>
          </div>
        </div>
      </Modal>
    </>
  );

  if (embedded) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', height: '100%', background: bgP }}>
        {inner}
      </div>
    );
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 998,
        }}
      />
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: 460,
          height: '100%',
          zIndex: 999,
          background: bgP,
          border: `1px solid ${adim}`,
          borderRight: 'none',
          display: 'flex',
          flexDirection: 'column',
          animation: 'noteDrawerSlideIn 250ms ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {inner}
      </div>
      <style>{`
        @keyframes noteDrawerSlideIn {
          from { transform: translateX(460px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
