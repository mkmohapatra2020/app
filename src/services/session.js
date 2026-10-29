// Token storage — the only module that reads or writes authentication values.
//
// One record in sessionStorage (this browser tab only; closing the tab signs out):
//   { token, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, user }
// Expiry values are UTC epoch milliseconds (0 = unknown).
//
// XSS note: anything in web storage can be read by script running on this origin, so the
// site must not run untrusted script. Tokens are never logged, put in URLs or sent anywhere
// except the API's Authorization header and the refresh-token request body.
const KEY = 'wl-session';
export const SESSION_EVENT = 'wl:session';

// Older builds kept the session in localStorage: remove it so no token or user id stays there.
try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }

const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch { return null; } };

export const session = {
  get() { return read(); },
  token() { return read()?.token || null; },
  refreshToken() { return read()?.refreshToken || null; },
  /** Access-token expiry, UTC ms (0 when unknown). */
  accessExpiresAt() { return Number(read()?.accessTokenExpiresAt) || 0; },
  /** Refresh-token expiry, UTC ms (0 when unknown). */
  refreshExpiresAt() { return Number(read()?.refreshTokenExpiresAt) || 0; },
  user() { return read()?.user || null; },
  isAuthenticated() { return !!read()?.token; },
  /** Replace the whole record in one write (token rotation is atomic for readers). */
  set(next) {
    try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: next }));
  },
  update(userPatch) { const cur = read(); if (cur) this.set({ ...cur, user: { ...cur.user, ...userPatch } }); },
  /** Remove every authentication value. */
  clear(reason) {
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: null, reason }));
  },
};
export default session;
