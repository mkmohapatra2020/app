// Signed-in session (token + user) — kept in localStorage, broadcast on change.
const KEY = 'wl-session';
export const SESSION_EVENT = 'wl:session';

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };

export const session = {
  get() { return read(); },
  token() { return read()?.token || null; },
  user() { return read()?.user || null; },
  isAuthenticated() { return !!read()?.token; },
  set(next) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: next }));
  },
  update(userPatch) { const cur = read(); if (cur) this.set({ ...cur, user: { ...cur.user, ...userPatch } }); },
  clear(reason) {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: null, reason }));
  },
};
export default session;
