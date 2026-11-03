/**
 * Site language: 'en' | 'or' (Odia). Stored in localStorage (like the theme) and applied
 * as <html lang>. Text is translated with `t('English text', { vars })`: the English text
 * is the key, so anything without a translation simply stays in English.
 *
 * Feature modules add their dictionaries with `registerStrings('or', {...})`.
 */
import { useCallback, useSyncExternalStore } from 'react';

export type Lang = 'en' | 'or';
export type Vars = Record<string, string | number>;
export type T = (key: string, vars?: Vars) => string;

export const LANGUAGES: { id: Lang; label: string; english: string; short: string; locale: string }[] = [
  { id: 'en', label: 'English', english: 'English', short: 'EN', locale: 'en-IN' },
  { id: 'or', label: 'ଓଡ଼ିଆ', english: 'Odia', short: 'ଓଡ଼ିଆ', locale: 'or-IN' },
];

const KEY = 'wl-lang';
const listeners = new Set<() => void>();
const dictionaries: Record<Lang, Record<string, string>> = { en: {}, or: {} };

const valid = (v: unknown): v is Lang => LANGUAGES.some((l) => l.id === v);
function read(): Lang {
  try { const v = localStorage.getItem(KEY); return valid(v) ? v : 'en'; } catch { return 'en'; }
}
let lang: Lang = typeof window !== 'undefined' ? read() : 'en';

function apply() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
}
apply();

export function setLanguage(next: Lang) {
  if (!valid(next)) return;
  lang = next;
  try { localStorage.setItem(KEY, next); } catch { /* storage blocked: still applies for this visit */ }
  apply();
  listeners.forEach((l) => l());
}

export const getLanguage = (): Lang => lang;
export const localeOf = (l: Lang = lang): string => LANGUAGES.find((x) => x.id === l)?.locale ?? 'en-IN';

/** Adds translations (English text → translated text). Later entries win. */
export function registerStrings(l: Lang, dict: Record<string, string>) {
  Object.assign(dictionaries[l], dict);
}
export const hasTranslation = (l: Lang, key: string) => l === 'en' || key in dictionaries[l];

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s);

export function translate(l: Lang, key: string, vars?: Vars): string {
  return fill(l === 'en' ? key : dictionaries[l][key] ?? key, vars);
}

/** English, for code paths without a hook (and tests). */
export const enT: T = (key, vars) => translate('en', key, vars);

const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { lang = read(); apply(); l(); } };
  window.addEventListener('storage', onStorage); // other tabs
  return () => { listeners.delete(l); window.removeEventListener('storage', onStorage); };
};

/** { lang, setLanguage } — re-renders when the language changes. */
export function useLanguage() {
  const current = useSyncExternalStore(subscribe, () => lang, () => 'en' as Lang);
  return { lang: current, setLanguage, locale: localeOf(current) };
}

/** Translator for the current language. */
export function useT(): T {
  const { lang: current } = useLanguage();
  return useCallback<T>((key, vars) => translate(current, key, vars), [current]);
}
