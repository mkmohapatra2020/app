import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Section from '../components/common/Section.jsx';
import RemoteImage from '../components/common/RemoteImage.jsx';
import useResource from '../hooks/useResource.js';
import useSession from '../hooks/useSession.js';
import { visualizationService } from '../services/visualizationService.js';

const areaLabel = (a) => String(a).replace(/([a-z])([A-Z])/g, '$1 $2');
const fmtDay = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// Gallery of the signed-in customer's AI designs — GET /ai-visualization/my-history
// (customer from the login token). Filter chips come from each design's business area.
export default function ProjectGallery() {
  const { isAuthenticated } = useSession();
  const location = useLocation();
  const [filter, setFilter] = useState('all');
  const designs = useResource(isAuthenticated ? 'my-designs' : null, (a) => visualizationService.myRequests(a), { fallback: [], accept: (d) => Array.isArray(d) });
  const list = (designs.data || []).filter((v) => v.image);
  const filters = useMemo(() => [['all', 'All'], ...[...new Set(list.map((v) => v.businessArea).filter(Boolean))].map((a) => [a, areaLabel(a)])], [list]);
  const items = list.filter((v) => filter === 'all' || v.businessArea === filter);

  return (
    <Section id="gallery" tone="warm" eyebrow="Your AI design gallery" title="Designs made for your space">
      {!isAuthenticated ? (
        <p className="empty-note">
          <Link to="/login" state={{ from: `${location.pathname}#gallery` }}>Sign in</Link> to see the designs you've created with the AI Space Visualizer.
        </p>
      ) : (
        <>
          {filters.length > 2 && (
            <div className="filter-row" role="group" aria-label="Filter designs">
              {filters.map(([id, label]) => (
                <button key={id} type="button" className={`chip${filter === id ? ' sel' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
              ))}
            </div>
          )}
          <p className="result-count" aria-live="polite">{designs.loading ? 'Loading your designs…' : `${items.length} design${items.length === 1 ? '' : 's'}`}</p>
          {!designs.loading && items.length === 0 && (
            <p className="empty-note">{designs.error ? 'Your designs could not be loaded right now. Please try again shortly.' : <>No finished designs yet. Try the <a href="#visualizer">AI Space Visualizer</a> above.</>}</p>
          )}
          <div className="gallery-grid">
            {items.map((v) => (
              <Link to="/my-designs" className="gal-item" key={v.id} title={v.prompt || undefined}>
                <RemoteImage src={v.image} fallback="show-deck" alt={v.projectName || 'AI design'} sizes="(max-width: 560px) 50vw, 25vw" />
                <span className="gal-cap">{v.projectName || 'AI design'}{v.completedAt && <span className="gal-badge">{fmtDay(v.completedAt)}</span>}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}
