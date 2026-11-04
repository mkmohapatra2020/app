/**
 * Overview. The API has no summary endpoint, so the counts come only from list calls this
 * page makes anyway (partners, projects, the user's partner's customers). Totals that would
 * need many requests (plots per project, payments per booking) are not computed here.
 */
import { Link } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateApi } from '../api/realEstateApi.ts';
import { ErrorView, LoadingState } from '../components/ApiStateView.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import { useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import { recentBatches, recentBookings } from '../utils/recent.ts';

function Tile({ label, value, to, hint }: { label: string; value: number | null; to?: string; hint?: string }) {
  return (
    <div className="re-stat">
      <dt>{label}</dt>
      <dd>{value === null ? '—' : to ? <Link to={to}>{value}</Link> : value}</dd>
      {hint && <small className="re-sub">{hint}</small>}
    </div>
  );
}

export default function RealEstateDashboardPage() {
  const t = useT();
  const access = useRealEstateAccess();
  const on = access.enabled;
  const partners = useRealEstateQuery((s) => realEstateApi.partners.list(s), [], { enabled: on && access.has('Partners') });
  const projects = useRealEstateQuery((s) => realEstateApi.projects.list(null, s), [], { enabled: on && access.has('Projects') });
  const partnerId = access.access.partnerId ?? partners.data?.[0]?.id ?? null;
  const partnerName = partners.data?.find((p) => String(p.id) === String(partnerId))?.businessName ?? '';
  const customers = useRealEstateQuery((s) => realEstateApi.customers.list(partnerId as string | number, s), [partnerId], { enabled: on && partnerId !== null && access.has('Customers') });
  const activeProjects = projects.data ? projects.data.filter((p) => !p.status || p.status.toLowerCase() === 'active').length : null;
  const loading = partners.loading || projects.loading || customers.loading;
  const error = partners.error || projects.error || customers.error;

  return (
    <RealEstateLayout title={t('Real Estate overview')} intro={t('Partners, plots, bookings and buyer payments at a glance.')}>
      {loading && <LoadingState text={t('Loading your dashboard…')} />}
      {error && <ErrorView error={error} onRetry={() => { partners.reload(); projects.reload(); customers.reload(); }} />}
      {!loading && !error && (
        <>
          <dl className="re-stats" aria-label={t('Summary')}>
            <Tile label={t('Total partners')} value={partners.data?.length ?? null} to={`${RE_ROOT}/partners`} />
            <Tile label={t('Active projects')} value={activeProjects} to={`${RE_ROOT}/projects`} />
            <Tile label={t('Customers')} value={customers.data?.length ?? null} to={`${RE_ROOT}/customers`} hint={partnerName} />
            <Tile label={t('Bookings created in this session')} value={recentBookings().length} to={`${RE_ROOT}/bookings`} />
            <Tile label={t('OCR batches in this session')} value={recentBatches().length} to={`${RE_ROOT}/ocr`} />
          </dl>
          <p className="f-alert f-alert-info">{t('Plot, payment and OCR totals need a summary endpoint the API doesn’t have yet. Open a project, booking or batch to see its figures.')}</p>
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
