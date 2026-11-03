/**
 * Overview. Counts come from data this page already loads (partners, projects); the other
 * totals only from the optional aggregate endpoint. Nothing is invented and no per-project
 * or per-booking requests are fanned out to compute totals.
 */
import { Link } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateApi } from '../api/realEstateApi.ts';
import { ErrorView, LoadingState } from '../components/ApiStateView.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import { useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import { money } from '../utils/format.ts';

function Tile({ label, value, tone = '', to }: { label: string; value: string | number | null; tone?: string; to?: string }) {
  const t = useT();
  const shown = value === null ? '—' : value;
  return (
    <div className={`re-stat ${tone}`}>
      <dt>{label}</dt>
      <dd>{to && value !== null ? <Link to={to}>{shown}</Link> : shown}</dd>
      {value === null && <small className="re-sub">{t('Not available yet')}</small>}
    </div>
  );
}

export default function RealEstateDashboardPage() {
  const t = useT();
  const access = useRealEstateAccess();
  const on = access.enabled;
  const partners = useRealEstateQuery((s) => realEstateApi.partners.list(s), [], { enabled: on && access.has('Partners') });
  const projects = useRealEstateQuery((s) => realEstateApi.projects.list(null, s), [], { enabled: on && access.has('Projects') });
  const totals = useRealEstateQuery((s) => realEstateApi.overview(s), [], { enabled: on });
  const o = totals.data ?? null;
  const activeProjects = projects.data ? projects.data.filter((p) => !p.status || p.status.toLowerCase() === 'active').length : null;
  const loading = partners.loading || projects.loading || totals.loading;
  const error = partners.error || projects.error || totals.error;

  return (
    <RealEstateLayout title={t('Real Estate overview')} intro={t('Partners, plots, bookings and buyer payments at a glance.')}>
      {loading && <LoadingState text={t('Loading your dashboard…')} />}
      {error && <ErrorView error={error} onRetry={() => { partners.reload(); projects.reload(); totals.reload(); }} />}
      {!loading && !error && (
        <>
          <dl className="re-stats" aria-label={t('Summary')}>
            <Tile label={t('Total partners')} value={partners.data?.length ?? null} to={`${RE_ROOT}/partners`} />
            <Tile label={t('Active projects')} value={activeProjects} to={`${RE_ROOT}/projects`} />
            <Tile label={t('Total plots')} value={o?.totalPlots ?? null} />
            <Tile label={t('Customers')} value={o?.customers ?? null} to={`${RE_ROOT}/customers`} />
            <Tile label={t('Bookings')} value={o?.bookings ?? null} to={`${RE_ROOT}/bookings`} />
          </dl>
          <dl className="re-stats" aria-label={t('Ledger totals')}>
            <Tile label={t('Total received')} value={o?.totalReceived != null ? money(o.totalReceived) : null} tone="re-stat-good" />
            <Tile label={t('Total commission')} value={o?.totalCommission != null ? money(o.totalCommission) : null} tone="re-stat-commission" />
            <Tile label={t('Total property amount')} value={o?.totalProperty != null ? money(o.totalProperty) : null} tone="re-stat-property" />
            <Tile label={t('OCR batches awaiting review')} value={o?.ocrAwaitingReview ?? null} tone="re-stat-warn" to={`${RE_ROOT}/ocr?status=Parsed`} />
            <Tile label={t('OCR batches ready to import')} value={o?.ocrReadyToImport ?? null} to={`${RE_ROOT}/ocr?status=Approved`} />
          </dl>
          {!o && <p className="f-alert f-alert-info">{t('Totals marked “—” appear once the backend provides a summary endpoint. Counts shown come from data already loaded on this page.')}</p>}
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
