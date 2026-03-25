// ============================================================
// src/components/widgets/NotesWidget.tsx
// Dashboard widget for displaying notes
// ============================================================
import { useState, useMemo } from 'react';
import { useNotes } from '@/hooks/useNotes';
import WidgetWrapper from '../WidgetWrapper';
import Modal from '../Modal';
import AddNoteModal from '../modals/AddNoteModal';
import { NoteService } from '@/services/noteService';

interface WidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onNoteClick?: (id: string) => void;
}

// ── Styles ────────────────────────────────────────────────────

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgS = 'hsl(var(--bg-secondary))';
const bgT = 'hsl(var(--bg-tertiary))';

export default function NotesWidget({ onClose, onFullscreen, isFullscreen, onNoteClick }: WidgetProps) {
  const { notes: allNotes, isLoading, refetch } = useNotes();
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [deleteConfirmNote, setDeleteConfirmNote] = useState<any | null>(null);

  // Filter notes
  const filtered = useMemo(() => {
    let base = allNotes ?? [];

    if (filterTab === 'ACTIVE') {
      base = base.filter(n => n.status === 'ACTIVE');
    } else if (filterTab === 'ARCHIVED') {
      base = base.filter(n => n.status === 'ARCHIVED');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(n => n.name.toLowerCase().includes(q));
    }

    // Sort by date DESC
    base.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return base.slice(0, 8); // Show max 8 items
  }, [allNotes, filterTab, search]);

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

  return (
    <>
      <WidgetWrapper title="NOTES" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {(['ALL', 'ACTIVE', 'ARCHIVED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              style={{
                fontFamily: mono,
                fontSize: 8,
                padding: '3px 8px',
                background: filterTab === tab ? 'rgba(255,176,0,0.2)' : 'transparent',
                border: `1px solid ${filterTab === tab ? acc : adim}`,
                color: filterTab === tab ? acc : adim,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                if (filterTab !== tab) {
                  e.currentTarget.style.borderColor = acc;
                }
              }}
              onMouseLeave={e => {
                if (filterTab !== tab) {
                  e.currentTarget.style.borderColor = adim;
                }
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '5px 8px',
            fontSize: 9,
            fontFamily: mono,
            background: bgS,
            border: `1px solid ${adim}`,
            color: acc,
            outline: 'none',
            boxSizing: 'border-box' as const,
            marginBottom: 10,
          }}
        />

        {/* Notes List */}
        {isLoading ? (
          <div style={{ fontSize: 9, color: dim, marginBottom: 10 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ fontSize: 9, color: dim, marginBottom: 10 }}>
            {allNotes?.length === 0 ? 'No notes yet.' : 'No notes match filter.'}
          </div>
        ) : (
          <div style={{ marginBottom: 10 }}>
            {filtered.map(note => {
              const date = new Date(note.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const truncated = note.name.length > 30 ? note.name.substring(0, 30) + '...' : note.name;

              return (
                <div
                  key={note.id}
                  style={{
                    marginBottom: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.opacity = '0.85';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onClick={() => onNoteClick?.(note.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: acc, fontFamily: mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {truncated}
                    </div>
                    <div style={{ fontSize: 8, color: dim, fontFamily: mono }}>
                      {date}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setEditingNote(note);
                        setShowAddModal(true);
                      }}
                      style={{
                        fontFamily: mono,
                        fontSize: 7,
                        padding: '2px 5px',
                        background: 'transparent',
                        border: `1px solid ${adim}`,
                        color: adim,
                        cursor: 'pointer',
                      }}
                    >
                      E
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setDeleteConfirmNote(note);
                      }}
                      style={{
                        fontFamily: mono,
                        fontSize: 7,
                        padding: '2px 5px',
                        background: 'transparent',
                        border: '1px solid #ff4444',
                        color: '#ff4444',
                        cursor: 'pointer',
                      }}
                    >
                      D
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Button */}
        <button
          className="topbar-btn"
          style={{ width: '100%', fontSize: 10, marginTop: 4 }}
          onClick={() => {
            setEditingNote(null);
            setShowAddModal(true);
          }}
        >
          + ADD NOTE
        </button>
      </WidgetWrapper>

      {/* Add/Edit Modal */}
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

      {/* Delete Confirm Modal */}
      <Modal
        open={deleteConfirmNote !== null}
        onClose={() => setDeleteConfirmNote(null)}
        title="DELETE NOTE"
        width={350}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: mono, fontSize: 10, color: dim, marginBottom: 12 }}>
            Delete this note?
          </p>
          <p style={{ fontFamily: mono, fontSize: 9, color: acc, marginBottom: 16 }}>
            "{deleteConfirmNote?.name}"
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
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
}
