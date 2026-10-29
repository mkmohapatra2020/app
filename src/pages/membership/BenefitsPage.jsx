import { Link } from 'react-router-dom';
import PageShell from '../../components/common/PageShell.jsx';
import { AiCreditsCard, MyBenefits } from '../../features/membership/MembershipUI.jsx';

// /membership/benefits — GET /membership/my-benefits and the AI credit balance.
export default function BenefitsPage() {
  return (
    <PageShell title="My benefits" eyebrow="Membership" crumbs={[['/profile', 'My account'], [null, 'My benefits']]}
      actions={<Link className="btn btn-outline btn-small" to="/membership">Membership</Link>}>
      <div className="mem-benefits-grid">
        <div><MyBenefits /></div>
        <AiCreditsCard />
      </div>
    </PageShell>
  );
}
