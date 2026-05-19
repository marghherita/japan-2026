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

export const loadItinerary  = () =>
  get(ref(db, "itinerary")).then((snap) => snap.val() ?? {});

export const saveItinerary  = (data) =>
  set(ref(db, "itinerary"), JSON.parse(JSON.stringify(data)));
