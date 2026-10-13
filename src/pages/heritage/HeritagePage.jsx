import { useState } from 'react';
import PageShell, { EmptyState, SkeletonGrid, SourceNote } from '../../components/common/PageShell.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import useResource from '../../hooks/useResource.js';
import { contentService } from '../../services/contentService.js';
import { fallbackHeritage } from '../../data/fallbacks.js';
import { generalEnquiry, useEnquiry } from '../../features/enquiry/enquiry.js';

export default function HeritagePage() {
  const [tab, setTab] = useState('projects');
  const projects = useResource('heritage', (a) => contentService.heritage(a), { fallback: fallbackHeritage });
  const crafts = useResource(tab === 'crafts' ? 'crafts' : null, (a) => contentService.crafts(a), { fallback: [] });
  const gallery = useResource(tab === 'gallery' ? 'crafts:gallery' : null, (a) => contentService.craftGallery(a), { fallback: [] });
  const enquiry = useEnquiry();
  const src = { projects, crafts, gallery }[tab];

  return (
    <PageShell title="Heritage & traditional crafts" eyebrow="Preserving skills across generations" crumbs={[[null, 'Heritage']]}
      intro="Wood carving, bamboo weaving, village living ideas and eco-friendly building from Odisha's craft traditions."
      actions={<button type="button" className="btn btn-primary btn-small" onClick={() => generalEnquiry(enquiry, "I'd like to explore the Heritage Collection.")}>Ask about a heritage project</button>}>
      <div className="tabs" role="tablist">
        {[['projects', 'Heritage projects'], ['crafts', 'Craft techniques'], ['gallery', 'Craft gallery']].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={`tab${tab === id ? ' sel' : ''}`} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === 'projects' && <SourceNote fromApi={projects.fromApi} />}
      {src.loading ? <SkeletonGrid /> : !src.data?.length ? <EmptyState icon="🎋" title="Coming soon">{tab === 'crafts' ? 'Craft technique guides are on their way.' : 'The craft gallery is being curated.'}</EmptyState> : tab === 'gallery' ? (
        <div className="gallery-grid">{src.data.map((g) => <figure className="gal-item" key={g.id || g.image}><RemoteImage src={g.image} fallback="heritage-bamboo" alt={g.title} /><figcaption>{g.title}</figcaption></figure>)}</div>
      ) : (
        <div className="item-grid">
          {src.data.map((h) => (
            <article key={h.id || h.title} className="item-card reveal">
              <div className="item-card-img"><RemoteImage src={h.image} fallback="heritage-woodcraft" alt="" /></div>
              <div className="item-card-body">
                {(h.region || h.level) && <span className="pill">{h.region || h.level}</span>}
                <h3>{h.title}</h3>
                {h.text && <p>{h.text}</p>}
                {h.materials?.length > 0 && <p className="muted">Materials: {h.materials.join(', ')}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
}
