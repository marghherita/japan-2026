import { useState } from 'react';
import { ThreeDotMenu } from './ThreeDotMenu';
import { RowContent } from './RowContent';
import { ActivityModal } from './modals/ActivityModal';
import { DayPickerModal } from './modals/DayPickerModal';
import type { JolliesData, JollyActivity, DayInfo, EditVals } from '../types';

interface Props {
  jollies: JolliesData | null;
  onChange: (next: JolliesData) => void;
  allDays: DayInfo[];
  onInsert: (jollyId: string, dayKey: string) => void;
}

export function JollySection({ jollies, onChange, allDays, onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVals, setEditVals] = useState<EditVals>({
    time: '', text: '', note: '', tags: [], url: '',
  });
  const [isNew, setIsNew] = useState(false);
  const [insertingId, setInsertingId] = useState<string | null>(null);

  const jollyList = Object.entries(jollies ?? {});

  const openAdd = () => {
    setEditingId(`jolly_${Date.now()}`);
    setEditVals({ time: '09:00', text: '', note: '', tags: [], url: '' });
    setIsNew(true);
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const a = (jollies ?? {})[id];
    setEditingId(id);
    setEditVals({
      time: a.time ?? '09:00',
      text: a.text ?? '',
      note: a.note ?? '',
      tags: a.tags ?? [],
      url: a.url ?? '',
    });
    setIsNew(false);
  };

  const saveEdit = () => {
    if (!editVals.text.trim() || !editingId) { cancelEdit(); return; }
    const updated: JollyActivity = {
      time: editVals.time.trim() || '09:00',
      text: editVals.text.trim(),
      note: editVals.note.trim() || undefined,
      tags: editVals.tags.length ? editVals.tags : undefined,
      url: editVals.url.trim() || undefined,
    };
    onChange({ ...(jollies ?? {}), [editingId]: updated });
    setEditingId(null);
    setIsNew(false);
  };

  const cancelEdit = () => { setEditingId(null); setIsNew(false); };

  const deleteJolly = (id: string) => {
    const next = { ...(jollies ?? {}) };
    delete next[id];
    onChange(next);
  };

  return (
    <div className="jolly-section">
      {editingId !== null && (
        <ActivityModal
          isNew={isNew}
          editVals={editVals}
          setEditVals={setEditVals}
          onSave={saveEdit}
          onCancel={cancelEdit}
          allDays={null}
          currentDayKey={editingId}
        />
      )}
      {insertingId !== null && (
        <DayPickerModal
          allDays={allDays}
          activity={(jollies ?? {})[insertingId]}
          onPick={(dayKey) => { onInsert(insertingId, dayKey); setInsertingId(null); }}
          onCancel={() => setInsertingId(null)}
        />
      )}
      <button className="cl-head" onClick={() => setOpen((o) => !o)}>
        <span className="cl-head-left">
          <span className="cl-head-title">🃏 Attività jolly</span>
          <span className="cl-head-counter">{jollyList.length} attività</span>
        </span>
        <span className="section-chevron" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>
      {open && (
        <div className="jolly-list">
          {jollyList.map(([id, activity]) => (
            <div key={id} className="jolly-activity-row">
              <span className="time">{activity.time}</span>
              <RowContent text={activity.text} url={activity.url} tags={activity.tags} note={activity.note} />
              <button
                className="jolly-insert-btn"
                onClick={() => setInsertingId(id)}
                title="Inserisci in una giornata"
              >
                + giornata
              </button>
              <ThreeDotMenu onEdit={() => openEdit(id)} onDelete={() => deleteJolly(id)} />
            </div>
          ))}
          <button className="add-row-btn" onClick={openAdd}>
            <span className="add-row-icon">＋</span> aggiungi attività
          </button>
        </div>
      )}
    </div>
  );
}
