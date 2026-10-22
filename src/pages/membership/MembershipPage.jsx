import PageShell from '../../components/common/PageShell.jsx';
import { ComparisonMatrix, PlanFamilies } from '../../features/membership/MembershipUI.jsx';
import { useMyEntitlements } from '../../features/membership/useMembership.js';
import { joinMembership, useEnquiry } from '../../features/enquiry/enquiry.js';

// /membership — plans by family + comparison matrix. Everything comes from the API.
export default function MembershipPage() {
  const enquiry = useEnquiry();
  const mine = useMyEntitlements();
  return (
    <PageShell className="membership-page" title="Membership" eyebrow="Weekend-Live Club" crumbs={[[null, 'Membership']]}
      intro="Learn, make and build all year — and get design help for your home. Compare every plan side by side.">
      <PlanFamilies owned={mine.data?.plans || []} onChoose={(p, all) => joinMembership(enquiry, p.name, all.map((x) => x.name))} />
      <section className="mem-compare" aria-labelledby="mem-compare-h">
        <h2 id="mem-compare-h">Compare plans</h2>
        <ComparisonMatrix />
      </section>
    </PageShell>
  );
}
