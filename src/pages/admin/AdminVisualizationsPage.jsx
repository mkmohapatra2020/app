import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell, { EmptyState, SkeletonGrid } from '../../components/common/PageShell.jsx';
import useApi from '../../hooks/useApi.js';
import useResource from '../../hooks/useResource.js';
import { ALL_STATUSES, aiWorkflowService as W } from '../../services/aiWorkflowService.js';
import { designService } from '../../services/designService.js';
import { ResultImages, StatusChip, fmtMoney, fmtWhen } from '../../features/aiVisualization/RequestCard.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const PAGE_SIZE = 25;
const EMPTY = { status: 'PendingReview', mode: '', visualizationTypeId: '', customer: '', from: '', to: '', failed: '' };

// Which actions apply in which state (the backend enforces this too — 409 otherwise).
const ACTIONS = {
  approve: { label: 'Approve & generate', when: ['PendingReview'], reserves: true },
  submit: { label: 'Edit & submit', when: ['PendingReview', 'ChangesRequested', 'Failed'], reserves: true },
  'request-changes': { label: 'Request changes', when: ['PendingReview'] },
  reject: { label: 'Reject', when: ['PendingReview', 'ChangesRequested'] },
  retry: { label: 'Retry', when: ['Failed'], reserves: true },
};

/**
 * /admin/ai-visualizations — review queue for AI visualization requests.
 * The route is admin-only (RequireAuth admin), and every call is authorised
 * again by the backend; hiding the UI is not the security boundary.
 */
export default function AdminVisualizationsPage() {
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const cats = useResource('design-categories', (a) => designService.categories(a), { fallback: [] });
  const list = useApi((a) => W.adminList(a));
  const load = (f = filters, p = page) => list.execute({ filters: { ...f, failed: f.failed ? 'true' : '', page: p, pageSize: PAGE_SIZE } });
  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const apply = (e) => { e.preventDefault(); setPage(1); load(filters, 1); };
  const data = list.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <PageShell title="AI visualization review" eyebrow="Weekend-Live admin" crumbs={[['/admin', 'Admin'], [null, 'AI visualizations']]}
      actions={<button type="button" className="btn btn-outline btn-small" onClick={() => load()} disabled={list.loading}>↻ Refresh</button>}>
      <form className="card wf-filters" onSubmit={apply}>
        <label className="f-field"><span className="f-label">Status</span>
          <select value={filters.status} onChange={set('status')}><option value="">Any</option>{ALL_STATUSES.filter((s) => s !== 'Draft').map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="f-field"><span className="f-label">Category</span>
          <select value={filters.visualizationTypeId} onChange={set('visualizationTypeId')}><option value="">Any</option>{(cats.data || []).map((c) => <option key={c.id} value={c.typeId}>{c.label}</option>)}</select></label>
        <label className="f-field"><span className="f-label">Mode</span>
          <select value={filters.mode} onChange={set('mode')}><option value="">Any</option><option>Auto</option><option>Manual</option></select></label>
        <label className="f-field"><span className="f-label">Customer</span><input value={filters.customer} onChange={set('customer')} placeholder="Name, email or id" /></label>
        <label className="f-field"><span className="f-label">From</span><input type="date" value={filters.from} onChange={set('from')} /></label>
        <label className="f-field"><span className="f-label">To</span><input type="date" value={filters.to} onChange={set('to')} /></label>
        <label className="f-check"><input type="checkbox" checked={!!filters.failed} onChange={set('failed')} /><span>Failed only</span></label>
        <div className="row-btns"><button type="submit" className="btn btn-primary btn-small">Apply</button><button type="button" className="btn btn-quiet btn-small" onClick={() => { const f = { ...EMPTY, status: '' }; setFilters(f); setPage(1); load(f, 1); }}>Clear</button></div>
      </form>

      {list.error && <p className="f-alert f-alert-error" role="alert">{list.error}</p>}
      {list.loading && !data ? <SkeletonGrid count={3} /> : !data?.items?.length ? <EmptyState icon="🗂️" title="No requests match these filters" /> : (
        <>
          <div className="wf-admin-table-wrap" role="region" aria-label="Requests" tabIndex={0}>
            <table className="wf-admin-table">
              <thead><tr><th>Submitted</th><th>Customer</th><th>Project</th><th>Category</th><th>Mode</th><th>Status</th><th><span className="sr-only">Open</span></th></tr></thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} className={openId === r.id ? 'is-open' : ''}>
                    <td>{fmtWhen(r.submittedAt || r.createdAt)}</td>
                    <td>{r.customer?.name || r.customer?.email || r.customer?.id || '—'}</td>
                    <td>{r.projectName || '—'}</td>
                    <td>{r.category || '—'}</td>
                    <td>{r.mode}</td>
                    <td><StatusChip status={r.status} /></td>
                    <td><button type="button" className="btn btn-outline btn-small" onClick={() => setOpenId(r.id)}>Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="wf-pager">
            <button type="button" className="btn btn-quiet btn-small" disabled={page <= 1 || list.loading} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <span>Page {page} of {pages} · {data.total} requests</span>
            <button type="button" className="btn btn-quiet btn-small" disabled={page >= pages || list.loading} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        </>
      )}

      {openId && <AdminDetail key={openId} id={openId} onClose={() => setOpenId(null)} onChanged={() => load()} />}
      <p className="muted"><Link to="/admin">← Back to admin dashboard</Link></p>
    </PageShell>
  );
}

function AdminDetail({ id, onClose, onChanged }) {
  const detail = useApi((a) => W.adminDetail(a));
  useEffect(() => { detail.execute({ id }); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [confirm, setConfirm] = useState(null); // action key
  const r = detail.data;

  return (
    <section className="card wf-admin-detail" aria-labelledby="wf-admin-h">
      <div className="row-between">
        <h2 id="wf-admin-h">{r?.projectName || 'Request'} {r && <StatusChip status={r.status} />}</h2>
        <button type="button" className="enq-close" aria-label="Close" onClick={onClose}>×</button>
      </div>
      {detail.loading && !r ? <div className="skeleton kpi" /> : detail.error ? <p className="enq-error" role="alert">{detail.error}</p> : r && (
        <>
          <div className="wf-admin-grid">
            <dl className="wf-kv">
              <div><dt>Customer</dt><dd>{[r.customer?.name, r.customer?.email, r.customer?.id && `#${r.customer.id}`].filter(Boolean).join(' · ') || '—'}</dd></div>
              <div><dt>Profile location</dt><dd>{r.location || '—'}</dd></div>
              <div><dt>Category</dt><dd>{r.category || '—'}</dd></div>
              <div><dt>Mode</dt><dd>{r.mode}</dd></div>
              <div><dt>Site photos</dt><dd>{r.sitePhotos.length ? r.sitePhotos.map((p) => p.fileName).join(', ') : r.sitePhotoCount}</dd></div>
              <div><dt>Reference images</dt><dd>{r.referenceImages.length ? r.referenceImages.map((p) => p.fileName).join(', ') : r.referenceCount || '—'}</dd></div>
              <div><dt>Maximum budget</dt><dd>{r.maxBudget ? fmtMoney(r.maxBudget, r.currency) : '—'}</dd></div>
              <div><dt>Quota</dt><dd>{r.quota ? `${r.quota.remaining} remaining · ${r.quota.consumed ? 'charged for this request' : 'not charged yet'}` : '—'}</dd></div>
            </dl>
            <div>
              <h3>Original prompt</h3><p>{r.prompt || '—'}</p>
              {r.additionalDetail && <><h3>Additional detail</h3><p>{r.additionalDetail}</p></>}
              {r.computedPrompt && <><h3>Computed prompt preview</h3><p className="wf-code">{r.computedPrompt}</p></>}
              {r.reviewNotes && <><h3>Review notes</h3><p>{r.reviewNotes}</p></>}
              {r.error && <p className="enq-error">{r.error}</p>}
            </div>
          </div>
          {r.revisions.length > 0 && (
            <details className="wf-details"><summary>Prompt revisions ({r.revisions.length})</summary>
              <ol>{r.revisions.map((v, i) => <li key={i}><small className="muted">{fmtWhen(v.at)} · {v.by}</small><p>{v.userPrompt}</p></li>)}</ol></details>
          )}
          {r.history.length > 0 && (
            <details className="wf-details"><summary>Status history ({r.history.length})</summary>
              <ol className="wf-history">{r.history.map((h, i) => <li key={i}><StatusChip status={h.status} /> <small className="muted">{fmtWhen(h.at)} · {h.by}</small>{h.note && <p>{h.note}</p>}</li>)}</ol></details>
          )}
          <ResultImages images={r.images} title={r.projectName} onExpired={() => detail.execute({ id })} />
          <div className="row-btns wf-actions">
            {Object.entries(ACTIONS).filter(([, a]) => a.when.includes(r.status)).map(([k, a]) => (
              <button key={k} type="button" className={`btn btn-small ${k === 'reject' ? 'btn-quiet' : k === 'approve' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setConfirm(k)}>{a.label}</button>
            ))}
            {!Object.values(ACTIONS).some((a) => a.when.includes(r.status)) && <span className="muted">No actions for a {r.status} request.</span>}
          </div>
        </>
      )}
      {confirm && r && <ActionDialog action={confirm} request={r} onClose={() => setConfirm(null)} onDone={(updated) => { setConfirm(null); detail.execute({ id }); onChanged(); return updated; }} />}
    </section>
  );
}

/** Confirmation dialog with the explanation field each action needs. */
function ActionDialog({ action, request, onClose, onDone }) {
  const ref = useRef(null);
  const run = useApi((a) => W.adminAction(a));
  const { toast } = useToast();
  const [v, setV] = useState({ reviewNotes: '', reason: '', userPrompt: request.prompt, additionalDetail: request.additionalDetail, generationMode: 'Auto' });
  useEffect(() => { ref.current?.showModal(); }, []);
  const a = ACTIONS[action];
  const needs = action === 'request-changes' ? !v.reviewNotes.trim() : action === 'reject' ? !v.reason.trim() : action === 'submit' ? !v.userPrompt.trim() : false;
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const go = async (e) => {
    e.preventDefault();
    if (needs || run.loading) return; // double-click safe
    const body = action === 'request-changes' ? { reviewNotes: v.reviewNotes.trim() }
      : action === 'reject' ? { reason: v.reason.trim() }
        : action === 'submit' ? { userPrompt: v.userPrompt.trim(), additionalDetail: v.additionalDetail, generationMode: v.generationMode } : {};
    const res = await run.execute({ id: request.id, action, body });
    if (res.success) { toast(`${a.label}: done — now ${res.data.status}`); onDone(res.data); }
  };

  return (
    <dialog ref={ref} className="wf-dialog" aria-labelledby="wf-dlg-h" onCancel={(e) => { if (run.loading) e.preventDefault(); else onClose(); }}>
      <form onSubmit={go} className="wf-dialog-body">
        <h2 id="wf-dlg-h">{a.label}?</h2>
        <p className="muted">{request.projectName || 'Request'} · {request.customer?.name || request.customer?.email || ''}</p>
        {a.reserves && <p className="wf-warn" role="note">⚠️ This reserves one quota unit for the customer (if not already charged) and starts model generation.</p>}
        {action === 'submit' && (
          <>
            <label className="f-field"><span className="f-label">Prompt</span><textarea rows={4} value={v.userPrompt} onChange={set('userPrompt')} /></label>
            <label className="f-field"><span className="f-label">Additional detail</span><textarea rows={3} value={v.additionalDetail} onChange={set('additionalDetail')} /></label>
            <label className="f-field"><span className="f-label">Generation mode</span><select value={v.generationMode} onChange={set('generationMode')}><option>Auto</option><option>Manual</option></select></label>
          </>
        )}
        {action === 'request-changes' && <label className="f-field"><span className="f-label">Review notes (shown to the customer)</span><textarea rows={4} value={v.reviewNotes} onChange={set('reviewNotes')} required /></label>}
        {action === 'reject' && (
          <>
            <p className="wf-note">{request.rejectPolicy || 'Quota policy: see the backend configuration.'}</p>
            <label className="f-field"><span className="f-label">Reason (shown to the customer)</span><textarea rows={3} value={v.reason} onChange={set('reason')} required /></label>
          </>
        )}
        {action === 'retry' && <p>The request will be queued again with its current prompt. The customer is not charged twice.</p>}
        {run.error && <p className="enq-error" role="alert">{run.error}</p>}
        <div className="row-btns">
          <button type="button" className="btn btn-quiet" onClick={onClose} disabled={run.loading}>Cancel</button>
          <button type="submit" className={`btn ${action === 'reject' ? 'btn-outline' : 'btn-primary'}`} disabled={needs || run.loading} aria-busy={run.loading}>{run.loading ? 'Working…' : a.label}</button>
        </div>
      </form>
    </dialog>
  );
}
