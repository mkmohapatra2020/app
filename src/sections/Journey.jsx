import Section from '../components/common/Section.jsx';
import { journey } from '../data/site.js';
import { bookWorkshop, useEnquiry } from '../features/enquiry/enquiry.js';

export default function Journey() {
  const enquiry = useEnquiry();
  return (
    <Section id="journey" eyebrow="Workshop journey" title="From sign-up to your own creation">
      <ol className="journey">
        {journey.map(([t, d], i) => (
          <li className="journey-step reveal" key={t}>
            <span className="journey-num">{i + 1}</span>
            <div><h3>{t}</h3><p>{d}</p></div>
          </li>
        ))}
      </ol>
      <div className="center-row"><button type="button" className="btn btn-primary" onClick={() => bookWorkshop(enquiry)}>Start with step 1 — Register</button></div>
    </Section>
  );
}
