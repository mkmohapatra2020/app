/**
 * Overview — GET /realestate/overview. Totals come from the API (the three ledger amounts
 * stay separate). Only if the response leaves out the partner / project / customer counts
 * does the page fall back to the corresponding list calls; nothing is invented.
 */
import { Link } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateApi } from '../api/realEstateApi.ts';
import { ErrorView, LoadingState } from '../components/ApiStateView.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import { useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import { money } from '../utils/format.ts';

function Tile({ label, value, tone = '', to, hint }: { label: string; value: string | number | null; tone?: string; to?: string; hint?: string }) {
  const t = useT();
  return (
    <div className={`re-stat ${tone}`}>
      <dt>{label}</dt>
      <dd>{value === null ? '—' : to ? <Link to={to}>{value}</Link> : value}</dd>
      {(hint || value === null) && <small className="re-sub">{hint || t('Not available yet')}</small>}
    </div>
  );
}

export default function RealEstateDashboardPage() {
  const t = useT();
  const access = useRealEstateAccess();
  const on = access.enabled;
  const overview = useRealEstateQuery((s) => realEstateApi.overview(s), [], { enabled: on });
  const o = overview.data;
  const settled = !overview.loading && (!!o || !!overview.error);
  // Fallbacks only for counts the overview didn't include.
  const partners = useRealEstateQuery((s) => realEstateApi.partners.list(s), [], { enabled: on && settled && o?.partners == null && access.has('Partners') });
  const projects = useRealEstateQuery((s) => realEstateApi.projects.list(null, s), [], { enabled: on && settled && o?.activeProjects == null && o?.projects == null && access.has('Projects') });
  const partnerId = access.access.partnerId ?? partners.data?.[0]?.id ?? null;
  const customers = useRealEstateQuery((s) => realEstateApi.customers.list(partnerId as string | number, s), [partnerId], { enabled: on && settled && o?.customers == null && partnerId !== null && access.has('Customers') });

  const partnerCount = o?.partners ?? partners.data?.length ?? null;
  // The live overview sends ProjectCount (all projects); "active" only when the API says so.
  const projectCount = o?.activeProjects ?? o?.projects ?? (projects.data ? projects.data.filter((p) => !p.status || p.status.toLowerCase() === 'active').length : null);
  const projectLabel = o?.activeProjects == null && o?.projects != null ? t('Projects') : t('Active projects');
  const customerCount = o?.customers ?? customers.data?.length ?? null;
  const plotHint = o && [o.availablePlots, o.bookedPlots, o.soldPlots].some((n) => n !== null)
    ? [o.availablePlots !== null && t('{n} available', { n: o.availablePlots }), o.bookedPlots !== null && t('{n} booked', { n: o.bookedPlots }), o.soldPlots !== null && t('{n} sold', { n: o.soldPlots })].filter(Boolean).join(' · ')
    : undefined;
  const loading = overview.loading || partners.loading || projects.loading || customers.loading;
  const amount = (n: number | null | undefined) => (n == null ? null : money(n));

  return (
    <RealEstateLayout title={o?.partnerName || t('Real Estate overview')} intro={t('Partners, plots, bookings and buyer payments at a glance.')}>
      {loading && <LoadingState text={t('Loading your dashboard…')} />}
      {overview.error && <ErrorView error={overview.error} onRetry={overview.reload} />}
      {!loading && (
        <>
          <dl className="re-stats" aria-label={t('Summary')}>
            <Tile label={t('Total partners')} value={partnerCount} to={`${RE_ROOT}/partners`} />
            <Tile label={projectLabel} value={projectCount} to={`${RE_ROOT}/projects`} />
            <Tile label={t('Total plots')} value={o?.totalPlots ?? null} to={`${RE_ROOT}/projects`} hint={plotHint} />
            <Tile label={t('Customers')} value={customerCount} to={`${RE_ROOT}/customers`} />
            <Tile label={t('Bookings')} value={o?.bookings ?? null} to={`${RE_ROOT}/bookings`} hint={o?.activeBookings != null ? t('{n} active', { n: o.activeBookings }) : undefined} />
          </dl>
          <dl className="re-stats re-stats-ledger" aria-label={t('Ledger totals')}>
            {o?.totalAgreedValue != null && <Tile label={t('Total agreed value')} value={amount(o.totalAgreedValue)} />}
            <Tile label={t('Total received')} value={amount(o?.totalReceived)} tone="re-stat-good" />
            <Tile label={t('Total commission')} value={amount(o?.totalCommission)} tone="re-stat-commission" />
            <Tile label={t('Total property amount')} value={amount(o?.totalProperty)} tone="re-stat-property" />
            {o?.outstanding != null && <Tile label={t('Outstanding')} value={amount(o.outstanding)} tone={o.outstanding > 0 ? 're-stat-due' : 're-stat-good'} />}
            <Tile label={t('OCR batches awaiting review')} value={o?.ocrAwaitingReview ?? null} tone="re-stat-warn" to={`${RE_ROOT}/ocr`} />
            {/* Not in the live response today: shown only if the API adds it. */}
            {o?.ocrReadyToImport != null && <Tile label={t('OCR batches ready to import')} value={o.ocrReadyToImport} to={`${RE_ROOT}/ocr`} />}
          </dl>
          <section className="re-card" aria-labelledby="re-next">
            <h2 id="re-next">{t('Quick actions')}</h2>
            <div className="re-actions">
              {access.has('Customers') && <Link className="btn btn-outline" to={`${RE_ROOT}/customers`}>{t('Add a customer')}</Link>}
              {access.has('Bookings') && <Link className="btn btn-outline" to={`${RE_ROOT}/bookings`}>{t('New booking')}</Link>}
              {access.has('Ledger') && <Link className="btn btn-outline" to={`${RE_ROOT}/ledger`}>{t('Record a payment')}</Link>}
              {access.has('OCR') && <Link className="btn btn-primary" to={`${RE_ROOT}/ocr/new`}>{t('Import a ledger page')}</Link>}
            </div>
          </section>
        </>
      )}
    </RealEstateLayout>
  );
}
