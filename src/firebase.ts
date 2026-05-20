import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set } from 'firebase/database';
import type {
  ItineraryData,
  ChecklistData,
  AlertsData,
  TitleOverridesData,
  JolliesData,
} from './types';

const app = initializeApp({
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
});

const db = getDatabase(app);

const load = <T>(path: string): Promise<T> =>
  get(ref(db, path)).then((snap) => (snap.val() as T) ?? ({} as T));

const save = <T>(path: string, data: T): Promise<void> =>
  set(ref(db, path), JSON.parse(JSON.stringify(data)));

export const loadItinerary      = (): Promise<ItineraryData>      => load('itinerary');
export const saveItinerary      = (d: ItineraryData)      => save('itinerary', d);

export const loadChecklist      = (): Promise<ChecklistData>      => load('checklist');
export const saveChecklist      = (d: ChecklistData)      => save('checklist', d);

export const loadAlerts         = (): Promise<AlertsData>         => load('alerts');
export const saveAlerts         = (d: AlertsData)         => save('alerts', d);

export const loadTitleOverrides = (): Promise<TitleOverridesData> => load('titleOverrides');
export const saveTitleOverrides = (d: TitleOverridesData) => save('titleOverrides', d);

export const loadJollies        = (): Promise<JolliesData>        => load('jollies');
export const saveJollies        = (d: JolliesData)        => save('jollies', d);

export const loadJollyApplications = (): Promise<Record<string, unknown>> => load('jollyApplications');
export const saveJollyApplications = (d: Record<string, unknown>) => save('jollyApplications', d);
