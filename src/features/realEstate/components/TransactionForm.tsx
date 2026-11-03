/** Record a ledger payment: date, the three independent amounts, mode, reference, remarks. */
import { useState, type FormEvent } from 'react';
import type { ApiError } from '../../../api/errors.ts';
import { useT } from '../../../i18n/language.ts';
import { PAYMENT_MODES, type TransactionInput } from '../types/realEstateTypes.ts';
import { hasErrors, toAmount, validateTransaction, type Errors, type TransactionForm as Form } from '../utils/validation.ts';
import { InlineError, serverFieldErrors } from './ApiStateView.tsx';
import { bind, Input, SelectInput } from './FormFields.tsx';
import LedgerAmountFields from './LedgerAmountFields.tsx';

const KEYS: (keyof Form)[] = ['transactionDate', 'amount', 'commissionAmount', 'propertyAmount', 'paymentMode', 'referenceNumber', 'remarks'];
const MODE_LABEL: Record<string, string> = { BankTransfer: 'Bank transfer' };
// Local calendar date (toISOString would give yesterday in IST before 05:30).
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Form strings → API input: numbers for amounts, null for empty optional amounts. */
export function toTransactionInput(f: Form): TransactionInput {
  const optional = (v: string) => (v.trim() === '' ? null : toAmount(v));
  return {
    transactionDate: f.transactionDate,
    amount: toAmount(f.amount),
    commissionAmount: optional(f.commissionAmount),
    propertyAmount: optional(f.propertyAmount),
    paymentMode: f.paymentMode,
    referenceNumber: f.referenceNumber,
    remarks: f.remarks,
  };
}

interface Props {
  pending: boolean;
  error: ApiError | null;
  /** Resolves true when saved (the form then clears). */
  onSubmit: (input: TransactionInput) => Promise<boolean>;
}

export default function TransactionForm({ pending, error, onSubmit }: Props) {
  const t = useT();
  const empty: Form = { transactionDate: today(), amount: '', commissionAmount: '', propertyAmount: '', paymentMode: 'UPI', referenceNumber: '', remarks: '' };
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Errors<keyof Form>>({});
  const f = bind(form, setForm);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validateTransaction(form, undefined, t);
    setErrors(v);
    if (hasErrors(v)) return;
    if (await onSubmit(toTransactionInput(form))) setForm(empty);
  };
  const fieldErr = { ...serverFieldErrors(error, KEYS), ...errors };

  return (
    <form className="re-form" onSubmit={submit} noValidate aria-label={t('Record a payment')}>
      <Input label={t('Transaction date')} required type="date" max={today()} {...f('transactionDate')} error={fieldErr.transactionDate} />
      <LedgerAmountFields
        values={{ amount: form.amount, commissionAmount: form.commissionAmount, propertyAmount: form.propertyAmount }}
        errors={{ amount: fieldErr.amount, commissionAmount: fieldErr.commissionAmount, propertyAmount: fieldErr.propertyAmount }}
        onChange={(key, value) => setForm((v) => ({ ...v, [key]: value }))}
      />
      <SelectInput label={t('Payment mode')} required {...f('paymentMode')} options={PAYMENT_MODES.map((m) => ({ value: m, label: t(MODE_LABEL[m] ?? m) }))} error={fieldErr.paymentMode} />
      <Input label={t('Reference number')} optional {...f('referenceNumber')} error={fieldErr.referenceNumber} hint={t('UPI transaction id, cheque or bank reference')} />
      <Input label={t('Remarks')} optional {...f('remarks')} error={fieldErr.remarks} placeholder={t('e.g. 2nd installment')} />
      <InlineError error={error} conflictText={t('This payment reference has already been recorded.')} />
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? t('Saving…') : t('Record payment')}</button>
    </form>
  );
}
