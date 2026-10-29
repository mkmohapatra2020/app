import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageShell, { EmptyState, SkeletonGrid, SourceNote } from '../../components/common/PageShell.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import useResource from '../../hooks/useResource.js';
import useApi from '../../hooks/useApi.js';
import useSession from '../../hooks/useSession.js';
import { contentService } from '../../services/contentService.js';
import { learnService as L } from '../../services/learnService.js';
import { fallbackArticles } from '../../data/fallbacks.js';
import { useToast } from '../../context/ToastContext.jsx';
import '../../styles/learn.css';

const TABS = [
  ['workshops', 'Workshops', '🔨'],
  ['paths', 'Learning paths', '🧭'],
  ['certifications', 'Certifications', '🏅'],
  ['guides', 'Guides', '📘'],
  ['mine', 'My learning', '📈'],
  ['idea', 'Submit an idea', '💡'],
];
const DEBOUNCE = 450;
const FILTERS = [['ageGroup', 'Age group'], ['skillLevel', 'Skill level'], ['projectType', 'Project type'], ['duration', 'Duration']];
const SERIES_ICON = { wood: '🪵', heritage: '🏛️', home: '🏠', outdoor: '🌿', plumb: '🚰', power: '⚡', senior: '🧓', stone: '🪨', water: '💧', finish: '🎨', innov: '💡', incub: '🚀', inter: '👨‍👩‍👧', family: '👨‍👩‍👧', kids: '🧒', tool: '🧰', diy: '🛠️' };
export const seriesIcon = (name = '') => Object.entries(SERIES_ICON).find(([k]) => name.toLowerCase().includes(k))?.[1] || '🛠️';
// Photo per series from the site's image library, used when the API sends no imageUrl.
// Two per series, alternated by the card's position so neighbouring cards differ.
const SERIES_PHOTO = {
  wood: ['pillar-diy', 'hero-workshop'], finish: ['learn-furniturecare', 'pillar-diy'], heritage: ['heritage-woodcraft', 'heritage-bamboo'],
  home: ['learn-sustainable', 'show-kitchen'], outdoor: ['show-deck', 'show-gazebo'], plumb: ['show-kitchen', 'learn-sustainable'],
  power: ['learn-toolsafety', 'hero-workshop'], tool: ['learn-toolsafety', 'camp-toolbox'], senior: ['pillar-senior', 'senior-hub'],
  stone: ['heritage-village', 'show-sitout'], water: ['show-sitout', 'show-roofgarden'], innov: ['camp-toolbox', 'show-bamboo'],
  incub: ['show-bamboo', 'camp-toolbox'], inter: ['hero-family', 'camp-birdhouse'], family: ['hero-family', 'camp-birdhouse'], kids: ['camp-birdhouse', 'hero-family'],
};
export const seriesPhoto = (name = '', n = 0) => {
  const set = Object.entries(SERIES_PHOTO).find(([k]) => name.toLowerCase().includes(k))?.[1] || ['hero-workshop', 'pillar-outdoor'];
  return set[Math.abs(Number(n) || 0) % set.length];
};

// /learn — Knowledge Center: workshops, learning paths, certifications, guides,
// the signed-in learner's dashboard and DIY Incubator ideas.
export default function LearnPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'workshops';
  const setTab = (t) => setParams(t === 'workshops' ? {} : { tab: t }, { replace: true });
  return (
    <PageShell className="learn" title="Learn" eyebrow="DIY Knowledge Center" crumbs={[[null, 'Learn']]}
      intro="Hands-on workshops, step-by-step learning paths and badges — woodworking, home maintenance, outdoor living, heritage crafts and more.">
      <div className="learn-tabs" role="tablist" aria-label="Knowledge Center">
        {TABS.map(([id, label, icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`learn-tab${tab === id ? ' sel' : ''}`} onClick={() => setTab(id)}>
            <span aria-hidden="true">{icon}</span>{label}
          </button>
        ))}
      </div>
      {tab === 'workshops' && <Workshops params={params} setParams={setParams} />}
      {tab === 'paths' && <Paths />}
      {tab === 'certifications' && <Certifications />}
      {tab === 'guides' && <Guides />}
      {tab === 'mine' && <MyLearning />}
      {tab === 'idea' && <SubmitIdea />}
    </PageShell>
  );
}

// ---------- Workshops ----------
function Workshops({ params }) {
  const cats = useResource('learn:categories', (a) => L.categories(a), { fallback: [] });
  const all = useResource('learn:workshops', (a) => L.workshops(a), { fallback: [] });
  const [f, setF] = useState({ ageGroup: '', skillLevel: '', projectType: '', duration: '', series: params.get('series') || '', q: params.get('q') || '' });
  const filtered = useApi((a) => L.workshops(a));
  const apiFilters = Object.fromEntries(FILTERS.map(([k]) => [k, f[k]]).filter(([, v]) => v));
  const hasApiFilter = Object.keys(apiFilters).length > 0;
  useEffect(() => { if (hasApiFilter) filtered.execute({ filters: apiFilters }); else filtered.reset(); }, [JSON.stringify(apiFilters)]); // eslint-disable-line react-hooks/exhaustive-deps

  const base = all.data || [];
  const options = useMemo(() => Object.fromEntries([...FILTERS.map(([k]) => k), 'series'].map((k) => [k, [...new Set(base.map((w) => w[k]).filter(Boolean))].sort()])), [base]);
  const source = hasApiFilter ? filtered.data || [] : base;
  const term = f.q.trim().toLowerCase();
  const list = source.filter((w) => (!f.series || w.series === f.series) && (!term || `${w.title} ${w.series} ${w.outcome} ${w.tools.join(' ')}`.toLowerCase().includes(term)));
  const loading = all.loading || filtered.loading;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const active = Object.entries(f).filter(([, v]) => v).length;

  return (
    <div>
      {(cats.data || []).length > 0 && (
        <div className="learn-topics" aria-label="Browse by topic">
          {cats.data.map((c) => (
            <button key={c.id} type="button" className={`chip${f.q === c.name ? ' sel' : ''}`} aria-pressed={f.q === c.name} onClick={() => setF((x) => ({ ...x, q: x.q === c.name ? '' : c.name, series: '' }))}>
              <span aria-hidden="true">{seriesIcon(c.name)}</span> {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="card learn-filters">
        <label className="f-field learn-search"><span className="f-label">Search</span><input type="search" value={f.q} onChange={set('q')} placeholder="Workshop, tool or skill…" /></label>
        <label className="f-field"><span className="f-label">Series</span><select value={f.series} onChange={set('series')}><option value="">All series</option>{options.series?.map((o) => <option key={o}>{o}</option>)}</select></label>
        {FILTERS.map(([k, label]) => (
          <label key={k} className="f-field"><span className="f-label">{label}</span><select value={f[k]} onChange={set(k)}><option value="">Any</option>{options[k]?.map((o) => <option key={o}>{o}</option>)}</select></label>
        ))}
        {active > 0 && <button type="button" className="btn btn-quiet btn-small learn-clear" onClick={() => setF({ ageGroup: '', skillLevel: '', projectType: '', duration: '', series: '', q: '' })}>Clear ({active})</button>}
      </div>
      {(all.error || filtered.error) && !list.length && <p className="f-alert f-alert-error" role="alert">{filtered.error || all.error}</p>}
      {loading && !list.length ? <SkeletonGrid /> : list.length ? (
        <>
          <p className="muted learn-count">{list.length} workshop{list.length === 1 ? '' : 's'}</p>
          <div className="learn-grid">{list.map((w, i) => <WorkshopCard key={w.id} w={w} index={i} />)}</div>
        </>
      ) : <EmptyState icon="🔍" title="No workshops match">Try clearing a filter or another topic.</EmptyState>}
    </div>
  );
}

export function WorkshopCard({ w, index = 0 }) {
  return (
    <Link to={`/learn/workshops/${encodeURIComponent(w.id)}`} className="card learn-card">
      <div className="learn-card-media">
        {w.image ? <RemoteImage src={w.image} fallback={seriesPhoto(w.series, index)} alt="" /> : <img src={`/images/${seriesPhoto(w.series, index)}-640.webp`} alt="" loading="lazy" decoding="async" />}
        <span className="learn-card-icon" aria-hidden="true">{seriesIcon(w.series)}</span>
        {w.seats != null && <span className={`learn-seats${w.seats <= 3 ? ' low' : ''}`}>{w.seats > 0 ? `${w.seats} seats` : 'Full'}</span>}
      </div>
      <div className="learn-card-body">
        <small className="learn-series">{w.series}</small>
        <h3>{w.title}</h3>
        <ul className="learn-meta">
          {w.duration && <li>⏱ {w.duration}</li>}
          {w.skillLevel && <li>📶 {w.skillLevel}</li>}
          {w.ageGroup && <li>👥 {w.ageGroup}</li>}
        </ul>
        {w.badge && <span className="pill">🏅 {w.badge}</span>}
        <span className="learn-go">View & register →</span>
      </div>
    </Link>
  );
}

// ---------- Learning paths ----------
function Paths() {
  const paths = useResource('learn:paths', (a) => L.paths(a), { fallback: [] });
  const [open, setOpen] = useState(null);
  if (paths.loading && !paths.data?.length) return <SkeletonGrid count={4} />;
  if (!paths.data?.length) return <EmptyState icon="🧭" title="Learning paths are coming soon">{paths.error}</EmptyState>;
  return (
    <div className="learn-paths">
      {paths.data.map((p) => {
        const isOpen = open === p.id || (open === null && p.steps.length > 0 && p === paths.data.find((x) => x.steps.length));
        return (
          <section key={p.id} className={`card learn-path${isOpen ? ' open' : ''}`}>
            <button type="button" className="learn-path-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? '' : p.id)}>
              <span className="learn-path-icon" aria-hidden="true">{seriesIcon(p.title)}</span>
              <span><strong>{p.title}</strong><small>{p.description}</small></span>
              <span className="learn-path-count">{p.steps.length ? `${p.steps.length} steps` : 'Workshops'}</span>
            </button>
            {isOpen && (
              p.steps.length ? (
                <ol className="learn-steps">
                  {p.steps.map((s) => (
                    <li key={s.id}>
                      <span className="learn-step-n">{s.sequence}</span>
                      <div>
                        <strong>{s.title}</strong>{s.duration && <small> · {s.duration}</small>}
                        {s.outcome && <p>{s.outcome}</p>}
                        <div className="learn-step-tags">{s.project && <span className="pill">Project: {s.project}</span>}{s.tools.map((t) => <span key={t} className="pill pill-quiet">{t}</span>)}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : <p className="learn-path-empty">Step-by-step plan coming soon. <Link to={`/learn?series=${encodeURIComponent(p.title)}`}>See this series' workshops →</Link></p>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ---------- Certifications ----------
function Certifications() {
  const certs = useResource('learn:certs', (a) => L.certifications(a), { fallback: [] });
  if (certs.loading && !certs.data?.length) return <SkeletonGrid count={6} />;
  if (!certs.data?.length) return <EmptyState icon="🏅" title="Badges are coming soon">{certs.error}</EmptyState>;
  return (
    <div className="learn-badges">
      {certs.data.map((c) => (
        <article key={c.id} className="card learn-badge">
          <div className="learn-badge-art">{c.image ? <img src={c.image} alt="" /> : <span aria-hidden="true">{seriesIcon(c.name)}</span>}</div>
          <h3>{c.name}</h3>
          <p className="muted">{c.description}</p>
        </article>
      ))}
    </div>
  );
}

// ---------- Guides (articles) ----------
function Guides() {
  const all = useResource('articles', (a) => contentService.articles(a), { fallback: fallbackArticles });
  const search = useApi((a) => contentService.search(a));
  const [q, setQ] = useState('');
  const term = q.trim();
  useEffect(() => {
    if (term.length < 3 || !all.fromApi) { search.reset(); return undefined; }
    const t = setTimeout(() => search.execute({ q: term }), DEBOUNCE);
    return () => clearTimeout(t);
  }, [term, all.fromApi]); // eslint-disable-line react-hooks/exhaustive-deps
  const local = term ? (all.data || []).filter((a) => `${a.title} ${a.summary} ${a.body.join(' ')}`.toLowerCase().includes(term.toLowerCase())) : all.data || [];
  const list = term.length >= 3 && all.fromApi && search.data ? search.data : local;
  return (
    <div>
      <div className="toolbar"><input className="f-input search" type="search" placeholder="Search guides (3+ letters)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search guides" /></div>
      <SourceNote fromApi={all.fromApi} />
      {all.loading || search.loading ? <SkeletonGrid /> : list.length ? (
        <div className="article-grid">
          {list.map((a) => (
            <article key={a.slug || a.id} className="article">
              <Link to={`/learn/${encodeURIComponent(a.slug || a.id)}`} className="article-img" tabIndex={-1} aria-hidden="true"><RemoteImage src={a.image} fallback="pillar-diy" alt="" /></Link>
              <div className="article-body">
                <h3><Link to={`/learn/${encodeURIComponent(a.slug || a.id)}`}>{a.title || a.slug}</Link></h3>
                {a.summary && <p className="article-sum">{a.summary}{a.minutes ? <small> · {a.minutes} min read</small> : null}</p>}
                <Link to={`/learn/${encodeURIComponent(a.slug || a.id)}`} className="link-btn">Read more →</Link>
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState icon="📘" title="No guides match">Try another word, like “deck” or “safety”.</EmptyState>}
    </div>
  );
}

// ---------- My learning (dashboard) ----------
function MyLearning() {
  const { isAuthenticated } = useSession();
  const dash = useResource(isAuthenticated ? 'learn:dashboard' : null, (a) => L.dashboard(a), { fallback: null, accept: (d) => d != null, ttl: 0 });
  if (!isAuthenticated) return <EmptyState icon="🔐" title="Sign in to see your learning"><Link to="/login" state={{ from: '/learn?tab=mine' }}>Sign in</Link> to track workshops, hours and badges.</EmptyState>;
  if (dash.loading && !dash.data) return <SkeletonGrid count={3} />;
  const d = dash.data;
  if (!d) return <EmptyState icon="⚠️" title="Your dashboard could not be loaded">{dash.error} <button type="button" className="link-btn" onClick={dash.reload}>Try again</button></EmptyState>;
  const stats = [['🔨', 'Workshops completed', d.workshopsCompleted], ['⏱', 'Learning hours', d.learningHours], ['🏅', 'Badges earned', d.badgesEarned], ['📅', 'Upcoming workshops', d.upcomingWorkshops], ['✨', 'AI design credits', d.aiDesignCredits]];
  return (
    <div className="learn-dash">
      <div className="card learn-dash-path">
        <span className="eyebrow">Current learning path</span>
        <h2>{d.currentPath || 'Not started yet'}</h2>
        <p className="muted">{d.currentPath ? 'Keep going — your next workshop is waiting.' : 'Pick a path and book your first workshop to start earning badges.'}</p>
        <div className="row-btns"><Link className="btn btn-primary btn-small" to="/learn">Browse workshops</Link><Link className="btn btn-outline btn-small" to="/learn?tab=paths">See learning paths</Link></div>
      </div>
      <div className="learn-stats">{stats.map(([icon, label, v]) => <div key={label} className="card learn-stat"><span aria-hidden="true">{icon}</span><b>{v}</b><small>{label}</small></div>)}</div>
    </div>
  );
}

// ---------- Submit an idea (DIY Incubator) ----------
function SubmitIdea() {
  const { isAuthenticated } = useSession();
  const { toast } = useToast();
  const [v, setV] = useState({ title: '', description: '', youtube: '' });
  const [file, setFile] = useState(null);
  const [done, setDone] = useState(null);
  const fileRef = useRef(null);
  const send = useApi(async (a) => {
    const c = await L.submitConcept(a);
    if (!c.success || (!a.file && !a.youtube)) return c;
    if (!c.data.conceptId) return { ...c, mediaSkipped: true };
    const m = await L.uploadMedia({ conceptId: c.data.conceptId, file: a.file, youtubeVideoLink: a.youtube, signal: a.signal });
    return m.success ? c : { ...c, mediaError: m.error };
  });
  const ytOk = !v.youtube || /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(v.youtube.trim());
  const valid = v.title.trim().length >= 3 && v.description.trim().length >= 20 && ytOk && (!file || file.size <= 25 * 1024 * 1024);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  if (!isAuthenticated) return <EmptyState icon="💡" title="Sign in to submit an idea"><Link to="/login" state={{ from: '/learn?tab=idea' }}>Sign in</Link> to send a DIY product idea to the Weekend-Live Incubator.</EmptyState>;
  if (done) return (
    <div className="card learn-idea-done" role="status">
      <span aria-hidden="true">🚀</span><h2>Idea submitted</h2><p>{done.message || 'Our incubator team will review it and get back to you.'}</p>
      {done.mediaError && <p className="enq-error">Your idea was saved, but the file could not be uploaded: {done.mediaError}</p>}
      <button type="button" className="btn btn-outline btn-small" onClick={() => { setDone(null); setV({ title: '', description: '', youtube: '' }); setFile(null); send.reset(); }}>Submit another idea</button>
    </div>
  );
  return (
    <form className="card learn-idea" noValidate onSubmit={async (e) => {
      e.preventDefault();
      if (!valid || send.loading) return;
      const r = await send.execute({ title: v.title, description: v.description, file, youtube: v.youtube.trim() });
      if (r.success) { setDone({ message: r.message, mediaError: r.mediaError }); toast('Idea submitted to the DIY Incubator'); }
    }}>
      <div><span className="eyebrow">DIY Incubator</span><h2>Have an idea for a DIY product?</h2><p className="muted">Tell us what you want to build. Add a sketch, photo or a YouTube link if you have one.</p></div>
      <label className="f-field"><span className="f-label">Idea title</span><input value={v.title} maxLength={120} onChange={set('title')} placeholder="Foldable balcony planter" /></label>
      <label className="f-field"><span className="f-label">Describe it</span><textarea rows={4} maxLength={2000} value={v.description} onChange={set('description')} placeholder="What does it do, who is it for, what materials would you use? (at least 20 characters)" /></label>
      <div className="wf-grid">
        <div className="f-field"><span className="f-label">Sketch, photo or PDF <em>(optional)</em></span>
          <input ref={fileRef} type="file" accept="image/*,application/pdf,video/mp4" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <div className="row-btns"><button type="button" className="btn btn-outline btn-small" onClick={() => fileRef.current?.click()}>{file ? 'Change file' : 'Choose file'}</button>{file && <small className="muted">{file.name} · {Math.round(file.size / 1024)} KB</small>}</div>
          {file && file.size > 25 * 1024 * 1024 && <small className="f-error">Please use a file under 25 MB.</small>}
        </div>
        <label className={`f-field${ytOk ? '' : ' has-error'}`}><span className="f-label">YouTube link <em>(optional)</em></span><input type="url" value={v.youtube} onChange={set('youtube')} placeholder="https://youtu.be/…" />{!ytOk && <small className="f-error">Enter a YouTube link.</small>}</label>
      </div>
      {send.error && <p className="f-alert f-alert-error" role="alert">{send.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={!valid || send.loading}>{send.loading ? 'Submitting…' : 'Submit idea'}</button>
    </form>
  );
}
