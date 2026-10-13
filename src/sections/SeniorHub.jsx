import Section from '../components/common/Section.jsx';
import Img from '../components/common/Img.jsx';
import SafetyScore from '../features/safetyScore/SafetyScore.jsx';
import { seniorFeatures } from '../data/site.js';
import { requestAssessment, useEnquiry } from '../features/enquiry/enquiry.js';

export default function SeniorHub() {
  const enquiry = useEnquiry();
  return (
    <Section id="seniors" eyebrow="Elderly home improvement hub" title="Helping seniors stay independent"
      intro="Safe, dignified upgrades that let parents and grandparents keep living the way they like.">
      <div className="senior-layout">
        <div className="senior-img reveal"><Img name="senior-hub" alt="A senior-friendly bathroom with grab rails, anti-slip tiles and a shower seat" sizes="(max-width: 900px) 100vw, 45vw" /></div>
        <div className="reveal">
          <ul className="senior-list">
            {seniorFeatures.map(([t, d]) => <li key={t}><span className="check" aria-hidden="true">✓</span><div><strong>{t}</strong><span>{d}</span></div></li>)}
          </ul>
          <button type="button" className="btn btn-primary" onClick={() => requestAssessment(enquiry)}>Free Home Assessment</button>
        </div>
      </div>
      <SafetyScore />
    </Section>
  );
}
