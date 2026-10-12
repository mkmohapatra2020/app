import Section from './Section.jsx';
import Img from './Img.jsx';
import { heritage } from '../data/site.js';
import { generalEnquiry, useEnquiry } from '../lib/enquiry.js';

export default function Heritage() {
  const enquiry = useEnquiry();
  return (
    <Section id="heritage" tone="dark" eyebrow="Heritage & traditional crafts" title="Preserving skills across generations">
      <div className="heritage-grid">
        {heritage.map((h, i) => (
          <article className={`heritage-card reveal${i === 0 ? ' wide' : ''}`} key={h.title}>
            <Img name={h.image} alt="" sizes={i === 0 ? '(max-width: 760px) 100vw, 50vw' : '(max-width: 760px) 100vw, 25vw'} />
            <div><h3>{h.title}</h3><p>{h.text}</p></div>
          </article>
        ))}
      </div>
      <div className="center-row"><button type="button" className="btn btn-primary" onClick={() => generalEnquiry(enquiry, "I'd like to explore the Heritage Collection.")}>Explore Heritage Collection</button></div>
    </Section>
  );
}
