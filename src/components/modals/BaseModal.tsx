import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useSwipeDismiss } from '../../hooks/useSwipeDismiss';

interface Props {
  title: string;
  onCancel: () => void;
  footer: ReactNode;
  children: ReactNode;
}

export function BaseModal({ title, onCancel, footer, children }: Props) {
  const { modalRef, dragProps } = useSwipeDismiss(onCancel);

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-backdrop" />
        <Dialog.Content
          className="modal"
          ref={modalRef}
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
        >
          <div className="modal-drag-zone" {...dragProps}>
            <div className="modal-pill" />
            <Dialog.Title className="modal-header">{title}</Dialog.Title>
          </div>
          <div className="modal-body">{children}</div>
          <div className="modal-footer">{footer}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
