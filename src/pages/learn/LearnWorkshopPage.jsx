import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import PageShell, { EmptyState, SkeletonGrid } from '../../components/common/PageShell.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import useResource from '../../hooks/useResource.js';
import useApi from '../../hooks/useApi.js';
import useSession from '../../hooks/useSession.js';
import { learnService as L, youtubeEmbed } from '../../services/learnService.js';
import { WorkshopCard, seriesIcon, seriesPhoto } from './LearnPage.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import '../../styles/learn.css';

// /learn/workshops/:id — GET /learn/workshops/{id} + POST …/register.
export default function LearnWorkshopPage() {
  const { id } = useParams();
  const location = useLocation();
  const { isAuthenticated } = useSession();
  const { toast } = useToast();
  const w = useResource(`learn:workshop:${id}`, (a) => L.workshop({ ...a, id }), { fallback: null, accept: (d) => !!d?.id });
  const all = useResource('learn:workshops', (a) => L.workshops(a), { fallback: [] });
  const reg = useApi((a) => L.register(a));
  const [people, setPeople] = useState(1);
  const [done, setDone] = useState('');

  if (w.loading && !w.data) return <PageShell title="Workshop" crumbs={[['/learn', 'Learn'], [null, 'Workshop']]}><SkeletonGrid count={2} /></PageShell>;
  const d = w.data;
  if (!d) return <PageShell title="Workshop not found" crumbs={[['/learn', 'Learn'], [null, 'Workshop']]}><EmptyState icon="🔍" title="We couldn't find this workshop"><Link to="/learn">Browse all workshops</Link></EmptyState></PageShell>;
  const video = youtubeEmbed(d.video);
  const full = d.seats === 0;
  const more = (all.data || []).filter((x) => x.series === d.series && x.id !== d.id).slice(0, 3);
  const facts = [['⏱', 'Duration', d.duration], ['📶', 'Skill level', d.skillLevel], ['👥', 'Age group', d.ageGroup], ['🧩', 'Project type', d.projectType], ['🪑', 'Seats available', d.seats ?? '']].filter(([, , v]) => v !== '' && v != null);

  const register = async (e) => {
    e.preventDefault();
    if (reg.loading || full) return;
    const r = await reg.execute({ id: d.id, participants: people });
    if (r.success) { setDone(r.message || `You're registered for ${d.title}.`); toast('Registered — see you at the workshop!'); }
  };

  return (
    <PageShell className="learn-detail" title={d.title} eyebrow={d.series} crumbs={[['/learn', 'Learn'], [`/learn?series=${encodeURIComponent(d.series)}`, d.series], [null, d.title]]}>
      <div className="learn-detail-grid">
        <div className="learn-detail-main">
          <div className="learn-detail-media">
            {video ? <iframe src={video} title={`${d.title} — video`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              : d.image ? <RemoteImage src={d.image} fallback={seriesPhoto(d.series, 0)} alt="" /> : <img src={`/images/${seriesPhoto(d.series, 0)}-1280.webp`} alt="" />}
            {!video && <span className="learn-detail-icon" aria-hidden="true">{seriesIcon(d.series)}</span>}
          </div>
          <dl className="learn-facts">{facts.map(([icon, label, v]) => <div key={label}><dt>{icon} {label}</dt><dd>{v}</dd></div>)}</dl>
          {d.outcome && <section><h2>What you'll learn</h2><p>{d.outcome}</p></section>}
          {d.tools.length > 0 && <section><h2>Tools used</h2><div className="learn-step-tags">{d.tools.map((t) => <span key={t} className="pill pill-quiet">{t}</span>)}</div></section>}
          {d.takeHome && <section><h2>Take-home project</h2><p>{d.takeHome}</p></section>}
          {d.safety && <section className="wf-safety" role="note"><strong>Safety: </strong>{d.safety}</section>}
        </div>
        <aside className="card learn-register">
          {d.badge && <p className="learn-register-badge"><span aria-hidden="true">🏅</span> Earn the <b>{d.badge}</b> badge</p>}
          {done ? (
            <div role="status"><h2>You're registered!</h2><p>{done}</p><Link className="btn btn-outline btn-small" to="/learn?tab=mine">Go to My learning</Link></div>
          ) : !isAuthenticated ? (
            <><h2>Book your seat</h2><p className="muted">Sign in to register for this workshop.</p><Link className="btn btn-primary btn-block" to="/login" state={{ from: location.pathname }}>Sign in to register</Link></>
          ) : (
            <form onSubmit={register} noValidate>
              <h2>Book your seat</h2>
              <label className="f-field"><span className="f-label">Participants</span>
                <select value={people} onChange={(e) => setPeople(Number(e.target.value))} disabled={full}>{Array.from({ length: Math.max(1, Math.min(6, d.seats ?? 6)) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select>
              </label>
              {reg.error && <p className="f-alert f-alert-error" role="alert">{reg.error}</p>}
              <button type="submit" className="btn btn-primary btn-block" disabled={reg.loading || full}>{full ? 'Fully booked' : reg.loading ? 'Registering…' : 'Register for this workshop'}</button>
            </form>
          )}
        </aside>
      </div>
      {more.length > 0 && (
        <section className="learn-more"><h2>More in {d.series}</h2><div className="learn-grid">{more.map((x, i) => <WorkshopCard key={x.id} w={x} index={i + 1} />)}</div></section>
      )}
    </PageShell>
  );
}
