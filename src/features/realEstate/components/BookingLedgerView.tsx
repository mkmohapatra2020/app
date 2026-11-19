/**
 * One booking's transaction details: booking / customer / plot (GET /realestate/bookings/:id),
 * ledger summary (total received, commission and property amount kept separate), payment
 * history, record-a-payment form, and the booking's documents and images.
 * Buyer payments use the Real Estate transactions API, never the membership payment API.
 */
import { useT } from '../../../i18n/language.ts';
import { useToast } from '../../../context/ToastContext.jsx';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateApi } from '../api/realEstateApi.ts';
import { useRealEstateMutation, useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import type { TransactionInput } from '../types/realEstateTypes.ts';
import { date, ledgerTotals, money } from '../utils/format.ts';
import { recentBooking } from '../utils/recent.ts';
import { EmptyView, ErrorView, LoadingState } from './ApiStateView.tsx';
import { usePlotLabel } from './BookingLedgerTable.tsx';
import DocumentsPanel from './DocumentsPanel.tsx';
import LedgerTable, { LedgerSummary } from './LedgerTable.tsx';
import RealEstateStatusBadge from './RealEstateStatusBadge.tsx';
import TransactionForm from './TransactionForm.tsx';

export default function BookingLedgerView({ bookingId }: { bookingId: string }) {
  const t = useT();
  const { toast } = useToast();
  const access = useRealEstateAccess();
  const plotLabel = usePlotLabel();
  const canLedger = access.has('Ledger');
  const details = useRealEstateQuery((s) => realEstateApi.bookings.get(bookingId, s), [bookingId], { enabled: !!bookingId });
  const tx = useRealEstateQuery((s) => realEstateApi.ledger.list(bookingId, s), [bookingId], { enabled: canLedger && !!bookingId });
  const create = useRealEstateMutation((input: TransactionInput) => realEstateApi.ledger.create(bookingId, input));
  const b = details.data?.booking;
  // Older API without the booking endpoint: fall back to what this tab remembers.
  const recent = recentBooking(bookingId);
  const agreed = b?.agreedValue || recent?.agreedValue || 0;
  const totals = ledgerTotals(agreed, tx.data ?? []);

  const record = async (input: TransactionInput) => {
    const created = await create.run(input);
    if (!created) return false;
    toast(t('Payment of {amount} recorded', { amount: money(created.amount || input.amount) }));
    tx.setData((l) => [...(l ?? []), created]);
    return true;
  };

  return (
    <>
      <section className="re-card" aria-label={t('Booking details')}>
        <div className="re-card-head">
          <h2>{t('Booking {id}', { id: bookingId })}</h2>
          {b && <RealEstateStatusBadge status={b.status || 'Pending'} />}
        </div>
        {details.loading && !details.data && <LoadingState text={t('Loading booking…')} />}
        {details.error && !recent && <ErrorView error={details.error} onRetry={details.reload} />}
        {b && (
          <dl className="re-facts">
            <div><dt>{t('Customer name')}</dt><dd>{b.customerName || 'N/A'}</dd></div>
            <div><dt>{t('Phone')}</dt><dd>{b.customerPhone || 'N/A'}</dd></div>
            <div><dt>{t('Address')}</dt><dd>{b.customerAddress || 'N/A'}</dd></div>
            {details.data?.customerEmail && <div><dt>{t('Email')}</dt><dd>{details.data.customerEmail}</dd></div>}
            <div><dt>{t('Plot and area')}</dt><dd>{plotLabel(b)}{b.projectName && ` · ${b.projectName}`}</dd></div>
            <div><dt>{t('Booking date')}</dt><dd>{date(b.bookingDate)}</dd></div>
            <div><dt>{t('Booking amount')}</dt><dd>{money(b.bookingAmount)}</dd></div>
            <div><dt>{t('Property value')}</dt><dd>{money(b.agreedValue)}</dd></div>
          </dl>
        )}
        {!b && recent && (
          <dl className="re-facts">
            <div><dt>{t('Customer name')}</dt><dd>{recent.customerName || 'N/A'}</dd></div>
            <div><dt>{t('Plot')}</dt><dd>{recent.plotNumber || 'N/A'}{recent.projectName && ` · ${recent.projectName}`}</dd></div>
            <div><dt>{t('Booking date')}</dt><dd>{date(recent.bookingDate)}</dd></div>
            <div><dt>{t('Property value')}</dt><dd>{money(recent.agreedValue)}</dd></div>
          </dl>
        )}
      </section>

      {!canLedger && <p className="f-alert f-alert-info">{t("The ledger isn't included in your Real Estate access.")}</p>}
      {canLedger && (
        <>
          {tx.loading && <LoadingState text={t('Loading ledger…')} />}
          {tx.error && <ErrorView error={tx.error} onRetry={tx.reload} />}
          {tx.data && <LedgerSummary totals={totals} agreedKnown={agreed > 0} />}
          <div className="re-stack">
            <section className="re-card" aria-labelledby="re-history">
              <h2 id="re-history">{t('Transaction history')}</h2>
              {tx.data && tx.data.length === 0 && <EmptyView title={t('No payments yet')}>{t('Record the first installment with the form.')}</EmptyView>}
              {tx.data && tx.data.length > 0 && <LedgerTable transactions={tx.data} />}
            </section>
            <section className="re-card" aria-labelledby="re-new-tx">
              <h2 id="re-new-tx">{t('Record a payment')}</h2>
              <TransactionForm pending={create.pending} error={create.error} onSubmit={record} />
            </section>
          </div>
        </>
      )}
      {access.has('Bookings') && (details.data || details.error) && (
        <DocumentsPanel key={`${bookingId}:${details.data ? 'api' : 'none'}`} bookingId={bookingId} initial={details.data?.documents ?? []} />
      )}
    </>
  );
}
