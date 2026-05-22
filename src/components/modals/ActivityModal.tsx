import { useState } from 'react';
import { X } from 'lucide-react';
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
  const [tagInput, setTagInput] = useState('');

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); onSave(); }
  };

  const removeTag = (tag: string) => {
    setEditVals((v) => ({ ...v, tags: v.tags.filter((t) => t !== tag) }));
  };

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (!t || editVals.tags.includes(t)) return;
    setEditVals((v) => ({ ...v, tags: [...v.tags, t] }));
  };

  const commitInput = () => {
    addTag(tagInput);
    setTagInput('');
  };

  const presets = Object.keys(tagColors).filter((t) => !editVals.tags.includes(t));

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

        {editVals.tags.length > 0 && (
          <div className="modal-tags modal-tags-active">
            {editVals.tags.map((t) => {
              const s = tagColors[t] ?? { bg: '#f3f4f6', color: '#374151' };
              return (
                <button
                  key={t}
                  type="button"
                  className="modal-tag modal-tag-active"
                  style={{ background: s.bg, color: s.color, borderColor: s.bg }}
                  onClick={() => removeTag(t)}
                >
                  {t}<span className="modal-tag-x" aria-hidden><X size={10} /></span>
                </button>
              );
            })}
          </div>
        )}

        <div className="modal-tag-input-row">
          <input
            className="modal-input"
            value={tagInput}
            placeholder="Nuovo tag…"
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitInput(); }
            }}
          />
          {tagInput.trim() && (
            <button type="button" className="modal-tag-add-btn" onClick={commitInput}>+</button>
          )}
        </div>

        {presets.length > 0 && (
          <div className="modal-tags">
            {presets.map((tag) => (
              <button
                key={tag}
                type="button"
                className="modal-tag"
                onClick={() => addTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
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
