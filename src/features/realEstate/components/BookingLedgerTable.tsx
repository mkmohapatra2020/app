/**
 * Every booking with its total paid (GET /realestate/transactions), 10 per page, newest first.
 * "Transaction details" opens the booking's payments and documents.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { realEstateApi } from '../api/realEstateApi.ts';
import { useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import type { BookingLedgerRow } from '../types/realEstateTypes.ts';
import { areaUnit, date, money } from '../utils/format.ts';
import { EmptyView, ErrorView, LoadingState } from './ApiStateView.tsx';
import Pager from './Pager.tsx';
import { RE_ROOT } from './RealEstateLayout.tsx';

export const LEDGER_PAGE_SIZE = 10;

/** "42 · 1,200 sq ft" — plot number and area. */
export function usePlotLabel() {
  const t = useT();
  return (b: Pick<BookingLedgerRow, 'plotNumber' | 'area' | 'areaUnit'>) =>
    [b.plotNumber || 'N/A', b.area !== null && b.area > 0 ? `${b.area} ${t(areaUnit(b.areaUnit))}` : ''].filter(Boolean).join(' · ');
}

/** `showAction` false hides the Transaction details column; change `reloadKey` to load again. */
export default function BookingLedgerTable({ showAction = true, reloadKey = 0 }: { showAction?: boolean; reloadKey?: number }) {
  const t = useT();
  const plotLabel = usePlotLabel();
  const [page, setPage] = useState(1);
  const q = useRealEstateQuery((s) => realEstateApi.ledger.bookings(page, LEDGER_PAGE_SIZE, s), [page, reloadKey]);
  const items = q.data?.items ?? [];
  return (
    <section className="re-card" aria-labelledby="re-all-tx">
      <h2 id="re-all-tx">{t('All bookings')}</h2>
      {q.loading && !q.data && <LoadingState text={t('Loading bookings…')} />}
      {q.error && <ErrorView error={q.error} onRetry={q.reload} />}
      {q.data && items.length === 0 && <EmptyView icon="📒" title={t('No bookings yet')}>{t('Bookings appear here after you create them or import a ledger.')}</EmptyView>}
      {items.length > 0 && (
        <>
          <div className="re-table-wrap" role="region" aria-label={t('All bookings')} tabIndex={0}>
            <table className="re-table">
              <thead>
                <tr>
                  <th scope="col">{t('Booking date')}</th>
                  <th scope="col">{t('Booking number')}</th>
                  <th scope="col">{t('Customer name')}</th>
                  <th scope="col">{t('Phone')}</th>
                  <th scope="col">{t('Address')}</th>
                  <th scope="col">{t('Plot and area')}</th>
                  <th scope="col" className="num">{t('Total paid')}</th>
                  {showAction && <th scope="col">{t('Action')}</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={String(b.bookingId)}>
                    <td data-label={t('Booking date')}>{date(b.bookingDate)}</td>
                    <td data-label={t('Booking number')}>#{String(b.bookingId)}</td>
                    <td data-label={t('Customer name')}>{b.customerName || 'N/A'}</td>
                    <td data-label={t('Phone')}>{b.customerPhone || 'N/A'}</td>
                    <td data-label={t('Address')}>{b.customerAddress || 'N/A'}</td>
                    <td data-label={t('Plot and area')}>{plotLabel(b)}{b.projectName && <small className="re-sub">{b.projectName}</small>}</td>
                    <td data-label={t('Total paid')} className="num re-amount-in">{money(b.totalPaid)}</td>
                    {showAction && (
                      <td data-label={t('Action')}>
                        <Link className="btn btn-outline btn-sm" to={`${RE_ROOT}/bookings/${encodeURIComponent(String(b.bookingId))}`}>{t('Transaction details')} →</Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} pageSize={LEDGER_PAGE_SIZE} total={q.data?.total ?? null} count={items.length} onPage={setPage} />
        </>
      )}
    </section>
  );
}
