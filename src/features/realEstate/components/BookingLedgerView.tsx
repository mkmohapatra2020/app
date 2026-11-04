/**
 * One booking: details, ledger summary (total received / commission / property amount
 * kept separate), transaction history, record-a-payment form and documents.
 * Buyer payments use the Real Estate transactions API, never the membership payment API.
 *
 * The API has no "get booking" endpoint: details (and the agreed value for "outstanding")
 * come from bookings created in this tab; otherwise only the transactions are shown.
 */
import { Link } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { useToast } from '../../../context/ToastContext.jsx';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateApi } from '../api/realEstateApi.ts';
import { useRealEstateMutation, useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import type { TransactionInput } from '../types/realEstateTypes.ts';
import { date, ledgerTotals, money } from '../utils/format.ts';
import { recentBooking } from '../utils/recent.ts';
import { EmptyView, ErrorView, LoadingState } from './ApiStateView.tsx';
import DocumentsPanel from './DocumentsPanel.tsx';
import LedgerTable, { LedgerSummary } from './LedgerTable.tsx';
import { RE_ROOT } from './RealEstateLayout.tsx';
import RealEstateStatusBadge from './RealEstateStatusBadge.tsx';
import TransactionForm from './TransactionForm.tsx';

export default function BookingLedgerView({ bookingId, view }: { bookingId: string; view: 'detail' | 'ledger' }) {
  const t = useT();
  const { toast } = useToast();
  const access = useRealEstateAccess();
  const canLedger = access.has('Ledger');
  const b = recentBooking(bookingId);
  const tx = useRealEstateQuery((s) => realEstateApi.ledger.list(bookingId, s), [bookingId], { enabled: canLedger && !!bookingId });
  const create = useRealEstateMutation((input: TransactionInput) => realEstateApi.ledger.create(bookingId, input));
  const totals = ledgerTotals(b?.agreedValue ?? 0, tx.data ?? []);
  const base = `${RE_ROOT}/bookings/${encodeURIComponent(bookingId)}`;

  const record = async (input: TransactionInput) => {
    const created = await create.run(input);
    if (!created) return false;
    toast(t('Payment of {amount} recorded', { amount: money(created.amount || input.amount) }));
    tx.setData((l) => [...(l ?? []), created]);
    return true;
  };

  return (
    <>
      {!b && (
        <section className="re-card" aria-label={t('Booking details')}>
          <div className="re-card-head">
            <h2>{t('Booking {id}', { id: bookingId })}</h2>
            {view === 'ledger' && <Link to={base}>{t('Booking details')} →</Link>}
            {view === 'detail' && canLedger && <Link className="btn btn-outline btn-sm" to={`${base}/ledger`}>{t('Open ledger')}</Link>}
          </div>
          <p className="re-sub">{t('Booking details are shown for bookings created in this session. The ledger below comes from the API.')}</p>
        </section>
      )}
      {b && (
        <section className="re-card" aria-label={t('Booking details')}>
          <div className="re-card-head">
            <h2>{t('Booking · Plot {plot}', { plot: b.plotNumber || '—' })}</h2>
            {view === 'ledger' && <Link to={base}>{t('Booking details')} →</Link>}
            {view === 'detail' && canLedger && <Link className="btn btn-outline btn-sm" to={`${base}/ledger`}>{t('Open ledger')}</Link>}
          </div>
          <dl className="re-facts">
            <div><dt>{t('Customer')}</dt><dd>{b.customerName || '—'}</dd></div>
            <div><dt>{t('Plot')}</dt><dd>{b.plotNumber || '—'}{b.projectName && ` · ${b.projectName}`}</dd></div>
            <div><dt>{t('Booking date')}</dt><dd>{date(b.bookingDate)}</dd></div>
            <div><dt>{t('Booking amount')}</dt><dd>{money(b.bookingAmount)}</dd></div>
            <div><dt>{t('Agreed value')}</dt><dd>{money(b.agreedValue)}</dd></div>
            <div><dt>{t('Status')}</dt><dd><RealEstateStatusBadge status={String(b.status)} /></dd></div>
          </dl>
        </section>
      )}

      {!canLedger && <p className="f-alert f-alert-info">{t("The ledger isn't included in your Real Estate access.")}</p>}
      {canLedger && (
        <>
          {tx.loading && <LoadingState text={t('Loading ledger…')} />}
          {tx.error && <ErrorView error={tx.error} onRetry={tx.reload} />}
          {tx.data && <LedgerSummary totals={totals} agreedKnown={!!b?.agreedValue} />}
          {/* Ledger view: full-width history (7 columns), form below it. */}
          <div className={view === 'ledger' ? 're-stack' : undefined}>
            <section className="re-card" aria-labelledby="re-history">
              <h2 id="re-history">{t('Transaction history')}</h2>
              {tx.data && tx.data.length === 0 && <EmptyView title={t('No payments yet')}>{t('Record the first installment with the form.')}</EmptyView>}
              {tx.data && tx.data.length > 0 && <LedgerTable transactions={tx.data} />}
            </section>
            {view === 'ledger' && (
              <section className="re-card" aria-labelledby="re-new-tx">
                <h2 id="re-new-tx">{t('Record a payment')}</h2>
                <TransactionForm pending={create.pending} error={create.error} onSubmit={record} />
              </section>
            )}
          </div>
        </>
      )}
      {view === 'detail' && access.has('Bookings') && <DocumentsPanel key={bookingId} bookingId={bookingId} />}
    </>
  );
}
