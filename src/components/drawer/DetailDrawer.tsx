import { useEffect } from 'react';
import CourseDetailDrawer from './CourseDetailDrawer';
import SkillDetailDrawer from './SkillDetailDrawer';
import AugmentDetailDrawer from './AugmentDetailDrawer';
import MediaDetailDrawer from './MediaDetailDrawer';
import ToolDetailDrawer from './ToolDetailDrawer';

export interface DrawerItem {
  type: 'skill' | 'course' | 'book' | 'project' | 'cert' | 'tool' | 'augment' | 'resource';
  id: string;
}

interface DetailDrawerProps {
  open: boolean;
  item: DrawerItem | null;
  onClose: () => void;
  onOpenLog?: () => void;
}

// ── Main drawer shell ─────────────────────────────────────────

const DetailDrawer = ({ open, item, onClose, onOpenLog }: DetailDrawerProps) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const typeLabel = item?.type?.toUpperCase() ?? 'DETAIL';

  return (
    <div
      className="detail-drawer"
      style={{
        position: 'fixed',
        top: 48,
        right: 0,
        bottom: 0,
        width: 420,
        background: 'hsl(var(--bg-primary))',
        borderLeft: '1px solid hsl(var(--accent-dim))',
        boxShadow: '-4px 0 20px rgba(255, 176, 0, 0.08)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(420px)',
        transition: 'transform 200ms ease',
      }}
    >
      {/* ── Drawer header ── */}
      <div style={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid #261600',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#664400' }}>
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
      <div style={{ flex: 1, minHeight: 0, background: 'hsl(var(--bg-primary))', display: 'flex', flexDirection: 'column' }}>
      {item?.type === 'course'  && <CourseDetailDrawer courseId={item.id} onClose={onClose} />}
      {item?.type === 'skill'   && <SkillDetailDrawer skillId={item.id} onClose={onClose} onOpenLog={onOpenLog} />}
      {item?.type === 'augment' && <AugmentDetailDrawer augmentId={item.id} onClose={onClose} />}
      {item?.type === 'tool'    && <ToolDetailDrawer toolId={item.id} onClose={onClose} />}
      {item?.type === 'book'    && <MediaDetailDrawer mediaId={item.id} onClose={onClose} />}
      {!item?.type && null}
      </div>
    </div>
  );
};

export default DetailDrawer;