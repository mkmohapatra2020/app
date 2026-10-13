import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import ErrorBoundary from './ErrorBoundary.jsx';

export const LOAD_ALL_EVENT = 'wl:load-all-sections';

/**
 * Renders a code-split section only when it is near the viewport.
 *  - `load`    () => import('...')   the section module (default export)
 *  - `anchor`  id kept on the placeholder so #links and the nav keep working
 *  - `minHeight` reserved space to avoid layout jumps while loading
 * Every slot also loads when LOAD_ALL_EVENT fires (used for #hash navigation).
 */
export default function LazySection({ load, anchor, minHeight = 520, name, margin = '900px 0px', props }) {
  const Comp = useMemo(() => lazy(load), [load]);
  const [show, setShow] = useState(false);
  const slot = useRef(null);

  useEffect(() => {
    if (show) return undefined;
    const onAll = () => setShow(true);
    window.addEventListener(LOAD_ALL_EVENT, onAll);
    let io;
    if ('IntersectionObserver' in window && slot.current) {
      io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) setShow(true); }, { rootMargin: margin });
      io.observe(slot.current);
    } else setShow(true);
    return () => { window.removeEventListener(LOAD_ALL_EVENT, onAll); io?.disconnect(); };
  }, [show, margin]);

  const placeholder = (
    <div ref={slot} id={anchor} className="lazy-slot" data-lazy-slot="" style={{ minHeight }} aria-busy="true">
      {show && <span className="lazy-slot-spinner" aria-hidden="true" />}
    </div>
  );

  if (!show) return placeholder;
  return (
    <ErrorBoundary inline name={name}>
      <Suspense fallback={placeholder}>
        <Comp {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
