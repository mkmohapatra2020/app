import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell, { EmptyState, SkeletonGrid, SourceNote } from '../../components/common/PageShell.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import useResource from '../../hooks/useResource.js';
import useApi from '../../hooks/useApi.js';
import { contentService } from '../../services/contentService.js';
import { fallbackArticles } from '../../data/fallbacks.js';

const DEBOUNCE = 450;

export default function LearnPage() {
  const all = useResource('articles', (a) => contentService.articles(a), { fallback: fallbackArticles });
  const search = useApi((a) => contentService.search(a));
  const [q, setQ] = useState('');
  const term = q.trim();

  // Server search (debounced) when online; local filter otherwise.
  useEffect(() => {
    if (term.length < 3 || !all.fromApi) { search.reset(); return undefined; }
    const t = setTimeout(() => search.execute({ q: term }), DEBOUNCE);
    return () => clearTimeout(t);
  }, [term, all.fromApi]); // eslint-disable-line react-hooks/exhaustive-deps

  const local = term ? (all.data || []).filter((a) => `${a.title} ${a.summary} ${a.body.join(' ')}`.toLowerCase().includes(term.toLowerCase())) : all.data || [];
  const list = term.length >= 3 && all.fromApi && search.data ? search.data : local;

  return (
    <PageShell title="DIY knowledge center" eyebrow="Learn & build" crumbs={[[null, 'Learn']]}
      intro="Practical, safe guides from our workshops — woodworking, tool safety, outdoor care, senior-friendly homes and more.">
      <div className="toolbar"><input className="f-input search" type="search" placeholder="Search guides (3+ letters)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search guides" /></div>
      <SourceNote fromApi={all.fromApi} />
      {all.loading || search.loading ? <SkeletonGrid /> : list.length ? (
        <div className="article-grid">
          {list.map((a) => (
            <article key={a.slug || a.id} className="article reveal">
              <Link to={`/learn/${encodeURIComponent(a.slug || a.id)}`} className="article-img" tabIndex={-1} aria-hidden="true"><RemoteImage src={a.image} fallback="pillar-diy" alt="" /></Link>
              <div className="article-body">
                <h3><Link to={`/learn/${encodeURIComponent(a.slug || a.id)}`}>{a.title}</Link></h3>
                <p className="article-sum">{a.summary}{a.minutes ? <small> · {a.minutes} min read</small> : null}</p>
                <Link to={`/learn/${encodeURIComponent(a.slug || a.id)}`} className="link-btn">Read more →</Link>
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState icon="📘" title="No guides match">Try another word, like “deck” or “safety”.</EmptyState>}
    </PageShell>
  );
}
