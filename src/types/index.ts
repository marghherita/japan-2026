// ── Row types ────────────────────────────────────────────────────────────────

export interface Row {
  _id: string;
  time: string;
  text: string;
  note?: string;
  tags?: string[];
  url?: string;
  coords?: [number, number];
  done?: boolean;
}

/** Row as defined in static data — no _id, no done flag */
export type StaticRow = Omit<Row, '_id' | 'done'>;

// ── Alert types ──────────────────────────────────────────────────────────────

export interface AlertData {
  type: 'warn' | 'info' | 'ok' | '';
  text: string;
}

// ── Day / Section types ──────────────────────────────────────────────────────

export interface DayData {
  badge: string;
  title: string;
  weather?: string;
  date?: string;
  city?: string;
  alert?: AlertData;
  rows: StaticRow[];
}

export interface SectionData {
  id: string;
  label: string;
  subtitle: string;
  days: DayData[];
}

/** Flattened day descriptor used in dropdowns and swap lists */
export interface DayInfo {
  key: string;
  label: string;
  badge: string;
}

// ── Style types ──────────────────────────────────────────────────────────────

export interface TagStyle {
  bg: string;
  color: string;
}

export interface BadgeStyle {
  bg: string;
  color: string;
  label: string;
}

// ── Jolly types ──────────────────────────────────────────────────────────────

export interface JollyActivity {
  time: string;
  text: string;
  note?: string;
  tags?: string[];
  url?: string;
}

// ── Checklist types ──────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface ChecklistCategoryData {
  id: string;
  label: string;
  icon: string;
  defaultItems: ChecklistItem[];
}

// ── Weather types ────────────────────────────────────────────────────────────

export interface HourlySlot {
  hour: string;
  icon: string;
  temp: number;
  rain: number;
}

export interface WeatherDay {
  icon: string;
  temp: number;
  rain: number;
}

export type WeatherDataMap = Record<string, WeatherDay | HourlySlot[]>;

// ── Map types ────────────────────────────────────────────────────────────────

export interface MapPoint {
  label: string;
  coords: [number, number];
  done?: boolean;
}

// ── Edit state types ─────────────────────────────────────────────────────────

export interface EditVals {
  time: string;
  text: string;
  note: string;
  tags: string[];
  url: string;
  targetDay?: string;
}

// ── Firebase record types ────────────────────────────────────────────────────

export type ItineraryData = Record<string, Row[]>;
export type ChecklistData = Record<string, ChecklistItem[]>;
export type AlertsData = Record<string, AlertData>;
export type TitleOverridesData = Record<string, string>;
export type BadgeOverridesData = Record<string, string>;
export type JolliesData = Record<string, JollyActivity>;
export type DayTagsData = Record<string, string[]>;
