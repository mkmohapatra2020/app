import { Link } from 'react-router-dom';
import Section from '../components/common/Section.jsx';
import { joinMembership, useEnquiry } from '../features/enquiry/enquiry.js';
import { PlanFamilies } from '../features/membership/MembershipUI.jsx';
import { useMyEntitlements } from '../features/membership/useMembership.js';

// Membership families and plans from the membership API — no static cards.
// New plans or families appear automatically.
export default function Membership() {
  const enquiry = useEnquiry();
  const mine = useMyEntitlements();
  return (
    <Section id="club" tone="warm" eyebrow="Membership program" title="Weekend-Live Club"
      intro="Keep learning all year — tips, savings, AI design credits and first access to the best workshops.">
      <PlanFamilies compact owned={mine.data?.plans || []} onChoose={(p, all) => joinMembership(enquiry, p.name, all.map((x) => x.name))} />
      <p className="mem-more"><Link to="/membership">Compare all plans and benefits →</Link></p>
    </Section>
  );
}
