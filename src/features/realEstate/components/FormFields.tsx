/**
 * Thin typed wrappers that render the app's own form markup (.f-field / .f-input from
 * components/common/Form.jsx), so Real Estate forms look and behave like the rest of the site.
 */
import { useT } from '../../../i18n/language.ts';
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

interface Base { label: ReactNode; error?: string; hint?: ReactNode; optional?: boolean }

function Wrap({ id, label, error, hint, optional, children }: Base & { id: string; children: ReactNode }) {
  const t = useT();
  return (
    <div className={`f-field ${error ? 'has-error' : ''}`}>
      <label className="f-label" htmlFor={id}>{label}{optional && <em> ({t('optional')})</em>}</label>
      {children}
      {hint && !error && <small className="f-hint" id={`${id}-hint`}>{hint}</small>}
      {error && <small className="f-error" id={`${id}-err`}>{error}</small>}
    </div>
  );
}

export function Input({ label, error, hint, optional, id: given, ...props }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const id = given || auto;
  return (
    <Wrap id={id} label={label} error={error} hint={hint} optional={optional}>
      <input id={id} className="f-input" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...props} />
    </Wrap>
  );
}

export function SelectInput({ label, error, hint, optional, options, placeholder, id: given, ...props }: Base & SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}) {
  const auto = useId();
  const id = given || auto;
  return (
    <Wrap id={id} label={label} error={error} hint={hint} optional={optional}>
      <select id={id} className="f-input" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
      </select>
    </Wrap>
  );
}

/** Form state helper: `[values, set]` where `set('name')` is an onChange handler. */
export const bind = <T extends { [K in keyof T]: string }>(values: T, setValues: (u: (v: T) => T) => void) =>
  (key: keyof T) => ({
    name: String(key),
    value: values[key],
    onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value })),
  });
