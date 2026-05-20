import type { DayInfo } from '../types';

export const MONTHS = [
  'gen', 'feb', 'mar', 'apr', 'mag', 'giu',
  'lug', 'ago', 'set', 'ott', 'nov', 'dic',
] as const;

export function formatDayOption(day: Pick<DayInfo, 'key' | 'label'>): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day.key)) return day.label;
  const d = new Date(day.key + 'T12:00:00');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${day.label}`;
}
