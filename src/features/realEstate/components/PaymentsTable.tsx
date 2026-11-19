/**
 * Every payment (GET /realestate/transactions?view=payments), 10 per page, newest first.
 * "View" opens the booking's transaction and document details.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { realEstateApi } from '../api/realEstateApi.ts';
import { useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import { date, money } from '../utils/format.ts';
import { EmptyView, ErrorView, LoadingState } from './ApiStateView.tsx';
import Pager from './Pager.tsx';
import { RE_ROOT } from './RealEstateLayout.tsx';

export const PAYMENTS_PAGE_SIZE = 10;
const opt = (n: number | null) => (n === null ? 'N/A' : money(n));

export default function PaymentsTable() {
  const t = useT();
  const [page, setPage] = useState(1);
  const q = useRealEstateQuery((s) => realEstateApi.ledger.payments(page, PAYMENTS_PAGE_SIZE, s), [page]);
  const items = q.data?.items ?? [];
  return (
    <section className="re-card" aria-labelledby="re-all-payments">
      <h2 id="re-all-payments">{t('All transactions')}</h2>
      {q.loading && !q.data && <LoadingState text={t('Loading transactions…')} />}
      {q.error && <ErrorView error={q.error} onRetry={q.reload} />}
      {q.data && items.length === 0 && <EmptyView icon="📒" title={t('No transactions yet')}>{t('Payments appear here after you record them or import a ledger.')}</EmptyView>}
      {items.length > 0 && (
        <>
          <div className="re-table-wrap" role="region" aria-label={t('All transactions')} tabIndex={0}>
            <table className="re-table">
              <thead>
                <tr>
                  <th scope="col">{t('Date')}</th>
                  <th scope="col">{t('Booking number')}</th>
                  <th scope="col">{t('Customer name')}</th>
                  <th scope="col" className="num re-col-property">{t('Property amount')}</th>
                  <th scope="col" className="num re-col-commission">{t('Commission')}</th>
                  <th scope="col" className="num">{t('Total paid')}</th>
                  <th scope="col">{t('Action')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tx) => (
                  <tr key={String(tx.id)}>
                    <td data-label={t('Date')}>{date(tx.transactionDate)}</td>
                    <td data-label={t('Booking number')}>{tx.bookingId ? `#${String(tx.bookingId)}` : 'N/A'}</td>
                    <td data-label={t('Customer name')}>{tx.customerName || 'N/A'}</td>
                    <td data-label={t('Property amount')} className="num re-col-property">{opt(tx.propertyAmount)}</td>
                    <td data-label={t('Commission')} className="num re-col-commission">{opt(tx.commissionAmount)}</td>
                    <td data-label={t('Total paid')} className="num re-amount-in">{money(tx.amount)}</td>
                    <td data-label={t('Action')}>
                      {tx.bookingId
                        ? <Link className="btn btn-outline btn-sm" to={`${RE_ROOT}/bookings/${encodeURIComponent(String(tx.bookingId))}`}>{t('View')} →</Link>
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} pageSize={PAYMENTS_PAGE_SIZE} total={q.data?.total ?? null} count={items.length} onPage={setPage} />
        </>
      )}
    </section>
  );
}
