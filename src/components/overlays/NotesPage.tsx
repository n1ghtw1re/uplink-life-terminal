// ============================================================
// src/components/overlays/NotesPage.tsx
// Full-page notes browser — list, sort, search, detail drawer
// ============================================================
import { useState, useMemo } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { NoteService } from '@/services/noteService';
import NoteDetailDrawer from '@/components/drawer/NoteDetailDrawer';
import AddNoteModal from '@/components/modals/AddNoteModal';
import Modal from '@/components/Modal';

type NoteStatus = 'ACTIVE' | 'ARCHIVED';

interface Props {
  onClose?: () => void;
}

// ── Constants ─────────────────────────────────────────────────

const STATUS_TABS: { key: NoteStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'ALL' },
  { key: 'ACTIVE', label: 'ACTIVE' },
  { key: 'ARCHIVED', label: 'ARCHIVED' },
];

type SortKey = 'date' | 'name';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date', label: 'DATE' },
  { key: 'name', label: 'A–Z' },
];

// ── Styles ────────────────────────────────────────────────────

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const dim = 'hsl(var(--text-dim))';
const adim = 'hsl(var(--accent-dim))';
const bgP = 'hsl(var(--bg-primary))';
const bgS = 'hsl(var(--bg-secondary))';
const bgT = 'hsl(var(--bg-tertiary))';

// ── Note Row ──────────────────────────────────────────────────

function NoteRow({ note, onClick, onEdit, onDelete, isActive }: {
  note: any;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isActive: boolean;
}) {
  const date = new Date(note.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 16px',
        background: isActive ? 'rgba(255,176,0,0.06)' : bgS,
        border: `1px solid ${isActive ? acc : 'rgba(153,104,0,0.4)'}`,
        cursor: 'pointer',
        transition: 'all 150ms',
      }}
      onClick={onClick}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = adim;
          e.currentTarget.style.background = 'rgba(255,176,0,0.03)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)';
          e.currentTarget.style.background = bgS;
        }
      }}
    >
      {/* Date */}
      <span
        style={{
          fontFamily: mono,
          fontSize: 10,
          color: dim,
          width: 70,
          flexShrink: 0,
        }}
      >
        {date}
      </span>

      {/* Name */}
      <span
        style={{
          fontFamily: mono,
          fontSize: 12,
          color: acc,
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {note.name}
      </span>

      {/* Edit Button */}
      <button
        onClick={e => {
          e.stopPropagation();
          onEdit();
        }}
        style={{
          fontFamily: mono,
          fontSize: 9,
          padding: '4px 8px',
          background: 'transparent',
          border: `1px solid ${adim}`,
          color: adim,
          cursor: 'pointer',
          transition: 'all 150ms',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = acc;
          e.currentTarget.style.color = acc;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = adim;
          e.currentTarget.style.color = adim;
        }}
      >
        EDIT
      </button>

      {/* Delete Button */}
      <button
        onClick={e => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          fontFamily: mono,
          fontSize: 9,
          padding: '4px 8px',
          background: 'transparent',
          border: '1px solid #ff4444',
          color: '#ff4444',
          cursor: 'pointer',
          transition: 'all 150ms',
          flexShrink: 0,
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
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────

function DeleteConfirm({ note, onConfirm, onCancel }: {
  note: any;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontFamily: mono, fontSize: 11, color: dim, marginBottom: 12 }}>
        Delete this note? This action cannot be undone.
      </p>
      <p style={{ fontFamily: mono, fontSize: 10, color: acc, marginBottom: 16 }}>
        "{note.name}"
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button
          onClick={onCancel}
          style={{
            fontFamily: mono,
            fontSize: 9,
            padding: '6px 14px',
            background: 'transparent',
            border: `1px solid ${dim}`,
            color: dim,
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = acc;
            e.currentTarget.style.color = acc;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = dim;
            e.currentTarget.style.color = dim;
          }}
        >
          CANCEL
        </button>
        <button
          onClick={onConfirm}
          style={{
            fontFamily: mono,
            fontSize: 9,
            padding: '6px 14px',
            background: 'rgba(255,68,68,0.1)',
            border: '1px solid #ff4444',
            color: '#ff4444',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,68,68,0.2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,68,68,0.1)';
          }}
        >
          DELETE
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function NotesPage({ onClose }: Props) {
  const { notes: allNotes, isLoading, refetch } = useNotes();
  const [activeTab, setActiveTab] = useState<NoteStatus | 'ALL'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [search, setSearch] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [deleteConfirmNote, setDeleteConfirmNote] = useState<any | null>(null);

  // Filter and sort notes
  const filtered = useMemo(() => {
    let base = allNotes ?? [];

    if (activeTab !== 'ALL') {
      base = base.filter(n => n.status === activeTab);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(n => n.name.toLowerCase().includes(q));
    }

    // Sort
    if (sortKey === 'date') {
      base.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortKey === 'name') {
      base.sort((a, b) => a.name.localeCompare(b.name));
    }

    return base;
  }, [allNotes, activeTab, search, sortKey]);

  const handleOpenNote = (note: any) => {
    setSelectedNoteId(note.id);
    setShowDrawer(true);
  };

  const handleEditNote = (note: any) => {
    setEditingNote(note);
    setShowAddModal(true);
  };

  const handleDeleteNote = async () => {
    if (!deleteConfirmNote) return;
    try {
      await NoteService.deleteNote(deleteConfirmNote.id);
      await refetch();
      setDeleteConfirmNote(null);
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleModalSave = async () => {
    await refetch();
    setEditingNote(null);
  };

  const currentNote = allNotes?.find(n => n.id === selectedNoteId);

  return (
    <>
      {/* Overlay background */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 998,
        }}
      />

      {/* Main panel */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          background: bgP,
          border: `1px solid ${adim}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${adim}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontFamily: mono, fontSize: 14, color: acc, margin: 0 }}>
              // NOTES {`(${filtered.length})`}
            </h2>
            <button
              onClick={onClose}
              style={{
                fontFamily: mono,
                fontSize: 12,
                background: 'transparent',
                border: `1px solid ${adim}`,
                color: adim,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search notes by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
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
              marginBottom: 10,
            }}
          />

          {/* Tabs & Sort */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    padding: '4px 10px',
                    background: activeTab === tab.key ? 'rgba(255,176,0,0.2)' : 'transparent',
                    border: `1px solid ${activeTab === tab.key ? acc : adim}`,
                    color: activeTab === tab.key ? acc : adim,
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortKey(opt.key)}
                  style={{
                    fontFamily: mono,
                    fontSize: 9,
                    padding: '4px 8px',
                    background: sortKey === opt.key ? 'rgba(255,176,0,0.2)' : 'transparent',
                    border: `1px solid ${sortKey === opt.key ? acc : adim}`,
                    color: sortKey === opt.key ? acc : adim,
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Add Note Button */}
            <button
              onClick={() => {
                setEditingNote(null);
                setShowAddModal(true);
              }}
              style={{
                fontFamily: mono,
                fontSize: 10,
                padding: '6px 12px',
                background: 'transparent',
                border: `1px solid ${acc}`,
                color: acc,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,176,0,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              + ADD NOTE
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {isLoading ? (
            <div style={{ padding: '16px', color: dim, fontFamily: mono, fontSize: 11 }}>
              Loading notes...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '16px', color: dim, fontFamily: mono, fontSize: 11 }}>
              {allNotes?.length === 0
                ? 'No notes yet. Create your first note to get started.'
                : 'No notes match your search.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.map(note => (
                <NoteRow
                  key={note.id}
                  note={note}
                  onClick={() => handleOpenNote(note)}
                  onEdit={() => handleEditNote(note)}
                  onDelete={() => setDeleteConfirmNote(note)}
                  isActive={selectedNoteId === note.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Note Detail Drawer */}
      {showDrawer && selectedNoteId && (
        <NoteDetailDrawer
          noteId={selectedNoteId}
          note={currentNote ?? undefined}
          embedded={false}
          onClose={() => {
            setShowDrawer(false);
            setSelectedNoteId(null);
          }}
        />
      )}

      {/* Add/Edit Note Modal */}
      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingNote(null);
        }}
        title={editingNote ? 'EDIT NOTE' : 'ADD NOTE'}
        width={560}
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

      {/* Delete Confirm Modal */}
      <Modal
        open={deleteConfirmNote !== null}
        onClose={() => setDeleteConfirmNote(null)}
        title="DELETE NOTE"
        width={400}
      >
        {deleteConfirmNote && (
          <DeleteConfirm
            note={deleteConfirmNote}
            onConfirm={handleDeleteNote}
            onCancel={() => setDeleteConfirmNote(null)}
          />
        )}
      </Modal>
    </>
  );
}
