import Section from '../components/common/Section.jsx';
import { membership as localTiers } from '../data/site.js';
import { joinMembership, useEnquiry } from '../features/enquiry/enquiry.js';
import useResource from '../hooks/useResource.js';
import useSession from '../hooks/useSession.js';
import { userService } from '../services/userService.js';

// Plans from GET /membership when available (also tells us the member's
// current tier); subscribing goes through POST /membership/subscribe.
export default function Membership() {
  const enquiry = useEnquiry();
  const { isAuthenticated } = useSession();
  const m = useResource(isAuthenticated ? 'membership' : null, (a) => userService.getMembership(a), { fallback: null, accept: (d) => !!d });
  const plans = m.data?.plans?.length ? m.data.plans.map((p) => ({ ...p, featured: /gold/i.test(p.tier) })) : localTiers;
  const current = (m.data?.current || '').toLowerCase();
  return (
    <Section id="club" tone="warm" eyebrow="Membership program" title="Weekend-Live Club"
      intro="Keep learning all year — tips, savings and first access to the best workshops.">
      <div className="tier-grid">
        {plans.map((p) => {
          const mine = current && p.tier.toLowerCase() === current;
          return (
            <article className={`tier reveal${p.featured ? ' featured' : ''}`} key={p.tier}>
              {mine ? <span className="tier-flag">Your plan</span> : p.featured && <span className="tier-flag">Most popular</span>}
              <h3>{p.tier}</h3>
              {Number.isFinite(p.price) && <p className="tier-price">₹{p.price.toLocaleString('en-IN')}<small>/month</small></p>}
              <ul className="ticks">{p.perks.map((x) => <li key={x}>{x}</li>)}</ul>
              <button type="button" className={`btn ${p.featured ? 'btn-primary' : 'btn-outline'}`} disabled={mine} onClick={() => joinMembership(enquiry, p.tier)}>{mine ? 'Current plan' : 'Become Member'}</button>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
