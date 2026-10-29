import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { USE_SAMPLE_DATA } from '../../data/site.js';
import SectionMenu from '../layout/SectionMenu.jsx';

// Consistent page header + container for every non-home screen.
// The header's right side holds the current section's menu (SectionMenu), when there is one.
// bare: children render full-width (for home sections that bring their own .wrap).
export default function PageShell({ title, eyebrow, intro, crumbs = [], actions, children, narrow = false, bare = false, className = '' }) {
  useEffect(() => { if (title) document.title = `${title} · Weekend-Live`; return () => { document.title = 'Weekend-Live — DIY Workshops, Outdoor Living & Senior-Friendly Homes in Bhubaneswar'; }; }, [title]);
  return (
    <div className={`page ${className}`}>
      <header className="page-head">
        <div className={`wrap page-head-grid ${narrow ? 'wrap-narrow' : ''}`}>
          <div className="page-head-text">
          {crumbs.length > 0 && (
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link to="/">Home</Link>
              {crumbs.map(([to, label]) => <span key={label}> / {to ? <Link to={to}>{label}</Link> : label}</span>)}
            </nav>
          )}
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <div className="page-title-row"><h1>{title}</h1>{actions}</div>
          {intro && <p className="page-intro">{intro}</p>}
          </div>
          <SectionMenu variant="header" />
        </div>
      </header>
      {bare ? children : <div className={`wrap page-body ${narrow ? 'wrap-narrow' : ''}`}>{children}</div>}
    </div>
  );
}

export function EmptyState({ icon = '🌿', title, children }) {
  return <div className="empty"><span aria-hidden="true">{icon}</span><h3>{title}</h3>{children && <p>{children}</p>}</div>;
}

export function SourceNote({ fromApi }) {
  if (fromApi || !USE_SAMPLE_DATA) return null;
  return <p className="source-note">Showing sample content while live data is unavailable.</p>;
}

export function SkeletonGrid({ count = 6 }) {
  return <div className="skeleton-grid" aria-hidden="true">{Array.from({ length: count }).map((_, i) => <div key={i} className="skeleton" />)}</div>;
}
