import { Link } from 'react-router-dom';
import { EmptyState, SkeletonGrid } from '../../components/common/PageShell.jsx';
import { entitlementLabel, formatEntitlement, isActiveBenefit } from '../../utils/entitlements.js';
import { useFamilies, useMatrix, usePlans, useMyMemberships, useAiCredits, useIncubatorEligibility } from './useMembership.js';

const money = (p) => (p.price === undefined ? '' : p.price === 0 ? 'Free' : `₹${p.price.toLocaleString('en-IN')}`);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/**
 * Plans grouped by family, exactly as the API returns them.
 * New families/plans appear automatically. `owned` = planCodes the user has.
 */
export function PlanFamilies({ owned = [], onChoose, busy = false, compact = false }) {
  const families = useFamilies();
  const plans = usePlans();
  const matrix = useMatrix();
  if (families.loading || plans.loading) return <SkeletonGrid count={3} />;
  const list = plans.data || [];
  if (!list.length) return <EmptyState icon="🪵" title="Membership plans are on their way">{plans.error ? 'Plans could not be loaded right now. Please try again shortly.' : 'Check back soon.'}</EmptyState>;
  // Families from the API; plans whose family is unknown still show in their own group.
  const fams = [...(families.data || [])];
  list.forEach((p) => { if (!fams.some((f) => f.code === p.familyCode)) fams.push({ code: p.familyCode, name: p.familyCode || 'Plans' }); });

  return (
    <div className="mem-families">
      {fams.map((f) => {
        const group = list.filter((p) => p.familyCode === f.code);
        if (!group.length) return null;
        return (
          <section key={f.code} className="mem-family" aria-labelledby={`fam-${f.code}`}>
            <header className="mem-family-head"><h3 id={`fam-${f.code}`}>{f.name}</h3>{f.description && <p className="muted">{f.description}</p>}</header>
            <div className="tier-grid">
              {group.map((p) => {
                const mine = owned.includes(p.code);
                const perks = (matrix.data?.rows || []).filter((r) => isActiveBenefit(matrix.data.values[p.code]?.[r.code])).slice(0, compact ? 4 : 6);
                return (
                  <article key={p.code} className={`tier reveal${p.featured ? ' featured' : ''}`}>
                    {mine ? <span className="tier-flag">Your plan</span> : p.featured && <span className="tier-flag">Most popular</span>}
                    <h3>{p.name}</h3>
                    {money(p) && <p className="tier-price">{money(p)}{p.price > 0 && p.period && <small>/{p.period}</small>}</p>}
                    {p.description && <p className="muted mem-desc">{p.description}</p>}
                    {perks.length > 0 && <ul className="ticks">{perks.map((r) => {
                      const v = formatEntitlement(r.code, matrix.data.values[p.code][r.code]);
                      return <li key={r.code}>{entitlementLabel(r.code, r.name)}{v !== '✓' && <b className="mem-val"> {v}</b>}</li>;
                    })}</ul>}
                    {onChoose && <button type="button" className={`btn ${p.featured ? 'btn-primary' : 'btn-outline'}`} disabled={mine || busy} onClick={() => onChoose(p, list)}>{mine ? 'Current plan' : 'Become a member'}</button>}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Columns = plans, rows = entitlement codes — both from the API. */
export function ComparisonMatrix() {
  const plans = usePlans();
  const matrix = useMatrix();
  const families = useFamilies();
  if (plans.loading || matrix.loading) return <SkeletonGrid count={2} />;
  // Columns grouped by family (family order, then plan order — both from the API).
  const famOrder = (code) => { const i = (families.data || []).findIndex((f) => f.code === code); return i < 0 ? 99 : i; };
  const cols = [...(plans.data || [])].sort((a, b) => famOrder(a.familyCode) - famOrder(b.familyCode) || a.order - b.order);
  const rows = matrix.data?.rows || [];
  if (!cols.length || !rows.length) return <EmptyState icon="📋" title="Comparison coming soon">{plans.error || matrix.error ? 'The comparison could not be loaded right now.' : 'Plans and benefits will appear here.'}</EmptyState>;
  const famName = (code) => families.data?.find((f) => f.code === code)?.name || code;
  return (
    <div className="mem-matrix-wrap" role="region" aria-label="Plan comparison" tabIndex={0}>
      <table className="mem-matrix">
        <thead>
          <tr><th scope="col">Benefit</th>{cols.map((p) => <th key={p.code} scope="col"><small>{famName(p.familyCode)}</small>{p.name}{money(p) && <span className="mem-matrix-price">{money(p)}</span>}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <th scope="row">{entitlementLabel(r.code, r.name)}</th>
              {cols.map((p) => { const v = formatEntitlement(r.code, matrix.data.values[p.code]?.[r.code]); return <td key={p.code} className={v === '—' ? 'is-off' : v === '✓' ? 'is-on' : ''}>{v === '—' ? <span aria-label="Not included">—</span> : v === '✓' ? <span aria-label="Included">✓</span> : v}</td>; })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Every active membership, as a badge. */
export function ActiveMemberships() {
  const mine = useMyMemberships();
  if (mine.loading) return <div className="skeleton mem-badges-skel" />;
  const active = (mine.data || []).filter((m) => !/cancel|expired|inactive/i.test(m.status));
  return (
    <div className="card mem-active">
      <h2>Active memberships</h2>
      {active.length ? (
        <ul className="mem-badges">
          {active.map((m) => (
            <li key={m.id || m.planCode} className={`mem-badge mem-badge-${m.familyCode.toLowerCase()}`}>
              <small>{m.familyName || m.familyCode}</small>
              <strong>{m.planName}</strong>
              {(m.startDate || m.endDate) && <span className="muted">{m.endDate ? `Until ${fmtDate(m.endDate)}` : `Since ${fmtDate(m.startDate)}`}</span>}
            </li>
          ))}
        </ul>
      ) : <p className="muted">{mine.error ? 'Your memberships could not be loaded right now.' : <>No active membership yet. <Link to="/membership">Compare plans</Link>.</>}</p>}
    </div>
  );
}

/** AI Design Credits — numbers only from the API. */
export function AiCreditsCard({ credits: given }) {
  const own = useAiCredits();
  const c = given || own;
  const d = c.data;
  const pct = d && d.allocated > 0 ? Math.min(100, (d.remaining / d.allocated) * 100) : 0;
  return (
    <div className="card mem-credits" aria-live="polite">
      <span className="eyebrow">AI Design Credits</span>
      {c.loading && !d ? <div className="skeleton kpi" /> : d ? (
        <>
          <p className="mem-credits-big"><b>{d.remaining}</b> remaining</p>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={d.allocated} aria-valuenow={d.remaining} aria-label="Credits remaining"><span style={{ width: `${pct}%` }} /></div>
          <dl className="mem-credits-dl"><div><dt>Allocated</dt><dd>{d.allocated}</dd></div><div><dt>Used</dt><dd>{d.consumed}</dd></div><div><dt>Remaining</dt><dd>{d.remaining}</dd></div></dl>
        </>
      ) : <p className="muted">Credits could not be loaded right now.</p>}
    </div>
  );
}

/** Incubator shortcuts, only when the API says the user is eligible. */
export function IncubatorWidget() {
  const e = useIncubatorEligibility();
  if (e.loading || !e.data) return null;
  return (
    <div className="card mem-incubator">
      <span className="eyebrow">DIY Incubator</span>
      <h3>You can submit ideas to the incubator</h3>
      <div className="row-btns"><Link className="btn btn-primary btn-small" to="/incubator#submit">Submit idea</Link><Link className="btn btn-outline btn-small" to="/incubator">View incubator projects</Link></div>
    </div>
  );
}

/** Membership dashboard used on the account page. */
export function MembershipDashboard() {
  return (
    <div className="mem-dash">
      <ActiveMemberships />
      <AiCreditsCard />
      <IncubatorWidget />
      <p className="mem-dash-links"><Link to="/membership/benefits">See all my benefits →</Link> · <Link to="/membership">Compare plans →</Link></p>
    </div>
  );
}
