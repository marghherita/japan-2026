import { BaseModal } from './BaseModal';
import type { DayInfo, TitleOverridesData } from '../../types';

interface Props {
  allDays: DayInfo[];
  currentDayKey: string;
  titleOverrides: TitleOverridesData | null;
  onSwap: (targetKey: string) => void;
  onCancel: () => void;
}

function getDisplayTitle(d: DayInfo, titleOverrides: TitleOverridesData | null): string {
  const ov = titleOverrides?.[d.key];
  if (ov === undefined) return d.label;
  const prefix = d.label.split(' — ')[0];
  return ov ? `${prefix} — ${ov}` : d.label;
}

export function DaySwapModal({ allDays, currentDayKey, titleOverrides, onSwap, onCancel }: Props) {
  const otherDays = allDays.filter((d) => d.key !== currentDayKey);

  const footer = (
    <button className="modal-btn-cancel" onClick={onCancel}>Annulla</button>
  );

  return (
    <BaseModal title="Scambia con un'altra giornata" onCancel={onCancel} footer={footer}>
      <div className="jolly-day-list">
        {otherDays.map((d) => (
          <button key={d.key} className="jolly-day-item" onClick={() => onSwap(d.key)}>
            {getDisplayTitle(d, titleOverrides)}
          </button>
        ))}
      </div>
    </BaseModal>
  );
}
