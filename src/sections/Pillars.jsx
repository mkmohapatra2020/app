import Section from '../components/common/Section.jsx';
import Img from '../components/common/Img.jsx';
import { pillars } from '../data/site.js';

export default function Pillars() {
  return (
    <Section id="about" eyebrow="Three experience pillars" title="Not just services — journeys for every generation"
      intro="Weekend-Live blends DIY learning, outdoor living, elder-friendly home improvements and heritage craft into one community where families learn, build and live better together.">
      <div className="pillar-grid">
        {pillars.map((p) => (
          <article className="pillar reveal" key={p.id}>
            <div className="pillar-img"><Img name={p.image} alt="" sizes="(max-width: 760px) 100vw, 33vw" /></div>
            <div className="pillar-body">
              <h3>{p.title}</h3>
              <p>{p.text}</p>
              <ul className="ticks">{p.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
              <a className="btn btn-outline" href={p.href}>Explore <span aria-hidden="true">→</span></a>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
