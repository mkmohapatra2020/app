/**
 * New booking: customer + plot + amounts, validated locally, then confirmed in a dialog.
 * Unavailable plots are listed but cannot be chosen; the API still has the final say (409).
 */
import { useState, type FormEvent } from 'react';
import type { ApiError } from '../../../api/errors.ts';
import { useT } from '../../../i18n/language.ts';
import type { BookingInput, Customer, Plot } from '../types/realEstateTypes.ts';
import { areaUnit, money } from '../utils/format.ts';
import { hasErrors, toAmount, validateBooking, type BookingForm as Form, type Errors } from '../utils/validation.ts';
import { InlineError, serverFieldErrors } from './ApiStateView.tsx';
import ConfirmDialog from './ConfirmDialog.tsx';
import { Input, SelectInput } from './FormFields.tsx';

const KEYS: (keyof Form)[] = ['customerId', 'plotId', 'bookingAmount', 'agreedValue'];

interface Props {
  customers: Customer[];
  plots: Plot[];
  initialPlotId?: string;
  pending: boolean;
  error: ApiError | null;
  /** Resolves true when the booking was created. */
  onSubmit: (input: BookingInput) => Promise<boolean>;
}

export default function BookingForm({ customers, plots, initialPlotId = '', pending, error, onSubmit }: Props) {
  const t = useT();
  const [form, setForm] = useState<Form>({ customerId: '', plotId: initialPlotId, bookingAmount: '', agreedValue: '' });
  const [errors, setErrors] = useState<Errors<keyof Form>>({});
  const [confirming, setConfirming] = useState(false);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((v) => ({ ...v, [k]: e.target.value }));
  const plot = plots.find((p) => String(p.id) === form.plotId) ?? null;
  const customer = customers.find((c) => String(c.id) === form.customerId) ?? null;

  const review = (e: FormEvent) => {
    e.preventDefault();
    const v = validateBooking(form, plot, t);
    setErrors(v);
    if (!hasErrors(v)) setConfirming(true);
  };
  const confirm = async () => {
    if (!customer || !plot) return;
    const ok = await onSubmit({ customerId: customer.id, plotId: plot.id, bookingAmount: toAmount(form.bookingAmount), agreedValue: toAmount(form.agreedValue) });
    setConfirming(false);
    if (ok) setForm({ customerId: '', plotId: '', bookingAmount: '', agreedValue: '' });
  };
  const fieldErr = { ...serverFieldErrors(error, KEYS), ...errors };

  return (
    <form className="re-form" onSubmit={review} noValidate aria-label={t('New booking')}>
      <SelectInput label={t('Customer')} required value={form.customerId} onChange={set('customerId')} placeholder={t('Choose a customer')}
        options={customers.map((c) => ({ value: String(c.id), label: `${c.name}${c.phone ? ` · ${c.phone}` : ''}` }))} error={fieldErr.customerId} />
      <SelectInput label={t('Plot')} required value={form.plotId} onChange={set('plotId')} placeholder={t('Choose an available plot')}
        options={plots.map((p) => ({ value: String(p.id), label: `${p.plotNumber}${p.area !== null ? ` · ${p.area} ${t(areaUnit(p.areaUnit))}` : ''}${p.status !== 'Available' ? ` (${t(String(p.status))})` : ''}`, disabled: p.status !== 'Available' }))}
        error={fieldErr.plotId} />
      <div className="re-row">
        <Input label={t('Booking amount (₹)')} required type="number" min="0" step="0.01" inputMode="decimal" value={form.bookingAmount} onChange={set('bookingAmount')} error={fieldErr.bookingAmount} />
        <Input label={t('Agreed value (₹)')} required type="number" min="0" step="0.01" inputMode="decimal" value={form.agreedValue} onChange={set('agreedValue')} error={fieldErr.agreedValue} />
      </div>
      <InlineError error={error} conflictText={t('This plot was just booked or blocked by someone else. Choose another plot.')} />
      <button type="submit" className="btn btn-primary" disabled={pending}>{t('Review booking')}</button>

      <ConfirmDialog open={confirming} title={t('Confirm booking')} confirmLabel={t('Create booking')} pending={pending} onConfirm={() => void confirm()} onCancel={() => setConfirming(false)}>
        <p>{t('Book plot {plot} for {customer}?', { plot: plot?.plotNumber ?? '', customer: customer?.name ?? '' })}</p>
        <p>{t('Booking amount {amount} of agreed value {agreed}.', { amount: money(toAmount(form.bookingAmount)), agreed: money(toAmount(form.agreedValue)) })}</p>
      </ConfirmDialog>
    </form>
  );
}
