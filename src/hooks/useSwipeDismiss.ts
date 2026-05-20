import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export function useSwipeDismiss(onDismiss: () => void) {
  const modalRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 600) return;
    drag.current = { startY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dy = Math.max(0, e.clientY - drag.current.startY);
    if (modalRef.current) {
      modalRef.current.style.transition = 'none';
      modalRef.current.style.transform = `translateY(${dy}px)`;
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dy = Math.max(0, e.clientY - drag.current.startY);
    drag.current = null;
    if (dy > 120) {
      if (modalRef.current) {
        modalRef.current.style.transition = 'transform 0.28s cubic-bezier(0.32,0.72,0,1)';
        modalRef.current.style.transform = 'translateY(110%)';
      }
      setTimeout(onDismiss, 260);
    } else if (modalRef.current) {
      modalRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)';
      modalRef.current.style.transform = 'translateY(0)';
    }
  };

  return {
    modalRef,
    dragProps: { onPointerDown, onPointerMove, onPointerUp },
  };
}
