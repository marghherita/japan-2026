import type { Dispatch, SetStateAction } from 'react';
import { BaseModal } from './BaseModal';

interface Props {
  isNew: boolean;
  text: string;
  setText: Dispatch<SetStateAction<string>>;
  onSave: () => void;
  onCancel: () => void;
}

export function ChecklistItemModal({ isNew, text, setText, onSave, onCancel }: Props) {
  const footer = (
    <>
      <button className="modal-btn-cancel" onClick={onCancel}>Annulla</button>
      <button className="modal-btn-save" onClick={onSave}>Salva</button>
    </>
  );

  return (
    <BaseModal title={isNew ? 'Nuova voce' : 'Modifica voce'} onCancel={onCancel} footer={footer}>
      <div className="modal-field">
        <label>Voce</label>
        <input
          className="modal-input"
          value={text}
          placeholder="es. Passaporto, adattatore prese…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSave(); } }}
        />
      </div>
    </BaseModal>
  );
}
