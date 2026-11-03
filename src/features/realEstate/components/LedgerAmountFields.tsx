/**
 * The three handwritten-ledger amounts, grouped and explained so they can't be confused.
 * Each is independent: nothing is added, subtracted or derived between them.
 *   Total received  — previous column              (neutral / primary)
 *   Commission      — lower black amount after Payment Details (charcoal)
 *   Property amount — amount written in red         (red accent)
 */
import { useT } from '../../../i18n/language.ts';
import { Input } from './FormFields.tsx';

export interface AmountValues { amount: string; commissionAmount: string; propertyAmount: string }
type Key = keyof AmountValues;

export const AMOUNT_META: { key: Key; label: string; help: string; tone: 'total' | 'commission' | 'property'; required: boolean }[] = [
  { key: 'amount', label: 'Total received', help: 'From the previous column', tone: 'total', required: true },
  { key: 'commissionAmount', label: 'Commission (lower black amount)', help: 'Lower amount written in black, after Payment Details', tone: 'commission', required: false },
  { key: 'propertyAmount', label: 'Property amount (red)', help: 'Amount written in red', tone: 'property', required: false },
];

interface Props {
  values: AmountValues;
  errors: Partial<Record<Key, string>>;
  onChange: (key: Key, value: string) => void;
}

export default function LedgerAmountFields({ values, errors, onChange }: Props) {
  const t = useT();
  return (
    <fieldset className="re-amounts">
      <legend>{t('Ledger amounts')}</legend>
      <p className="re-sub">{t('Enter each amount exactly as written. They are separate figures and are never added together.')}</p>
      {AMOUNT_META.map((m) => (
        <div key={m.key} className={`re-amount re-amount-${m.tone}`}>
          <Input
            label={`${t(m.label)} (₹)`} required={m.required} optional={!m.required}
            type="number" min="0" step="0.01" inputMode="decimal"
            name={m.key} value={values[m.key]} onChange={(e) => onChange(m.key, e.target.value)}
            hint={t(m.help)} error={errors[m.key]}
          />
        </div>
      ))}
    </fieldset>
  );
}
