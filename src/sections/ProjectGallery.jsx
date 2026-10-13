import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Section from '../components/common/Section.jsx';
import RemoteImage from '../components/common/RemoteImage.jsx';
import useResource from '../hooks/useResource.js';
import { projectService } from '../services/projectService.js';
import { galleryFilters } from '../data/features.js';
import { fallbackProjects } from '../data/fallbacks.js';

// Filterable project gallery — /projects/gallery + /projects/categories,
// with the PDF's filters as the default. Each project opens /projects/:id.
export default function ProjectGallery() {
  const [filter, setFilter] = useState('all');
  const projects = useResource('projects:gallery', (a) => projectService.gallery(a), { fallback: fallbackProjects });
  const cats = useResource('projects:categories', (a) => projectService.categories(a), { fallback: [] });
  const filters = useMemo(() => {
    const fromApi = (cats.data || []).map((c) => [c.id, c.label]);
    const merged = [...galleryFilters];
    fromApi.forEach(([id, label]) => { if (!merged.some(([m, l]) => m === id || l.toLowerCase() === label.toLowerCase())) merged.splice(merged.length - 1, 0, [id, label]); });
    return merged;
  }, [cats.data]);
  const items = (projects.data || []).filter((g) => filter === 'all' || (filter === 'budget' ? Number.isFinite(g.cost) && g.cost < 5000 : g.tags.some((t) => t === filter || t.includes(filter))));

  return (
    <Section id="gallery" tone="warm" eyebrow="Weekend-Live project gallery" title="Find a project like yours">
      <div className="filter-row" role="group" aria-label="Filter projects">
        {filters.map(([id, label]) => (
          <button key={id} type="button" className={`chip${filter === id ? ' sel' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>
      <p className="result-count" aria-live="polite">{projects.loading ? 'Loading projects…' : `${items.length} project${items.length === 1 ? '' : 's'}`}</p>
      <div className="gallery-grid">
        {items.map((g) => (
          <Link to={`/projects/${encodeURIComponent(g.id)}`} className="gal-item" key={g.id}>
            <RemoteImage src={g.image} fallback="show-deck" alt={g.title} sizes="(max-width: 560px) 50vw, 25vw" />
            <span className="gal-cap">{g.title}{Number.isFinite(g.cost) && g.cost < 5000 && <span className="gal-badge">Under ₹5k</span>}</span>
          </Link>
        ))}
      </div>
    </Section>
  );
}
