import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import TryNow from '../../features/tryNow/TryNow.jsx';
import { nav } from '../../data/site.js';
import { bookWorkshop, useEnquiry } from '../../features/enquiry/enquiry.js';

// Sticky header: shrinks on scroll, shows reading progress, highlights the
// section in view with a sliding indicator, and animates the phone menu.
export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('');
  const [pill, setPill] = useState(null);
  const navRef = useRef(null);
  const listRef = useRef(null);
  const progressRef = useRef(null);
  const enquiry = useEnquiry();

  useEffect(() => {
    const onDocClick = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setOpen(false); };
    const onResize = () => { if (window.innerWidth > 980) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 24);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
        ticking = false;
      });
    };
    document.addEventListener('click', onDocClick);
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      document.removeEventListener('click', onDocClick); window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Which nav section is in the middle of the screen? Looked up on each check
  // so it keeps working when lazily loaded sections replace their placeholders.
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      if (window.scrollY < 200) { setActive(''); return; }
      const mid = window.innerHeight * 0.45;
      let current = '';
      for (const [href] of nav) {
        const el = document.querySelector(href);
        if (el && el.getBoundingClientRect().top <= mid) current = href;
      }
      setActive(current);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    check();
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);

  // Move the sliding indicator under the active link (desktop).
  useLayoutEffect(() => {
    const place = () => {
      const a = listRef.current?.querySelector(`a[href="${active}"]`);
      if (!a || window.innerWidth <= 980) { setPill(null); return; }
      setPill({ left: a.offsetLeft, width: a.offsetWidth });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [active, scrolled]);

  return (
    <nav className={`nav${open ? ' nav-open' : ''}${scrolled ? ' nav-scrolled' : ''}`} ref={navRef} aria-label="Main">
      <div className="nav-inner">
        <a className="nav-logo" href="#top"><span className="nav-logo-mark" aria-hidden="true">✦</span>Weekend-Live</a>
        <button
          className="nav-toggle" type="button"
          aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}
          aria-controls="primary-navigation" onClick={() => setOpen((o) => !o)}
        ><span></span><span></span><span></span></button>
        <ul className="nav-links" id="primary-navigation" ref={listRef} onClick={(e) => { if (e.target.closest('a,button')) setOpen(false); }}>
          {nav.map(([href, label], i) => (
            <li key={href} style={{ '--i': i }}>
              <a href={href} className={active === href ? 'is-active' : ''} aria-current={active === href ? 'location' : undefined}>{label}</a>
            </li>
          ))}
          <li className="nav-mobile-cta" style={{ '--i': nav.length }}><button type="button" onClick={() => bookWorkshop(enquiry)}>Book Workshop</button></li>
          {pill && <li className="nav-pill" aria-hidden="true" style={{ transform: `translateX(${pill.left}px)`, width: pill.width }} />}
        </ul>
        <div className="nav-actions">
          <TryNow />
          <button type="button" className="nav-cta" onClick={() => bookWorkshop(enquiry)}><span>Book Workshop</span></button>
        </div>
      </div>
      <div className="nav-progress" ref={progressRef} aria-hidden="true" />
    </nav>
  );
}
