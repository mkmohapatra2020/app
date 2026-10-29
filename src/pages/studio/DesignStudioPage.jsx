import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageShell, { EmptyState, SkeletonGrid } from '../../components/common/PageShell.jsx';
import useResource from '../../hooks/useResource.js';
import { aiWorkflowService as W } from '../../services/aiWorkflowService.js';
import NewDesignForm from '../../features/aiVisualization/NewDesignForm.jsx';
import RequestCard, { ResultImages, fmtWhen } from '../../features/aiVisualization/RequestCard.jsx';
import { refreshMembership } from '../../features/membership/useMembership.js';

const TABS = [['new', 'New design'], ['requests', 'My design requests'], ['gallery', 'Gallery']];

// History groups, in display order.
const GROUPS = [
  ['In progress', ['Submitted', 'Queued', 'Processing']],
  ['Needs your attention', ['ChangesRequested']],
  ['Awaiting review', ['PendingReview']],
  ['Completed', ['Completed']],
  ['Closed', ['Failed', 'Rejected', 'Cancelled']],
];
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Undated');

// /design-studio — draft → uploads → category → details → submit → track → gallery.
export default function DesignStudioPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'new';
  const setTab = (t) => setParams(t === 'new' ? {} : { tab: t }, { replace: true });
  const history = useResource('viz:history', (a) => W.myHistory(a), { fallback: [], accept: (d) => Array.isArray(d), ttl: 0 });
  const [fresh, setFresh] = useState([]); // just-submitted, shown before history reloads
  const [latest, setLatest] = useState({}); // id → newest copy reported by its card
  const [resume, setResume] = useState(null);

  const list = useMemo(() => {
    const seen = new Set();
    // Server copy wins; just-submitted ones fill the gap until the history reloads.
    return [...(history.data || []), ...fresh].filter((r) => (seen.has(r.id) ? false : seen.add(r.id))).map((r) => (latest[r.id] ? { ...r, ...latest[r.id] } : r));
  }, [fresh, history.data, latest]);
  const onStatus = (r) => setLatest((m) => ({ ...m, [r.id]: r }));
  const active = list.filter((r) => ['Submitted', 'Queued', 'Processing', 'ChangesRequested'].includes(r.status)).length;

  const onSubmitted = (req) => { setFresh((f) => [req, ...f]); setResume(null); refreshMembership(); setTab('requests'); };
  const onResubmit = (req) => { setResume(req); setTab('new'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <PageShell className="studio" title="AI Design Studio" eyebrow="Design before you build" crumbs={[[null, 'AI Design Studio']]}
      intro="Upload photos of your space and a few reference images, pick what you want to build, and our AI creates a concept you can refine with the Weekend-Live team.">
      <div className="tabs" role="tablist" aria-label="Design studio">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`tab${tab === id ? ' sel' : ''}`} onClick={() => { setTab(id); if (id !== 'new') history.reload(); }}>
            {label}{id === 'requests' && list.length > 0 && <span className="tab-count">{list.length}</span>}{id === 'requests' && active > 0 && <span className="tab-live" aria-label={`${active} need attention or are in progress`} />}
          </button>
        ))}
      </div>
      {tab === 'new' && <NewDesignForm key={resume?.id || 'new'} resume={resume} onSubmitted={onSubmitted} />}
      {tab === 'requests' && <Requests list={list} loading={history.loading && !list.length} error={history.error} onRetry={history.reload} onNew={() => setTab('new')} onResubmit={onResubmit} onStatus={onStatus} />}
      {tab === 'gallery' && <Gallery list={list} loading={history.loading && !list.length} onNew={() => setTab('new')} onExpired={history.reload} />}
    </PageShell>
  );
}

function Requests({ list, loading, error, onRetry, onNew, onResubmit, onStatus }) {
  if (loading) return <SkeletonGrid count={2} />;
  if (!list.length) {
    return error
      ? <EmptyState icon="⚠️" title="Your requests could not be loaded">{error} <button type="button" className="link-btn" onClick={onRetry}>Try again</button></EmptyState>
      : <EmptyState icon="🖼️" title="No design requests yet">Start a <button type="button" className="link-btn" onClick={onNew}>new design</button>.</EmptyState>;
  }
  return (
    <div className="studio-requests">
      {GROUPS.map(([title, statuses]) => {
        const items = list.filter((r) => statuses.includes(r.status)).sort((a, b) => String(b.submittedAt || b.createdAt).localeCompare(String(a.submittedAt || a.createdAt)));
        if (!items.length) return null;
        const byDay = items.reduce((m, r) => { const k = day(r.submittedAt || r.createdAt); (m[k] ||= []).push(r); return m; }, {});
        return (
          <section key={title} className="wf-group" aria-labelledby={`grp-${title}`}>
            <h2 id={`grp-${title}`} className="studio-sub">{title} <small className="muted">({items.length})</small></h2>
            {Object.entries(byDay).map(([d, rs]) => (
              <div key={d} className="wf-day">
                <h3 className="wf-day-label">{d}</h3>
                {rs.map((r) => <RequestCard key={r.id} request={r} onResubmit={onResubmit} onStatus={onStatus} />)}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function Gallery({ list, loading, onNew, onExpired }) {
  const done = list.filter((r) => r.status === 'Completed' && r.images?.length);
  if (loading) return <SkeletonGrid count={3} />;
  if (!done.length) return <EmptyState icon="✨" title="Your gallery is empty">Completed designs appear here. <button type="button" className="link-btn" onClick={onNew}>Create your first design</button></EmptyState>;
  return (
    <div className="wf-gallery">
      {done.map((r) => (
        <section key={r.id} className="card">
          <h3>{r.projectName || 'AI design'}</h3>
          <small className="muted">{[r.category, r.completedAt && `Completed ${fmtWhen(r.completedAt)}`].filter(Boolean).join(' · ')}</small>
          <ResultImages images={r.images} title={r.projectName} onExpired={onExpired} />
        </section>
      ))}
    </div>
  );
}
