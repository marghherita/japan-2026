import { DayCard } from './DayCard';
import type {
  SectionData, WeatherDataMap, Row, DayInfo,
  AlertData, TitleOverridesData, ItineraryData, AlertsData,
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
  onSwapDay: (keyA: string, keyB: string) => void;
}

export function Section({
  section, activeSection, onToggle, weatherData, itinerary,
  onRowsChange, allDays, onMoveRow, cardVersions, alerts,
  onAlertChange, titleOverrides, onSwapDay,
}: Props) {
  const isOpen = activeSection === section.id;

  return (
    <div className="section">
      <button className="section-label" onClick={() => onToggle(section.id)}>
        <span>{section.label}</span>
        <span className="section-sub">{section.subtitle}</span>
        <span className="section-chevron" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
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
                onSwapDay={onSwapDay}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
