import { Link } from 'react-router-dom';
import SectionPage from './SectionPage.jsx';
import PassportSection from '../../features/passport/PassportSection.jsx';

// School project helper card (AI Generator app).
function SchoolProjects() {
  return (
    <section className="sec sec-tight" aria-labelledby="school-h">
      <div className="wrap">
        <div className="tool-card kids-school">
          <div className="tool-head">
            <span className="eyebrow">School Project Work</span>
            <h3 id="school-h">Turn a school project idea into step-by-step pictures</h3>
            <p>Describe the model or craft your child needs to make, and our AI Generator draws an illustrated build sheet with materials and steps. Adults handle any cutting, drilling or hot glue.</p>
            <div className="row-btns">
              <Link className="btn btn-primary" to="/image-generator?for=school">Generate Project Steps</Link>
              <Link className="btn btn-outline" to="/workshops?q=kids">Book Kids Workshop</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// /kids — Kids DIY campaign & workshops, school projects, cross-links.
export default function KidsPage() {
  return (
    <SectionPage title="Kids" eyebrow="Ages 8–15 · always with adult supervision"
      intro="Weekend workshops where kids build real things, a DIY passport with a badge for every project, and an AI helper for school project work."
      sections={[PassportSection, SchoolProjects]}
      related={[
        ['/workshops?q=kids', 'Kids workshops', 'Weekend sessions for young builders', '🔨'],
        ['/learn', 'Learn', 'Guides and DIY tutorials for families', '📚'],
        ['/build-together', 'Build Together', 'Family build days for all ages', '👨‍👩‍👧'],
      ]} />
  );
}
