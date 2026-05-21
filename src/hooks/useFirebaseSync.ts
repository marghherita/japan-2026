import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../firebase';

/**
 * Real-time Firebase sync. Subscribes to onValue for live updates from other
 * devices and writes back on every local state change.
 * Returns null while the initial snapshot is in flight.
 */
export function useFirebaseSync<T extends object>(
  path: string,
): [T | null, Dispatch<SetStateAction<T | null>>] {
  const [data, setData] = useState<T | null>(null);
  // True when the last setData call came from Firebase, not from user action.
  // Prevents re-saving received data back to Firebase.
  const isRemote = useRef(false);

  useEffect(() => {
    const unsub = onValue(
      ref(db, path),
      (snap) => {
        isRemote.current = true;
        setData((snap.val() as T) ?? ({} as T));
      },
      () => setData({} as T), // on error fall back to empty
    );
    return unsub;
  }, [path]);

  useEffect(() => {
    if (data === null) return;
    if (isRemote.current) { isRemote.current = false; return; }
    set(ref(db, path), JSON.parse(JSON.stringify(data))).catch(console.error);
  }, [data, path]);

  return [data, setData];
}
