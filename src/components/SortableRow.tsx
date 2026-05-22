import { useSortable } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';
import { ThreeDotMenu } from './ThreeDotMenu';
import { RowContent } from './RowContent';
import type { Row } from '../types';

interface Props {
  id: string;
  row: Row;
  idx: number;
  startEdit: (i: number) => void;
  deleteRow: (i: number) => void;
  onToggleDone: (i: number) => void;
}

export function SortableRow({ id, row, idx, startEdit, deleteRow, onToggleDone }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`row${row.done ? ' row-done' : ''}`}
      onClick={() => onToggleDone(idx)}
      title={row.done ? 'Segna come non fatto' : 'Segna come fatto'}
    >
      <span
        className="drag-handle"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </span>
      <span className="time">{row.time}</span>
      <RowContent text={row.text} url={row.url} tags={row.tags} note={row.note} />
      <ThreeDotMenu onEdit={() => startEdit(idx)} onDelete={() => deleteRow(idx)} />
    </div>
  );
}
