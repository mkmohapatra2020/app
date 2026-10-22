import { Link } from 'react-router-dom';
import PageShell, { EmptyState, SkeletonGrid } from '../../components/common/PageShell.jsx';
import { AiCreditsCard } from '../../features/membership/MembershipUI.jsx';
import { useMyEntitlements, useMyMemberships } from '../../features/membership/useMembership.js';
import { entitlementLabel, formatEntitlement, isActiveBenefit } from '../../utils/entitlements.js';
import { useMatrix } from '../../features/membership/useMembership.js';

// /membership/benefits — the signed-in user's effective entitlements.
// The page does not know benefit names: rows are whatever the API returns.
export default function BenefitsPage() {
  const ents = useMyEntitlements();
  const mine = useMyMemberships();
  const matrix = useMatrix();
  const nameOf = (code) => matrix.data?.rows?.find((r) => r.code === code)?.name;
  const list = (ents.data?.entitlements || []).filter((e) => isActiveBenefit(e.value));
  // Service-family plans get their own block — decided by familyCode from the API.
  const service = (mine.data || []).filter((m) => /service/i.test(m.familyCode));
  const servicePlanCodes = service.map((m) => m.planCode);
  const serviceRows = matrix.data?.rows?.filter((r) => servicePlanCodes.some((p) => isActiveBenefit(matrix.data.values[p]?.[r.code]))) || [];

  return (
    <PageShell title="My benefits" eyebrow="Membership" crumbs={[['/profile', 'My account'], [null, 'My benefits']]}
      actions={<Link className="btn btn-outline btn-small" to="/membership">Compare plans</Link>}>
      <div className="mem-benefits-grid">
        <div>
          {ents.loading ? <SkeletonGrid count={3} /> : list.length ? (
            <div className="card">
              <h2>Your benefits</h2>
              <ul className="mem-benefit-list">
                {list.map((e) => { const v = formatEntitlement(e.code, e.value); return <li key={e.code}><span aria-hidden="true">✓</span>{entitlementLabel(e.code, nameOf(e.code))}{v !== '✓' && <b>{v}</b>}</li>; })}
              </ul>
            </div>
          ) : <EmptyState icon="🌱" title="No benefits yet">{ents.error ? 'Your benefits could not be loaded right now.' : <>Choose a <Link to="/membership">membership</Link> to unlock benefits.</>}</EmptyState>}

          {service.length > 0 && serviceRows.length > 0 && (
            <div className="card mem-service">
              <span className="eyebrow">{service.map((m) => m.planName).join(' · ')}</span>
              <h2>Your Outdoor Living Benefits</h2>
              <ul className="mem-benefit-list">
                {serviceRows.map((r) => {
                  const best = servicePlanCodes.map((p) => matrix.data.values[p]?.[r.code]).find(isActiveBenefit);
                  const v = formatEntitlement(r.code, best);
                  return <li key={r.code}><span aria-hidden="true">✓</span>{entitlementLabel(r.code, r.name)}{v !== '✓' && <b>{v}</b>}</li>;
                })}
              </ul>
            </div>
          )}
        </div>
        <AiCreditsCard />
      </div>
    </PageShell>
  );
}
