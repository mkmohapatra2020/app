import { Suspense, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageShell from '../../components/common/PageShell.jsx';
import ErrorBoundary from '../../components/common/ErrorBoundary.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import { scrollToTarget } from '../../utils/scrollTo.js';

/**
 * A header section as its own page (Outdoor, Seniors, Kids, Build Together).
 * Sections render straight away (not on scroll) so /outdoor#visualizer style
 * links land on the right block.
 *   sections: [Component, …]   related: [[to, title, text, icon], …]
 */
export default function SectionPage({ title, eyebrow, intro, actions, sections = [], related = [], relatedTitle = 'Keep exploring' }) {
  const { hash } = useLocation();
  // Land on #anchor links; re-align once after images above it have loaded
  // (unless the visitor has started scrolling themselves).
  useEffect(() => {
    if (!hash) return undefined;
    let userScrolled = false;
    const mark = () => { userScrolled = true; };
    scrollToTarget(hash, { smooth: false });
    const t = setTimeout(() => {
      window.addEventListener('wheel', mark, { once: true, passive: true });
      window.addEventListener('touchmove', mark, { once: true, passive: true });
    }, 100);
    const align = setTimeout(() => { if (!userScrolled) document.querySelector(hash)?.scrollIntoView({ block: 'start' }); }, 900);
    return () => { clearTimeout(t); clearTimeout(align); window.removeEventListener('wheel', mark); window.removeEventListener('touchmove', mark); };
  }, [hash]);
  return (
    <PageShell bare className="section-page" title={title} eyebrow={eyebrow} intro={intro} crumbs={[[null, title]]} actions={actions}>
      <main id="main" className="section-page-body">
        {sections.map((S, i) => (
          <ErrorBoundary key={S.displayName || S.name || i} inline name={`${title} section ${i + 1}`}>
            <Suspense fallback={<LoadingSpinner text="Loading…" />}><S /></Suspense>
          </ErrorBoundary>
        ))}
        <RelatedLinks title={relatedTitle} links={related} className="wrap" />
      </main>
    </PageShell>
  );
}

/** "Keep exploring" cards at the bottom of a page: [[to, title, text, icon], …]. */
export function RelatedLinks({ title = 'Keep exploring', links = [], className = '' }) {
  if (!links.length) return null;
  return (
    <section className={`section-related ${className}`} aria-labelledby="related-h">
      <h2 id="related-h">{title}</h2>
      <div className="related-grid">
        {links.map(([to, t, text, icon]) => (
          <Link key={to + t} to={to} className="card related-card">
            {icon && <span className="related-icon" aria-hidden="true">{icon}</span>}
            <strong>{t}</strong>
            {text && <span className="muted">{text}</span>}
            <span className="related-go" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
