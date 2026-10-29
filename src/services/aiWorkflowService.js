/**
 * AI visualization draft workflow (AI_VISUALIZATION_UI_IMPLEMENTATION_PROMPT.md).
 *
 *   POST /ai-visualization/drafts                         → { requestId, status, generationMode, remainingQuota, … }
 *   POST /ai-visualization/{id}/site-photo/upload         { fileName, contentType } → SAS, then PUT to Blob
 *   POST /ai-visualization/{id}/reference-image/upload    same
 *   POST /ai-visualization/{id}/submit                    details → { status, remainingQuota }
 *   GET  /ai-visualization/{id}/status | /{id}            polling + results
 *   GET  /ai-visualization/my-history                     (customer from the token)
 *   Admin: /admin/ai-visualizations[...]                  list, detail, approve|submit|request-changes|reject|retry
 *
 * The customer is always derived from the bearer token — no customer id, role or
 * location is sent. SAS URLs live in memory only and are never logged.
 * Mocked until deployed: src/mocks/visualizationWorkflowMock.js (my-history is always live).
 */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { pick, unwrap, unwrapList } from './adapters.js';
import { blobService, putFile } from './blobService.js';

const W = BACKEND_ENDPOINTS.AI_WORKFLOW;
const A = BACKEND_ENDPOINTS.ADMIN_AI_VISUALIZATION;
const str = (v, d = '') => (v === undefined || v === null ? d : String(v));
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

export const ACTIVE_STATUSES = ['Submitted', 'Queued', 'Processing'];
export const STOP_STATUSES = ['Completed', 'Failed', 'Rejected', 'ChangesRequested', 'Cancelled'];
export const ALL_STATUSES = ['Draft', 'Submitted', 'Queued', 'Processing', 'PendingReview', 'ChangesRequested', 'Completed', 'Failed', 'Rejected', 'Cancelled'];

// Status-specific messages from the workflow contract.
export function workflowError(res, fallback = 'Something went wrong. Please try again.') {
  const msg = str(res.errorDetails?.error || res.errorDetails?.message || '').replace(/\s*\(Parameter '[^']*'\)\s*$/, '').slice(0, 300);
  switch (res.status) {
    case 401: return 'Please sign in to continue.';
    case 402: return 'You have no AI design quota remaining. Upgrade your membership or wait for your next allocation.';
    case 403: return 'You do not have permission to view or change this request.';
    case 404: return 'This design request no longer exists. Please start a new one.';
    case 409: return msg || 'This request has already been submitted or is in a different state. Refresh to see its status.';
    case 422: return msg || 'Some details are missing or invalid. Please check the form.';
    case 0: return res.aborted ? 'Cancelled' : 'We could not reach the server. Check your connection and try again.';
    default: return res.status >= 500 ? 'The server had a problem. Please wait a moment, then refresh to check the status before trying again.' : (msg || fallback);
  }
}
const withError = (res) => (res.success ? res : { ...res, error: workflowError(res) });

// Result image: imageUrl/url (SAS links) or aiVisualizationResult.blobUrl / thumbnailUrl from my-history.
const toImage = (i) => ({ order: num(pick(i, 'imageOrder', 'order'), 0), url: str(pick(i, 'imageUrl', 'url', 'blobUri', 'blobUrl', 'thumbnailUrl')), thumb: str(pick(i, 'thumbnailUrl')), expiresOn: str(pick(i, 'expiresOn')) });

/** Maps a request (customer or admin view) to the shape the UI uses. */
export function toRequest(d) {
  const p = unwrap(d) || {};
  const images = unwrapList(pick(p, 'images', 'results', 'generatedImages') || [], 'images').map(toImage).filter((i) => i.url).sort((a, b) => a.order - b.order);
  return {
    id: str(pick(p, 'requestId', 'id')),
    status: str(pick(p, 'status'), 'Draft'),
    mode: str(pick(p, 'generationMode'), 'Auto'),
    projectName: str(pick(p, 'projectName')),
    typeId: num(pick(p, 'visualizationTypeId'), null),
    category: str(pick(p, 'categoryName', 'category')),
    prompt: str(pick(p, 'userPrompt')),
    additionalDetail: str(pick(p, 'additionalDetail')),
    maxBudget: pick(p, 'maxBudget') == null ? null : num(pick(p, 'maxBudget'), null),
    currency: str(pick(p, 'budgetCurrency')),
    details: pick(p, 'details') || {},
    reviewNotes: str(pick(p, 'reviewNotes')),
    sitePhotoCount: num(pick(p, 'sitePhotoCount'), 0),
    referenceCount: num(pick(p, 'referenceImageCount'), 0),
    createdAt: str(pick(p, 'createdDate')),
    submittedAt: str(pick(p, 'submittedDate')),
    completedAt: str(pick(p, 'completedDate')),
    error: str(pick(p, 'errorMessage')),
    images,
    // admin-only extras (absent for customers)
    customer: pick(p, 'customer') || null,
    location: str(pick(p, 'locationSnapshot')),
    computedPrompt: str(pick(p, 'computedPrompt')),
    revisions: pick(p, 'promptRevisions') || [],
    history: pick(p, 'statusHistory') || [],
    quota: pick(p, 'quota') || null,
    sitePhotos: pick(p, 'sitePhotos') || [],
    referenceImages: pick(p, 'referenceImages') || [],
    rejectPolicy: str(pick(p, 'rejectQuotaPolicy')),
  };
}

const toDraft = (d) => {
  const p = unwrap(d) || {};
  return {
    id: str(pick(p, 'requestId')),
    status: str(pick(p, 'status'), 'Draft'),
    mode: str(pick(p, 'generationMode'), 'Auto'),
    remainingQuota: num(pick(p, 'remainingQuota'), null),
    maxReferenceImages: num(pick(p, 'maxReferenceImages'), null),
    maxSitePhotos: num(pick(p, 'maxSitePhotos'), null),
    canChangeMode: pick(p, 'canChangeGenerationMode') !== false,
  };
};

const toSas = (d) => {
  const p = unwrap(d) || {};
  const uri = str(pick(p, 'blobUri'));
  const sas = str(pick(p, 'sasToken')).replace(/^\?/, '');
  return {
    assetId: str(pick(p, 'assetId', 'id')),
    url: uri && sas && !uri.includes('?') ? `${uri}?${sas}` : uri,
    blobName: str(pick(p, 'blobName')),
    expires: Date.parse(str(pick(p, 'expiresOn'))) || Date.now() + 5 * 60 * 1000,
    maxReferenceImages: num(pick(p, 'maxReferenceImages'), null),
  };
};

class AiWorkflowService {
  createDraft({ signal } = {}) { return api.post(W.DRAFTS, {}, { signal }).then((r) => withError(mapRes(r, toDraft))); }

  /**
   * Upload one file: SAS from the API (reused while valid, so a retry does not
   * create a duplicate record), then a direct PUT with progress.
   * @param {{ requestId: string, kind: 'site'|'reference', file: Blob & { name?: string }, sas?: object, onProgress?: Function, signal?: AbortSignal }} a
   * @returns ApiResponse<{ assetId, blobName, sas }> — keep `sas` to retry the PUT.
   */
  async uploadAsset({ requestId, kind, file, sas, onProgress, signal }) {
    let link = sas && sas.expires - 30 * 1000 > Date.now() ? sas : null;
    if (!link) {
      const ep = kind === 'site' ? W.SITE_PHOTO_UPLOAD : W.REFERENCE_UPLOAD;
      const body = { fileName: file.name || `${kind}.jpg`, contentType: file.type || 'image/jpeg', ...(sas?.assetId ? { assetId: sas.assetId } : {}) };
      const r = withError(mapRes(await api.post(ep, body, { arg: requestId, signal }), toSas));
      if (!r.success) return r;
      if (!r.data.url) return { success: false, status: 502, error: 'The upload link could not be created. Please try again.' };
      link = r.data;
    }
    const put = await putFile(link.url, file, { onProgress, signal });
    if (put.aborted) return { success: false, status: 0, aborted: true, error: 'Cancelled', sas: link };
    if (!put.ok) return { success: false, status: put.status, sas: link, error: put.status === 403 ? 'The upload link expired. Tap retry to get a new one.' : 'The upload failed. Tap retry to try again.' };
    return { success: true, status: 201, data: { assetId: link.assetId, blobName: link.blobName, sas: link, maxReferenceImages: link.maxReferenceImages } };
  }

  submit({ requestId, payload, signal }) {
    return api.post(W.SUBMIT, payload, { arg: requestId, signal }).then((r) => withError(mapRes(r, (d) => {
      const p = unwrap(d) || {};
      return { status: str(pick(p, 'status')), mode: str(pick(p, 'generationMode')), remainingQuota: num(pick(p, 'remainingQuota'), null) };
    })));
  }

  status({ id, signal }) { return api.get(W.STATUS, { arg: id, signal }).then((r) => withError(mapRes(r, (d) => { const p = unwrap(d) || {}; return { status: str(pick(p, 'status')), reviewNotes: str(pick(p, 'reviewNotes')) }; }))); }
  detail({ id, signal }) { return api.get(W.BY_ID, { arg: id, signal }).then((r) => withError(mapRes(r, toRequest))); }
  /**
   * GET /ai-visualization/my-history — the signed-in customer's requests (customer from the
   * login token, no customerId). Private Blob result URLs get a read SAS so <img> can show them.
   */
  async myHistory({ signal } = {}) {
    const r = withError(mapRes(await api.get(W.MY_HISTORY, { auth: true, signal }), (d) => unwrapList(d, 'items', 'requests').map(toRequest).filter((x) => x.id)));
    if (!r.success) return r;
    const data = await Promise.all(r.data.map(async (req) => ({
      ...req,
      images: await Promise.all(req.images.map(async (img) => ({ ...img, url: await blobService.displayUrl(img.url, { signal }) }))),
    })));
    return { ...r, data };
  }

  // ---------- admin (backend enforces Role = Admin) ----------
  adminList({ filters = {}, signal } = {}) {
    return api.get(A.LIST, { signal, query: filters }).then((r) => withError(mapRes(r, (d) => {
      const p = unwrap(d) || {};
      return { total: num(pick(p, 'total'), 0), page: num(pick(p, 'page'), 1), pageSize: num(pick(p, 'pageSize'), 25), items: unwrapList(p, 'items').map(toRequest) };
    })));
  }
  adminDetail({ id, signal }) { return api.get(A.BY_ID, { arg: id, signal }).then((r) => withError(mapRes(r, toRequest))); }
  adminAction({ id, action, body = {}, signal }) { return api.post(A.ACTION, body, { arg: { id, action }, signal }).then((r) => withError(mapRes(r, toRequest))); }
}

export const aiWorkflowService = new AiWorkflowService();
export default aiWorkflowService;
