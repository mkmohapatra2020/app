import { Link, useParams } from 'react-router-dom';
import PageShell, { SourceNote } from '../../components/common/PageShell.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import useResource from '../../hooks/useResource.js';
import { contentService } from '../../services/contentService.js';
import { fallbackArticles } from '../../data/fallbacks.js';
import { sanitizeHtml } from '../../utils/sanitize.js';

export default function ArticlePage() {
  const { slug } = useParams();
  const local = fallbackArticles.find((a) => a.slug === slug);
  const a = useResource(`article:${slug}`, (x) => contentService.article({ slug, ...x }), { fallback: local, accept: (d) => !!d?.title });
  const article = a.data;
  if (!article) return <PageShell title={a.loading ? 'Loading…' : 'Guide not found'} crumbs={[['/learn', 'Learn'], [null, 'Guide']]}>{!a.loading && <p><Link to="/learn">Browse all guides</Link></p>}</PageShell>;
  return (
    <PageShell title={article.title} eyebrow={article.category || 'Guide'} crumbs={[['/learn', 'Learn'], [null, article.title]]} narrow>
      <SourceNote fromApi={a.fromApi} />
      <p className="muted article-meta">{[article.author, article.date && new Date(article.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), article.minutes && `${article.minutes} min read`].filter(Boolean).join(' · ')}</p>
      <RemoteImage src={article.image} fallback="pillar-diy" alt="" className="detail-hero" />
      {article.summary && <p className="lead-text">{article.summary}</p>}
      {article.isHtml
        ? <div className="prose" dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.html) }} />
        : <div className="prose">{article.body.map((p, i) => <p key={i}>{p}</p>)}</div>}
      <div className="card cta-card"><h3>Learn it hands-on</h3><p>Join a weekend workshop and build with our crew.</p><Link to="/workshops" className="btn btn-primary btn-small">See workshops</Link></div>
    </PageShell>
  );
}
