import { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';
import { ThreeDotMenu } from './ThreeDotMenu';
import { RowContent } from './RowContent';
import type { Row } from '../types';

const SWIPE_THRESHOLD = 60;

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

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const didSwipe = useRef(false);
  const [swipeX, setSwipeX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    didSwipe.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dx > 0 && dx > dy) {
      setSwipeX(Math.min(dx, 80));
    }
  };

  const handleTouchEnd = () => {
    if (swipeX > SWIPE_THRESHOLD) {
      didSwipe.current = true;
      onToggleDone(idx);
    }
    setSwipeX(0);
  };

  const handleClick = () => {
    if (didSwipe.current) { didSwipe.current = false; return; }
    onToggleDone(idx);
  };

  const swipeProgress = Math.min(1, swipeX / SWIPE_THRESHOLD);
  const dndTransform = CSS.Transform.toString(transform);

  const style: React.CSSProperties = {
    transform: swipeX !== 0
      ? [dndTransform, `translateX(${swipeX}px)`].filter(Boolean).join(' ')
      : (dndTransform || undefined),
    transition: swipeX !== 0 ? 'none' : transition,
    opacity: isDragging ? 0.3 : 1,
    background: swipeX !== 0 ? `rgba(34, 197, 94, ${swipeProgress * 0.18})` : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`row${row.done ? ' row-done' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
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
