export default function Section({ id, className = '', eyebrow, title, intro, children, tone }) {
  return (
    <section id={id} className={`sec ${tone ? `sec-${tone}` : ''} ${className}`}>
      <div className="wrap">
        {(eyebrow || title) && (
          <header className="sec-head reveal">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h2>{title}</h2>}
            {intro && <p>{intro}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

export function SampleTag({ show }) {
  return show ? <span className="sample-tag" title="Placeholder content — replace with real details">Sample</span> : null;
}
