import { Link } from 'react-router-dom';
import Section from '../components/common/Section.jsx';
import RemoteImage from '../components/common/RemoteImage.jsx';
import useResource from '../hooks/useResource.js';
import { contentService } from '../services/contentService.js';
import { fallbackArticles } from '../data/fallbacks.js';

// Latest guides from GET /articles (built-in guides as fallback).
export default function KnowledgeCenter() {
  const a = useResource('articles', (x) => contentService.articles(x), { fallback: fallbackArticles });
  const list = (a.data || []).slice(0, 6);
  return (
    <Section id="learn" tone="warm" eyebrow="Learn & build" title="DIY knowledge center"
      intro="Free guides from our workshops — practical, safe and written for Odisha homes.">
      <div className="article-grid">
        {list.map((g) => {
          const to = `/learn/${encodeURIComponent(g.slug || g.id)}`;
          return (
            <article className="article reveal" key={g.slug || g.id} id={`guide-${g.slug || g.id}`}>
              <Link to={to} className="article-img" tabIndex={-1} aria-hidden="true"><RemoteImage src={g.image} fallback="pillar-diy" alt="" sizes="(max-width: 760px) 100vw, 33vw" /></Link>
              <div className="article-body">
                <h3><span aria-hidden="true">▶</span> <Link to={to}>{g.title}</Link></h3>
                <p className="article-sum">{g.summary}{g.minutes ? <small> · {g.minutes} min read</small> : null}</p>
                <Link to={to} className="link-btn">Read more</Link>
              </div>
            </article>
          );
        })}
      </div>
      <div className="center-row"><Link to="/learn" className="btn btn-outline">Browse all guides & search</Link></div>
    </Section>
  );
}
