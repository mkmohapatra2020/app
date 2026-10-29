import { Link } from 'react-router-dom';
import Section from '../components/common/Section.jsx';
import { JoinMembership, MyMembershipDetails } from '../features/membership/MembershipUI.jsx';

// Home "Membership program": the member's own data from the membership API, and a way to join.
export default function Membership() {
  return (
    <Section id="club" tone="warm" eyebrow="Membership program" title="Weekend-Live Club"
      intro="Keep learning all year — tips, savings, AI design credits and first access to the best workshops.">
      <MyMembershipDetails guestPrompt={false} />
      <JoinMembership />
      <p className="mem-more"><Link to="/membership">See your membership →</Link></p>
    </Section>
  );
}
