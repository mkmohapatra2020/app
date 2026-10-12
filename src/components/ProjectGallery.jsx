import { useState } from 'react';
import Section from './Section.jsx';
import Img from './Img.jsx';
import { galleryFilters, galleryItems } from '../data/features.js';

export default function ProjectGallery() {
  const [filter, setFilter] = useState('all');
  const items = galleryItems.filter((g) => filter === 'all' || (filter === 'budget' ? g.cost < 5000 : g.tags.includes(filter)));
  return (
    <Section id="gallery" tone="warm" eyebrow="Weekend-Live project gallery" title="Find a project like yours">
      <div className="filter-row" role="group" aria-label="Filter projects">
        {galleryFilters.map(([id, label]) => (
          <button key={id} type="button" className={`chip${filter === id ? ' sel' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>
      <p className="result-count" aria-live="polite">{items.length} project{items.length === 1 ? '' : 's'}</p>
      <div className="gallery-grid">
        {items.map((g) => (
          <figure className="gal-item" key={g.title}>
            <Img name={g.image} alt={g.title} sizes="(max-width: 560px) 50vw, 25vw" />
            <figcaption>{g.title}{g.cost < 5000 && <span className="gal-badge">Under ₹5k</span>}</figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
