// Run `fn` when the browser is idle (or after `timeout` ms). Returns a cancel fn.
export function onIdle(fn, timeout = 2000) {
  if (typeof window === 'undefined') return () => {};
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(() => fn(), { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(fn, Math.min(timeout, 1200));
  return () => clearTimeout(id);
}

// Run after the window 'load' event, then when idle.
export function afterLoad(fn, timeout = 2000) {
  let cancel = () => {};
  const go = () => { cancel = onIdle(fn, timeout); };
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
  return () => { window.removeEventListener('load', go); cancel(); };
}
