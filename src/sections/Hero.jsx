import { useEffect, useRef, useState } from 'react';
import Img from '../components/common/Img.jsx';
import BeforeAfter from '../components/common/BeforeAfter.jsx';
import { hero, showcase } from '../data/site.js';
import { afterLoad } from '../utils/idle.js';

const PAIRS = showcase.filter((s) => s.before);
import { bookWorkshop, useEnquiry } from '../features/enquiry/enquiry.js';

// Hero banner with a slow cross-fading photo reel (family, workshop, elder, hands-on).
export default function Hero() {
  const [i, setI] = useState(0);
  // Only the first photo loads with the page; the rest arrive after 'load'.
  const [allSlides, setAllSlides] = useState(false);
  const [pair, setPair] = useState(0);
  const picked = useRef(false);
  const enquiry = useEnquiry();
  useEffect(() => afterLoad(() => setAllSlides(true), 1500), []);
  useEffect(() => {
    if (!allSlides || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % hero.slides.length), 5500);
    const u = setInterval(() => { if (!picked.current) setPair((n) => (n + 1) % PAIRS.length); }, 9000);
    return () => { clearInterval(t); clearInterval(u); };
  }, [allSlides]);

  return (
    <header className="hero" id="top">
      <div className="hero-media" aria-hidden="true">
        {hero.slides.slice(0, allSlides ? hero.slides.length : 1).map((s, n) => (
          <Img key={s.src} name={s.src} alt="" sizes="100vw" eager={n === 0} fetchpriority={n === 0 ? 'high' : 'low'} className={`hero-slide${n === i ? ' is-on' : ''}`} />
        ))}
        <div className="hero-shade" />
      </div>
      <div className="wrap hero-inner">
        <div className="hero-copy">
        <span className="eyebrow hero-eyebrow">{hero.eyebrow}</span>
        <h1>{hero.title.map((t, n) => <span key={t} className={n === 1 ? 'accent' : ''}>{t} </span>)}</h1>
        <p className="lede">{hero.lede}</p>
        <div className="hero-ctas">
          <button type="button" className="btn btn-primary" onClick={() => bookWorkshop(enquiry)}>Join DIY Workshop</button>
          <a className="btn btn-ghost" href="#outdoor">Explore Outdoor Living</a>
        </div>
        <div className="hero-dots" role="tablist" aria-label="Hero photos">
          {hero.slides.map((s, n) => (
            <button key={s.src} type="button" role="tab" aria-selected={n === i} aria-label={s.alt} className={n === i ? 'is-on' : ''} onClick={() => { setAllSlides(true); setI(n); }} />
          ))}
        </div>
        </div>
        <aside className="hero-ba" aria-label="Before and after transformations">
          <div className="hero-ba-head">
            <span className="hero-ba-badge">Weekend transformation</span>
            <span className="hero-ba-title" key={PAIRS[pair].id}>{PAIRS[pair].title}</span>
          </div>
          <BeforeAfter key={PAIRS[pair].id} before={PAIRS[pair].before} after={PAIRS[pair].image} alt={PAIRS[pair].title} auto eager sizes="(max-width: 980px) 100vw, 40vw" />
          <div className="hero-ba-tabs" role="tablist" aria-label="Choose a transformation">
            {PAIRS.map((p, n) => (
              <button key={p.id} type="button" role="tab" aria-selected={n === pair} className={n === pair ? 'is-on' : ''} onClick={() => { picked.current = true; setPair(n); }}>{p.title}</button>
            ))}
          </div>
          <div className="hero-ba-foot">
            <p className="hero-ba-hint">Drag to compare · <a href="#outdoor">See all projects</a></p>
            <button type="button" className="hero-ba-try" onClick={() => window.dispatchEvent(new CustomEvent('wl:open-try-now', { detail: { mode: 'photo' } }))}>
              <span aria-hidden="true">✦</span> Try now on your space
            </button>
          </div>
        </aside>
      </div>
    </header>
  );
}
