import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { openWhatsApp } from '../../utils/contact.js';

// A small form in a dialog that sends the details to Weekend-Live on WhatsApp.
// open({ title, intro, fields, build }) — fields: [{ name, label, type, options, required }]
const EnquiryDialog = forwardRef(function EnquiryDialog(_, ref) {
  const dlg = useRef(null);
  const [cfg, setCfg] = useState(null);
  const [values, setValues] = useState({});
  const [error, setError] = useState('');

  useImperativeHandle(ref, () => ({
    open(next) {
      const init = {};
      next.fields.forEach((f) => { init[f.name] = f.value ?? (f.options ? f.options[0] : ''); });
      setCfg(next); setValues(init); setError('');
      dlg.current?.showModal();
    },
  }));

  const submit = (e) => {
    e.preventDefault();
    const missing = cfg.fields.find((f) => f.required && !String(values[f.name] || '').trim());
    if (missing) { setError(`Please fill in “${missing.label}”.`); return; }
    if (values.phone && !/^[+\d][\d\s-]{7,}$/.test(values.phone.trim())) { setError('Please enter a valid phone number.'); return; }
    openWhatsApp(cfg.build(values));
    dlg.current?.close();
  };

  return (
    <dialog ref={dlg} className="enq-dialog" aria-labelledby="enq-title" onClick={(e) => { if (e.target === dlg.current) dlg.current.close(); }}>
      {cfg && (
        <form className="enq-body" onSubmit={submit} noValidate>
          <div className="enq-head">
            <h2 id="enq-title">{cfg.title}</h2>
            <button type="button" className="enq-close" aria-label="Close" onClick={() => dlg.current.close()}>×</button>
          </div>
          {cfg.intro && <p className="enq-intro">{cfg.intro}</p>}
          {cfg.fields.map((f) => (
            <label key={f.name} className="enq-field">
              <span>{f.label}{!f.required && !f.options && <em> (optional)</em>}</span>
              {f.options ? (
                <select value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}>
                  {f.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea rows={3} value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
              ) : (
                <input
                  type={f.type || 'text'} value={values[f.name]} inputMode={f.type === 'tel' ? 'tel' : f.type === 'number' ? 'numeric' : undefined}
                  min={f.min} max={f.max} autoComplete={f.autoComplete}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                />
              )}
            </label>
          ))}
          {error && <p className="enq-error" role="alert">{error}</p>}
          <div className="enq-actions">
            <button type="button" className="btn btn-quiet" onClick={() => dlg.current.close()}>Cancel</button>
            <button type="submit" className="btn btn-primary"><span aria-hidden="true">💬</span> Send on WhatsApp</button>
          </div>
          <p className="enq-note">Opens WhatsApp with your details filled in — nothing is stored on this website.</p>
        </form>
      )}
    </dialog>
  );
});

export default EnquiryDialog;
