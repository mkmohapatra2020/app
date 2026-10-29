import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import TryNow from '../../features/tryNow/TryNow.jsx';
import ThemeSwitcher, { ThemeRow } from '../../theme/ThemeSwitcher.jsx';
import { mainNav, nav } from '../../data/site.js';
import useSession from '../../hooks/useSession.js';
import { useCart } from '../../context/CartContext.jsx';
import { authService } from '../../services/authService.js';
import { activeSection, bestItem, rememberSection, usePreferredSection } from './navState.js';

const isHash = (to) => to.startsWith('/#');
const DESKTOP = 980;
const caret = <svg className="nav-caret" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;

// Every link of a header section (its landing page + dropdown items).
const linksOf = (m) => [m.to, ...(m.groups || []).flatMap((g) => g.items.map(([to]) => to))];

// Sticky header: five core sections with dropdowns, no global CTA (each section
// carries its own actions). Shrinks on scroll, shows reading progress, highlights
// the current section with a sliding pill, and becomes a drawer on phones.
export default function Nav() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(''); // key of the open dropdown
  const [userOpen, setUserOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [section, setSection] = useState('');
  const [pill, setPill] = useState(null);
  const navRef = useRef(null);
  const listRef = useRef(null);
  const progressRef = useRef(null);
  const { user, isAuthenticated, isAdmin } = useSession();
  const cart = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const onHome = location.pathname === '/';
  const prefSection = usePreferredSection();

  const closeAll = () => { setOpen(false); setMenu(''); setUserOpen(false); };
  useEffect(closeAll, [location.pathname, location.hash, location.search]);

  useEffect(() => {
    const onDocClick = (e) => { if (navRef.current && !navRef.current.contains(e.target)) closeAll(); };
    const onResize = () => { if (window.innerWidth > DESKTOP) setOpen(false); };
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
    const anchors = [...new Set(nav.map(([to]) => to).filter(isHash))];
    let raf = 0;
    const check = () => {
      raf = 0;
      if (window.scrollY < 200) { setSection(''); return; }
      const mid = window.innerHeight * 0.45;
      let current = '';
      let best = -Infinity;
      for (const to of anchors) {
        const top = document.querySelector(to.slice(1))?.getBoundingClientRect().top;
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

  // Active header section: home-page anchor in view, or the current route.
  const activeMenu = onHome ? mainNav.find((m) => section && linksOf(m).includes(section)) : activeSection(location, prefSection);
  const activeKey = activeMenu?.key || '';
  // The dropdown item for this exact page (path + ?query + #hash), highlighted in its menu.
  const currentItem = !onHome && activeMenu ? bestItem(activeMenu, location) : null;

  // Sliding indicator under the active section (desktop).
  useLayoutEffect(() => {
    const place = () => {
      const el = listRef.current?.querySelector(`[data-key="${activeKey}"]`);
      if (!el || window.innerWidth <= DESKTOP) { setPill(null); return; }
      // Measure from the menu bar: dropdown buttons sit inside a positioned <li>.
      const li = el.closest('li');
      setPill({ left: (li?.offsetLeft || 0) + (li && li !== el.offsetParent ? 0 : el.offsetLeft), width: el.offsetWidth });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [activeKey, scrolled]);


  const logout = () => { authService.logout(); closeAll(); navigate('/'); };
  const initials = (user?.name || user?.email || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  // Dropdown item: icon tile + label + one-line description. --d staggers the entrance.
  const itemLink = (m) => ([to, label, sub, icon], i) => {
    const current = activeKey === m.key && currentItem?.to === to;
    return (
    <li key={`${to}-${label}`} style={{ '--d': i }}>
      <Link to={to} className={`nav-item${current ? ' is-current' : ''}`} aria-current={current ? 'page' : undefined} onClick={() => rememberSection(m.key)}>
        {icon && <span className="nav-item-icon" aria-hidden="true">{icon}</span>}
        <span className="nav-item-text"><span className="nav-item-label">{label}</span>{sub && <small className="nav-item-sub">{sub}</small>}</span>
        <span className="nav-item-arrow" aria-hidden="true">→</span>
      </Link>
    </li>
    );
  };
  const featureCard = (m, f) => (
    <Link to={f.to} onClick={() => rememberSection(m.key)} className="nav-feature" style={{ '--img': `url(/images/${f.image}-640.webp)` }}>
      <span className="nav-feature-title">{f.title}</span>
      <span className="nav-feature-text">{f.text}</span>
      <span className="nav-feature-cta">{f.cta} →</span>
    </Link>
  );

  return (
    <nav className={`nav${open ? ' nav-open' : ''}${scrolled ? ' nav-scrolled' : ''}`} ref={navRef} aria-label="Main">
      <div className="nav-inner">
        <Link className="nav-logo" to="/"><img className="nav-logo-mark" src="/logo-mark.webp" alt="" width="145" height="96" decoding="async" />Weekend-Live</Link>
        <button
          className="nav-toggle" type="button"
          aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}
          aria-controls="primary-navigation" onClick={() => setOpen((o) => !o)}
        ><span></span><span></span><span></span></button>
        <ul className="nav-links" id="primary-navigation" ref={listRef}>
          {mainNav.map((m, i) => (m.groups ? (
            <li key={m.key} className={`nav-menu${menu === m.key ? ' is-open' : ''}`} style={{ '--i': i }}>
              <button type="button" data-key={m.key} className={`nav-menu-btn${activeKey === m.key ? ' is-active' : ''}`} aria-expanded={menu === m.key} aria-controls={`menu-${m.key}`}
                onClick={() => {
                  // Desktop: the section name opens its page, where its sub-menu is shown (SectionMenu).
                  // Phones: it expands the accordion, which starts with an "All …" link.
                  if (window.innerWidth > DESKTOP) { rememberSection(m.key); setMenu(''); navigate(m.to); } else setMenu((k) => (k === m.key ? '' : m.key));
                }}>
                {m.icon && <span className="nav-menu-icon" aria-hidden="true">{m.icon}</span>}{m.label}{caret}
              </button>
              <div id={`menu-${m.key}`} className={`nav-dropdown nav-mega nav-mega-${m.groups.length}${m.feature ? ' has-feature' : ''}${menu === m.key ? ' open' : ''}`}>
                <Link to={m.to} className="nav-mega-all" onClick={() => rememberSection(m.key)}>All {m.label} <span aria-hidden="true">→</span></Link>
                <div className="nav-mega-groups">
                  {m.groups.map((g, gi) => (
                    <div key={g.title || gi} className="nav-mega-group">
                      {g.title && <p className="nav-mega-title">{g.title}</p>}
                      <ul>{g.items.map(itemLink(m))}</ul>
                    </div>
                  ))}
                </div>
                {m.feature && featureCard(m, m.feature)}
              </div>
            </li>
          ) : (
            <li key={m.key} style={{ '--i': i }}>
              <NavLink to={m.to} data-key={m.key} onClick={() => rememberSection(m.key)} className={({ isActive }) => `nav-studio${isActive || activeKey === m.key ? ' is-active' : ''}`}>{m.icon && <span className="nav-menu-icon" aria-hidden="true">{m.icon}</span>}{m.label}</NavLink>
            </li>
          )))}
          <li className="nav-mobile-only" style={{ '--i': mainNav.length }}>
            {isAuthenticated
              ? <><Link to="/profile">My profile</Link>{isAdmin && <Link to="/admin">Admin dashboard</Link>}<button type="button" className="nav-text-btn" onClick={logout}>Sign out</button></>
              : <><Link to="/login">Sign in</Link><Link to="/register">Create account</Link></>}
          </li>
          <li className="nav-mobile-only" style={{ '--i': mainNav.length + 2 }}><Link to="/contact">Contact</Link><Link to="/#about">About us</Link></li>
          <li className="nav-mobile-only" style={{ '--i': mainNav.length + 3 }}><ThemeRow /></li>
          {pill && <li className="nav-pill" aria-hidden="true" style={{ transform: `translateX(${pill.left}px)`, width: pill.width }} />}
        </ul>
        <div className="nav-actions">
          <TryNow showButton={false} />
          <Link to="/contact" className="nav-aux">Contact</Link>
          <Link to="/#about" className="nav-aux">About us</Link>
          <ThemeSwitcher />
          <Link to="/cart" className="nav-icon-btn" aria-label={`Cart, ${cart.count} item${cart.count === 1 ? '' : 's'}`}>
            <span aria-hidden="true">🛒</span>{cart.count > 0 && <b className="nav-badge">{cart.count}</b>}
          </Link>
          <div className="nav-user">
            {isAuthenticated ? (
              <>
                <button type="button" className="nav-avatar" aria-haspopup="true" aria-expanded={userOpen} aria-label="Account menu" onClick={() => { setUserOpen((o) => !o); setMenu(''); }}>
                  {user?.photo ? <img src={user.photo} alt="" /> : <span>{initials}</span>}
                </button>
                <ul className={`nav-dropdown nav-dropdown-right${userOpen ? ' open' : ''}`}>
                  <li className="nav-dropdown-head">{user?.name || user?.email}</li>
                  <li><Link to="/profile">My profile</Link></li>
                  <li><Link to="/my-designs">My AI designs</Link></li>
                  {isAdmin && <li><Link to="/admin">Admin dashboard</Link></li>}
                  {isAdmin && <li><Link to="/admin/ai-visualizations">AI review queue</Link></li>}
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
        </div>
      </div>
      <div className="nav-progress" ref={progressRef} aria-hidden="true" />
    </nav>
  );
}
