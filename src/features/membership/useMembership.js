import { useEffect } from 'react';
import useResource, { invalidate } from '../../hooks/useResource.js';
import useSession from '../../hooks/useSession.js';
import { membershipService as M } from '../../services/membershipService.js';
import { SESSION_EVENT } from '../../services/session.js';

// Sign-in, sign-out or an expired token: never show one user's balances to another.
if (typeof window !== 'undefined') window.addEventListener(SESSION_EVENT, () => invalidate('mem:my:'));

// Shared, cached membership data. Keys are namespaced so invalidate('mem:') resets all.
const any = (d) => d != null;


// Signed-in only: key is null for guests so nothing is requested.
const CHANGED = 'wl:membership-changed';
function useMine(name, fn, fallback) {
  const { isAuthenticated } = useSession();
  const res = useResource(isAuthenticated ? `mem:my:${name}` : null, fn, { fallback, accept: any, ttl: 20 * 1000 });
  const { reload } = res;
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    window.addEventListener(CHANGED, reload);
    return () => window.removeEventListener(CHANGED, reload);
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps
  return res;
}
export const useMyMemberships = () => useMine('memberships', (a) => M.myMemberships(a), []);
export const useMyEntitlements = () => useMine('entitlements', (a) => M.myEntitlements(a), { plans: [], entitlements: [] });
export const useMyBenefits = () => useMine('benefits', (a) => M.myBenefits(a), null);
export const useMembershipOverview = () => useMine('overview', (a) => M.overview(a), null);
export const useMyCredits = () => useMine('my-credits', (a) => M.myCredits(a), null);

/** AI credits; refreshes when the visitor returns to the tab. */
export function useAiCredits() {
  const credits = useMine('credits', (a) => M.myAiCredits(a), null);
  const { reload } = credits;
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') reload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return credits;
}

/** Call after anything that can change balances (submit, completion, grant). */
export function refreshMembership() { invalidate('mem:my:'); window.dispatchEvent(new Event(CHANGED)); }
