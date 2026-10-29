import { Link } from 'react-router-dom';
import { EmptyState, SkeletonGrid } from '../../components/common/PageShell.jsx';
import { entitlementLabel, formatEntitlement, isActiveBenefit } from '../../utils/entitlements.js';
import useSession from '../../hooks/useSession.js';
import { joinMembership, useEnquiry } from '../enquiry/enquiry.js';
import { useMyMemberships, useAiCredits, useMembershipOverview, useMyBenefits, useMyCredits, useMyEntitlements } from './useMembership.js';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// ---------- every field of an API record ----------
const human = (k) => String(k).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
const isPlain = (v) => v === null || typeof v !== 'object';
const fmtValue = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return v.toLocaleString('en-IN');
  if (/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(v)) return fmtDate(v);
  return String(v);
};

/** Key/value list of everything in an API object (nested objects and lists included). */
export function ApiFields({ data, skip = [], className = '' }) {
  if (data == null) return null;
  if (isPlain(data)) return <p className="mem-fields-value">{fmtValue(data)}</p>;
  if (Array.isArray(data)) {
    if (!data.length) return <p className="muted mem-fields-value">None</p>;
    if (data.every(isPlain)) return <p className="mem-fields-value">{data.map(fmtValue).join(', ')}</p>;
    // A list of flat records (e.g. entitlement code/value pairs) reads best as a table.
    if (data.every((x) => x && !Array.isArray(x) && Object.values(x).every(isPlain))) {
      const cols = [...new Set(data.flatMap(Object.keys))];
      return (
        <div className="mem-fields-table-wrap">
          <table className="mem-fields-table">
            <thead><tr>{cols.map((c) => <th key={c} scope="col">{human(c)}</th>)}</tr></thead>
            <tbody>{data.map((x, i) => <tr key={i}>{cols.map((c) => <td key={c}>{fmtValue(x[c])}</td>)}</tr>)}</tbody>{/* eslint-disable-line react/no-array-index-key */}
          </table>
        </div>
      );
    }
    return <div className="mem-fields-list">{data.map((x, i) => <ApiFields key={i} data={x} className="mem-fields-nested" />)}</div>; // eslint-disable-line react/no-array-index-key
  }
  const entries = Object.entries(data).filter(([k]) => !skip.includes(k));
  if (!entries.length) return null;
  return (
    <dl className={`mem-fields ${className}`}>
      {entries.map(([k, v]) => (
        <div key={k} className={isPlain(v) || (Array.isArray(v) && v.every(isPlain)) ? '' : 'mem-fields-wide'}>
          <dt>{human(k)}</dt>
          <dd>{isPlain(v) ? fmtValue(v) : <ApiFields data={v} />}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "Become a member" — POST /membership/subscribe through the enquiry form. */
export function JoinMembership({ className = '' }) {
  const enquiry = useEnquiry();
  return (
    <div className={`card mem-join ${className}`}>
      <div>
        <h3>Join the Weekend-Live Club</h3>
        <p className="muted">Workshops, savings, AI design credits and first access to the best sessions.</p>
      </div>
      <button type="button" className="btn btn-primary" onClick={() => joinMembership(enquiry)}>Become a member</button>
    </div>
  );
}

/** GET /membership/my-benefits — benefit codes as a list, plus any other fields it returns. */
export function MyBenefits() {
  const b = useMyBenefits();
  if (b.loading && !b.data) return <SkeletonGrid count={2} />;
  const list = (b.data?.list || []).filter((e) => isActiveBenefit(e.value));
  if (!b.data) return <EmptyState icon="🌱" title="No benefits yet">{b.error || <>Become a member to unlock benefits.</>}</EmptyState>;
  return (
    <div className="card">
      <h2>Your benefits</h2>
      {list.length > 0 ? (
        <ul className="mem-benefit-list">
          {list.map((e) => { const v = formatEntitlement(e.code, e.value); return <li key={e.code}><span aria-hidden="true">✓</span>{entitlementLabel(e.code)}{v !== '✓' && <b>{v}</b>}</li>; })}
        </ul>
      ) : <ApiFields data={b.data.raw} />}
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
      ) : <p className="muted">{mine.error ? 'Your memberships could not be loaded right now.' : <>No active membership yet. <Link to="/membership">Become a member</Link>.</>}</p>}
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

/** Membership dashboard used on the account page. */
export function MembershipDashboard() {
  return (
    <div className="mem-dash">
      <ActiveMemberships />
      <AiCreditsCard />
      <p className="mem-dash-links"><Link to="/membership/benefits">See all my benefits →</Link> · <Link to="/membership">Membership →</Link></p>
    </div>
  );
}

/**
 * Signed-in member's data, exactly as the membership API returns it:
 * GET /membership, /my-memberships, /my-entitlements, /my-credits, /my-ai-credits and /my-benefits.
 */
export function MyMembershipDetails({ guestPrompt = true }) {
  const { isAuthenticated } = useSession();
  const overview = useMembershipOverview();
  const mine = useMyMemberships();
  const ents = useMyEntitlements();
  const credits = useMyCredits();
  const ai = useAiCredits();
  const benefits = useMyBenefits();
  if (!isAuthenticated) {
    if (!guestPrompt) return null;
    return (
      <div className="card mem-details-guest">
        <h2>Your membership</h2>
        <p className="muted">Sign in to see your membership, benefits and AI credits.</p>
        <Link className="btn btn-primary btn-small" to="/login" state={{ from: '/membership' }}>Sign in</Link>
      </div>
    );
  }
  const block = (title, res, body, wide = false) => (
    <article className={`card mem-detail${wide ? ' mem-detail-wide' : ''}`}>
      <h3>{title}</h3>
      {res.loading && res.data == null ? <div className="skeleton kpi" /> : res.error && !res.fromApi ? <p className="f-alert f-alert-error">{res.error}</p> : body}
    </article>
  );
  const memberships = mine.data || [];
  return (
    <section className="mem-details" aria-labelledby="mem-details-h">
      <h2 id="mem-details-h">Your membership</h2>
      <div className="mem-details-grid">
        {block('Membership', overview, <>{overview.data == null ? <p className="muted">No membership details returned.</p> : <ApiFields data={overview.data} />}</>)}
        {block('Credits & limits', credits, <>{credits.data ? <ApiFields data={credits.data.raw} /> : <p className="muted">No credit details returned.</p>}</>)}
        {block('Entitlements', ents, <>{ents.data?.raw ? <ApiFields data={ents.data.raw} /> : <p className="muted">No entitlements returned.</p>}</>)}
        {block('AI credits', ai, ai.data ? <ApiFields data={ai.data.raw} /> : <p className="muted">No AI credit details returned.</p>)}
        {block('Benefits', benefits, benefits.data ? <ApiFields data={benefits.data.raw} /> : <p className="muted">No benefits returned.</p>)}
        {block(`My memberships${memberships.length ? ` (${memberships.length})` : ''}`, mine, <>{memberships.length ? memberships.map((m) => <ApiFields key={m.id || m.planCode} data={m.raw} className="mem-fields-nested" />) : <p className="muted">No memberships yet.</p>}</>, true)}
      </div>
    </section>
  );
}
