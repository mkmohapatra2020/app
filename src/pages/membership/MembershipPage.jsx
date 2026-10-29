import PageShell from '../../components/common/PageShell.jsx';
import { JoinMembership, MyMembershipDetails } from '../../features/membership/MembershipUI.jsx';

// /membership — the signed-in member's data from the membership API, and a way to join.
export default function MembershipPage() {
  return (
    <PageShell className="membership-page" title="Membership" eyebrow="Weekend-Live Club" crumbs={[[null, 'Membership']]}
      intro="Learn, make and build all year — and get design help for your home.">
      <MyMembershipDetails />
      <JoinMembership />
    </PageShell>
  );
}
