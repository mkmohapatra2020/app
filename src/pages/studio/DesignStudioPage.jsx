import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageShell, { EmptyState } from '../../components/common/PageShell.jsx';
import BeforeAfter from '../../components/common/BeforeAfter.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import useResource from '../../hooks/useResource.js';
import useSession from '../../hooks/useSession.js';
import { visualizationService } from '../../services/visualizationService.js';
import { preparePhoto } from '../../utils/photo.js';
import { studio as S } from '../../data/flagship.js';
import { generalEnquiry, useEnquiry } from '../../features/enquiry/enquiry.js';
import { removeRequest, submitDesign, useStudioRequests } from '../../features/studio/studioStore.js';

const MAX = 4;
const TABS = [['new', 'New design'], ['requests', 'My design requests'], ['gallery', 'Gallery']];
const ORDER = S.timeline.map(([id]) => id);
const catById = (id) => S.categories.find((c) => c.id === id);

// /design-studio — upload → choose category → submit → track → gallery.
export default function DesignStudioPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'new';
  const setTab = (t) => setParams(t === 'new' ? {} : { tab: t }, { replace: true });
  const requests = useStudioRequests();
  const { isAuthenticated } = useSession();
  const saved = useResource(isAuthenticated ? 'my-designs' : null, (a) => visualizationService.myRequests(a), { fallback: [] });
  const active = requests.filter((r) => !['completed', 'failed'].includes(r.status)).length;

  return (
    <PageShell className="studio" title="AI Design Studio" eyebrow="Design before you build" crumbs={[[null, 'AI Design Studio']]}
      intro="Upload photos of your space and a few reference images, pick what you want to build, and our AI creates a concept you can refine with the Weekend-Live team.">
      <div className="tabs" role="tablist" aria-label="Design studio">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`tab${tab === id ? ' sel' : ''}`} onClick={() => setTab(id)}>
            {label}{id === 'requests' && requests.length > 0 && <span className="tab-count">{requests.length}</span>}{id === 'requests' && active > 0 && <span className="tab-live" aria-label={`${active} in progress`} />}
          </button>
        ))}
      </div>
      {tab === 'new' && <NewDesign onSubmitted={() => setTab('requests')} />}
      {tab === 'requests' && <Requests requests={requests} saved={saved} isAuthenticated={isAuthenticated} onNew={() => setTab('new')} />}
      {tab === 'gallery' && <Gallery requests={requests} saved={saved.data || []} onNew={() => setTab('new')} />}
    </PageShell>
  );
}

function PhotoPicker({ step, title, hint, photos, setPhotos, icon }) {
  const [err, setErr] = useState('');
  const add = async (e) => {
    const files = [...(e.target.files || [])].slice(0, MAX - photos.length);
    e.target.value = '';
    setErr('');
    const out = [];
    for (const f of files) { try { out.push(await preparePhoto(f)); } catch (x) { setErr(x.message); } }
    setPhotos((p) => [...p, ...out].slice(0, MAX));
  };
  const remove = (i) => setPhotos((p) => { URL.revokeObjectURL(p[i].url); return p.filter((_, j) => j !== i); });
  return (
    <fieldset className="studio-step">
      <legend><span className="studio-num">{step}</span>{title}</legend>
      <p className="muted">{hint}</p>
      <div className="studio-thumbs">
        {photos.map((p, i) => (
          <figure key={p.url} className="studio-thumb">
            <img src={p.url} alt={`${title} ${i + 1}`} />
            <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => remove(i)}>×</button>
          </figure>
        ))}
        {photos.length < MAX && (
          <label className="studio-add">
            <input type="file" accept="image/*" multiple onChange={add} />
            <span aria-hidden="true">{icon}</span>
            <b>Add photos</b><small>{photos.length}/{MAX}</small>
          </label>
        )}
      </div>
      {err && <p className="enq-error" role="alert">{err}</p>}
    </fieldset>
  );
}

function NewDesign({ onSubmitted }) {
  const [site, setSite] = useState([]);
  const [refs, setRefs] = useState([]);
  const [cat, setCat] = useState('');
  const [notes, setNotes] = useState('');
  const category = catById(cat);
  const ready = category && (site.length || refs.length);
  const missing = !category ? 'Choose a category' : !(site.length || refs.length) ? 'Add at least one photo' : '';

  const submit = (e) => {
    e.preventDefault();
    if (!ready) return;
    submitDesign({ category, sitePhotos: site, refPhotos: refs, notes: notes.trim() });
    // Ownership of the object URLs passes to the request.
    setSite([]); setRefs([]); setCat(''); setNotes('');
    onSubmitted();
  };

  return (
    <form className="studio-form" onSubmit={submit}>
      <div className="studio-main">
        <PhotoPicker step={1} icon="📷" title="Upload existing site photos" hint="Your terrace, garden, room or the piece to restore. Daylight, wide-angle photos work best." photos={site} setPhotos={setSite} />
        <PhotoPicker step={2} icon="🖼️" title="Upload reference images" hint="Optional — designs, materials or styles you like. Screenshots are fine." photos={refs} setPhotos={setRefs} />
        <fieldset className="studio-step">
          <legend><span className="studio-num">3</span>Select category</legend>
          <div className="studio-cats" role="radiogroup" aria-label="Design category">
            {S.categories.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={cat === c.id} className={`studio-cat${cat === c.id ? ' sel' : ''}`} onClick={() => setCat(c.id)}>
                <span aria-hidden="true">{c.icon}</span><strong>{c.label}</strong><small>{c.hint}</small>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="studio-step">
          <legend><span className="studio-num">4</span>Anything else? <em className="muted">(optional)</em></legend>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={600} placeholder="Size, budget, colours, who will use the space…" />
        </fieldset>
      </div>
      <aside className="studio-summary card">
        <h2>Your request</h2>
        <dl>
          <div><dt>Site photos</dt><dd>{site.length || '—'}</dd></div>
          <div><dt>References</dt><dd>{refs.length || '—'}</dd></div>
          <div><dt>Category</dt><dd>{category ? `${category.icon} ${category.label}` : '—'}</dd></div>
        </dl>
        <button type="submit" className="btn btn-primary btn-block" disabled={!ready}>Submit design request</button>
        {missing && <p className="muted studio-missing">{missing} to continue.</p>}
        <ol className="studio-mini-steps" aria-label="What happens next">{S.timeline.map(([id, label]) => <li key={id}>{label}</li>)}</ol>
      </aside>
    </form>
  );
}

export function StatusTimeline({ status, times = {} }) {
  const failed = status === 'failed';
  const at = failed ? ORDER.indexOf('generating') : ORDER.indexOf(status);
  return (
    <ol className={`studio-timeline${failed ? ' is-failed' : ''}`}>
      {S.timeline.map(([id, label, desc], i) => {
        const state = i < at || status === 'completed' ? 'done' : i === at ? (failed ? 'fail' : 'now') : 'todo';
        return (
          <li key={id} className={`st-${state}`} aria-current={state === 'now' ? 'step' : undefined}>
            <span className="st-dot" aria-hidden="true">{state === 'done' ? '✓' : state === 'fail' ? '!' : i + 1}</span>
            <div>
              <strong>{failed && id === 'generating' ? 'Failed' : label}</strong>
              {times[id] && <small>{new Date(times[id]).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</small>}
              {state === 'now' && <p>{desc}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const savedStatus = (v) => v.stage || (v.status === 'done' ? 'completed' : v.status === 'error' ? 'failed' : 'generating');

function Requests({ requests, saved, isAuthenticated, onNew }) {
  const enquiry = useEnquiry();
  const savedList = (saved.data || []).filter((v) => v.id);
  if (!requests.length && !savedList.length) {
    return <EmptyState icon="🖼️" title="No design requests yet">Start a <button type="button" className="link-btn" onClick={onNew}>new design</button>{!isAuthenticated && <> — or <Link to="/login">sign in</Link> to see designs saved to your account</>}.</EmptyState>;
  }
  return (
    <div className="studio-requests">
      {requests.map((r) => (
        <article key={r.id} className="card studio-req" aria-live="polite">
          <header className="studio-req-head">
            <div><span className="pill">{r.category.icon} {r.category.label}</span><h3>Request {r.id.slice(4).toUpperCase()}</h3>
              <small className="muted">{r.sitePhotos.length} site photo{r.sitePhotos.length === 1 ? '' : 's'} · {r.refPhotos.length} reference{r.refPhotos.length === 1 ? '' : 's'}</small></div>
            <button type="button" className="btn btn-quiet btn-small" onClick={() => removeRequest(r.id)}>{['completed', 'failed'].includes(r.status) ? 'Remove' : 'Cancel'}</button>
          </header>
          <StatusTimeline status={r.status} times={r.times} />
          <div className="studio-req-body">
            {r.status === 'completed' ? (
              <BeforeAfter beforeSrc={r.original} afterSrc={r.result} alt={`${r.category.label} concept`} aspect={r.aspect} labels={['Your photo', 'AI concept']} />
            ) : (
              <div className={`studio-wait${r.status === 'failed' ? ' failed' : ''}`}>
                <img src={r.original} alt="Your uploaded photo" />
                {r.status !== 'failed' && <span className="slide-spinner" aria-hidden="true" />}
              </div>
            )}
            {r.status === 'failed' && <p className="enq-error" role="alert">{r.error}</p>}
            {r.status === 'completed' && (
              <div className="row-btns">
                <a className="btn btn-outline btn-small" href={r.result} download={`weekend-live-${r.category.id}.png`}>Download</a>
                <button type="button" className="btn btn-small" onClick={() => generalEnquiry(enquiry, `I created a ${r.category.label} concept in the AI Design Studio and would like a site visit and quote.`)}>Get a quote for this</button>
              </div>
            )}
          </div>
        </article>
      ))}
      {savedList.length > 0 && (
        <>
          <h2 className="studio-sub">Saved to your account</h2>
          <div className="studio-saved">
            {savedList.map((v) => (
              <article key={v.id} className="card studio-saved-item">
                <RemoteImage src={v.image || v.original} fallback="show-roofgarden" alt="" />
                <div><StatusTimeline status={savedStatus(v)} times={{}} />
                  <strong className="studio-saved-title">{v.projectName || v.businessArea || 'AI design'}</strong><small className="muted">{v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-IN') : `Request ${v.id}`}{v.rawStatus ? ` · ${v.rawStatus}` : ''}</small></div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Gallery({ requests, saved, onNew }) {
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);
  const items = useMemo(() => [
    ...requests.filter((r) => r.status === 'completed').map((r) => ({ id: r.id, cat: r.category.id, before: r.original, after: r.result, aspect: r.aspect, label: r.category.label })),
    ...saved.filter((v) => v.status === 'done' && v.image).map((v) => ({ id: v.id, cat: 'saved', before: v.original, after: v.image, label: 'Saved design' })),
  ], [requests, saved]);
  useEffect(() => { if (open && !items.some((i) => i.id === open.id)) setOpen(null); }, [items, open]);
  const shown = filter === 'all' ? items : items.filter((i) => i.cat === filter);
  const cats = [['all', 'All'], ...S.categories.filter((c) => items.some((i) => i.cat === c.id)).map((c) => [c.id, c.label]), ...(items.some((i) => i.cat === 'saved') ? [['saved', 'Saved']] : [])];

  if (!items.length) return <EmptyState icon="✨" title="Your gallery is empty">Completed designs appear here. <button type="button" className="link-btn" onClick={onNew}>Create your first design</button></EmptyState>;
  return (
    <div>
      <div className="filter-row">{cats.map(([id, l]) => <button key={id} type="button" className={`chip${filter === id ? ' sel' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{l}</button>)}</div>
      {open && (
        <div className="card studio-open">
          <div className="row-between"><h3>{open.label}</h3><button type="button" className="enq-close" aria-label="Close" onClick={() => setOpen(null)}>×</button></div>
          {open.before ? <BeforeAfter beforeSrc={open.before} afterSrc={open.after} alt={open.label} aspect={open.aspect} labels={['Before', 'AI concept']} /> : <img src={open.after} alt={open.label} className="design-full" />}
        </div>
      )}
      <div className="gallery-grid">
        {shown.map((i) => (
          <button key={i.id} type="button" className="gal-item studio-gal" onClick={() => setOpen(i)}>
            <img src={i.after} alt="" />
            <span className="studio-gal-cap">{i.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
