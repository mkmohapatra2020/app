import { useEffect, useRef, useState } from 'react';
import TryNow from './TryNow.jsx';

const links = [
  ['#products', 'Products'],
  ['#blueprint', 'A Build, Mapped'],
  ['#services', 'Services'],
  ['#crew', 'The Crew'],
  ['#feedback', 'Tell Us'],
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setOpen(false); };
    const onResize = () => { if (window.innerWidth > 980) setOpen(false); };
    document.addEventListener('click', onDocClick);
    window.addEventListener('resize', onResize);
    return () => { document.removeEventListener('click', onDocClick); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <nav className={`nav${open ? ' nav-open' : ''}`} ref={navRef}>
      <div className="nav-inner">
        <span className="nav-logo">Weekend-Live</span>
        <button
          className="nav-toggle" type="button"
          aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}
          aria-controls="primary-navigation" onClick={() => setOpen((o) => !o)}
        ><span></span><span></span><span></span></button>
        <ul className="nav-links" id="primary-navigation" onClick={(e) => { if (e.target.closest('a')) setOpen(false); }}>
          {links.map(([href, label]) => <li key={href}><a href={href}>{label}</a></li>)}
          <li className="nav-mobile-cta"><a href="tel:+918917250407">Call 89172 50407</a></li>
        </ul>
        <div className="nav-actions">
          <TryNow />
          <a className="nav-cta" href="tel:+918917250407">Call 89172 50407</a>
        </div>
      </div>
    </nav>
  );
}
