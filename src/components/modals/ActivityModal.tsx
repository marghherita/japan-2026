import { tagColors } from '../../data';
import { formatDayOption } from '../../utils/time';
import { BaseModal } from './BaseModal';
import type { EditVals, DayInfo } from '../../types';
import type { Dispatch, SetStateAction } from 'react';

interface Props {
  isNew: boolean;
  editVals: EditVals;
  setEditVals: Dispatch<SetStateAction<EditVals>>;
  onSave: () => void;
  onCancel: () => void;
  allDays: DayInfo[] | null;
  currentDayKey: string;
}

export function ActivityModal({
  isNew, editVals, setEditVals, onSave, onCancel, allDays, currentDayKey,
}: Props) {
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); onSave(); }
  };

  const toggleTag = (tag: string) => {
    setEditVals((v) => ({
      ...v,
      tags: v.tags.includes(tag) ? v.tags.filter((t) => t !== tag) : [...v.tags, tag],
    }));
  };

  const footer = (
    <>
      <button className="modal-btn-cancel" onClick={onCancel}>Annulla</button>
      <button className="modal-btn-save" onClick={onSave}>Salva</button>
    </>
  );

  return (
    <BaseModal
      title={isNew ? 'Nuova attività' : 'Modifica attività'}
      onCancel={onCancel}
      footer={footer}
    >
      <div className="modal-field">
        <label>Attività</label>
        <input
          className="modal-input"
          value={editVals.text}
          placeholder="es. Visita al Fushimi Inari…"
          onChange={(e) => setEditVals((v) => ({ ...v, text: e.target.value }))}
          onKeyDown={handleKey}
        />
      </div>
      <div className="modal-row">
        <div className="modal-field modal-field-time">
          <label>Orario</label>
          <input
            className="modal-input"
            type="time"
            value={editVals.time}
            onChange={(e) => setEditVals((v) => ({ ...v, time: e.target.value }))}
            onKeyDown={handleKey}
          />
        </div>
        <div className="modal-field" style={{ flex: 1 }}>
          <label>Nota <span>(opzionale)</span></label>
          <input
            className="modal-input"
            value={editVals.note}
            placeholder="prenotazione, link, prezzo…"
            onChange={(e) => setEditVals((v) => ({ ...v, note: e.target.value }))}
            onKeyDown={handleKey}
          />
        </div>
      </div>
      <div className="modal-field">
        <label>Link <span>(opzionale)</span></label>
        <input
          className="modal-input"
          value={editVals.url}
          placeholder="https://…"
          type="url"
          inputMode="url"
          onChange={(e) => setEditVals((v) => ({ ...v, url: e.target.value }))}
          onKeyDown={handleKey}
        />
      </div>
      <div className="modal-field">
        <label>Tag <span>(opzionale)</span></label>
        <div className="modal-tags">
          {Object.entries(tagColors).map(([tag, s]) => {
            const active = editVals.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                className={`modal-tag${active ? ' modal-tag-active' : ''}`}
                style={active ? { background: s.bg, color: s.color, borderColor: s.bg } : {}}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
      {allDays && allDays.length > 1 && (
        <div className="modal-field">
          <label>Giorno <span>(sposta attività)</span></label>
          <select
            className="modal-select"
            value={editVals.targetDay ?? currentDayKey}
            onChange={(e) => setEditVals((v) => ({ ...v, targetDay: e.target.value }))}
          >
            {allDays.map((d) => (
              <option key={d.key} value={d.key}>{formatDayOption(d)}</option>
            ))}
          </select>
        </div>
      )}
    </BaseModal>
  );
}
