import { useEffect, useMemo, useRef, useState } from 'react';
import { generateImage, editImage } from '../api/generateImage.js';
import { catalog, materials, settings, dimensionFields, buildSpecPrompt, buildEditPrompt } from '../data/designCatalog.js';
import { preparePhoto } from '../lib/photo.js';
import BeforeAfter from './BeforeAfter.jsx';

const MIN_FT = 0.5;
const MAX_FT = 200;

// "Try now" header button. Two modes:
//  - Design from scratch: pick type, sub-type and size → labelled spec sheet.
//  - Edit my photo: upload your space → the structure is added at that size,
//    shown as a before / after slider.
export default function TryNow({ className = '' }) {
  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);
  const abortRef = useRef(null);
  const previewRef = useRef(null);

  const [categoryId, setCategoryId] = useState(catalog[0].id);
  const category = catalog.find((c) => c.id === categoryId);
  const [subtypeId, setSubtypeId] = useState(catalog[0].subtypes[0].id);
  const subtype = category.subtypes.find((s) => s.id === subtypeId) || category.subtypes[0];
  const [dims, setDims] = useState({ ...catalog[0].subtypes[0].dims });
  const [material, setMaterial] = useState(materials[0]);
  const [setting, setSetting] = useState(settings[1]);

  const [mode, setMode] = useState('photo'); // photo (Change My Space) | design
  const [photo, setPhoto] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const loading = status === 'loading';

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);
  // Other parts of the page (e.g. the nudge pop-up) can open this dialog.
  useEffect(() => {
    const onOpen = (e) => { if (e.detail?.mode) setMode(e.detail.mode); open(); };
    window.addEventListener('wl:open-try-now', onOpen);
    return () => window.removeEventListener('wl:open-try-now', onOpen);
  });
  useEffect(() => () => abortRef.current?.abort(), []);

  // Count seconds while generating so the loader shows progress.
  useEffect(() => {
    if (!loading) return undefined;
    setElapsed(0);
    const t = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  // Bring the result into view when it arrives.
  useEffect(() => {
    if (status === 'done') setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);
  }, [status]);

  const pickCategory = (id) => {
    const next = catalog.find((c) => c.id === id);
    setCategoryId(id);
    pickSubtype(next.subtypes[0]);
  };
  const pickSubtype = (s) => {
    setSubtypeId(s.id);
    setDims({ ...s.dims });
  };

  const invalid = dimensionFields.filter(({ key, required }) => {
    const v = dims[key];
    if (v === '' || v === undefined) return required;
    const n = Number(v);
    return !Number.isFinite(n) || n < MIN_FT || n > MAX_FT;
  }).map((f) => f.key);

  const cleanDims = useMemo(() => Object.fromEntries(
    Object.entries(dims).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)]),
  ), [dims]);

  const prompt = useMemo(() => (mode === 'photo'
    ? buildEditPrompt({ subtype, dims: cleanDims, material })
    : buildSpecPrompt({ category, subtype, dims: cleanDims, material, setting })), [mode, category, subtype, cleanDims, material, setting]);

  const switchMode = (m) => { if (loading) return; setMode(m); setStatus('idle'); setMessage(''); setPreview(null); };
  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(''); setStatus('idle'); setPreview(null);
    try { setPhoto(await preparePhoto(file)); } catch (err) { setStatus('error'); setMessage(err.message); }
  };

  const open = () => {
    if (!loading) { setStatus('idle'); setMessage(''); }
    dialogRef.current?.showModal();
    setTimeout(() => firstFieldRef.current?.focus(), 0);
  };
  const close = () => {
    abortRef.current?.abort();
    dialogRef.current?.close();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (loading || invalid.length) return;
    if (mode === 'photo' && !photo) { setStatus('error'); setMessage('Please upload a photo of your space first.'); return; }
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    setMessage('');
    try {
      const blob = mode === 'photo'
        ? await editImage({ image: photo.blob, prompt, size: photo.size, signal: controller.signal })
        : await generateImage({ prompt, size: '1024x1024', signal: controller.signal });
      setPreview(URL.createObjectURL(blob));
      setStatus('done');
    } catch (err) {
      if (err.name === 'AbortError') { setStatus('idle'); return; }
      setStatus('error');
      setMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  const stage = mode === 'photo'
    ? (elapsed < 8 ? 'Studying your photo…' : elapsed < 30 ? `Placing the ${subtype.label.toLowerCase()}…` : elapsed < 55 ? 'Matching light and shadows…' : 'Almost there…')
    : (elapsed < 8 ? 'Reading your specs…' : elapsed < 30 ? 'Sketching the structure…' : elapsed < 60 ? 'Adding dimensions and views…' : 'Almost there…');

  return (
    <>
      <button type="button" className={`try-now ${className}`} onClick={open}>
        <span className="try-now-spark" aria-hidden="true">✦</span> Try now
      </button>

      <dialog
        ref={dialogRef} className="try-dialog" aria-labelledby="try-title"
        onClick={(e) => { if (e.target === dialogRef.current && !loading) close(); }}
        onCancel={(e) => { if (loading) e.preventDefault(); }}
      >
        <form className="try-body" onSubmit={submit} noValidate>
          <div className="try-head">
            <div>
              <h2 id="try-title">Design your structure</h2>
              <p className="try-sub">{mode === 'photo'
                ? 'Upload your terrace, garden or plot and see the structure added at your exact size.'
                : "Pick what you want built and its size — we'll draw a spec sheet with every dimension."}</p>
            </div>
            <button type="button" className="try-close" aria-label="Close" onClick={close}>×</button>
          </div>

          <div className="try-modes" role="tablist" aria-label="How do you want to start?">
            {[['photo', '✨', 'Change My Space'], ['design', '✏️', 'Design from scratch']].map(([m, icon, label]) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} className={`try-mode try-mode-${m}${mode === m ? ' sel' : ''}`} onClick={() => switchMode(m)} disabled={loading}>
                <span className="try-mode-icon" aria-hidden="true">{icon}</span>{label}
              </button>
            ))}
            <span className="try-mode-pill" style={{ transform: `translateX(${mode === 'design' ? '100%' : '0'})` }} aria-hidden="true" />
          </div>

          {mode === 'photo' && (
            <label className={`upload-drop try-upload${photo ? ' has-photo' : ''}`}>
              <input type="file" accept="image/*" onChange={onPhoto} disabled={loading} />
              {photo ? <img src={photo.url} alt="" className="try-upload-thumb" /> : <span className="upload-icon" aria-hidden="true">📷</span>}
              <span><b>{photo ? 'Photo ready — tap to change' : 'Upload a photo of your space to change it'}</b><small>Terrace, backyard, garden or plot · daylight works best</small></span>
            </label>
          )}

          <fieldset className="try-field" disabled={loading}>
            <legend>Type</legend>
            <div className="try-chips" role="radiogroup">
              {catalog.map((c, i) => (
                <label key={c.id} className={`chip${c.id === categoryId ? ' sel' : ''}`}>
                  <input
                    ref={i === 0 ? firstFieldRef : undefined} type="radio" name="try-cat" value={c.id}
                    checked={c.id === categoryId} onChange={() => pickCategory(c.id)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="try-field" disabled={loading}>
            <legend>{category.label} — sub-type</legend>
            <div className="try-chips" role="radiogroup">
              {category.subtypes.map((s) => (
                <label key={s.id} className={`chip chip-sm${s.id === subtype.id ? ' sel' : ''}`}>
                  <input type="radio" name="try-sub" value={s.id} checked={s.id === subtype.id} onChange={() => pickSubtype(s)} />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="try-field" disabled={loading}>
            <legend>Size (feet)</legend>
            <div className="try-dims">
              {dimensionFields.map(({ key, label, required }) => (
                <label key={key} className={`try-dim${invalid.includes(key) ? ' is-invalid' : ''}`}>
                  <span>{label}{!required && <em> (optional)</em>}</span>
                  <span className="try-dim-input">
                    <input
                      type="number" inputMode="decimal" min={MIN_FT} max={MAX_FT} step="0.5"
                      value={dims[key] ?? ''} placeholder={required ? '' : '—'} required={required}
                      aria-invalid={invalid.includes(key)}
                      onChange={(e) => setDims((d) => ({ ...d, [key]: e.target.value }))}
                    />
                    <b>ft</b>
                  </span>
                </label>
              ))}
            </div>
            {invalid.length > 0 && <p className="try-hint">Enter sizes between {MIN_FT} and {MAX_FT} ft.</p>}
          </fieldset>

          <div className={`try-row${mode === 'photo' ? ' single' : ''}`}>
            <label className="try-select">
              <span>Material</span>
              <select value={material} onChange={(e) => setMaterial(e.target.value)} disabled={loading}>
                {materials.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            {mode === 'design' && (
              <label className="try-select">
                <span>Setting</span>
                <select value={setting} onChange={(e) => setSetting(e.target.value)} disabled={loading}>
                  {settings.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            )}
          </div>

          {loading && (
            <div className="try-loader" role="progressbar" aria-label="Generating image" aria-valuetext={stage}>
              <div className="try-loader-ring"><span>✦</span></div>
              <p className="try-loader-stage">{stage}</p>
              <p className="try-loader-time">{elapsed}s · usually {mode === 'photo' ? '45–90' : '40–80'}s</p>
              <div className="try-loader-bar"><span style={{ width: `${Math.min(95, (elapsed / 80) * 95)}%` }} /></div>
            </div>
          )}

          {preview && status === 'done' && mode === 'photo' && photo && (
            <div className="try-ba" ref={previewRef}>
              <BeforeAfter beforeSrc={photo.url} afterSrc={preview} aspect={photo.aspect} alt={`Your space with a ${subtype.label.toLowerCase()}`} />
              <p className="try-ba-note">Drag the slider to compare before and after.</p>
            </div>
          )}

          {preview && status === 'done' && mode === 'design' && <img ref={previewRef} onLoad={() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} className="try-preview" src={preview} alt={`Generated spec sheet: ${subtype.label}`} />}

          {message && (
            <p className={`try-msg${status === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">{message}</p>
          )}

          <div className="try-actions">
            <button type="button" className="btn try-cancel" onClick={close}>{loading ? 'Cancel' : 'Close'}</button>
            <button type="submit" className="btn btn-primary try-go" disabled={loading || invalid.length > 0 || (mode === 'photo' && !photo)}>
              {loading && <span className="try-btn-spinner" aria-hidden="true" />}
              {loading ? 'Generating…' : mode === 'photo' ? 'Generate on my photo' : 'Generate'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
