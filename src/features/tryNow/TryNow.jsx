import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onIdle } from '../../utils/idle.js';
import useSession from '../../hooks/useSession.js';
import { useToast } from '../../context/ToastContext.jsx';

// Try now needs a signed-in user: guests go to /login, and the request is
// remembered here so the dialog opens by itself once they are back.
const AFTER_LOGIN = 'wl:try-now-after-login';
const remember = (opts) => { try { sessionStorage.setItem(AFTER_LOGIN, JSON.stringify(opts)); } catch { /* storage blocked */ } };
const recall = () => {
  try {
    const raw = sessionStorage.getItem(AFTER_LOGIN);
    sessionStorage.removeItem(AFTER_LOGIN);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

// The pop-up (form, catalog, prompts) is a separate chunk, fetched in the
// background after the page settles, or immediately on first click.
const loadDialog = () => import('./TryNowDialog.jsx');
const TryNowDialog = lazy(loadDialog);

/**
 * "Try now" button. Anything on the page can also open it with:
 *   window.dispatchEvent(new CustomEvent('wl:open-try-now', { detail: { mode: 'photo' } }))
 * Only one dialog is mounted, owned by the button rendered with `owner`.
 */
export default function TryNow({ className = '', owner = true }) {
  const [mounted, setMounted] = useState(false);
  const pending = useRef(null);
  const dialog = useRef(null);
  const { isAuthenticated } = useSession();
  const signedIn = useRef(isAuthenticated);
  signedIn.current = isAuthenticated;
  const navigate = useNavigate();
  const location = useLocation();
  const here = useRef('');
  here.current = location.pathname + location.search + location.hash;
  const { toast } = useToast();

  useEffect(() => { if (owner) return onIdle(loadDialog, 2500); return undefined; }, [owner]);

  // Back from /login (or /register) signed in: open the dialog they asked for.
  useEffect(() => {
    if (!owner || !isAuthenticated || location.pathname === '/login' || location.pathname === '/register') return;
    const opts = recall();
    if (opts) window.dispatchEvent(new CustomEvent('wl:open-try-now', { detail: opts }));
  }, [owner, isAuthenticated, location.pathname]);

  useEffect(() => {
    if (!owner) return undefined;
    const onOpen = (e) => {
      const opts = e.detail || {};
      if (!signedIn.current) {
        remember(opts);
        toast('Please sign in to use Try now.');
        navigate('/login', { state: { from: here.current } });
        return;
      }
      if (dialog.current) dialog.current.open(opts);
      else { pending.current = opts; setMounted(true); }
    };
    window.addEventListener('wl:open-try-now', onOpen);
    return () => window.removeEventListener('wl:open-try-now', onOpen);
  }, [owner, navigate, toast]);

  // Open as soon as the lazily loaded dialog attaches its ref.
  const attach = (instance) => {
    dialog.current = instance;
    if (instance && pending.current) { instance.open(pending.current); pending.current = null; }
  };

  const open = () => window.dispatchEvent(new CustomEvent('wl:open-try-now', { detail: {} }));

  return (
    <>
      <button type="button" className={`try-now ${className}`} onClick={open} onPointerEnter={loadDialog} onFocus={loadDialog}>
        <span className="try-now-spark" aria-hidden="true">✦</span> Try now
      </button>
      {owner && mounted && (
        <Suspense fallback={null}>
          <TryNowDialog ref={attach} />
        </Suspense>
      )}
    </>
  );
}
