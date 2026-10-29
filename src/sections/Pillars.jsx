import { Link } from 'react-router-dom';
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
              <Link className="btn btn-outline" to={p.href}>Explore <span aria-hidden="true">→</span></Link>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
