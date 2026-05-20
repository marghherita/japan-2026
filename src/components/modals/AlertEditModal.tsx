import { useState } from 'react';
import { BaseModal } from './BaseModal';
import type { AlertData } from '../../types';

type AlertType = 'warn' | 'info' | 'ok';

const TYPE_OPTIONS: { value: AlertType; label: string }[] = [
  { value: 'warn', label: '⚠️ Attenzione' },
  { value: 'info', label: 'ℹ️ Info' },
  { value: 'ok',   label: '✅ Ok' },
];

interface Props {
  current: AlertData | null;
  onSave: (val: AlertData) => void;
  onCancel: () => void;
  onRemove: () => void;
}

export function AlertEditModal({ current, onSave, onCancel, onRemove }: Props) {
  const [type, setType] = useState<AlertType>((current?.type as AlertType) || 'warn');
  const [text, setText] = useState(current?.text || '');

  const handleSave = () => {
    if (text.trim()) onSave({ type, text: text.trim() });
  };

  const footer = (
    <>
      {current && (
        <button className="modal-btn-remove" onClick={onRemove}>Rimuovi</button>
      )}
      <button className="modal-btn-cancel" onClick={onCancel}>Annulla</button>
      <button className="modal-btn-save" onClick={handleSave}>Salva</button>
    </>
  );

  return (
    <BaseModal
      title={current ? 'Modifica nota' : 'Aggiungi nota'}
      onCancel={onCancel}
      footer={footer}
    >
      <div className="modal-field">
        <label>Tipo</label>
        <div className="alert-type-btns">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`alert-type-btn alert-type-btn-${opt.value}${type === opt.value ? ' active' : ''}`}
              onClick={() => setType(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="modal-field">
        <label>Testo</label>
        <input
          className="modal-input"
          value={text}
          placeholder="es. Prenotazione richiesta, portare ombrello…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}
        />
      </div>
    </BaseModal>
  );
}
