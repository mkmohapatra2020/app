import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { onIdle } from '../../utils/idle.js';

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

  useEffect(() => { if (owner) return onIdle(loadDialog, 2500); return undefined; }, [owner]);

  useEffect(() => {
    if (!owner) return undefined;
    const onOpen = (e) => {
      const opts = e.detail || {};
      if (dialog.current) dialog.current.open(opts);
      else { pending.current = opts; setMounted(true); }
    };
    window.addEventListener('wl:open-try-now', onOpen);
    return () => window.removeEventListener('wl:open-try-now', onOpen);
  }, [owner]);

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
