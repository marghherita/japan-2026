import { BaseModal } from './BaseModal';
import { formatDayOption } from '../../utils/time';
import type { DayInfo, JollyActivity } from '../../types';

interface Props {
  allDays: DayInfo[];
  activity: JollyActivity | undefined;
  onPick: (dayKey: string) => void;
  onCancel: () => void;
}

export function DayPickerModal({ allDays, activity, onPick, onCancel }: Props) {
  const footer = (
    <button className="modal-btn-cancel" onClick={onCancel}>Annulla</button>
  );

  return (
    <BaseModal title="Inserisci in una giornata" onCancel={onCancel} footer={footer}>
      <div className="jolly-activity-preview">
        <span className="time">{activity?.time}</span>
        <span className="row-text">{activity?.text}</span>
      </div>
      <div className="jolly-day-list">
        {allDays.map((d) => (
          <button key={d.key} className="jolly-day-item" onClick={() => onPick(d.key)}>
            {formatDayOption(d)}
          </button>
        ))}
      </div>
    </BaseModal>
  );
}
