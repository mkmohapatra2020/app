/**
 * /real-estate/bookings/:bookingId          → booking details + ledger summary
 * /real-estate/bookings/:bookingId/ledger   → full ledger + record a payment
 * Buyer payments use the Real Estate transactions API, never the membership payment API.
 */
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext.jsx';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateApi } from '../api/realEstateApi.ts';
import BlobUploadField from '../components/BlobUploadField.tsx';
import { EmptyView, ErrorView, InlineError, LoadingState, serverFieldErrors } from '../components/ApiStateView.tsx';
import { bind, Input, SelectInput } from '../components/FormFields.tsx';
import LedgerTable, { LedgerSummary } from '../components/LedgerTable.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import RealEstateStatusBadge from '../components/RealEstateStatusBadge.tsx';
import { useRealEstateMutation, useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import { PAYMENT_MODES, type StoredBlob } from '../types/realEstateTypes.ts';
import { date, ledgerTotals, money } from '../utils/format.ts';
import { hasErrors, toAmount, validateTransaction, type Errors, type TransactionForm } from '../utils/validation.ts';

// Local calendar date (toISOString would give yesterday in IST before 05:30).
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const KEYS: (keyof TransactionForm)[] = ['transactionDate', 'amount', 'paymentMode', 'referenceNumber', 'remarks'];
const MODE_LABEL: Record<string, string> = { BankTransfer: 'Bank transfer' };

export default function BookingLedgerPage({ view = 'ledger' }: { view?: 'detail' | 'ledger' }) {
  const t = useT();
  const { bookingId = '' } = useParams();
  const access = useRealEstateAccess();
  const { toast } = useToast();
  const canLedger = access.has('Ledger');
  const booking = useRealEstateQuery((s) => realEstateApi.bookings.get(bookingId, s), [bookingId], { enabled: access.has('Bookings') && !!bookingId });
  const tx = useRealEstateQuery((s) => realEstateApi.ledger.list(bookingId, s), [bookingId], { enabled: canLedger && !!bookingId });

  const empty: TransactionForm = { transactionDate: today(), amount: '', paymentMode: 'UPI', referenceNumber: '', remarks: '' };
  const [form, setForm] = useState<TransactionForm>(empty);
  const [proof, setProof] = useState<StoredBlob | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [errors, setErrors] = useState<Errors<keyof TransactionForm>>({});
  const create = useRealEstateMutation((input: Parameters<typeof realEstateApi.ledger.create>[1]) => realEstateApi.ledger.create(bookingId, input));
  const f = bind(form, setForm);

  const b = booking.data;
  const totals = ledgerTotals(b?.agreedValue ?? 0, tx.data ?? []);
  const base = `${RE_ROOT}/bookings/${encodeURIComponent(bookingId)}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validateTransaction(form, undefined, t);
    setErrors(v);
    if (hasErrors(v)) return;
    const created = await create.run({ ...form, amount: toAmount(form.amount), proof });
    if (created) {
      toast(t('Payment of {amount} recorded', { amount: money(created.amount || toAmount(form.amount)) }));
      setForm(empty); setProof(null); setUploadKey((k) => k + 1);
      tx.setData((l) => [...(l ?? []), created]);
    }
  };
  const fieldErr = { ...serverFieldErrors(create.error, KEYS), ...errors };

  return (
    <RealEstateLayout
      title={b ? t('Booking · Plot {plot}', { plot: b.plotNumber || '—' }) : t('Booking')}
      feature="Bookings"
      crumbs={[[`${RE_ROOT}/bookings`, t('Bookings')], view === 'ledger' ? [base, t('Booking')] : [null, t('Booking')], ...(view === 'ledger' ? [[null, t('Ledger')] as [null, string]] : [])]}
      actions={view === 'detail' && canLedger ? <Link className="btn btn-primary" to={`${base}/ledger`}>{t('Open ledger')}</Link> : undefined}
    >
      {booking.loading && <LoadingState />}
      {booking.error && <ErrorView error={booking.error} onRetry={booking.reload} />}
      {b && (
        <section className="re-card" aria-label={t('Booking details')}>
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

      {!canLedger && b && <p className="f-alert f-alert-info">{t("The ledger isn't included in your Real Estate access.")}</p>}
      {canLedger && (
        <>
          {tx.loading && <LoadingState text={t('Loading ledger…')} />}
          {tx.error && <ErrorView error={tx.error} onRetry={tx.reload} />}
          {tx.data && b && <LedgerSummary totals={totals} />}

          {view === 'ledger' && (
            <div className="re-split">
              <section className="re-card" aria-labelledby="re-history">
                <h2 id="re-history">{t('Transaction history')}</h2>
                {tx.data && tx.data.length === 0 && <EmptyView title={t('No payments yet')}>{t('Record the first installment with the form.')}</EmptyView>}
                {tx.data && tx.data.length > 0 && <LedgerTable transactions={tx.data} />}
              </section>
              <section className="re-card" aria-labelledby="re-new-tx">
                <h2 id="re-new-tx">{t('Record a payment')}</h2>
                <form className="re-form" onSubmit={submit} noValidate>
                  <Input label={t('Transaction date')} required type="date" max={today()} {...f('transactionDate')} error={fieldErr.transactionDate} />
                  <Input label={t('Amount (₹)')} required type="number" min="0" step="0.01" inputMode="decimal" {...f('amount')} error={fieldErr.amount} />
                  <SelectInput label={t('Payment mode')} required {...f('paymentMode')} options={PAYMENT_MODES.map((m) => ({ value: m, label: t(MODE_LABEL[m] ?? m) }))} error={fieldErr.paymentMode} />
                  <Input label={t('Reference number')} optional={form.paymentMode === 'Cash'} {...f('referenceNumber')} error={fieldErr.referenceNumber} hint={t('UPI transaction id, cheque or bank reference')} />
                  <Input label={t('Remarks')} optional {...f('remarks')} error={fieldErr.remarks} placeholder={t('e.g. 2nd installment')} />
                  {/* The upload grant is refused (403) when the plan has no proof uploads. */}
                  <BlobUploadField key={uploadKey} label={t('Payment proof (optional)')} purpose="Document" hint={t('UPI screenshot or receipt photo. JPG, PNG or WebP, up to 10 MB.')} onUploaded={setProof} />
                  <InlineError error={create.error} conflictText={t('This payment reference has already been recorded.')} />
                  <button type="submit" className="btn btn-primary" disabled={create.pending}>{create.pending ? t('Saving…') : t('Record payment')}</button>
                </form>
              </section>
            </div>
          )}
        </>
      )}
    </RealEstateLayout>
  );
}
