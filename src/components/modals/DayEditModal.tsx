import { useState } from 'react';
import { X } from 'lucide-react';
import { badgeStyles } from '../../data';
import { BaseModal } from './BaseModal';

interface Props {
  currentSubtitle: string;
  currentBadge: string;
  currentTags: string[];
  onSave: (subtitle: string, badge: string, tags: string[]) => void;
  onCancel: () => void;
}

export function DayEditModal({ currentSubtitle, currentBadge, currentTags, onSave, onCancel }: Props) {
  const [subtitle, setSubtitle] = useState(currentSubtitle);
  const [badge, setBadge] = useState(currentBadge);
  const [tags, setTags] = useState<string[]>(currentTags);
  const [tagInput, setTagInput] = useState('');

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
  };

  const commitInput = () => { addTag(tagInput); setTagInput(''); };

  const presets = Object.keys(badgeStyles).filter((t) => !tags.includes(t));

  const footer = (
    <>
      <button className="modal-btn-cancel" onClick={onCancel}>Annulla</button>
      <button className="modal-btn-save" onClick={() => onSave(subtitle.trim(), badge, tags)}>Salva</button>
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
          onKeyDown={(e) => e.key === 'Enter' && onSave(subtitle.trim(), badge, tags)}
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
      <div className="modal-field">
        <label>Tag <span>(opzionale)</span></label>

        {tags.length > 0 && (
          <div className="modal-tags modal-tags-active">
            {tags.map((t) => {
              const s = badgeStyles[t] ?? { bg: '#f3f4f6', color: '#374151' };
              return (
                <button
                  key={t}
                  type="button"
                  className="modal-tag modal-tag-active"
                  style={{ background: s.bg, color: s.color, borderColor: s.bg }}
                  onClick={() => removeTag(t)}
                >
                  {('label' in s ? s.label : t)}<span className="modal-tag-x" aria-hidden><X size={10} /></span>
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
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitInput(); } }}
          />
          {tagInput.trim() && (
            <button type="button" className="modal-tag-add-btn" onClick={commitInput}>+</button>
          )}
        </div>

        {presets.length > 0 && (
          <div className="modal-tags">
            {presets.map((key) => (
              <button key={key} type="button" className="modal-tag" onClick={() => addTag(key)}>
                {badgeStyles[key].label}
              </button>
            ))}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
