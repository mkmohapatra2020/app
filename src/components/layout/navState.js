// Which header section and which sub-menu item match the current page.
// Used by the header (Nav) to highlight the current section and dropdown item.
import { useSyncExternalStore } from 'react';
import { mainNav } from '../../data/site.js';

const KEY = 'wl:nav-section';
const EVENT = 'wl:nav-section';

/** Flat, de-duplicated sub-menu items of a section: [{ to, label, sub, icon, group }]. */
export function itemsOf(m) {
  const seen = new Set();
  return (m.groups || []).flatMap((g) => g.items.map(([to, label, sub, icon]) => ({ to, label, sub, icon, group: g.title || '' })))
    .filter((it) => (seen.has(it.to) ? false : seen.add(it.to)));
}

const parse = (to) => { const u = new URL(to, 'http://x'); return { path: u.pathname, search: u.search, hash: u.hash }; };

/**
 * How well a link matches the current location: -1 = no match, higher = better.
 * Same path is required; matching ?query and #hash add points, a link whose
 * query/hash differs from the page scores below a plain link to the same path.
 */
export function matchScore(to, loc) {
  const t = parse(to);
  if (t.path !== loc.pathname) return t.path !== '/' && loc.pathname.startsWith(`${t.path}/`) ? 0 : -1; // sub-page (e.g. /learn/workshops/3)
  let s = 1;
  if (t.search) s += t.search === loc.search ? 3 : -5; else if (loc.search) s -= 0.5;
  if (t.hash) s += t.hash === loc.hash ? 2 : -5; else if (loc.hash) s -= 0.25;
  return s;
}

/** Best-matching sub-menu item of a section for this location (or null). */
export function bestItem(m, loc) {
  let best = null;
  let score = -1;
  for (const it of itemsOf(m)) {
    const s = matchScore(it.to, loc);
    if (s > score) { score = s; best = it; }
  }
  return score >= 0 ? best : null;
}

// The section the visitor navigated from (pages like Elderly DIY live in two menus).
function readPref() { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } }
export function rememberSection(key) {
  try { sessionStorage.setItem(KEY, key); } catch { /* storage blocked */ }
  window.dispatchEvent(new Event(EVENT));
}
export function usePreferredSection() {
  return useSyncExternalStore((cb) => { window.addEventListener(EVENT, cb); return () => window.removeEventListener(EVENT, cb); }, readPref, () => '');
}

/**
 * Active header section for a location. Priority:
 *   1. a section whose landing page this is exactly (e.g. /kids → Kids)
 *   2. the section the visitor came from, if this page belongs to it
 *   3. a section whose own pages these are (e.g. /learn/... under its path)
 *   4. the first section listing this page
 */
export function activeSection(loc, pref = '') {
  if (loc.pathname === '/') return null;
  const own = (m) => { const p = parse(m.to).path; return loc.pathname === p || loc.pathname.startsWith(`${p}/`); };
  const lists = (m) => own(m) || itemsOf(m).some((it) => matchScore(it.to, loc) >= 0);
  const candidates = mainNav.filter(lists);
  const landing = (m) => loc.pathname === parse(m.to).path;
  return candidates.find(landing) || candidates.find((m) => m.key === pref) || candidates.find(own) || candidates[0] || null;
}
