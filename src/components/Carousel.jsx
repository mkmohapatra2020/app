import { useCallback, useEffect, useRef, useState } from 'react';

export const projectSlides = [
  ['deck-red-chairs.webp', 'Sunny timber deck with red outdoor lounge chairs', 'A warm, open-air deck for slow afternoons'],
  ['pergola-patio.webp', 'Modern patio shaded by a timber pergola', 'Clean lines, generous shade'],
  ['pergola-ideas.webp', 'Four outdoor pergola design inspirations', 'Pergola ideas for every kind of gathering'],
  ['evening-lounge.webp', 'Evening lounge on a timber deck beneath a wooden pergola', 'An evening lounge under the lights'],
].map(([src, alt, caption]) => ({ src: `/projects/${src}`, alt, caption }));

// One slide image with a shimmer loader until it has loaded (or failed).
function SlideImage({ src, alt }) {
  const [state, setState] = useState('loading'); // loading | loaded | error
  const imgRef = useCallback((img) => {
    if (img && img.complete && img.naturalWidth > 0) setState('loaded'); // already cached
  }, []);
  return (
    <>
      {state !== 'loaded' && (
        <div className={`slide-loader${state === 'error' ? ' is-error' : ''}`} aria-hidden="true">
          {state === 'error' ? <span>Image unavailable</span> : <span className="slide-spinner" />}
        </div>
      )}
      <img
        ref={imgRef} src={src} alt={alt} decoding="async"
        className={state === 'loaded' ? 'is-loaded' : ''}
        onLoad={() => setState('loaded')} onError={() => setState('error')}
      />
    </>
  );
}

// Accessible carousel — advances gently and pauses while being used.
export default function Carousel({ slides = projectSlides, interval = 5000, label = 'Featured Weekend-Live projects' }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef(0);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const show = useCallback((i) => setActive((i + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused || reduceMotion) return undefined;
    const t = setInterval(() => setActive((a) => (a + 1) % slides.length), interval);
    return () => clearInterval(t);
  }, [paused, reduceMotion, interval, slides.length, active]);

  return (
    <div
      className="carousel"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') show(active - 1); if (e.key === 'ArrowRight') show(active + 1); }}
      onTouchStart={(e) => { touchStart.current = e.changedTouches[0].screenX; }}
      onTouchEnd={(e) => {
        const delta = e.changedTouches[0].screenX - touchStart.current;
        if (Math.abs(delta) > 40) show(active + (delta < 0 ? 1 : -1));
      }}
    >
      <div className="carousel-viewport" tabIndex={0} aria-label={label}>
        <div className="carousel-track" style={{ transform: `translateX(-${active * 100}%)` }}>
          {slides.map((s, i) => (
            <figure key={s.src} className={`carousel-slide${i === active ? ' is-active' : ''}`}>
              <SlideImage src={s.src} alt={s.alt} />
              <figcaption className="carousel-caption">{s.caption}</figcaption>
            </figure>
          ))}
        </div>
        <button className="carousel-btn prev" type="button" aria-label="Previous image" onClick={() => show(active - 1)}>&#8249;</button>
        <button className="carousel-btn next" type="button" aria-label="Next image" onClick={() => show(active + 1)}>&#8250;</button>
      </div>
      <div className="carousel-dots" aria-label="Choose gallery image">
        {slides.map((s, i) => (
          <button
            key={s.src} type="button" className={`carousel-dot${i === active ? ' is-active' : ''}`}
            aria-label={`Show image ${i + 1}`} aria-current={i === active} onClick={() => show(i)}
          />
        ))}
      </div>
    </div>
  );
}
