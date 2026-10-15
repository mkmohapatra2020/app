import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import TryNow from '../../features/tryNow/TryNow.jsx';
import ThemeSwitcher, { ThemeRow } from '../../theme/ThemeSwitcher.jsx';
import { nav, moreNav } from '../../data/site.js';
import { bookWorkshop, useEnquiry } from '../../features/enquiry/enquiry.js';
import useSession from '../../hooks/useSession.js';
import { useCart } from '../../context/CartContext.jsx';
import { authService } from '../../services/authService.js';

const isHash = (to) => to.startsWith('/#');

// Sticky header: shrinks on scroll, shows reading progress, highlights the
// current page / home section with a sliding pill, animates the phone menu.
export default function Nav() {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [section, setSection] = useState('');
  const [pill, setPill] = useState(null);
  const navRef = useRef(null);
  const listRef = useRef(null);
  const progressRef = useRef(null);
  const enquiry = useEnquiry();
  const { user, isAuthenticated, isAdmin } = useSession();
  const cart = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const onHome = location.pathname === '/';

  const closeAll = () => { setOpen(false); setMoreOpen(false); setUserOpen(false); };
  useEffect(closeAll, [location.pathname, location.hash]);

  useEffect(() => {
    const onDocClick = (e) => { if (navRef.current && !navRef.current.contains(e.target)) closeAll(); };
    const onResize = () => { if (window.innerWidth > 980) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') closeAll(); };
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

  // On the home page, which section is in the middle of the screen?
  useEffect(() => {
    if (!onHome) { setSection(''); return undefined; }
    let raf = 0;
    const check = () => {
      raf = 0;
      if (window.scrollY < 200) { setSection(''); return; }
      const mid = window.innerHeight * 0.45;
      // The section whose top is closest above the middle line wins
      // (menu order differs from page order, so compare positions).
      let current = '';
      let best = -Infinity;
      for (const [to] of [...nav, ...moreNav].filter(([t]) => isHash(t))) {
        const el = document.querySelector(to.slice(1));
        const top = el?.getBoundingClientRect().top;
        if (top !== undefined && top <= mid && top > best) { best = top; current = to; }
      }
      setSection(current);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    check();
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, [onHome]);

  const activeTo = onHome ? section : nav.find(([to]) => !isHash(to) && location.pathname.startsWith(to))?.[0] || '';

  // Sliding indicator under the active link (desktop).
  useLayoutEffect(() => {
    const place = () => {
      const a = listRef.current?.querySelector(`a[data-to="${activeTo}"]`);
      if (!a || window.innerWidth <= 980) { setPill(null); return; }
      setPill({ left: a.offsetLeft, width: a.offsetWidth });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [activeTo, scrolled]);

  const link = ([to, label], i) => (
    <li key={to} style={{ '--i': i }}>
      {isHash(to)
        ? <Link to={to} data-to={to} className={activeTo === to ? 'is-active' : ''} aria-current={activeTo === to ? 'location' : undefined}>{label}</Link>
        : <NavLink to={to} data-to={to} className={({ isActive }) => (isActive ? 'is-active' : '')}>{label}</NavLink>}
    </li>
  );

  const logout = () => { authService.logout(); closeAll(); navigate('/'); };
  const initials = (user?.name || user?.email || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <nav className={`nav${open ? ' nav-open' : ''}${scrolled ? ' nav-scrolled' : ''}`} ref={navRef} aria-label="Main">
      <div className="nav-inner">
        <Link className="nav-logo" to="/"><span className="nav-logo-mark" aria-hidden="true">✦</span>Weekend-Live</Link>
        <button
          className="nav-toggle" type="button"
          aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}
          aria-controls="primary-navigation" onClick={() => setOpen((o) => !o)}
        ><span></span><span></span><span></span></button>
        <ul className="nav-links" id="primary-navigation" ref={listRef}>
          {nav.map(link)}
          <li className="nav-more" style={{ '--i': nav.length }}>
            <button type="button" className="nav-more-btn" aria-expanded={moreOpen} aria-haspopup="true" onClick={() => setMoreOpen((o) => !o)}>More<svg className="nav-caret" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            <ul className={`nav-dropdown${moreOpen ? ' open' : ''}`}>{moreNav.map(([to, label]) => <li key={to}><Link to={to}>{label}</Link></li>)}</ul>
          </li>
          <li className="nav-mobile-only" style={{ '--i': nav.length + 1 }}>
            {isAuthenticated
              ? <><Link to="/profile">My profile</Link>{isAdmin && <Link to="/admin">Admin dashboard</Link>}<button type="button" className="nav-text-btn" onClick={logout}>Sign out</button></>
              : <><Link to="/login">Sign in</Link><Link to="/register">Create account</Link></>}
          </li>
          <li className="nav-mobile-only" style={{ '--i': nav.length + 2 }}><ThemeRow /></li>
          <li className="nav-mobile-cta" style={{ '--i': nav.length + 3 }}><button type="button" onClick={() => bookWorkshop(enquiry)}>Book Workshop</button></li>
          {pill && <li className="nav-pill" aria-hidden="true" style={{ transform: `translateX(${pill.left}px)`, width: pill.width }} />}
        </ul>
        <div className="nav-actions">
          <TryNow />
          <ThemeSwitcher />
          <Link to="/cart" className="nav-icon-btn" aria-label={`Cart, ${cart.count} item${cart.count === 1 ? '' : 's'}`}>
            <span aria-hidden="true">🛒</span>{cart.count > 0 && <b className="nav-badge">{cart.count}</b>}
          </Link>
          <div className="nav-user">
            {isAuthenticated ? (
              <>
                <button type="button" className="nav-avatar" aria-haspopup="true" aria-expanded={userOpen} aria-label="Account menu" onClick={() => setUserOpen((o) => !o)}>
                  {user?.photo ? <img src={user.photo} alt="" /> : <span>{initials}</span>}
                </button>
                <ul className={`nav-dropdown nav-dropdown-right${userOpen ? ' open' : ''}`}>
                  <li className="nav-dropdown-head">{user?.name || user?.email}</li>
                  <li><Link to="/profile">My profile</Link></li>
                  <li><Link to="/my-designs">My AI designs</Link></li>
                  {isAdmin && <li><Link to="/admin">Admin dashboard</Link></li>}
                  <li><button type="button" onClick={logout}>Sign out</button></li>
                </ul>
              </>
            ) : (
              <Link to="/login" className="nav-signin">
                <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="10" cy="7" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M3.8 17c.9-3.2 3.3-4.8 6.2-4.8s5.3 1.6 6.2 4.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                <span>Sign in</span>
              </Link>
            )}
          </div>
          <button type="button" className="nav-cta" onClick={() => bookWorkshop(enquiry)}><span>Book Workshop</span></button>
        </div>
      </div>
      <div className="nav-progress" ref={progressRef} aria-hidden="true" />
    </nav>
  );
}
