import Section from '../components/common/Section.jsx';
import { membership } from '../data/site.js';
import { joinMembership, useEnquiry } from '../features/enquiry/enquiry.js';

export default function Membership() {
  const enquiry = useEnquiry();
  return (
    <Section id="club" tone="warm" eyebrow="Membership program" title="Weekend-Live Club"
      intro="Keep learning all year — tips, savings and first access to the best workshops.">
      <div className="tier-grid">
        {membership.map((m) => (
          <article className={`tier reveal${m.featured ? ' featured' : ''}`} key={m.tier}>
            {m.featured && <span className="tier-flag">Most popular</span>}
            <h3>{m.tier}</h3>
            <ul className="ticks">{m.perks.map((p) => <li key={p}>{p}</li>)}</ul>
            <button type="button" className={`btn ${m.featured ? 'btn-primary' : 'btn-outline'}`} onClick={() => joinMembership(enquiry, m.tier)}>Become Member</button>
          </article>
        ))}
      </div>
    </Section>
  );
}
