import { useState } from 'react';
import Section from '../components/common/Section.jsx';
import Img from '../components/common/Img.jsx';
import { articles } from '../data/site.js';

export default function KnowledgeCenter() {
  const [open, setOpen] = useState(null);
  return (
    <Section id="learn" tone="warm" eyebrow="Learn & build" title="DIY knowledge center"
      intro="Free guides from our workshops — practical, safe and written for Odisha homes.">
      <div className="article-grid">
        {articles.map((a) => {
          const isOpen = open === a.id;
          return (
            <article className={`article reveal${isOpen ? ' is-open' : ''}`} key={a.id} id={`guide-${a.id}`}>
              <div className="article-img"><Img name={a.image} alt="" sizes="(max-width: 760px) 100vw, 33vw" /></div>
              <div className="article-body">
                <h3><span aria-hidden="true">▶</span> {a.title}</h3>
                <p className="article-sum">{a.summary} <small>· {a.minutes} min read</small></p>
                <div className="article-more" id={`more-${a.id}`} hidden={!isOpen}>
                  {a.body.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}
                </div>
                <button type="button" className="link-btn" aria-expanded={isOpen} aria-controls={`more-${a.id}`} onClick={() => setOpen(isOpen ? null : a.id)}>
                  {isOpen ? 'Show less' : 'Read more'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
