/**
 * New booking: customer + plot + amounts, validated locally, then confirmed in a dialog.
 * The customer is picked from the list, or "+ Add a new customer" shows name / mobile /
 * address / email fields and the customer is created just before the booking.
 * The booking amount is also recorded as the first payment (with commission and payment mode),
 * and documents attached here are saved to the new booking.
 * Unavailable plots are listed but cannot be chosen; the API still has the final say (409).
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import type { ApiError } from '../../../api/errors.ts';
import { useT } from '../../../i18n/language.ts';
import { DOCUMENT_TYPES, PAYMENT_MODES, type BookingInput, type Customer, type Plot, type StoredBlob } from '../types/realEstateTypes.ts';
import { areaUnit, money } from '../utils/format.ts';
import { hasErrors, toAmount, validateBooking, validateCustomer, type BookingForm as Form, type Errors } from '../utils/validation.ts';
import { InlineError, serverFieldErrors } from './ApiStateView.tsx';
import ConfirmDialog from './ConfirmDialog.tsx';
import BlobUploadField from './BlobUploadField.tsx';
import { DOCUMENT_TYPE_LABEL } from './DocumentsPanel.tsx';
import { Input, SelectInput } from './FormFields.tsx';

const KEYS: (keyof Form)[] = ['customerId', 'plotId', 'bookingAmount', 'agreedValue'];
/** Customer select value that switches to the new-customer fields. */
export const NEW_CUSTOMER = '__new__';
export interface NewCustomer { name: string; phone: string; address: string; email: string }
type NewKey = keyof NewCustomer;
const EMPTY_NEW: NewCustomer = { name: '', phone: '', address: '', email: '' };
const MODE_LABEL: Record<string, string> = { BankTransfer: 'Bank transfer' };
/** First payment (the booking amount) and documents saved right after the booking is created. */
export interface BookingExtras {
  commissionAmount: number | null;
  paymentMode: string;
  documents: { blob: StoredBlob; documentType: string }[];
}

interface Props {
  customers: Customer[];
  plots: Plot[];
  initialPlotId?: string;
  /** Fields shown first in the grid (the project picker). */
  before?: ReactNode;
  /** Show "+ Add a new customer" (needs a partner to add the customer to). */
  canAddCustomer?: boolean;
  pending: boolean;
  error: ApiError | null;
  /** Resolves true when the booking was created. `newCustomer` is set when the customer must be created first. */
  onSubmit: (input: BookingInput, newCustomer: NewCustomer | undefined, extras: BookingExtras) => Promise<boolean>;
}

export default function BookingForm({ customers, plots, initialPlotId = '', before, canAddCustomer = false, pending, error, onSubmit }: Props) {
  const t = useT();
  const [form, setForm] = useState<Form>({ customerId: '', plotId: initialPlotId, bookingAmount: '', agreedValue: '' });
  const [nc, setNc] = useState<NewCustomer>(EMPTY_NEW);
  const [errors, setErrors] = useState<Errors<keyof Form>>({});
  const [ncErrors, setNcErrors] = useState<Partial<Record<NewKey, string>>>({});
  const [confirming, setConfirming] = useState(false);
  const [commission, setCommission] = useState('');
  const [commissionError, setCommissionError] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [docType, setDocType] = useState<string>('PaymentReceipt');
  const [docs, setDocs] = useState<BookingExtras['documents']>([]);
  const [uploadKey, setUploadKey] = useState(0);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((v) => ({ ...v, [k]: e.target.value }));
  const setN = (k: NewKey) => (e: { target: { value: string } }) => setNc((v) => ({ ...v, [k]: e.target.value }));
  const isNew = form.customerId === NEW_CUSTOMER;
  const plot = plots.find((p) => String(p.id) === form.plotId) ?? null;
  const customer = customers.find((c) => String(c.id) === form.customerId) ?? null;
  const customerName = isNew ? nc.name.trim() : customer?.name ?? '';

  const review = (e: FormEvent) => {
    e.preventDefault();
    const v = validateBooking(form, plot, t);
    const c = isNew ? validateCustomer({ partnerId: 'x', name: nc.name, phone: nc.phone, email: nc.email, address: nc.address, aadhaarNumber: '', panNumber: '' }, t) : {};
    const cn: Partial<Record<NewKey, string>> = { name: c.name, phone: c.phone, email: c.email };
    let ce = '';
    if (commission.trim() !== '') {
      const c = toAmount(commission);
      if (!Number.isFinite(c) || c < 0) ce = t("Commission can't be negative.");
      else if (!v.bookingAmount && c > toAmount(form.bookingAmount)) ce = t("Commission can't be more than the booking amount.");
    }
    setErrors(v);
    setNcErrors(cn);
    setCommissionError(ce);
    if (!hasErrors(v) && !hasErrors(cn) && !ce) setConfirming(true);
  };
  const confirm = async () => {
    if ((!customer && !isNew) || !plot) return;
    const input: BookingInput = { customerId: isNew ? '' : customer!.id, plotId: plot.id, bookingAmount: toAmount(form.bookingAmount), agreedValue: toAmount(form.agreedValue) };
    const extras: BookingExtras = { commissionAmount: commission.trim() === '' ? null : toAmount(commission), paymentMode, documents: docs };
    const ok = await onSubmit(input, isNew ? { name: nc.name.trim(), phone: nc.phone.trim(), address: nc.address.trim(), email: nc.email.trim() } : undefined, extras);
    setConfirming(false);
    if (ok) { setForm({ customerId: '', plotId: '', bookingAmount: '', agreedValue: '' }); setNc(EMPTY_NEW); setCommission(''); setDocs([]); setUploadKey((k) => k + 1); }
  };
  const fieldErr = { ...serverFieldErrors(error, KEYS), ...errors };
  const customerOptions = [
    ...customers.map((c) => ({ value: String(c.id), label: `${c.name}${c.phone ? ` · ${c.phone}` : ''}` })),
    ...(canAddCustomer ? [{ value: NEW_CUSTOMER, label: `+ ${t('Add a new customer')}` }] : []),
  ];

  return (
    <form className="re-form-grid re-booking-grid" onSubmit={review} noValidate aria-label={t('New booking')} autoComplete="off">
      {before}
      <SelectInput label={t('Customer')} required value={form.customerId} onChange={set('customerId')} placeholder={t('Choose a customer')}
        options={customerOptions} error={fieldErr.customerId} />
      {isNew && (
        <fieldset className="re-new-customer">
          <legend>{t('New customer')}</legend>
          <Input label={t('Full name')} required value={nc.name} onChange={setN('name')} error={ncErrors.name} />
          <Input label={t('Mobile number')} required type="tel" inputMode="tel" value={nc.phone} onChange={setN('phone')} error={ncErrors.phone} />
          <Input label={t('Address')} optional value={nc.address} onChange={setN('address')} />
          <Input label={t('Email')} optional type="email" value={nc.email} onChange={setN('email')} error={ncErrors.email} />
        </fieldset>
      )}
      <SelectInput label={t('Plot')} required value={form.plotId} onChange={set('plotId')} placeholder={t('Choose an available plot')}
        options={plots.map((p) => ({ value: String(p.id), label: `${p.plotNumber}${p.area !== null ? ` · ${p.area} ${t(areaUnit(p.areaUnit))}` : ''}${p.status !== 'Available' ? ` (${t(String(p.status))})` : ''}`, disabled: p.status !== 'Available' }))}
        error={fieldErr.plotId} />
      <Input label={t('Booking amount (₹)')} required type="number" min="0" step="0.01" inputMode="decimal" value={form.bookingAmount} onChange={set('bookingAmount')} error={fieldErr.bookingAmount} />
      <Input label={t('Property value (₹)')} required type="number" min="0" step="0.01" inputMode="decimal" value={form.agreedValue} onChange={set('agreedValue')} error={fieldErr.agreedValue} />
      <Input label={t('Commission (₹)')} optional type="number" min="0" step="0.01" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} error={commissionError} />
      <SelectInput label={t('Payment mode')} required value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} options={PAYMENT_MODES.map((m) => ({ value: m, label: t(MODE_LABEL[m] ?? m) }))} />
      <fieldset className="re-new-customer re-booking-docs">
        <legend>{t('Documents')} <em>({t('optional')})</em></legend>
        <SelectInput label={t('Document type')} value={docType} onChange={(e) => setDocType(e.target.value)}
          options={DOCUMENT_TYPES.map((d) => ({ value: d, label: t(DOCUMENT_TYPE_LABEL[d] ?? d) }))} />
        <BlobUploadField key={uploadKey} label={t('Attach a document or image')} purpose="Document" disabled={pending}
          onUploaded={(blob) => { setDocs((l) => [...l, { blob, documentType: docType }]); setUploadKey((k) => k + 1); }} />
        {docs.length > 0 && (
          <ul className="re-doc-list">
            {docs.map((d, i) => (
              <li key={`${d.blob.blobName}-${i}`}>
                <span className="re-badge re-badge-info">{t(DOCUMENT_TYPE_LABEL[d.documentType] ?? d.documentType)}</span>
                <span>{d.blob.fileName}</span>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setDocs((l) => l.filter((_, j) => j !== i))}>{t('Remove')}</button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      <div className="re-form-actions">
        <InlineError error={error} conflictText={t('This plot was just booked or blocked by someone else. Choose another plot.')} />
        <button type="submit" className="btn btn-primary" disabled={pending}>{t('Review booking')}</button>
      </div>

      <ConfirmDialog open={confirming} title={t('Confirm booking')} confirmLabel={t('Create booking')} pending={pending} onConfirm={() => void confirm()} onCancel={() => setConfirming(false)}>
        {isNew && <p>{t('A new customer {name} ({phone}) will be added.', { name: customerName, phone: nc.phone.trim() })}</p>}
        <p>{t('Book plot {plot} for {customer}?', { plot: plot?.plotNumber ?? '', customer: customerName })}</p>
        <p>{t('Booking amount {amount} of property value {agreed}.', { amount: money(toAmount(form.bookingAmount)), agreed: money(toAmount(form.agreedValue)) })}</p>
        <p>{t('The booking amount is recorded as the first payment ({mode}{commission}).', { mode: t(MODE_LABEL[paymentMode] ?? paymentMode), commission: commission.trim() ? `, ${t('commission')} ${money(toAmount(commission))}` : '' })}</p>
        {docs.length > 0 && <p>{t('{n} document(s) will be attached to the booking.', { n: docs.length })}</p>}
      </ConfirmDialog>
    </form>
  );
}
