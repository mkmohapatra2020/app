import { Link, useParams } from 'react-router-dom';
import PageShell, { SourceNote } from '../../components/common/PageShell.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import BeforeAfter from '../../components/common/BeforeAfter.jsx';
import useResource from '../../hooks/useResource.js';
import { projectService } from '../../services/projectService.js';
import { fallbackProjects } from '../../data/fallbacks.js';
import { generalEnquiry, useEnquiry } from '../../features/enquiry/enquiry.js';

const isRemote = (s) => /^(https?:|\/)/.test(s || '');

export default function ProjectPage() {
  const { id } = useParams();
  const local = fallbackProjects.find((p) => p.id === id);
  const p = useResource(`project:${id}`, (a) => projectService.get({ id, ...a }), { fallback: local, accept: (d) => !!d?.title });
  const cmp = useResource(p.fromApi ? `project:${id}:cmp` : null, (a) => projectService.comparison({ id, ...a }), { fallback: null, accept: (d) => !!(d?.before && d?.after) });
  const enquiry = useEnquiry();
  const proj = p.data;
  if (!proj) return <PageShell title={p.loading ? 'Loading…' : 'Project not found'} crumbs={[['/#gallery', 'Projects'], [null, 'Project']]}>{!p.loading && <Link to="/#gallery">Browse the gallery</Link>}</PageShell>;

  const before = cmp.data?.before || proj.before;
  const after = cmp.data?.after || proj.image;
  const srcProps = (b, a) => (isRemote(b) || isRemote(a) ? { beforeSrc: b, afterSrc: a } : { before: b, after: a });

  return (
    <PageShell title={proj.title} eyebrow="Project" crumbs={[['/#gallery', 'Projects'], [null, proj.title]]}>
      <SourceNote fromApi={p.fromApi} />
      <div className="detail-layout">
        <div>
          {before && after ? <div className="detail-ba"><BeforeAfter {...srcProps(before, after)} alt={proj.title} sizes="(max-width: 900px) 100vw, 60vw" /></div> : <RemoteImage src={proj.image} fallback="show-deck" alt={proj.title} className="detail-hero" />}
          {cmp.data?.notes && <p className="muted">{cmp.data.notes}</p>}
          {proj.text && <p className="lead-text">{proj.text}</p>}
        </div>
        <aside className="card">
          <h3>Project facts</h3>
          <dl className="facts">
            {proj.location && <><dt>Location</dt><dd>{proj.location}</dd></>}
            {proj.duration && <><dt>Build time</dt><dd>{proj.duration}</dd></>}
            {Number.isFinite(proj.cost) && <><dt>Approx. cost</dt><dd>₹{proj.cost.toLocaleString('en-IN')}</dd></>}
            {proj.materials?.length > 0 && <><dt>Materials</dt><dd>{proj.materials.join(', ')}</dd></>}
            {proj.tags?.length > 0 && <><dt>Type</dt><dd>{proj.tags.join(', ')}</dd></>}
          </dl>
          <button type="button" className="btn btn-primary btn-block" onClick={() => generalEnquiry(enquiry, `I'd like a quote for a project like "${proj.title}".`, 'quotation')}>Get a quote for this</button>
          <Link to="/contact" className="btn btn-outline btn-block">Request a site visit</Link>
        </aside>
      </div>
    </PageShell>
  );
}
