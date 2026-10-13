// Small form building blocks shared by every screen.
export function Field({ label, error, hint, optional, children, className = '' }) {
  return (
    <label className={`f-field ${error ? 'has-error' : ''} ${className}`}>
      <span className="f-label">{label}{optional && <em> (optional)</em>}</span>
      {children}
      {hint && !error && <small className="f-hint">{hint}</small>}
      {error && <small className="f-error">{error}</small>}
    </label>
  );
}

export function TextInput({ label, error, hint, optional, className, ...props }) {
  return <Field label={label} error={error} hint={hint} optional={optional} className={className}><input className="f-input" aria-invalid={!!error} {...props} /></Field>;
}

export function TextArea({ label, error, hint, optional, className, ...props }) {
  return <Field label={label} error={error} hint={hint} optional={optional} className={className}><textarea className="f-input" rows={4} aria-invalid={!!error} {...props} /></Field>;
}

export function Select({ label, options, error, optional, className, ...props }) {
  return (
    <Field label={label} error={error} optional={optional} className={className}>
      <select className="f-input" {...props}>
        {options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}
      </select>
    </Field>
  );
}

export function FormAlert({ tone = 'error', children }) {
  if (!children) return null;
  return <p className={`f-alert f-alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</p>;
}

export function SubmitButton({ loading, children, loadingText = 'Please wait…', className = '', ...props }) {
  return (
    <button type="submit" className={`btn btn-primary ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <span className="try-btn-spinner" aria-hidden="true" />}{loading ? loadingText : children}
    </button>
  );
}

// Validators
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());
export const isPhone = (v) => /^[+\d][\d\s-]{7,}$/.test(String(v).trim());
