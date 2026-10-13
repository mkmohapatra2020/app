import { useEffect, useState } from 'react';
import { session, SESSION_EVENT } from '../services/session.js';

/** Current session ({ token, user } | null), updated live on sign-in / sign-out. */
export default function useSession() {
  const [value, setValue] = useState(() => session.get());
  useEffect(() => {
    const on = () => setValue(session.get());
    window.addEventListener(SESSION_EVENT, on);
    window.addEventListener('storage', on); // other tabs
    return () => { window.removeEventListener(SESSION_EVENT, on); window.removeEventListener('storage', on); };
  }, []);
  return { session: value, user: value?.user || null, isAuthenticated: !!value?.token, isAdmin: !!value?.user?.isAdmin };
}
