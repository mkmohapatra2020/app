/**
 * Header language button + menu (English / ଓଡ଼ିଆ), and a compact row for the phone menu.
 * Same look and keyboard behaviour as the theme switcher (reuses its classes).
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { LANGUAGES, useLanguage } from './language.ts';
import './commonStrings.ts';
import './language.css';
import './odia-font.css';

const globe = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z" />
  </svg>
);

export function LanguageRow() {
  const { lang, setLanguage } = useLanguage();
  return (
    <div className="nav-theme-row">
      <span id="nav-lang-label">Language · ଭାଷା</span>
      <div className="nav-theme-opts" role="radiogroup" aria-labelledby="nav-lang-label">
        {LANGUAGES.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={lang === l.id} lang={l.id} onClick={() => setLanguage(l.id)}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LanguageSwitcher() {
  const { lang, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); box.current?.querySelector<HTMLButtonElement>('.lang-btn')?.focus(); } };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    items.current[LANGUAGES.findIndex((l) => l.id === lang)]?.focus();
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open, lang]);

  const onMenuKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const i = items.current.indexOf(document.activeElement as HTMLButtonElement);
    const n = LANGUAGES.length;
    items.current[(i + (e.key === 'ArrowDown' ? 1 : n - 1)) % n]?.focus();
  };

  const current = LANGUAGES.find((l) => l.id === lang) ?? LANGUAGES[0];
  return (
    <div className="theme-switch lang-switch" ref={box}>
      <button type="button" className="theme-btn lang-btn" aria-haspopup="true" aria-expanded={open}
        aria-label={`Language: ${current.english}. Change language`} title="Change language · ଭାଷା ବଦଳାନ୍ତୁ"
        onClick={() => setOpen((o) => !o)}>
        {globe}
        <span className="lang-code" lang={current.id}>{current.short}</span>
      </button>
      <ul className={`theme-menu${open ? ' open' : ''}`} role="menu" aria-label="Language" onKeyDown={onMenuKey}>
        {LANGUAGES.map((l, i) => (
          <li key={l.id} role="none">
            <button type="button" role="menuitemradio" aria-checked={lang === l.id} tabIndex={open ? 0 : -1} lang={l.id}
              ref={(el) => { items.current[i] = el; }}
              onClick={() => { setLanguage(l.id); setOpen(false); }}>
              <span className="lang-badge" aria-hidden="true">{l.id === 'or' ? 'ଓ' : 'A'}</span>
              <span>{l.label}{l.label !== l.english && <small>{l.english}</small>}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
