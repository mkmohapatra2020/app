import { useEffect, useRef, useState } from 'react';
import Img from './Img.jsx';

// Before → after comparison. Pass `before`/`after` as /images names, or
// `beforeSrc`/`afterSrc` as URLs. `auto` sweeps the divider until touched.
export default function BeforeAfter({ before, after, beforeSrc, afterSrc, alt, auto = false, eager = false, aspect, sizes = '(max-width: 760px) 100vw, 33vw', labels = ['Before', 'After'] }) {
  const [pos, setPos] = useState(50);
  const [touched, setTouched] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!auto || touched || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf; const t0 = performance.now();
    const tick = (t) => { setPos(50 + 38 * Math.sin((t - t0) / 1400)); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [auto, touched]);

  const fromEvent = (clientX) => {
    const r = box.current.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  const pic = (name, src, label, className) => (src
    ? <img src={src} alt={`${alt} — ${label.toLowerCase()}`} className={className} />
    : <Img name={name} alt={`${alt} — ${label.toLowerCase()}`} sizes={sizes} className={className} eager={eager} />);

  return (
    <div
      className={`ba${auto && !touched ? ' ba-auto' : ''}`} ref={box} style={{ '--pos': `${pos}%`, aspectRatio: aspect }}
      onPointerMove={(e) => { if (e.pointerType === 'mouse' || e.buttons) { setTouched(true); fromEvent(e.clientX); } }}
      onPointerDown={(e) => { setTouched(true); fromEvent(e.clientX); }}
      onMouseLeave={() => { if (!auto) setPos(50); }}
    >
      {pic(after, afterSrc, labels[1], 'ba-after')}
      <div className="ba-before">{pic(before, beforeSrc, labels[0])}</div>
      <span className="ba-tag ba-tag-before">{labels[0]}</span><span className="ba-tag ba-tag-after">{labels[1]}</span>
      <span className="ba-handle" aria-hidden="true"><span>⟷</span></span>
      <input className="ba-range" type="range" min="0" max="100" value={Math.round(pos)} aria-label={`Compare ${labels[0].toLowerCase()} and ${labels[1].toLowerCase()}: ${alt}`} onChange={(e) => { setTouched(true); setPos(Number(e.target.value)); }} />
    </div>
  );
}
