import { LOAD_ALL_EVENT } from '../components/common/LazySection.jsx';

/**
 * Smooth-scroll to a selector, loading any lazy sections first so the target
 * exists and the page above it has its real height. Returns a Promise<boolean>.
 */
export function scrollToTarget(selector, { smooth = true, timeout = 2500 } = {}) {
  return new Promise((resolve) => {
    if (document.querySelector('[data-lazy-slot]')) window.dispatchEvent(new Event(LOAD_ALL_EVENT));
    const started = performance.now();
    const settle = () => {
      const target = document.querySelector(selector);
      const pending = document.querySelector('[data-lazy-slot]');
      if ((pending || !target) && performance.now() - started < timeout) { requestAnimationFrame(settle); return; }
      if (target) target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      resolve(!!target);
    };
    requestAnimationFrame(settle);
  });
}
