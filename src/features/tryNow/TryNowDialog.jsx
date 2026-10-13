import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import useImageJob from '../../hooks/useImageJob.js';
import ImageJobLoader from '../../components/common/ImageJobLoader.jsx';
import BeforeAfter from '../../components/common/BeforeAfter.jsx';
import { catalog, materials, settings, dimensionFields, buildSpecPrompt, buildEditPrompt } from '../../data/designCatalog.js';
import { preparePhoto } from '../../utils/photo.js';

const MIN_FT = 0.5;
const MAX_FT = 200;

const STAGES = {
  photo: (name) => [[8, 'Studying your photo…'], [30, `Placing the ${name}…`], [55, 'Matching light and shadows…'], [Infinity, 'Almost there…']],
  design: () => [[8, 'Reading your specs…'], [30, 'Sketching the structure…'], [60, 'Adding dimensions and views…'], [Infinity, 'Almost there…']],
};

/**
 * Try now pop-up (loaded on demand). Two modes:
 *  - Change My Space: upload a photo → structure added at the entered size,
 *    shown as a before / after slider.
 *  - Design from scratch: type, sub-type and size → labelled spec sheet.
 * Opened imperatively: ref.current.open({ mode }).
 */
const TryNowDialog = forwardRef(function TryNowDialog(_, ref) {
  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);
  const resultRef = useRef(null);
  const job = useImageJob();

  const [categoryId, setCategoryId] = useState(catalog[0].id);
  const category = catalog.find((c) => c.id === categoryId);
  const [subtypeId, setSubtypeId] = useState(catalog[0].subtypes[0].id);
  const subtype = category.subtypes.find((s) => s.id === subtypeId) || category.subtypes[0];
  const [dims, setDims] = useState({ ...catalog[0].subtypes[0].dims });
  const [material, setMaterial] = useState(materials[0]);
  const [setting, setSetting] = useState(settings[1]);
  const [mode, setMode] = useState('photo');
  const [photo, setPhoto] = useState(null);
  const { loading } = job;

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);
  useEffect(() => {
    if (job.status === 'done') setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);
  }, [job.status]);

  const close = () => { job.cancel(); dialogRef.current?.close(); };
  useImperativeHandle(ref, () => ({
    open({ mode: m } = {}) {
      if (m) setMode(m);
      if (!dialogRef.current.open) dialogRef.current.showModal();
      setTimeout(() => firstFieldRef.current?.focus(), 0);
    },
  }));

  const pickSubtype = (s) => { setSubtypeId(s.id); setDims({ ...s.dims }); };
  const pickCategory = (id) => { setCategoryId(id); pickSubtype(catalog.find((c) => c.id === id).subtypes[0]); };
  const switchMode = (m) => { if (loading) return; setMode(m); job.reset(); };

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

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    job.reset();
    try { setPhoto(await preparePhoto(file)); } catch (err) { job.fail(err.message); }
  };

  const submit = (e) => {
    e.preventDefault();
    if (loading || invalid.length) return;
    if (mode === 'photo') {
      if (!photo) { job.fail('Please upload a photo of your space first.'); return; }
      job.edit({ image: photo.blob, prompt, size: photo.size });
    } else {
      job.generate({ prompt, size: '1024x1024' });
    }
  };

  const done = job.status === 'done' && job.resultUrl;

  return (
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
                <input ref={i === 0 ? firstFieldRef : undefined} type="radio" name="try-cat" value={c.id} checked={c.id === categoryId} onChange={() => pickCategory(c.id)} />
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
          <ImageJobLoader
            elapsed={job.elapsed}
            stages={STAGES[mode](subtype.label.toLowerCase())}
            expected={mode === 'photo' ? '45–90' : '40–80'}
          />
        )}

        {done && mode === 'photo' && photo && (
          <div className="try-ba" ref={resultRef}>
            <BeforeAfter beforeSrc={photo.url} afterSrc={job.resultUrl} aspect={photo.aspect} alt={`Your space with a ${subtype.label.toLowerCase()}`} />
            <p className="try-ba-note">Drag the slider to compare before and after.</p>
          </div>
        )}
        {done && mode === 'design' && (
          <img ref={resultRef} className="try-preview" src={job.resultUrl} alt={`Generated spec sheet: ${subtype.label}`} />
        )}

        {job.error && <p className="try-msg is-error" role="alert">{job.error}</p>}

        <div className="try-actions">
          <button type="button" className="btn try-cancel" onClick={close}>{loading ? 'Cancel' : 'Close'}</button>
          <button type="submit" className="btn btn-primary try-go" disabled={loading || invalid.length > 0 || (mode === 'photo' && !photo)}>
            {loading && <span className="try-btn-spinner" aria-hidden="true" />}
            {loading ? 'Generating…' : mode === 'photo' ? 'Generate on my photo' : 'Generate'}
          </button>
        </div>
      </form>
    </dialog>
  );
});

export default TryNowDialog;
