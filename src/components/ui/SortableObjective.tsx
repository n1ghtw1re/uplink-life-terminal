import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const green = '#44ff88';
const bgS = 'hsl(var(--bg-secondary))';
const bgT = 'hsl(var(--bg-tertiary))';

interface SortableObjectiveProps {
  id: string;
  title: string;
  completed?: boolean;
  isNew?: boolean;
  onToggle?: () => void;
  onDelete: () => void;
  mode: 'drawer' | 'modal';
}

export function SortableObjective({
  id,
  title,
  completed = false,
  isNew = false,
  onToggle,
  onDelete,
  mode,
}: SortableObjectiveProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle?.();
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
        padding: mode === 'modal' ? '4px 0' : '2px 0',
        background: isDragging ? 'rgba(255,176,0,0.08)' : 'transparent',
        border: isDragging ? `1px solid ${acc}` : '1px solid transparent',
        borderRadius: 2,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 2px',
          color: isDragging ? acc : adim,
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = acc)}
        onMouseLeave={(e) => (e.currentTarget.style.color = isDragging ? acc : adim)}
      >
        <GripVertical size={14} />
      </div>

      {mode === 'drawer' && (
        <span
          onClick={handleToggle}
          style={{
            width: 14,
            height: 14,
            border: `1px solid ${completed ? green : adim}`,
            background: completed ? 'rgba(68,255,136,0.15)' : 'transparent',
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            color: green,
          }}
        >
          {completed ? '✓' : ''}
        </span>
      )}

      <span
        style={{
          fontSize: mode === 'modal' ? 10 : 10,
          color: completed ? dim : acc,
          flex: 1,
          textDecoration: completed ? 'line-through' : 'none',
          opacity: completed ? 0.5 : 1,
        }}
      >
        {title}
      </span>

      <span
        onClick={handleDelete}
        style={{
          fontSize: 9,
          color: adim,
          cursor: 'pointer',
          opacity: 0.5,
          padding: '4px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ff4400';
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = adim;
          e.currentTarget.style.opacity = '0.5';
        }}
      >
        ×
      </span>
    </div>
  );
}

interface SortableObjectiveInputProps {
  id: string;
  value: string;
  index: number;
  onChange: (value: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}

export function SortableObjectiveInput({
  id,
  value,
  index,
  onChange,
  onDelete,
  canDelete,
}: SortableObjectiveInputProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        gap: 6,
        marginBottom: 6,
        padding: '4px 0',
        background: isDragging ? 'rgba(255,176,0,0.08)' : 'transparent',
        border: isDragging ? `1px solid ${acc}` : '1px solid transparent',
        borderRadius: 2,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 2px',
          color: isDragging ? acc : adim,
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = acc)}
        onMouseLeave={(e) => (e.currentTarget.style.color = isDragging ? acc : adim)}
      >
        <GripVertical size={14} />
      </div>

      <input
        className="crt-input"
        style={{ flex: 1 }}
        placeholder={`Objective ${index + 1}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      {canDelete && (
        <button
          onClick={handleDelete}
          style={{
            background: 'transparent',
            border: '1px solid rgba(153,104,0,0.4)',
            color: dim,
            fontFamily: mono,
            fontSize: 11,
            padding: '0 8px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#ff4400';
            e.currentTarget.style.color = '#ff4400';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)';
            e.currentTarget.style.color = dim;
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
