import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageShell, { EmptyState, SkeletonGrid } from '../../components/common/PageShell.jsx';
import useApi from '../../hooks/useApi.js';
import useResource from '../../hooks/useResource.js';
import useElapsed from '../../hooks/useElapsed.js';
import { IMAGE_SIZES, IMAGE_STYLES, imageGenerationService as G } from '../../services/imageGenerationService.js';
import { preparePhoto } from '../../utils/photo.js';

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// /image-generator — text-to-image on the Weekend-Live image API.
// ?for=school → "School Project Work": step-by-step project illustrations for kids.
const SCHOOL = {
  title: 'School Project Work', eyebrow: 'Kids · AI project helper',
  intro: 'Describe your school DIY project and get an illustrated, step-by-step build sheet. An adult should handle any cutting, drilling or hot glue.',
  prompt: 'Step-by-step illustrated build sheet for a school DIY project for a 12-year-old: a cardboard and ice-cream-stick model of a solar-powered house. Numbered steps, labelled materials list, safety notes for adult-only steps.',
  style: 'minimalist',
};

export default function ImageGeneratorPage() {
  const [params] = useSearchParams();
  const school = params.get('for') === 'school';
  const quota = useResource('images:quota', (a) => G.quota(a), { fallback: null, accept: (d) => d != null, ttl: 0 });
  const history = useResource('images:history', (a) => G.history(a), { fallback: { total: 0, items: [] }, accept: (d) => d != null, ttl: 0 });
  return (
    <PageShell className="imggen" title={school ? SCHOOL.title : 'AI Image Generator'} eyebrow={school ? SCHOOL.eyebrow : 'Design ideas in seconds'} crumbs={[[null, school ? SCHOOL.title : 'AI Image Generator']]}
      intro={school ? SCHOOL.intro : 'Describe a pergola, deck, garden corner or DIY piece and get a picture to share with your family or our team.'}>
      <div className="imggen-grid">
        <ImageGenerator key={school ? 'school' : 'default'} preset={school ? SCHOOL : null} quota={quota} onGenerated={() => history.reload()} />
        <QuotaCard quota={quota} />
      </div>
      <ImageHistory history={history} />
    </PageShell>
  );
}

function ImageGenerator({ quota, onGenerated, preset }) {
  const [prompt, setPrompt] = useState(preset?.prompt || '');
  const [style, setStyle] = useState(preset?.style || IMAGE_STYLES[0]);
  const [size, setSize] = useState(IMAGE_SIZES[0]);
  const [hint, setHint] = useState('');
  // Optional reference photo: uploaded once via write SAS, reused while unchanged.
  const [photo, setPhoto] = useState(null); // { blob, url, reference? }
  const fileRef = useRef(null);
  useEffect(() => () => { if (photo?.url) URL.revokeObjectURL(photo.url); }, [photo]);
  const gen = useApi((a) => (a.photo ? G.generateFromPhoto({ ...a, file: a.photo.blob, reference: a.photo.reference }) : G.generate(a)));
  const elapsed = useElapsed(gen.loading);
  const exhausted = (quota.data && quota.data.remaining <= 0) || gen.status === 403;
  const disabled = !prompt.trim() || gen.loading || exhausted;

  const submit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) { setHint('Please describe the image you want.'); return; }
    if (disabled) return;
    setHint('');
    const res = await gen.execute({ prompt: prompt.trim(), style, size, photo });
    const ref = res.data?.reference || res.reference;
    if (ref && photo && !photo.reference) setPhoto((p) => (p ? { ...p, reference: ref } : p));
    if (res.success) {
      if (Number.isFinite(res.data.remainingQuota)) quota.setData((q) => (q ? { ...q, remaining: res.data.remainingQuota, used: Math.max(0, q.monthlyQuota - res.data.remainingQuota) } : q));
      else quota.reload();
      onGenerated();
    }
    // On failure prompt and style are kept as they are.
  };

  return (
    <form className="card imggen-form" onSubmit={submit} noValidate>
      <label className="f-field">
        <span className="f-label">Describe your image</span>
        <textarea rows={4} maxLength={1000} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Modern wooden pergola with outdoor seating and warm string lights" aria-describedby="imggen-hint" />
      </label>
      <div className="imggen-photo">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={gen.loading}
          onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { const p = await preparePhoto(f); setPhoto({ blob: p.blob, url: p.url }); setHint(''); } catch (err) { setHint(err.message); } }} />
        {photo ? (
          <>
            <img src={photo.url} alt="Your reference photo" />
            <span>{photo.reference ? 'Photo uploaded — reused for every try' : 'Photo ready — uploads when you generate'}</span>
            <button type="button" className="btn btn-quiet btn-small" disabled={gen.loading} onClick={() => setPhoto(null)}>Remove</button>
          </>
        ) : <button type="button" className="btn btn-outline btn-small" disabled={gen.loading} onClick={() => fileRef.current?.click()}>📷 Add a photo of your space (optional)</button>}
      </div>
      <div className="f-row">
        <label className="f-field"><span className="f-label">Style</span>
          <select value={style} onChange={(e) => setStyle(e.target.value)} disabled={gen.loading}>{IMAGE_STYLES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}</select>
        </label>
        <label className="f-field"><span className="f-label">Size</span>
          <select value={size} onChange={(e) => setSize(e.target.value)} disabled={gen.loading}>{IMAGE_SIZES.map((s) => <option key={s} value={s}>{s.replace('x', ' × ')}</option>)}</select>
        </label>
      </div>
      <p id="imggen-hint" className={hint ? 'enq-error' : 'muted'} role={hint ? 'alert' : undefined}>{hint || 'Mention materials, setting and mood for the best results.'}</p>
      {gen.error && <p className="f-alert f-alert-error" role="alert">{gen.error}</p>}
      {exhausted && !gen.error && <p className="f-alert f-alert-error" role="alert">Your image-generation quota has been exhausted.</p>}
      <button type="submit" className="btn btn-primary" disabled={disabled} aria-busy={gen.loading}>
        {gen.loading ? <><span className="try-btn-spinner" aria-hidden="true" /> Generating… {elapsed}s</> : 'Generate'}
      </button>
      {gen.loading && <div className="imggen-progress" role="status"><span className="slide-spinner" aria-hidden="true" /><p>Creating your image — this usually takes 20–60 seconds.</p></div>}
      {gen.data?.url && !gen.loading && (
        <figure className="imggen-result" aria-live="polite">
          <img src={gen.data.url} alt={`Generated image: ${prompt}`} />
          <figcaption>
            {Number.isFinite(gen.data.remainingQuota) && <span>{gen.data.remainingQuota} images left this month</span>}
            <a className="btn btn-outline btn-small" href={gen.data.url} target="_blank" rel="noopener">Open full size</a>
          </figcaption>
        </figure>
      )}
    </form>
  );
}

function QuotaCard({ quota }) {
  const q = quota.data;
  const pct = q && q.monthlyQuota > 0 ? Math.min(100, (q.remaining / q.monthlyQuota) * 100) : 0;
  return (
    <aside className="card imggen-quota" aria-live="polite">
      <span className="eyebrow">Image quota</span>
      {quota.loading && !q ? <div className="skeleton kpi" /> : q ? (
        <>
          {q.membership && <p className="pill">{q.membership}</p>}
          <p className="mem-credits-big"><b>{q.remaining}</b> remaining</p>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={q.monthlyQuota} aria-valuenow={q.remaining} aria-label="Images remaining this month"><span style={{ width: `${pct}%` }} /></div>
          <dl className="mem-credits-dl"><div><dt>Monthly</dt><dd>{q.monthlyQuota}</dd></div><div><dt>Used</dt><dd>{q.used}</dd></div><div><dt>Left</dt><dd>{q.remaining}</dd></div></dl>
          <p className="muted imggen-note">Separate from your AI Design Studio credits.</p>
        </>
      ) : (
        <><p className="muted">{quota.error || 'Your quota could not be loaded.'}</p><button type="button" className="btn btn-outline btn-small" onClick={quota.reload}>Try again</button></>
      )}
    </aside>
  );
}

function ImageHistory({ history }) {
  const items = history.data?.items || [];
  return (
    <section className="imggen-history" aria-labelledby="imggen-history-h">
      <h2 id="imggen-history-h">Your images{history.data?.total ? <small className="muted"> ({history.data.total})</small> : null}</h2>
      {history.loading && !items.length ? <SkeletonGrid count={4} />
        : history.error && !items.length ? <EmptyState icon="⚠️" title="History could not be loaded">{history.error} <button type="button" className="link-btn" onClick={history.reload}>Try again</button></EmptyState>
          : !items.length ? <EmptyState icon="🖼️" title="No images yet">Your generated images will appear here.</EmptyState>
            : (
              <ul className="imggen-gallery">
                {items.map((i) => (
                  <li key={i.id || i.url}>
                    <a href={i.url} target="_blank" rel="noopener"><img src={i.url} alt={i.prompt ? `Generated image: ${i.prompt}` : 'Generated image'} loading="lazy" /></a>
                    <p>{i.prompt}</p>
                    <small className="muted">{[i.style && cap(i.style), i.size, fmtDay(i.createdAt)].filter(Boolean).join(' · ')}</small>
                  </li>
                ))}
              </ul>
            )}
    </section>
  );
}
