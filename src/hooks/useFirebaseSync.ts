import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';

const TIMEOUT_MS = 8000;

/**
 * Loads data from Firebase on mount and saves it whenever it changes.
 * Returns null while the initial load is in flight.
 */
export function useFirebaseSync<T extends object>(
  loader: () => Promise<T>,
  saver: (data: T) => Promise<void>,
): [T | null, Dispatch<SetStateAction<T | null>>] {
  const [data, setData] = useState<T | null>(null);
  const hasLoaded = useRef(false);
  const loaderRef = useRef(loader);
  const saverRef = useRef(saver);

  useEffect(() => {
    Promise.race([
      loaderRef.current(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS),
      ),
    ])
      .then((d) => setData(d ?? ({} as T)))
      .catch(() => setData({} as T));
  }, []); // intentionally empty — runs once on mount

  useEffect(() => {
    if (data === null) return;
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      return;
    }
    saverRef.current(data).catch(console.error);
  }, [data]);

  return [data, setData];
}
