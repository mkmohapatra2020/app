import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { openWhatsApp } from '../../utils/contact.js';
import { session } from '../../services/session.js';

/**
 * Enquiry / booking dialog.
 * open({ title, intro, fields, build, submit?, requiresAuth?, successText? })
 *  - submit(values) → Promise<ApiResponse>: sends to the backend API.
 *  - build(values) → WhatsApp text: used when there's no API call, the visitor
 *    isn't signed in (requiresAuth), or the API call fails.
 */
const EnquiryDialog = forwardRef(function EnquiryDialog(_, ref) {
  const dlg = useRef(null);
  const [cfg, setCfg] = useState(null);
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done | failed

  useImperativeHandle(ref, () => ({
    open(next) {
      const init = {};
      const u = session.user() || {};
      next.fields.forEach((f) => { init[f.name] = f.value ?? (f.options ? (Array.isArray(f.options[0]) ? f.options[0][0] : f.options[0]) : (f.name === 'name' ? u.name || '' : f.name === 'phone' ? u.phone || '' : '')); });
      setCfg(next); setValues(init); setError(''); setState('idle');
      dlg.current?.showModal();
    },
  }));

  const close = () => dlg.current?.close();
  const guest = cfg?.requiresAuth && !session.isAuthenticated();
  const useApiPath = cfg?.submit && !guest;

  const validate = () => {
    const missing = cfg.fields.find((f) => f.required && !String(values[f.name] || '').trim());
    if (missing) { setError(`Please fill in “${missing.label}”.`); return false; }
    if (values.phone && !/^[+\d][\d\s-]{7,}$/.test(values.phone.trim())) { setError('Please enter a valid phone number.'); return false; }
    setError('');
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!useApiPath) { openWhatsApp(cfg.build(values)); close(); return; }
    setState('sending');
    const res = await cfg.submit(values);
    if (res?.success) setState('done');
    else { setState('failed'); setError(res?.error || 'We could not send that just now.'); }
  };

  return (
    <dialog ref={dlg} className="enq-dialog" aria-labelledby="enq-title" onClick={(e) => { if (e.target === dlg.current) close(); }}>
      {cfg && (state === 'done' ? (
        <div className="enq-body enq-done">
          <span aria-hidden="true">🎉</span>
          <h2 id="enq-title">{cfg.successTitle || 'Thank you!'}</h2>
          <p>{cfg.successText || "We've received your request and will contact you shortly."}</p>
          <button type="button" className="btn btn-primary" onClick={close}>Done</button>
        </div>
      ) : (
        <form className="enq-body" onSubmit={submit} noValidate>
          <div className="enq-head">
            <h2 id="enq-title">{cfg.title}</h2>
            <button type="button" className="enq-close" aria-label="Close" onClick={close}>×</button>
          </div>
          {cfg.intro && <p className="enq-intro">{cfg.intro}</p>}
          {guest && (
            <p className="enq-signin">
              <Link to="/login" onClick={close}>Sign in</Link> to {cfg.authAction || 'book online'} — or send your details on WhatsApp below.
            </p>
          )}
          {cfg.fields.map((f) => (
            <label key={f.name} className="enq-field">
              <span>{f.label}{!f.required && !f.options && <em> (optional)</em>}</span>
              {f.options ? (
                <select value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}>
                  {f.options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}
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
          {error && (
            <p className="enq-error" role="alert">
              {error}
              {state === 'failed' && <> <button type="button" className="link-btn" onClick={() => { openWhatsApp(cfg.build(values)); close(); }}>Send on WhatsApp instead</button></>}
            </p>
          )}
          <div className="enq-actions">
            <button type="button" className="btn btn-quiet" onClick={close}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={state === 'sending'}>
              {state === 'sending' ? <><span className="try-btn-spinner" aria-hidden="true" /> Sending…</> : useApiPath ? (cfg.submitLabel || 'Send request') : <><span aria-hidden="true">💬</span> Send on WhatsApp</>}
            </button>
          </div>
          <p className="enq-note">{useApiPath ? 'Sent securely to the Weekend-Live team.' : 'Opens WhatsApp with your details filled in — nothing is stored on this website.'}</p>
        </form>
      ))}
    </dialog>
  );
});

export default EnquiryDialog;
