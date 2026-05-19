import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";

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

export const loadItinerary = () =>
  get(ref(db, "itinerary")).then((snap) => snap.val() ?? {});

export const saveItinerary = (data) =>
  set(ref(db, "itinerary"), JSON.parse(JSON.stringify(data)));

export const loadChecklist = () =>
  get(ref(db, "checklist")).then((snap) => snap.val() ?? {});

export const saveChecklist = (data) =>
  set(ref(db, "checklist"), JSON.parse(JSON.stringify(data)));

export const loadAlerts = () =>
  get(ref(db, "alerts")).then((snap) => snap.val() ?? {});

export const saveAlerts = (data) =>
  set(ref(db, "alerts"), JSON.parse(JSON.stringify(data)));

export const loadTitleOverrides = () =>
  get(ref(db, "titleOverrides")).then((snap) => snap.val() ?? {});

export const saveTitleOverrides = (data) =>
  set(ref(db, "titleOverrides"), JSON.parse(JSON.stringify(data)));

export const loadJollies = () =>
  get(ref(db, "jollies")).then((snap) => snap.val() ?? {});

export const saveJollies = (data) =>
  set(ref(db, "jollies"), JSON.parse(JSON.stringify(data)));

export const loadJollyApplications = () =>
  get(ref(db, "jollyApplications")).then((snap) => snap.val() ?? {});

export const saveJollyApplications = (data) =>
  set(ref(db, "jollyApplications"), JSON.parse(JSON.stringify(data)));
