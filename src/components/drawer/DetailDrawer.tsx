// ============================================================
// src/components/drawer/DetailDrawer.tsx
// Shared shell — routes by type to the correct detail drawer.
// ============================================================
import { useEffect } from 'react';
import CourseDetailDrawer from './CourseDetailDrawer';
import SkillDetailDrawer from './SkillDetailDrawer';
import MediaDetailDrawer from './MediaDetailDrawer';

export interface DrawerItem {
  type: 'skill' | 'course' | 'media' | 'book' | 'project' | 'cert' | 'tool' | 'augment' | 'resource';
  id: string;
}

interface DetailDrawerProps {
  open: boolean;
  item: DrawerItem | null;
  onClose: () => void;
  onOpenLog?: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  skill:       'SKILL',
  course:      'COURSE',
  media:       'MEDIA',
  book:        'MEDIA',
  project:     'PROJECT',
  cert:        'CERTIFICATION',
  tool:        'TOOL',
  augment:     'AUGMENTATION',
  resource:    'RESOURCE',
};

// ── Shell ─────────────────────────────────────────────────────

const DetailDrawer = ({ open, item, onClose, onOpenLog }: DetailDrawerProps) => {
  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const typeLabel = item?.type ? (TYPE_LABEL[item.type] ?? item.type.toUpperCase()) : 'DETAIL';

  return (
    <>
      {/* Backdrop — click-away to close */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 499,
            background: 'transparent',
          }}
        />
      )}

      <div
        className="detail-drawer"
        style={{
          position: 'fixed',
          top: 48,
          right: 0,
          bottom: 0,
          width: 420,
          background: '#0f0800',
          borderLeft: '1px solid hsl(var(--accent-dim))',
          boxShadow: '-4px 0 24px rgba(255, 176, 0, 0.08)',
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(420px)',
          transition: 'transform 200ms ease',
          // Block click-through to the backdrop inside the drawer
          pointerEvents: open ? 'all' : 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Drawer header chrome ── */}
        <div style={{
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid rgba(153,104,0,0.4)',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            color: 'hsl(var(--accent-dim))',
            letterSpacing: 2,
          }}>
            // DETAIL — {typeLabel}
          </span>
          <button
            className="topbar-btn"
            onClick={onClose}
            style={{ fontSize: 10, padding: '2px 8px' }}
          >
            × CLOSE
          </button>
        </div>

        {/* ── Routed content ── */}
        {item && open && (() => {
          switch (item.type) {
            case 'course':
              return <CourseDetailDrawer courseId={item.id} onClose={onClose} />;

            case 'skill':
              return <SkillDetailDrawer skillId={item.id} onClose={onClose} onOpenLog={onOpenLog} />;

            case 'media':
            case 'book':
              return <MediaDetailDrawer mediaId={item.id} onClose={onClose} />;

            default:
              return (
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: 'hsl(var(--text-dim))',
                  opacity: 0.5,
                  flexDirection: 'column', gap: 8,
                }}>
                  <div>// {typeLabel} DRAWER</div>
                  <div style={{ fontSize: 9, opacity: 0.6 }}>COMING SOON</div>
                </div>
              );
          }
        })()}
      </div>
    </>
  );
};

export default DetailDrawer;