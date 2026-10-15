import { Link } from 'react-router-dom';
import Section from '../components/common/Section.jsx';
import Img from '../components/common/Img.jsx';
import { flagships } from '../data/flagship.js';

// Homepage band introducing the three new flagship business areas.
export default function Flagships() {
  return (
    <Section id="flagships" className="sec-flagships" eyebrow="New at Weekend-Live" title="Three new ways to make, mend and invent"
      intro="Heritage restoration, programmes for active elders and an incubator for new ideas — all built on the same workshop, the same craftspeople and the same community.">
      <div className="flag-grid">
        {flagships.map((f) => (
          <Link key={f.id} to={f.to} className={`flag-card flag-${f.id} reveal`}>
            <Img name={f.image} alt="" sizes="(max-width: 760px) 100vw, 33vw" />
            <div className="flag-body">
              <span className="flag-tag">{f.tag}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
              <span className="flag-go" aria-hidden="true">Explore →</span>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}
