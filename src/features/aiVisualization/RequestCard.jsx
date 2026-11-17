import { useCallback, useEffect, useRef, useState } from 'react';
import BeforeAfter from '../../components/common/BeforeAfter.jsx';
import { ACTIVE_STATUSES, STOP_STATUSES, aiWorkflowService as W } from '../../services/aiWorkflowService.js';

const POLL_START = 3000;
const POLL_MAX_GAP = 20000;
const POLL_WINDOW = 10 * 60 * 1000;

const STATUS_LABEL = {
  Draft: 'Draft', Submitted: 'Submitted', Queued: 'Queued', Processing: 'Generating', Generating: 'Generating', PendingReview: 'Awaiting review',
  ChangesRequested: 'Changes requested', Completed: 'Completed', Failed: 'Failed', Rejected: 'Rejected', Cancelled: 'Cancelled',
};
export const statusLabel = (s) => STATUS_LABEL[s] || s;
export function StatusChip({ status }) {
  return <span className={`wf-status wf-${String(status).toLowerCase()}`}>{statusLabel(status)}</span>;
}

export const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
export const fmtMoney = (amount, currency) => (amount ? `${currency || ''} ${Number(amount).toLocaleString('en-IN')}`.trim() : '');

/**
 * Polls a request while it is being generated: every 3 s, backing off to 20 s,
 * for at most 10 min. Stops on Completed/Failed/Rejected/ChangesRequested/Cancelled,
 * on unmount, or on an error. Loads the detail (results) when it completes.
 */
export function useRequestPolling(id, initial) {
  const [req, setReq] = useState(initial || null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);
  const ctrl = useRef(null);

  const stop = useCallback(() => { clearTimeout(timer.current); ctrl.current?.abort(); setPolling(false); }, []);

  // Image Generator pictures (my-history) are not Studio requests: there is no detail to load.
  const isImage = initial?.source === 'image';

  const loadDetail = useCallback(async () => {
    if (isImage) return null;
    const c = new AbortController(); ctrl.current = c;
    const d = await W.detail({ id, signal: c.signal });
    if (d.aborted) return null;
   if (d.success) {
      // Never let a detail without images/photo wipe the ones the list already gave this card.
      let merged = d.data;
      setReq((prev) => {
        merged = {
          ...d.data,
          images: d.data.images?.length ? d.data.images : (prev?.images || []),
          beforeUrl: d.data.beforeUrl || prev?.beforeUrl || '',
        };
        return merged;
      });
      setError('');
      return merged;
    }
    setError(d.error); return null;
  }, [id, isImage]);

  const poll = useCallback(async () => {
    stop();
    setError('');
    const start = Date.now();
    let gap = POLL_START;
    setPolling(true);
    const step = async () => {
      const c = new AbortController(); ctrl.current = c;
      const s = await W.status({ id, signal: c.signal });
      if (s.aborted) return;
      if (!s.success) { setError(s.error); setPolling(false); return; }
      setReq((r) => ({ ...(r || {}), status: s.data.status, reviewNotes: s.data.reviewNotes || r?.reviewNotes }));
      if (STOP_STATUSES.includes(s.data.status)) { setPolling(false); await loadDetail(); return; }
      if (!ACTIVE_STATUSES.includes(s.data.status) && s.data.status !== 'PendingReview') { setPolling(false); return; }
      if (Date.now() - start > POLL_WINDOW) { setPolling(false); setError('Still working on it — refresh later to see the result.'); return; }
      gap = Math.min(POLL_MAX_GAP, Math.round(gap * 1.4));
      timer.current = setTimeout(step, gap);
    };
    timer.current = setTimeout(step, POLL_START);
  }, [id, loadDetail, stop]);

  useEffect(() => {
    if (isImage) return undefined;
    let alive = true;
    (async () => {
      const d = await loadDetail();
      if (alive && d && (ACTIVE_STATUSES.includes(d.status) || d.status === 'PendingReview')) poll();
    })();
    return () => { alive = false; stop(); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { req, polling, error, refresh: loadDetail, poll, stop };
}

/**
 * Generated images ordered by imageOrder; an expired link re-fetches the detail once.
 * With the site photo (`beforeUrl`), each result is a before/after slider, like the Outdoor page.
 */
export function ResultImages({ images = [], title, beforeUrl = '', onExpired }) {
  const [broken, setBroken] = useState({});
  const retried = useRef(false);
  if (!images.length) return null;
  if (beforeUrl) return <TransformationCard images={images} title={title} beforeUrl={beforeUrl} />;
  return (
    <div className="wf-results">
      {images.map((img) => (
        <figure key={`${img.order}-${img.url.split('?')[0]}`} className="wf-result">
          {broken[img.order] ? (
            <div className="wf-result-error" role="alert">
              <p>This image could not be loaded.</p>
              <button type="button" className="btn btn-outline btn-small" onClick={() => { setBroken((b) => ({ ...b, [img.order]: false })); onExpired?.(); }}>Retry</button>
            </div>
          ) : (
            <img src={img.url} alt={`${title || 'AI design'} — result ${img.order}`} loading="lazy"
              onError={() => { if (!retried.current) { retried.current = true; onExpired?.(); } else setBroken((b) => ({ ...b, [img.order]: true })); }} />
          )}
          <figcaption>
            <span>Result {img.order}</span>
            <a className="btn btn-outline btn-small" href={img.url} download={`weekend-live-design-${img.order}`} target="_blank" rel="noopener">Download</a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/**
 * "Weekend transformation" card, like the home page hero: the site photo (before) against one
 * result (after) in a large drag-to-compare slider; tabs switch between results.
 */
function TransformationCard({ images, title, beforeUrl }) {
  const [i, setI] = useState(0);
  const img = images[Math.min(i, images.length - 1)];
  const name = title || 'AI design';
  return (
    <section className="hero-ba wf-transform" aria-label={`Before and after: ${name}`}>
      <div className="hero-ba-head">
        <span className="hero-ba-badge">Weekend transformation</span>
        <span className="hero-ba-title">{name}</span>
      </div>
      <BeforeAfter key={`${img.order}-${img.url.split('?')[0]}`} beforeSrc={beforeUrl} afterSrc={img.url} alt={`${name} — result ${img.order}`} aspect="4 / 3" />
      {images.length > 1 && (
        <div className="hero-ba-tabs" role="tablist" aria-label="Choose a result">
          {images.map((x, n) => (
            <button key={x.order} type="button" role="tab" aria-selected={n === i} className={n === i ? 'is-on' : ''} onClick={() => setI(n)}>Result {x.order}</button>
          ))}
        </div>
      )}
      <div className="hero-ba-foot">
        <p className="hero-ba-hint">Drag to compare your site photo with the design.</p>
        <a className="hero-ba-try wf-transform-dl" href={img.url} download={`weekend-live-design-${img.order}`} target="_blank" rel="noopener">⬇ Download result {img.order}</a>
      </div>
    </section>
  );
}

/** One submitted request: status, review notes, results, resubmit. */
export default function RequestCard({ request, onResubmit, onStatus }) {
  const { req, error, refresh } = useRequestPolling(request.id, request);
  const r = req || request;
  // Tell the list when the status moves, so the card is regrouped (e.g. In progress → Completed).
  useEffect(() => { if (r.status && r.status !== request.status) onStatus?.(r); }, [r.status]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <article className="card wf-card" aria-live="polite">
      <header className="wf-card-head">
        <div>
          <div className="wf-tags"><StatusChip status={r.status} />{r.category && <span className="pill">{r.category}</span>}<span className="pill pill-quiet">{r.mode}</span></div>
          <h3>{r.projectName || 'AI design request'}</h3>
        </div>
      </header>

      {ACTIVE_STATUSES.includes(r.status) && <p className="wf-wait"><span className="slide-spinner" aria-hidden="true" /> {['Processing', 'Generating'].includes(r.status) ? 'Generating your design — usually under two minutes.' : 'Queued for generation…'}</p>}
      {r.status === 'PendingReview' && <p className="wf-note">Our team reviews manual requests before generating. No image yet is normal — we will update this card.</p>}
      {r.status === 'ChangesRequested' && (
        <div className="wf-review" role="status">
          <strong>Our team asked for changes</strong>
          <p>{r.reviewNotes || 'Please review your details.'}</p>
          <button type="button" className="btn btn-primary btn-small" onClick={() => onResubmit?.(r)}>Review and resubmit</button>
        </div>
      )}
      {r.status === 'Rejected' && <div className="wf-review is-bad"><strong>This request was not approved</strong>{r.reviewNotes && <p>{r.reviewNotes}</p>}</div>}
      {r.status === 'Failed' && <p className="enq-error" role="alert">{r.error || 'The design could not be generated.'} Our team can retry it for you.</p>}
      {error && <p className="enq-error" role="alert">{error}</p>}
      <ResultImages images={r.status === 'Completed' ? r.images : []} title={r.projectName} beforeUrl={r.beforeUrl} onExpired={refresh} />
    </article>
  );
}
