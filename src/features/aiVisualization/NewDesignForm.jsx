import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useResource from '../../hooks/useResource.js';
import { designService } from '../../services/designService.js';
import { aiWorkflowService as W } from '../../services/aiWorkflowService.js';
import { preparePhoto } from '../../utils/photo.js';
import { fmtMoney } from './RequestCard.jsx';

// Only the request id is kept across a refresh (never SAS links or files).
const DRAFT_KEY = 'wl:viz-draft';
const readDraftId = () => { try { return sessionStorage.getItem(DRAFT_KEY) || ''; } catch { return ''; } };
const writeDraftId = (id) => { try { if (id) sessionStorage.setItem(DRAFT_KEY, id); else sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } };

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];
const OUTPUT_TYPES = ['Realistic render', 'Concept sketch', 'Product render', 'Lifestyle scene'];
const SKILLS = ['Beginner', 'Some experience', 'Confident'];
const PLACES = ['Indoor', 'Outdoor', 'Either'];

const KIDS_FIELDS = [
  ['childAge', "Children's age or age range", 'text', '10–15'],
  ['childCount', 'Number of children', 'number', ''],
  ['supervisor', 'Adult supervisor available?', 'select', 'Yes', ['Yes', 'No — please arrange one']],
  ['skillLevel', 'Skill level', 'select', SKILLS[0], SKILLS],
  ['duration', 'Project duration', 'text', ''],
  ['location', 'Indoor or outdoor', 'select', PLACES[0], PLACES],
  ['educationalGoal', 'Educational goal', 'text', ''],
  ['materials', 'Available materials and tools', 'text', ''],
  ['adultSteps', 'Adult-only steps, cleanup and storage needs', 'text', ''],
];
const FAMILY_FIELDS = [
  ['groupSize', 'Group size (2–10 people)', 'number', '4'],
  ['ageRanges', 'Participant age ranges', 'text', ''],
  ['adultChildRatio', 'Adult-to-child ratio', 'text', ''],
  ['skillLevels', 'Skill levels', 'text', ''],
  ['roles', 'Preferred shared roles', 'text', ''],
  ['duration', 'Project duration', 'text', ''],
  ['location', 'Indoor or outdoor', 'select', PLACES[0], PLACES],
  ['goal', 'Collaboration or learning goal', 'text', ''],
  ['materials', 'Available materials and tools', 'text', ''],
  ['cleanup', 'Cleanup and storage requirements', 'text', ''],
];
const GENERAL_FIELDS = [
  ['style', 'Preferred style and colours'], ['materialsWanted', 'Materials'], ['dimensions', 'Dimensions or available space'],
  ['intendedUsers', 'Intended users'], ['numberOfUsers', 'Number of users'], ['accessibility', 'Accessibility requirements'],
  ['safety', 'Safety concerns'], ['maintenance', 'Maintenance preference'],
];
const defaults = (fields) => Object.fromEntries(fields.map(([k, , , d]) => [k, d ?? '']));
const label = (fields, k) => fields.find(([f]) => f === k)?.[1] || k;

let uid = 0;

/**
 * Customer flow: draft → site photos (required) + reference images (optional)
 * → category (from the catalog) → idea, details, budget, mode → submit.
 * `resume` = a ChangesRequested request to edit and resubmit with the same id.
 */
export default function NewDesignForm({ resume, onSubmitted }) {
  const navigate = useNavigate();
  const location = useLocation();
  const cats = useResource('design-categories', (a) => designService.categories(a), { fallback: [] });
  const categories = cats.data || [];

  const [draft, setDraft] = useState(null);
  const [draftError, setDraftError] = useState('');
  const creating = useRef(null);
  const [files, setFiles] = useState([]); // { key, kind, file, preview, progress, state, error, sas, assetId }
  const [form, setForm] = useState({ categoryId: '', projectName: '', prompt: '', additionalDetail: '', maxBudget: '', currency: 'INR', mode: '', outputType: OUTPUT_TYPES[0] });
  const [campaign, setCampaign] = useState({});
  const [general, setGeneral] = useState(defaults(GENERAL_FIELDS));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [touched, setTouched] = useState(false);
  const ctrl = useRef(null);

  const category = categories.find((c) => c.id === form.categoryId);
  const fieldSet = category?.fieldSet === 'kids' ? KIDS_FIELDS : category?.fieldSet === 'family' ? FAMILY_FIELDS : null;

  // Resume: a ChangesRequested request (same id) or the draft saved for this tab.
  useEffect(() => {
    const id = resume?.id || readDraftId();
    if (!id) return undefined;
    const c = new AbortController();
    W.detail({ id, signal: c.signal }).then((r) => {
      if (r.aborted) return;
      if (!r.success || !['Draft', 'ChangesRequested'].includes(r.data.status)) { if (!resume) writeDraftId(''); return; }
      const d = r.data;
      setDraft({ id: d.id, resumed: true, status: d.status, mode: d.mode, remainingQuota: null, maxReferenceImages: null, maxSitePhotos: null, canChangeMode: true, existingSite: d.sitePhotoCount, existingRefs: d.referenceCount, reviewNotes: d.reviewNotes });
      setForm((f) => ({ ...f, projectName: d.projectName || '', prompt: d.prompt || '', additionalDetail: d.additionalDetail || '', maxBudget: d.maxBudget ? String(d.maxBudget) : '', currency: d.currency || 'INR', mode: d.mode, _typeId: d.typeId || undefined, outputType: d.details?.outputType || f.outputType }));
      if (d.details) { setCampaign(d.details.campaign || {}); setGeneral((g) => ({ ...g, ...(d.details.requirements || {}) })); }
    });
    return () => c.abort();
  }, [resume?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Map a resumed request's visualizationTypeId back to a catalog entry once loaded.
  useEffect(() => {
    if (!form._typeId || !categories.length) return;
    const c = categories.find((x) => x.typeId === form._typeId);
    if (c) setForm((f) => ({ ...f, categoryId: c.id, _typeId: undefined }));
  }, [form._typeId, categories]);

  useEffect(() => { if (fieldSet) setCampaign((c) => ({ ...defaults(fieldSet), ...c })); }, [category?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => () => { ctrl.current?.abort(); filesRef.current.forEach((f) => URL.revokeObjectURL(f.preview)); }, []);

  // Create the draft once, before the first upload.
  const ensureDraft = async () => {
    if (draft?.id) return draft;
    if (!creating.current) {
      creating.current = W.createDraft().then((r) => {
        creating.current = null;
        if (!r.success) {
          if (r.status === 401) navigate('/login', { state: { from: location.pathname } });
          setDraftError(r.error); return null;
        }
        const d = { ...r.data, existingSite: 0, existingRefs: 0 };
        writeDraftId(d.id);
        setDraft(d);
        setForm((f) => ({ ...f, mode: f.mode || d.mode }));
        return d;
      });
    }
    return creating.current;
  };

  const patchFile = (key, change) => setFiles((list) => list.map((f) => (f.key === key ? { ...f, ...change } : f)));

  const upload = async (item, d) => {
    patchFile(item.key, { state: 'uploading', error: '', progress: 0 });
    const r = await W.uploadAsset({ requestId: d.id, kind: item.kind, file: item.file, sas: item.sas, onProgress: (p) => patchFile(item.key, { progress: p }) });
    if (r.success) {
      patchFile(item.key, { state: 'done', progress: 1, sas: r.data.sas, assetId: r.data.assetId });
      if (r.data.maxReferenceImages) setDraft((x) => ({ ...x, maxReferenceImages: r.data.maxReferenceImages }));
    } else {
      patchFile(item.key, { state: 'error', error: r.error, sas: r.sas || item.sas });
      if (r.status === 401) navigate('/login', { state: { from: location.pathname } });
    }
  };

  const maxSite = draft?.maxSitePhotos || 4;
  const maxRefs = draft?.maxReferenceImages || 5;
  const siteFiles = files.filter((f) => f.kind === 'site');
  const refFiles = files.filter((f) => f.kind === 'reference');
  const siteCount = (draft?.existingSite || 0) + siteFiles.length;
  const refCount = (draft?.existingRefs || 0) + refFiles.length;

  const addFiles = (kind) => async (e) => {
    const picked = [...(e.target.files || [])];
    e.target.value = '';
    const room = kind === 'site' ? maxSite - siteCount : maxRefs - refCount;
    if (room <= 0) { setSubmitError(kind === 'site' ? `You can upload up to ${maxSite} site photos.` : `Your membership allows up to ${maxRefs} reference images.`); return; }
    setSubmitError('');
    const d = await ensureDraft();
    if (!d) return;
    for (const file of picked.slice(0, room)) {
      let prepared;
      try { prepared = await preparePhoto(file); } catch (err) { setSubmitError(err.message); continue; }
      const blob = new File([prepared.blob], `${(file.name || 'photo').replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
      uid += 1;
      const item = { key: `f${uid}`, kind, file: blob, preview: prepared.url, progress: 0, state: 'queued' };
      setFiles((list) => [...list, item]);
      upload(item, d);
    }
  };
  const removeFile = (key) => setFiles((list) => { const f = list.find((x) => x.key === key); if (f) URL.revokeObjectURL(f.preview); return list.filter((x) => x.key !== key); });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // ---------- validation ----------
  const budgetNum = form.maxBudget === '' ? null : Number(form.maxBudget);
  const errors = useMemo(() => {
    const e = {};
    if (siteFiles.filter((f) => f.state === 'done').length + (draft?.existingSite || 0) < 1) e.site = 'Upload at least one site photo.';
    if (!category) e.category = 'Choose a category.';
    if (!form.prompt.trim()) e.prompt = 'Describe your idea.';
    if (budgetNum !== null && !(budgetNum > 0)) e.budget = 'Maximum budget must be greater than zero.';
    if (budgetNum !== null && !/^[A-Z]{3}$/.test(form.currency)) e.currency = 'Choose a currency.';
    if (fieldSet === FAMILY_FIELDS) { const g = Number(campaign.groupSize); if (!(g >= 2 && g <= 10)) e.groupSize = 'Group size must be between 2 and 10.'; }
    if (fieldSet === KIDS_FIELDS && String(campaign.childCount ?? '') !== '' && !(Number(campaign.childCount) >= 1)) e.childCount = 'Enter the number of children.';
    return e;
  }, [siteFiles, draft, category, form.prompt, budgetNum, form.currency, fieldSet, campaign]);
  const uploading = files.some((f) => f.state === 'uploading' || f.state === 'queued');
  const failedUploads = files.some((f) => f.state === 'error');
  const mode = form.mode || draft?.mode || 'Auto';
  const quotaKnown = !!draft && draft.remainingQuota !== null && draft.remainingQuota !== undefined;
  const noQuota = quotaKnown && draft.remainingQuota <= 0 && mode === 'Auto';
  const canSubmit = !!draft && !Object.keys(errors).length && !uploading && !failedUploads && !submitting && !noQuota && (quotaKnown || draft?.resumed) // resumed drafts: the server re-checks quota (402);

  // Structured details + a readable summary in additionalDetail.
  const buildPayload = () => {
    const campaignVals = fieldSet ? Object.fromEntries(Object.entries(campaign).filter(([k, v]) => fieldSet.some(([f]) => f === k) && String(v).trim() !== '')) : {};
    const req = Object.fromEntries(Object.entries(general).filter(([, v]) => String(v).trim() !== ''));
    const summary = [
      form.additionalDetail.trim(),
      fieldSet && Object.entries(campaignVals).map(([k, v]) => `${label(fieldSet, k)}: ${v}`).join('; '),
      Object.entries(req).map(([k, v]) => `${label(GENERAL_FIELDS, k)}: ${v}`).join('; '),
      `Output: ${form.outputType}`,
    ].filter(Boolean).join('. ');
    return {
      visualizationTypeId: category.typeId,
      projectName: form.projectName.trim() || `${category.label} — Design Studio`,
      userPrompt: form.prompt.trim(),
      additionalDetail: summary,
      ...(budgetNum ? { maxBudget: budgetNum, budgetCurrency: form.currency } : {}),
      generationMode: mode,
      details: { ...(fieldSet ? { campaign: campaignVals } : {}), requirements: req, outputType: form.outputType },
    };
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true); setSubmitError('');
    ctrl.current = new AbortController();
    const payload = buildPayload();
    const res = await W.submit({ requestId: draft.id, payload, signal: ctrl.current.signal });
    setSubmitting(false);
    if (res.aborted) return;
    if (res.success) {
      writeDraftId('');
      onSubmitted?.({ id: draft.id, status: res.data.status, mode: res.data.mode || mode, projectName: payload.projectName, category: category.label, prompt: payload.userPrompt, submittedAt: new Date().toISOString(), sitePhotoCount: siteCount, referenceCount: refCount, images: [] });
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]); setDraft(null); setTouched(false);
      setForm((f) => ({ ...f, projectName: '', prompt: '', additionalDetail: '', maxBudget: '' }));
      return;
    }
    setSubmitError(res.error);
    if (res.status === 401) navigate('/login', { state: { from: location.pathname } });
    if (res.status === 404) { writeDraftId(''); setDraft(null); setFiles([]); }
    if (res.status === 402) setDraft((d) => ({ ...d, remainingQuota: 0 }));
  };

  const fileTiles = (list, kind, title, icon, max, existing) => (
    <div className="studio-thumbs">
      {existing > 0 && <div className="studio-thumb wf-existing"><span>{existing} already uploaded</span></div>}
      {list.map((f, i) => (
        <figure key={f.key} className={`studio-thumb wf-up wf-up-${f.state}`}>
          <img src={f.preview} alt={`${title} ${i + 1}`} />
          {f.state !== 'done' && <div className="wf-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(f.progress * 100)} aria-label={`Uploading ${title} ${i + 1}`}><span style={{ width: `${Math.round(f.progress * 100)}%` }} /></div>}
          {f.state === 'done' && <span className="wf-up-ok" aria-label="Uploaded">✓</span>}
          {f.state === 'error' && <button type="button" className="wf-up-retry" onClick={() => upload(f, draft)} title={f.error}>↻ Retry</button>}
          {f.state !== 'uploading' && <button type="button" aria-label={`Remove ${title} ${i + 1}`} onClick={() => removeFile(f.key)}>×</button>}
        </figure>
      ))}
      {existing + list.length < max && (
        <label className="studio-add">
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addFiles(kind)} />
          <span aria-hidden="true">{icon}</span><b>Add {kind === 'site' ? 'site photos' : 'references'}</b><small>{existing + list.length}/{max}</small>
        </label>
      )}
    </div>
  );

  return (
    <form className="studio-form" onSubmit={submit} noValidate>
      <div className="studio-main">
        {draft?.status === 'ChangesRequested' && (
          <div className="wf-review" role="status"><strong>Changes requested</strong><p>{draft.reviewNotes || 'Please review your details and resubmit.'}</p></div>
        )}
        {draftError && <p className="enq-error" role="alert">{draftError}</p>}

        <fieldset className="studio-step">
          <legend><span className="studio-num">1</span>Existing site photos <em className="muted">(required)</em></legend>
          <p className="muted">Your terrace, garden, room, structure, product or the piece to restore. Daylight, wide-angle photos work best.</p>
          {fileTiles(siteFiles, 'site', 'Site photo', '📷', maxSite, draft?.existingSite || 0)}
          {touched && errors.site && <p className="enq-error">{errors.site}</p>}
        </fieldset>

        <fieldset className="studio-step wf-refs">
          <legend><span className="studio-num">2</span>Reference images <em className="muted">(optional)</em></legend>
          <p className="muted">Designs, materials, colours or styles you like — not your own space. Your membership allows up to {maxRefs}.</p>
          {fileTiles(refFiles, 'reference', 'Reference image', '🖼️', maxRefs, draft?.existingRefs || 0)}
        </fieldset>

        <fieldset className="studio-step">
          <legend><span className="studio-num">3</span>Category</legend>
          {cats.loading && <div className="skeleton kpi" />}
          {!cats.loading && !categories.length && <p className="enq-error" role="alert">Categories could not be loaded right now. Please try again shortly.</p>}
          <div className="studio-cats" role="radiogroup" aria-label="Design category">
            {categories.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={form.categoryId === c.id} className={`studio-cat${form.categoryId === c.id ? ' sel' : ''}`} onClick={() => setForm((f) => ({ ...f, categoryId: c.id }))}>
                <span aria-hidden="true">{c.icon}</span><strong>{c.label}</strong><small>{c.hint}</small>
              </button>
            ))}
          </div>
          {touched && errors.category && <p className="enq-error">{errors.category}</p>}
        </fieldset>

        {fieldSet && (
          <fieldset className="studio-step wf-campaign">
            <legend><span className="studio-num">3a</span>{category.label} details</legend>
            <p className="wf-safety" role="note">
              {fieldSet === KIDS_FIELDS
                ? 'A professional carpenter or qualified adult supervises all cutting, drilling, lifting, structural work and any hazardous tool use. Children never use dangerous tools unsupervised.'
                : 'Adults handle cutting, drilling, lifting and structural work; everyone gets a safe, age-appropriate role.'}
            </p>
            <div className="wf-grid">
              {fieldSet.map(([k, l, type, , opts]) => (
                <label key={k} className={`f-field${errors[k] && touched ? ' has-error' : ''}`}>
                  <span className="f-label">{l}</span>
                  {type === 'select'
                    ? <select value={campaign[k] ?? ''} onChange={(e) => setCampaign((c) => ({ ...c, [k]: e.target.value }))}>{opts.map((o) => <option key={o}>{o}</option>)}</select>
                    : <input type={type} min={type === 'number' ? (k === 'groupSize' ? 2 : 1) : undefined} max={k === 'groupSize' ? 10 : undefined} value={campaign[k] ?? ''} onChange={(e) => setCampaign((c) => ({ ...c, [k]: e.target.value }))} />}
                  {touched && errors[k] && <small className="f-error">{errors[k]}</small>}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="studio-step">
          <legend><span className="studio-num">4</span>Your idea</legend>
          <div className="wf-grid">
            <label className="f-field"><span className="f-label">Project or idea name <em>(optional)</em></span><input value={form.projectName} maxLength={120} onChange={set('projectName')} placeholder="Back garden renovation" /></label>
            <label className="f-field"><span className="f-label">Output type</span><select value={form.outputType} onChange={set('outputType')}>{OUTPUT_TYPES.map((o) => <option key={o}>{o}</option>)}</select></label>
          </div>
          <label className={`f-field${touched && errors.prompt ? ' has-error' : ''}`}><span className="f-label">What would you like designed?</span>
            <textarea rows={3} maxLength={1000} value={form.prompt} onChange={set('prompt')} placeholder="A shaded seating corner with warm lighting and planters" />
            {touched && errors.prompt && <small className="f-error">{errors.prompt}</small>}
          </label>
          <label className="f-field"><span className="f-label">Additional detail <em>(optional)</em></span>
            <textarea rows={2} maxLength={800} value={form.additionalDetail} onChange={set('additionalDetail')} placeholder="Materials, climate concerns, constraints or style" />
          </label>
          <details className="wf-more">
            <summary>More requirements (optional)</summary>
            <div className="wf-grid">
              {GENERAL_FIELDS.map(([k, l]) => <label key={k} className="f-field"><span className="f-label">{l}</span><input value={general[k]} maxLength={200} onChange={(e) => setGeneral((g) => ({ ...g, [k]: e.target.value }))} /></label>)}
            </div>
          </details>
          <div className="wf-grid">
            <label className={`f-field${touched && errors.budget ? ' has-error' : ''}`}><span className="f-label">Maximum budget <em>(optional)</em></span>
              <input type="number" min="1" step="1" inputMode="decimal" value={form.maxBudget} onChange={set('maxBudget')} placeholder="5000" />
              {touched && errors.budget && <small className="f-error">{errors.budget}</small>}
            </label>
            <label className={`f-field${touched && errors.currency ? ' has-error' : ''}`}><span className="f-label">Currency</span>
              <select value={form.currency} onChange={set('currency')} disabled={form.maxBudget === ''}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
          </div>
          <p className="muted wf-hint">The budget guides the design (scope, materials, complexity). It is not a quotation.</p>
          <fieldset className="wf-mode" disabled={!!draft && !draft.canChangeMode}>
            <legend className="f-label">Generation mode</legend>
            {['Auto', 'Manual'].map((m) => (
              <label key={m} className={`chip${mode === m ? ' sel' : ''}`}><input type="radio" name="wf-mode" value={m} checked={mode === m} onChange={() => setForm((f) => ({ ...f, mode: m }))} />
                {m === 'Auto' ? 'Auto — generate straight away' : 'Manual — our team reviews first'}</label>
            ))}
          </fieldset>
        </fieldset>
      </div>

      <aside className="studio-summary card">
        <h2>Before you submit</h2>
        <dl>
          <div><dt>Remaining quota</dt><dd>{quotaKnown ? draft.remainingQuota : draft ? '—' : 'after first photo'}</dd></div>
          <div><dt>Site photos</dt><dd>{siteCount || '—'}</dd></div>
          <div><dt>Reference images</dt><dd>{refCount || '—'}</dd></div>
          <div><dt>Category</dt><dd>{category ? `${category.icon} ${category.label}` : '—'}</dd></div>
          {budgetNum > 0 && <div><dt>Maximum budget</dt><dd>{fmtMoney(budgetNum, form.currency)}</dd></div>}
          <div><dt>Mode</dt><dd>{mode}</dd></div>
        </dl>
        <p className="muted wf-hint">Generation uses one quota unit when your request is accepted for generation{mode === 'Manual' ? ' (after our review)' : ''}.</p>
        {noQuota && <p className="enq-error" role="alert">You have no AI design quota remaining. Upgrade your membership or wait for your next allocation.</p>}
        {submitError && <p className="enq-error" role="alert">{submitError}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit} aria-busy={submitting}>
          {submitting ? <><span className="try-btn-spinner" aria-hidden="true" /> Submitting…</> : draft?.status === 'ChangesRequested' ? 'Resubmit design request' : 'Submit design request'}
        </button>
        {!canSubmit && !submitting && <p className="muted studio-missing">{uploading ? 'Waiting for uploads to finish…' : failedUploads ? 'Retry or remove the failed upload.' : Object.values(errors)[0] || (draft ? '' : 'Add a site photo to start.')}</p>}
      </aside>
    </form>
  );
}
