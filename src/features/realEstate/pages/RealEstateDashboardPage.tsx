import { Link } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateApi } from '../api/realEstateApi.ts';
import { EmptyView, ErrorView, LoadingState } from '../components/ApiStateView.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import { useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import { date, money } from '../utils/format.ts';

export default function RealEstateDashboardPage() {
  const t = useT();
  const access = useRealEstateAccess();
  const q = useRealEstateQuery((s) => realEstateApi.dashboard(s), [], { enabled: access.enabled });
  const d = q.data;

  return (
    <RealEstateLayout title={d?.partnerName || t('Real Estate dashboard')} intro={t('Plots, bookings and buyer payments at a glance.')}>
      {q.loading && <LoadingState text={t('Loading your dashboard…')} />}
      {q.error && <ErrorView error={q.error} onRetry={q.reload} />}
      {d && !q.loading && (
        <>
          <dl className="re-stats" aria-label={t('Summary')}>
            <div className="re-stat"><dt>{t('Projects')}</dt><dd>{d.projectCount}</dd></div>
            <div className="re-stat re-stat-good"><dt>{t('Available plots')}</dt><dd>{d.availablePlots}</dd></div>
            <div className="re-stat"><dt>{t('Booked plots')}</dt><dd>{d.bookedPlots}</dd></div>
            <div className="re-stat"><dt>{t('Sold plots')}</dt><dd>{d.soldPlots}</dd></div>
            <div className="re-stat"><dt>{t('Active bookings')}</dt><dd>{d.activeBookings}</dd></div>
            <div className={`re-stat ${d.outstandingBalance > 0 ? 're-stat-due' : 're-stat-good'}`}><dt>{t('Outstanding balance')}</dt><dd>{money(d.outstandingBalance)}</dd></div>
            {access.has('OCR') && (
              <div className={`re-stat ${d.ocrBatchesAwaitingReview > 0 ? 're-stat-warn' : ''}`}>
                <dt>{t('OCR batches to review')}</dt>
                <dd><Link to={`${RE_ROOT}/ocr`}>{d.ocrBatchesAwaitingReview}</Link></dd>
              </div>
            )}
          </dl>

          <section className="re-card" aria-labelledby="re-recent">
            <h2 id="re-recent">{t('Recent transactions')}</h2>
            {d.recentTransactions.length === 0 ? (
              <EmptyView title={t('No payments recorded yet')}>{t("Payments you add to a booking's ledger appear here.")}</EmptyView>
            ) : (
              <div className="re-table-wrap" role="region" aria-label={t('Recent transactions')} tabIndex={0}>
                <table className="re-table">
                  <thead><tr><th scope="col">{t('Date')}</th><th scope="col">{t('Customer')}</th><th scope="col">{t('Plot')}</th><th scope="col" className="num">{t('Amount')}</th><th scope="col">{t('Reference')}</th></tr></thead>
                  <tbody>
                    {d.recentTransactions.map((tx) => (
                      <tr key={String(tx.id)}>
                        <td data-label={t('Date')}>{date(tx.transactionDate)}</td>
                        <td data-label={t('Customer')}>{tx.bookingId !== null ? <Link to={`${RE_ROOT}/bookings/${encodeURIComponent(String(tx.bookingId))}/ledger`}>{tx.customerName || t('View ledger')}</Link> : tx.customerName || '—'}</td>
                        <td data-label={t('Plot')}>{tx.plotNumber || '—'}</td>
                        <td data-label={t('Amount')} className="num re-amount-in">{money(tx.amount)}</td>
                        <td data-label={t('Reference')}>{tx.referenceNumber || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </RealEstateLayout>
  );
}
