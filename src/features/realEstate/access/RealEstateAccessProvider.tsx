/**
 * Real Estate feature gate. After sign-in it asks GET /realestate/access once; until a
 * response says `enabled: true`, the module is hidden. A missing endpoint (404), 401/403
 * or network error all leave it disabled — access is never assumed.
 *
 * This only drives navigation and UX. Every API call is still authorised by the backend.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext } from '../../../auth/AuthContext.tsx';
import { isApiError, type ApiError } from '../../../api/errors.ts';
import { session, SESSION_EVENT } from '../../../services/session.js';
import { DISABLED_ACCESS, fetchRealEstateAccess } from '../api/realEstateAccessApi.ts';
import type { RealEstateAccess, RealEstateFeature } from '../types/realEstateTypes.ts';

export type AccessStatus = 'signedOut' | 'loading' | 'ready' | 'error';

export interface RealEstateAccessValue {
  status: AccessStatus;
  access: RealEstateAccess;
  enabled: boolean;
  /** Set when discovery failed (incl. 404 "not deployed yet"). */
  error: ApiError | null;
  has: (feature: RealEstateFeature) => boolean;
  /** Fine-grained grant from the backend (e.g. "Partners.Create"); admins pass too. */
  can: (permission: string) => boolean;
  reload: () => void;
}

const disabledValue = (status: AccessStatus, error: ApiError | null = null, reload = () => {}): RealEstateAccessValue => ({
  status, access: DISABLED_ACCESS, enabled: false, error, has: () => false, can: () => false, reload,
});

export const RealEstateAccessContext = createContext<RealEstateAccessValue>(disabledValue('signedOut'));

/** Builds a context value from an access response (also used by tests). */
export function accessValue(access: RealEstateAccess, isAdmin = false, reload = () => {}): RealEstateAccessValue {
  if (!access.enabled) return disabledValue('ready', null, reload);
  const features = new Set(access.features);
  const perms = new Set(access.permissions.map((p) => p.toLowerCase()));
  return {
    status: 'ready', access, enabled: true, error: null, reload,
    has: (f) => features.has(f),
    can: (p) => isAdmin || perms.has(p.toLowerCase()),
  };
}

function useSignedIn(): { token: string | null; userId: string; isAdmin: boolean } {
  const auth = useContext(AuthContext);
  // Outside <AuthProvider> (tests, isolated renders) fall back to the shared session store.
  const [fallback, setFallback] = useState(() => session.token());
  useEffect(() => {
    if (auth) return undefined;
    const on = () => setFallback(session.token());
    window.addEventListener(SESSION_EVENT, on);
    return () => window.removeEventListener(SESSION_EVENT, on);
  }, [auth]);
  const user = (auth ? auth.user : session.user()) as { id?: unknown; isAdmin?: boolean } | null;
  return { token: auth ? auth.token : fallback, userId: String(user?.id ?? ''), isAdmin: !!user?.isAdmin };
}

export function RealEstateAccessProvider({ children }: { children: ReactNode }) {
  const { token, userId, isAdmin } = useSignedIn();
  const signedIn = !!token;
  const [state, setState] = useState<{ status: AccessStatus; access: RealEstateAccess; error: ApiError | null }>({ status: signedIn ? 'loading' : 'signedOut', access: DISABLED_ACCESS, error: null });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  // Keyed on the user, not the token: a refreshed access token doesn't re-ask.
  useEffect(() => {
    if (!signedIn) { setState({ status: 'signedOut', access: DISABLED_ACCESS, error: null }); return undefined; }
    const ctrl = new AbortController();
    setState({ status: 'loading', access: DISABLED_ACCESS, error: null });
    fetchRealEstateAccess(ctrl.signal)
      .then((access) => { if (!ctrl.signal.aborted) setState({ status: 'ready', access, error: null }); })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted || (isApiError(e) && e.kind === 'cancelled')) return;
        setState({ status: 'error', access: DISABLED_ACCESS, error: isApiError(e) ? e : null });
      });
    return () => ctrl.abort();
  }, [signedIn, userId, nonce]);

  const value = useMemo<RealEstateAccessValue>(() => {
    if (state.status !== 'ready') return disabledValue(state.status, state.error, reload);
    return accessValue(state.access, isAdmin, reload);
  }, [state, isAdmin, reload]);

  return <RealEstateAccessContext.Provider value={value}>{children}</RealEstateAccessContext.Provider>;
}

export const useRealEstateAccess = () => useContext(RealEstateAccessContext);

export default RealEstateAccessProvider;
