import { useEffect } from 'react';
import { Link } from 'react-router-dom';

// Consistent page header + container for every non-home screen.
export default function PageShell({ title, eyebrow, intro, crumbs = [], actions, children, narrow = false, className = '' }) {
  useEffect(() => { if (title) document.title = `${title} · Weekend-Live`; return () => { document.title = 'Weekend-Live — DIY Workshops, Outdoor Living & Senior-Friendly Homes in Bhubaneswar'; }; }, [title]);
  return (
    <div className={`page ${className}`}>
      <header className="page-head">
        <div className={`wrap ${narrow ? 'wrap-narrow' : ''}`}>
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
      </header>
      <div className={`wrap page-body ${narrow ? 'wrap-narrow' : ''}`}>{children}</div>
    </div>
  );
}

export function EmptyState({ icon = '🌿', title, children }) {
  return <div className="empty"><span aria-hidden="true">{icon}</span><h3>{title}</h3>{children && <p>{children}</p>}</div>;
}

export function SourceNote({ fromApi }) {
  return fromApi ? null : <p className="source-note">Showing sample content while live data is unavailable.</p>;
}

export function SkeletonGrid({ count = 6 }) {
  return <div className="skeleton-grid" aria-hidden="true">{Array.from({ length: count }).map((_, i) => <div key={i} className="skeleton" />)}</div>;
}
