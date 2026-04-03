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
import HabitDrawer from './HabitDrawer';

export interface DrawerItem {
  type: 'skill' | 'course' | 'book' | 'project' | 'cert' | 'tool' | 'augment' | 'resource' | 'habit';
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
    
    case 'habit':
      // For habits, we don't fetch by ID - we pass the full habit object via a different mechanism
      // The HabitDrawer expects a habit object, not an ID
      // We'll need to use a state to track the selected habit in Index.tsx instead
      return null;

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