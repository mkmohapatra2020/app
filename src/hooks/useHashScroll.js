import { useEffect } from 'react';
import { scrollToTarget } from '../utils/scrollTo.js';

// Makes #anchor links land correctly even when the target section (or the
// sections above it) haven't been lazily loaded yet.
export default function useHashScroll() {
  useEffect(() => {
    const needsHelp = (hash) => hash && hash !== '#' && hash !== '#top' && hash !== '#main' && !!document.querySelector('[data-lazy-slot]');
    const onClick = (e) => {
      const a = e.target.closest?.('a[href^="#"]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const hash = a.getAttribute('href');
      if (!needsHelp(hash)) return;
      e.preventDefault();
      history.pushState(null, '', hash);
      scrollToTarget(hash);
    };
    document.addEventListener('click', onClick);
    if (needsHelp(location.hash)) scrollToTarget(location.hash, { smooth: false });
    return () => document.removeEventListener('click', onClick);
  }, []);
}
