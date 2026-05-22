import { useState, useEffect, useRef } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Props {
  onEdit: () => void;
  onDelete: () => void;
}

export function ThreeDotMenu({ onEdit, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen((o) => !o);
  };

  return (
    <div className="row-menu">
      <button ref={btnRef} className="row-menu-btn" onClick={toggle} title="Opzioni"><MoreVertical size={16} /></button>
      {open && createPortal(
        <div
          ref={dropRef}
          className="row-menu-dropdown"
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
        >
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}><Pencil size={13} /> Modifica</button>
          <button
            className="row-menu-delete"
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
          >
            <Trash2 size={13} /> Elimina
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}
