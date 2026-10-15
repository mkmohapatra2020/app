/**
 * Theme preference: 'system' | 'light' | 'dark' | 'forest'.
 * Stored in localStorage; applied as <html data-theme="light|dark|forest">.
 * index.html runs the same logic inline before first paint (no flash).
 */
import { useEffect, useSyncExternalStore } from 'react';

export const THEMES = [
  { id: 'system', label: 'System', hint: 'Match this device' },
  { id: 'light', label: 'Light', hint: 'Warm beige & wood' },
  { id: 'dark', label: 'Dark', hint: 'Easy on the eyes at night' },
  { id: 'forest', label: 'Forest', hint: 'Leaf green & sage' },
];
const KEY = 'wl-theme';
const META = { light: '#3E2A18', dark: '#15100A', forest: '#22351F' };
const listeners = new Set();
const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

const read = () => { try { const v = localStorage.getItem(KEY); return THEMES.some((t) => t.id === v) ? v : 'system'; } catch { return 'system'; } };
let pref = typeof window !== 'undefined' ? read() : 'system';

export const resolve = (p) => (p === 'system' ? (mq?.matches ? 'dark' : 'light') : p);

function apply(animate) {
  const root = document.documentElement;
  const theme = resolve(pref);
  if (animate) {
    root.classList.add('theme-anim');
    window.setTimeout(() => root.classList.remove('theme-anim'), 400);
  }
  root.dataset.theme = theme;
  root.dataset.themePref = pref;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[theme]);
}

export function setTheme(next) {
  pref = next;
  try { localStorage.setItem(KEY, next); } catch { /* storage blocked: still applies for this visit */ }
  apply(true);
  listeners.forEach((l) => l());
}

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

/** { pref, theme, setTheme } — re-renders when the preference or system scheme changes. */
export function useTheme() {
  const current = useSyncExternalStore(subscribe, () => pref, () => 'system');
  useEffect(() => {
    apply(false);
    if (!mq) return undefined;
    const onChange = () => { if (pref === 'system') { apply(true); listeners.forEach((l) => l()); } };
    mq.addEventListener?.('change', onChange);
    const onStorage = (e) => { if (e.key === KEY) { pref = read(); apply(true); listeners.forEach((l) => l()); } };
    window.addEventListener('storage', onStorage);
    return () => { mq.removeEventListener?.('change', onChange); window.removeEventListener('storage', onStorage); };
  }, []);
  return { pref: current, theme: resolve(current), setTheme };
}
