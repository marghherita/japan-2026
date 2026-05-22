import { DayCard } from './DayCard';
import { ChevronDown } from 'lucide-react';
import type {
  SectionData, WeatherDataMap, Row, DayInfo,
  AlertData, TitleOverridesData, BadgeOverridesData, ItineraryData, AlertsData,
} from '../types';

interface Props {
  section: SectionData;
  activeSection: string | null;
  onToggle: (id: string) => void;
  weatherData: WeatherDataMap;
  itinerary: ItineraryData | null;
  onRowsChange: (key: string, rows: Row[]) => void;
  allDays: DayInfo[];
  onMoveRow: (row: Row, toKey: string) => void;
  cardVersions: Record<string, number>;
  alerts: AlertsData | null;
  onAlertChange: (dayKey: string, val: AlertData) => void;
  titleOverrides: TitleOverridesData | null;
  badgeOverrides: BadgeOverridesData | null;
  onDayEdit: (dayKey: string, patch: { title?: string; badge?: string }) => void;
  onSwapDay: (keyA: string, keyB: string) => void;
  todayKey: string | null;
}

export function Section({
  section, activeSection, onToggle, weatherData, itinerary,
  onRowsChange, allDays, onMoveRow, cardVersions, alerts,
  onAlertChange, titleOverrides, badgeOverrides, onDayEdit, onSwapDay, todayKey,
}: Props) {
  const isOpen = activeSection === section.id;

  return (
    <div className="section">
      <button className="section-label" onClick={() => onToggle(section.id)}>
        <span>{section.label}</span>
        <span className="section-sub">{section.subtitle}</span>
        <span className="section-chevron" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}><ChevronDown size={14} /></span>
      </button>
      {isOpen && (
        <div className="section-days">
          {section.days.map((day) => {
            const dk = day.date ?? day.title;
            return (
              <DayCard
                key={`${dk}-${cardVersions[dk] ?? 0}`}
                day={day}
                weatherData={weatherData}
                initialRows={itinerary?.[dk]}
                onRowsChange={onRowsChange}
                allDays={allDays}
                onMoveRow={onMoveRow}
                alertOverride={alerts?.[dk]}
                onAlertChange={onAlertChange}
                titleOverride={titleOverrides?.[dk]}
                titleOverrides={titleOverrides}
                badgeOverride={badgeOverrides?.[dk]}
                onDayEdit={onDayEdit}
                onSwapDay={onSwapDay}
                isToday={dk === todayKey}
                defaultOpen={todayKey ? dk === todayKey : true}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
