/**
 * App-wide authentication state.
 *
 * Tokens live in services/session.js (sessionStorage), so the JavaScript services,
 * `useSession()` and this context always agree.
 *
 *  - Startup: the stored session is kept only while its refresh token is valid; if the
 *    access token is stale it is refreshed first (`isInitializing` until done).
 *  - While signed in, the access token is refreshed shortly before it expires.
 *  - A rejected refresh / unrecoverable 401 clears the session and sets `authExpired`.
 */
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AUTH_EXPIRED_EVENT, ApiError } from '../api/errors.ts';
import { fetchProfile, login as apiLogin, logout as apiLogout } from '../api/authApi.ts';
import { REFRESH_WINDOW_MS, accessExpiry, accessNeedsRefresh, refreshSession, refreshUsable, restoreSession } from '../api/tokenManager.ts';
import type { AuthUser } from '../api/types.ts';
import { session, SESSION_EVENT } from '../services/session.js';

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  /** Restoring / refreshing the stored session on startup. Protected content waits for this. */
  isInitializing: boolean;
  /** A sign-in or profile refresh is in flight. */
  isLoading: boolean;
  /** The last session ended because authentication failed (401 / refresh rejected). */
  authExpired: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  /** Exchange the refresh token for new tokens now. */
  refresh: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  /** `{ Authorization: 'Bearer …' }` when signed in, else `{}`. */
  getAuthHeaders: () => Record<string, string>;
  clearAuthExpired: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface Snapshot { token: string | null; user: AuthUser | null }
const read = (): Snapshot => ({ token: session.token(), user: (session.user() as AuthUser | null) || null });
const MAX_TIMER = 2_147_000_000; // setTimeout limit (~24.8 days)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Snapshot>(read);
  // Only wait when there is something to restore that needs a network round trip.
  const [isInitializing, setInitializing] = useState(() => !!session.token() && accessNeedsRefresh() && refreshUsable());
  const [isLoading, setLoading] = useState(false);
  const [authExpired, setAuthExpired] = useState(false);

  useEffect(() => {
    const onSession = () => setState(read());
    const onExpired = () => setAuthExpired(true);
    window.addEventListener(SESSION_EVENT, onSession);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    let alive = true;
    restoreSession().finally(() => { if (alive) { setState(read()); setInitializing(false); } });
    return () => { alive = false; window.removeEventListener(SESSION_EVENT, onSession); window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired); };
  }, []);

  // Proactive refresh shortly before the access token expires (also covers idle tabs).
  useEffect(() => {
    if (!state.token || isInitializing) return undefined;
    const exp = accessExpiry();
    if (!exp || !refreshUsable()) return undefined;
    const wait = Math.min(MAX_TIMER, Math.max(1_000, exp - REFRESH_WINDOW_MS - Date.now()));
    const t = setTimeout(() => { refreshSession().catch(() => { /* 401 ends the session; network errors retry on next request */ }); }, wait);
    return () => clearTimeout(t);
  }, [state.token, isInitializing]);

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    setLoading(true);
    try {
      const s = await apiLogin({ usernameOrEmail, password });
      setAuthExpired(false);
      return s.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => { setAuthExpired(false); apiLogout(); }, []);

  const refresh = useCallback(async () => { await refreshSession(); }, []);

  const refreshUser = useCallback(async () => {
    if (!session.token()) return null;
    setLoading(true);
    try {
      return await fetchProfile();
    } catch (e) {
      if (e instanceof ApiError && e.kind === 'unauthorized') return null;
      return (session.user() as AuthUser | null) || null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const t = session.token();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, []);

  // Refresh the profile once per sign-in (after start-up restore has finished).
  useEffect(() => { if (state.token && !isInitializing) void refreshUser(); }, [state.token, isInitializing, refreshUser]);

  const value = useMemo<AuthContextValue>(() => ({
    user: state.user,
    token: state.token,
    isAuthenticated: !!state.token,
    isInitializing,
    isLoading,
    authExpired,
    login,
    logout,
    refresh,
    refreshUser,
    getAuthHeaders,
    clearAuthExpired: () => setAuthExpired(false),
  }), [state, isInitializing, isLoading, authExpired, login, logout, refresh, refreshUser, getAuthHeaders]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
