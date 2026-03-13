// ============================================================
// src/components/drawer/DrawerRouter.tsx
//
// Drop this inside your existing DetailDrawer where you render
// drawer content. Route on item.type:
//
//   type === 'course'  → <CourseDetailDrawer courseId={item.id} />
//   type === 'skill'   → existing skill view (unchanged)
//
// Usage in DetailDrawer.tsx:
//   import DrawerRouter from './DrawerRouter'
//   <DrawerRouter item={item} onClose={onClose} onOpenLog={onOpenLog} />
// ============================================================
import CourseDetailDrawer from './CourseDetailDrawer';

export interface DrawerItem {
  type: 'skill' | 'course' | 'book' | 'project' | 'cert' | 'tool' | 'augment' | 'resource';
  id: string;
}

interface Props {
  item: DrawerItem | null;
  onClose: () => void;
  onOpenLog?: () => void;
}

export default function DrawerRouter({ item, onClose, onOpenLog }: Props) {
  if (!item) return null;

  switch (item.type) {
    case 'course':
      return <CourseDetailDrawer courseId={item.id} onClose={onClose} />;

    // Future types slot in here:
    // case 'book':   return <BookDetailDrawer ... />;
    // case 'project': return <ProjectDetailDrawer ... />;

    default:
      return (
        <div style={{
          padding: 20,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          color: 'hsl(var(--text-dim))',
        }}>
          // {item.type.toUpperCase()} — detail view coming soon
        </div>
      );
  }
}