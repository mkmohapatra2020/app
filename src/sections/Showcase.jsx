import Section from '../components/common/Section.jsx';
import Img from '../components/common/Img.jsx';
import BeforeAfter from '../components/common/BeforeAfter.jsx';
import { showcase } from '../data/site.js';

export default function Showcase() {
  return (
    <Section id="outdoor" eyebrow="Outdoor living showcase" title="Featured projects"
      intro="Spaces for residential homes and farmhouses, built to survive Odisha's monsoon. Hover or drag to compare before and after.">
      <div className="show-grid">
        {showcase.map((s) => (
          <article className="show-card reveal" key={s.id}>
            {s.before
              ? <BeforeAfter before={s.before} after={s.image} alt={s.title} />
              : <div className="show-img"><Img name={s.image} alt={s.title} sizes="(max-width: 760px) 100vw, 33vw" /></div>}
            <div className="show-body"><h3>{s.title}</h3><p>{s.text}</p></div>
          </article>
        ))}
      </div>
      <p className="fine-print">Images are illustrative concepts of the kind of spaces we build.</p>
    </Section>
  );
}
