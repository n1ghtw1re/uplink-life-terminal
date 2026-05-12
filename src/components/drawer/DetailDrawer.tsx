import { useEffect } from 'react';
import CourseDetailDrawer from './CourseDetailDrawer';
import SkillDetailDrawer from './SkillDetailDrawer';
import AugmentDetailDrawer from './AugmentDetailDrawer';
import ProjectDetailDrawer from './ProjectDetailDrawer';
import MediaDetailDrawer from './MediaDetailDrawer';
import ToolDetailDrawer from './ToolDetailDrawer';
import NoteDetailDrawer from './NoteDetailDrawer';
import ResourceDetailDrawer from './ResourceDetailDrawer';
import HabitDrawer from './HabitDrawer';
import VaultItemDrawer from './VaultItemDrawer';
import IngredientDrawer from './IngredientDrawer';
import RecipeDrawer from './RecipeDrawer';
import IntakeDrawer from './IntakeDrawer';
import ExerciseDetailDrawer from './ExerciseDetailDrawer';
import WorkoutDetailDrawer from './WorkoutDetailDrawer';
import OutputLogDrawer from './OutputLogDrawer';

export interface DrawerItem {
  type: 'skill' | 'course' | 'book' | 'project' | 'cert' | 'tool' | 'augment' | 'resource' | 'media' | 'note' | 'habit' | 'vault' | 'ingredient' | 'recipe' | 'intake' | 'exercise' | 'workout' | 'output';
  id: string;
  habitData?: any; // For passing full habit object
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
    {item?.type === 'course'  && <CourseDetailDrawer key="course" courseId={item.id} onClose={onClose} />}
    {item?.type === 'skill'   && <SkillDetailDrawer key="skill" skillId={item.id} onClose={onClose} onOpenLog={onOpenLog} />}
    {item?.type === 'augment' && <AugmentDetailDrawer key="augment" augmentId={item.id} onClose={onClose} />}
    {item?.type === 'tool'    && <ToolDetailDrawer key="tool" toolId={item.id} onClose={onClose} />}
    {item?.type === 'book'    && <MediaDetailDrawer key="book" mediaId={item.id} embedded onClose={onClose} />}
    {item?.type === 'project'  && <ProjectDetailDrawer key="project" projectId={item.id} onClose={onClose} />}
    {item?.type === 'note'   && <NoteDetailDrawer key="note" noteId={item.id} embedded onClose={onClose} />}
    {item?.type === 'resource' && <ResourceDetailDrawer key="resource" resourceId={item.id} onClose={onClose} />}
    {item?.type === 'exercise' && <ExerciseDetailDrawer key="exercise" exerciseId={item.id} onClose={onClose} />}
    {item?.type === 'workout' && <WorkoutDetailDrawer key="workout" workoutId={item.id} onClose={onClose} />}
        {item?.type === 'output' && <OutputLogDrawer outputLogId={item.id} onClose={onClose} />}
      {item?.type === 'habit' && item.id && <HabitDrawer habitId={item.id} onClose={onClose} />}
      {item?.type === 'vault'      && <VaultItemDrawer key="vault" itemId={item.id} onClose={onClose} />}
      {item?.type === 'recipe'     && <RecipeDrawer key="recipe" recipeId={item.id} onClose={onClose} />}
      {item?.type === 'ingredient' && <IngredientDrawer key="ingredient" ingredientId={item.id} onClose={onClose} />}
      {item?.type === 'intake'     && <IntakeDrawer key="intake" logId={item.id} onClose={onClose} />}
      {!item?.type && null}
      </div>
    </div>
  );
};

export default DetailDrawer;
