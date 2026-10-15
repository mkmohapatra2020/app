import { useEffect, useRef, useState } from 'react';
import { THEMES, useTheme } from './theme.js';

const ICONS = {
  light: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" /></svg>,
  dark: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></svg>,
  forest: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 6 11h3l-4 6h14l-4-6h3z" /><path d="M12 17v4" /></svg>,
};

// Compact row for the phone/tablet menu: "Theme" + four choices.
export function ThemeRow() {
  const { pref, setTheme } = useTheme();
  return (
    <div className="nav-theme-row">
      <span id="nav-theme-label">Theme</span>
      <div className="nav-theme-opts" role="radiogroup" aria-labelledby="nav-theme-label">
        {THEMES.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={pref === t.id} onClick={() => setTheme(t.id)}>
            <span className={`theme-swatch sw-${t.id}`} aria-hidden="true" />{t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Header button + menu: System / Light / Dark / Forest.
export default function ThemeSwitcher() {
  const { pref, theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const items = useRef([]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); box.current?.querySelector('.theme-btn')?.focus(); } };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    items.current[THEMES.findIndex((t) => t.id === pref)]?.focus();
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open, pref]);

  const onMenuKey = (e) => {
    const i = items.current.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = THEMES.length;
      items.current[(i + (e.key === 'ArrowDown' ? 1 : n - 1)) % n]?.focus();
    }
  };

  const current = THEMES.find((t) => t.id === pref);
  return (
    <div className="theme-switch" ref={box}>
      <button type="button" className="theme-btn" aria-haspopup="true" aria-expanded={open}
        aria-label={`Theme: ${current.label}${pref === 'system' ? ` (${theme})` : ''}. Change theme`}
        title="Change theme" onClick={() => setOpen((o) => !o)}>
        {ICONS[theme]}
        <span className="theme-label">Theme</span>
        <svg className="theme-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <ul className={`theme-menu${open ? ' open' : ''}`} role="menu" aria-label="Theme" onKeyDown={onMenuKey}>
        {THEMES.map((t, i) => (
          <li key={t.id} role="none">
            <button type="button" role="menuitemradio" aria-checked={pref === t.id} tabIndex={open ? 0 : -1}
              ref={(el) => { items.current[i] = el; }}
              onClick={() => { setTheme(t.id); setOpen(false); }}>
              <span className={`theme-swatch sw-${t.id}`} aria-hidden="true" />
              <span>{t.label}<small>{t.hint}</small></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
