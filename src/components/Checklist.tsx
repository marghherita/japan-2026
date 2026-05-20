import { useState } from 'react';
import { ThreeDotMenu } from './ThreeDotMenu';
import { ChecklistItemModal } from './modals/ChecklistItemModal';
import { checklistCategories } from '../checklistData';
import type { ChecklistData, ChecklistItem, ChecklistCategoryData } from '../types';

// ── Category ──────────────────────────────────────────────────────────────────

interface CategoryProps {
  category: ChecklistCategoryData;
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

function ChecklistCategory({ category, items, onChange }: CategoryProps) {
  const [open, setOpen] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [modalText, setModalText] = useState('');

  const checkedCount = items.filter((i) => i.checked).length;

  const toggle = (id: string) =>
    onChange(items.map((i) => i.id === id ? { ...i, checked: !i.checked } : i));

  const deleteItem = (id: string) => onChange(items.filter((i) => i.id !== id));

  const openAdd  = () => { setEditId('new'); setModalText(''); };
  const openEdit = (item: ChecklistItem) => { setEditId(item.id); setModalText(item.text); };
  const closeModal = () => { setEditId(null); setModalText(''); };

  const saveModal = () => {
    if (!modalText.trim()) return;
    if (editId === 'new') {
      onChange([...items, { id: `${category.id}-${Date.now()}`, text: modalText.trim(), checked: false }]);
    } else {
      onChange(items.map((i) => i.id === editId ? { ...i, text: modalText.trim() } : i));
    }
    closeModal();
  };

  return (
    <>
      {editId !== null && (
        <ChecklistItemModal
          isNew={editId === 'new'}
          text={modalText}
          setText={setModalText}
          onSave={saveModal}
          onCancel={closeModal}
        />
      )}
      <div className="cl-cat">
        <button className="cl-cat-head" onClick={() => setOpen((o) => !o)}>
          <span className="cl-cat-icon">{category.icon}</span>
          <span className="cl-cat-label">{category.label}</span>
          <span className="cl-cat-count">{checkedCount}/{items.length}</span>
          <span className="chevron" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </button>
        {open && (
          <div className="cl-items">
            {items.map((item) => (
              <div key={item.id} className={`cl-item${item.checked ? ' cl-item-done' : ''}`}>
                <input
                  type="checkbox"
                  className="cl-checkbox"
                  checked={item.checked}
                  onChange={() => toggle(item.id)}
                />
                <span className="cl-item-text">{item.text}</span>
                <ThreeDotMenu onEdit={() => openEdit(item)} onDelete={() => deleteItem(item.id)} />
              </div>
            ))}
            <button className="add-row-btn" onClick={openAdd}>
              <span className="add-row-icon">＋</span> aggiungi voce
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Checklist ─────────────────────────────────────────────────────────────────

interface Props {
  state: ChecklistData | null;
  onChange: (catId: string, items: ChecklistItem[]) => void;
}

export function Checklist({ state, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const allItems = checklistCategories.flatMap(
    (cat) => (state ?? {})[cat.id] ?? cat.defaultItems,
  );
  const total   = allItems.length;
  const checked = allItems.filter((i) => i.checked).length;
  const pct     = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <div className="cl-wrap">
      <button className="cl-head" onClick={() => setOpen((o) => !o)}>
        <span className="cl-head-left">
          <span className="cl-head-title">✈ Checklist viaggio</span>
          <span className="cl-head-counter">{checked}/{total} voci</span>
        </span>
        <span className="cl-progress-wrap">
          <span className="cl-progress-bar" style={{ width: `${pct}%` }} />
        </span>
        <span className="cl-pct">{pct}%</span>
        <span className="section-chevron" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>
      {open && (
        <div className="cl-body">
          {checklistCategories.map((cat) => (
            <ChecklistCategory
              key={cat.id}
              category={cat}
              items={(state ?? {})[cat.id] ?? cat.defaultItems}
              onChange={(items) => onChange(cat.id, items)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
