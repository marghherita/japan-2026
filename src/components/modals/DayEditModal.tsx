import { useState } from 'react';
import { badgeStyles } from '../../data';
import { BaseModal } from './BaseModal';

interface Props {
  currentSubtitle: string;
  currentBadge: string;
  onSave: (subtitle: string, badge: string) => void;
  onCancel: () => void;
}

export function DayEditModal({ currentSubtitle, currentBadge, onSave, onCancel }: Props) {
  const [subtitle, setSubtitle] = useState(currentSubtitle);
  const [badge, setBadge] = useState(currentBadge);

  const footer = (
    <>
      <button className="modal-btn-cancel" onClick={onCancel}>Annulla</button>
      <button className="modal-btn-save" onClick={() => onSave(subtitle.trim(), badge)}>Salva</button>
    </>
  );

  return (
    <BaseModal title="Modifica giornata" onCancel={onCancel} footer={footer}>
      <div className="modal-field">
        <label>Titolo <span>(es. "Arrivo", "Kyoto centro")</span></label>
        <input
          className="modal-input"
          value={subtitle}
          placeholder="es. Arrivo + Dotonbori"
          onChange={(e) => setSubtitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSave(subtitle.trim(), badge)}
        />
      </div>
      <div className="modal-field">
        <label>Città</label>
        <div className="modal-tags">
          {Object.entries(badgeStyles).map(([key, s]) => (
            <button
              key={key}
              type="button"
              className={`modal-tag${badge === key ? ' modal-tag-active' : ''}`}
              style={badge === key ? { background: s.bg, color: s.color, borderColor: s.bg } : {}}
              onClick={() => setBadge(key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </BaseModal>
  );
}
