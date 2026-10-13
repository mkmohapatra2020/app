import { useEffect } from 'react';

// Adds the "in" class to .reveal elements as they scroll into view —
// including elements added later by lazily loaded sections.
export default function useReveal() {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    const watch = (root) => {
      if (root.nodeType !== 1) return;
      if (root.matches?.('.reveal:not(.in)')) io.observe(root);
      root.querySelectorAll?.('.reveal:not(.in)').forEach((el) => io.observe(el));
    };
    watch(document.body);
    const mo = new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(watch)));
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}
