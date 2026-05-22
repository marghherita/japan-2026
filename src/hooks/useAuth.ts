import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebase';

const ALLOWED_EMAILS = ['margherita.grasso3@gmail.com', 'greta51198@gmail.com'];

export type AuthState = 'loading' | 'allowed' | 'denied' | 'unauthenticated';

export function useAuth(): { user: User | null; state: AuthState } {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<AuthState>('loading');

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setState('unauthenticated');
      else if (ALLOWED_EMAILS.includes(u.email ?? '')) setState('allowed');
      else setState('denied');
    });
  }, []);

  return { user, state };
}
