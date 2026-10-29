/**
 * Blob Storage via SAS tokens (swagger tag "File").
 *
 *   POST /write-sas-token  { userId, blobName, containerName, storageType, contentType } → { blobUri, sasToken, blobName, expiresOn }
 *   POST /read-sas-token   { userId, blobName, containerName, storageType }              → { blobUri, sasToken, blobName, expiresOn }
 *   containerName = 'uploaded' | 'aigenerated'; storageType = STORAGE_KIND (apiConfig.js).
 *
 * Used sparingly:
 *  - write: one token per upload, requested only after the file passes local checks;
 *    the photo goes straight to Blob Storage (PUT), never through the API.
 *  - read:  only for blobs that are not already readable, cached per blob until
 *    shortly before `expiresOn`, de-duplicated while in flight, max 4 at a time.
 * The SAS token itself is never logged or stored outside memory.
 *
 * Blob Storage needs a CORS rule allowing PUT/GET from the site origin with the
 * x-ms-blob-type, content-type headers.
 */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS, MAX_UPLOAD_BYTES, STORAGE_KIND, STORAGE_TYPES } from './apiConfig.js';
import { pick, unwrap } from './adapters.js';
import { SESSION_EVENT, session } from './session.js';

// Signed-in user id (int), like visualizationService.customerId (kept local to avoid an import cycle).
const customerId = () => { const id = Number(session.user()?.id); return Number.isInteger(id) && id > 0 ? id : null; };

const F = BACKEND_ENDPOINTS.FILES;
const str = (v) => (v === undefined || v === null ? '' : String(v));
const EARLY = 60 * 1000;          // treat a token as expired 1 min early
const DEFAULT_LIFE = 5 * 60 * 1000; // when the API sends no expiresOn
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const toSas = (d) => {
  const p = unwrap(d) || {};
  const uri = str(pick(p, 'blobUri', 'uri', 'url'));
  const sas = str(pick(p, 'sasToken', 'token')).replace(/^\?/, '');
  const expires = Date.parse(str(pick(p, 'expiresOn', 'expiresAt'))) || Date.now() + DEFAULT_LIFE;
  return { uri, sas, blobName: str(pick(p, 'blobName')), expires, url: uri && sas && !uri.includes('?') ? `${uri}?${sas}` : uri };
};

const MOCK_BLOB_HOST = 'mock-blob.local'; // see src/mocks/visualizationWorkflowMock.js

/**
 * PUT a file straight to Blob Storage with a SAS URL, reporting progress (0–1).
 * Resolves to { ok, status }. Never logs the URL (it contains the SAS).
 */
export function putFile(url, file, { onProgress, signal } = {}) {
  if (url.includes(`//${MOCK_BLOB_HOST}/`)) {
    // Mock upload: no network, simulated progress.
    return new Promise((resolve) => {
      let p = 0;
      const t = setInterval(() => { p = Math.min(1, p + 0.25); onProgress?.(p); if (p >= 1) { clearInterval(t); resolve({ ok: true, status: 201 }); } }, 120);
      signal?.addEventListener('abort', () => { clearInterval(t); resolve({ ok: false, status: 0, aborted: true }); }, { once: true });
    });
  }
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status });
    xhr.onerror = () => resolve({ ok: false, status: 0 });
    xhr.onabort = () => resolve({ ok: false, status: 0, aborted: true });
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

/** True if the URL already carries a SAS (or is a local object URL). */
export const isReadableUrl = (url) => /^(blob:|data:)/.test(url) || /[?&]sig=/.test(url);

/**
 * Split a Blob Storage URL into { container, blobName }.
 * https://acct.blob.core.windows.net/aigenerated/1/2026/10/21/x.png → { 'aigenerated', '1/2026/10/21/x.png' }
 */
export function parseBlobUrl(url) {
  try {
    const u = new URL(url);
    if (!/\.blob\.core\.windows\.net$/i.test(u.hostname)) return null;
    const [container, ...rest] = u.pathname.replace(/^\//, '').split('/');
    return rest.length ? { container: decodeURIComponent(container), blobName: rest.map(decodeURIComponent).join('/') } : null;
  } catch { return null; }
}

// ---------- read-SAS cache + limiter ----------
const readCache = new Map(); // `${container}/${blobName}` → { url, expires }
const inflight = new Map();
let active = 0;
const queue = [];
const limited = (fn) => new Promise((resolve) => {
  const run = async () => { active += 1; try { resolve(await fn()); } finally { active -= 1; queue.shift()?.(); } };
  if (active < 4) run(); else queue.push(run);
});

const ext = (type) => (type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg');
const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '/');

class BlobService {
  /**
   * Upload a photo: local checks → write SAS → PUT to Blob Storage.
   * Resolves to ApiResponse<{ blobName, container, url (no SAS) }>.
   */
  async uploadImage({ file, container = STORAGE_TYPES.UPLOAD, signal }) {
    const userId = customerId();
    if (!userId) return { success: false, status: 401, error: 'Please sign in to upload photos.' };
    const type = file?.type || 'image/jpeg';
    if (!ALLOWED.includes(type)) return { success: false, status: 415, error: 'Please upload a JPG, PNG or WebP photo.' };
    if (!file?.size) return { success: false, status: 400, error: 'That photo is empty. Please choose another one.' };
    if (file.size > MAX_UPLOAD_BYTES) return { success: false, status: 413, error: `Please use a photo under ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.` };

    const suggested = `${userId}/${today()}/${crypto.randomUUID()}.${ext(type)}`;
    const sas = await api.post(F.WRITE_SAS, { userId, blobName: suggested, containerName: container, storageType: STORAGE_KIND, contentType: type }, { signal }).then((r) => mapRes(r, toSas));
    if (!sas.success) return sas;
    if (!sas.data.url || !sas.data.sas) return { success: false, status: 502, error: 'The upload service did not return an upload link. Please try again.' };

    let put;
    try {
      put = await fetch(sas.data.url, { method: 'PUT', body: file, signal, headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': type } });
    } catch (err) {
      if (err?.name === 'AbortError') return { success: false, status: 0, aborted: true, error: 'Cancelled' };
      return { success: false, status: 0, error: 'The photo could not be uploaded. Please check your connection and try again.' };
    }
    if (!put.ok) return { success: false, status: put.status, error: put.status === 403 ? 'The upload link expired. Please try again.' : 'The photo could not be uploaded. Please try again.' };

    const blobName = sas.data.blobName || suggested;
    // The write token is discarded here (it may be write-only); previews use the local file.
    return { success: true, status: 200, data: { blobName, container, url: sas.data.uri } };
  }

  /** Read SAS for one blob, cached until it is about to expire. */
  async readUrl({ blobName, container = STORAGE_TYPES.GENERATED, signal }) {
    const userId = customerId();
    const key = `${container}/${blobName}`;
    const hit = readCache.get(key);
    if (hit && hit.expires > Date.now()) return { success: true, status: 200, data: hit.url };
    if (inflight.has(key)) return inflight.get(key);
    const p = limited(() => api.post(F.READ_SAS, { userId, blobName, containerName: container, storageType: STORAGE_KIND }, { signal }).then((r) => mapRes(r, toSas)))
      .then((r) => {
        if (!r.success) return r;
        if (!r.data.url) return { success: false, status: 502, error: 'The image link could not be created.' };
        readCache.set(key, { url: r.data.url, expires: r.data.expires - EARLY });
        return { ...r, data: r.data.url };
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  }

  /**
   * A URL the browser can display. Uses the URL as-is when it already has a SAS
   * (or is not a Blob Storage URL); otherwise asks /read-sas-token once.
   */
  async displayUrl(url, { signal } = {}) {
    if (!url || isReadableUrl(url)) return url;
    const parsed = parseBlobUrl(url);
    if (!parsed) return url;
    const r = await this.readUrl({ ...parsed, signal });
    return r.success ? r.data : url;
  }

  /** Forget cached read links (e.g. on sign-out). */
  clear() { readCache.clear(); }
}

export const blobService = new BlobService();
// Read links are per user: drop them on sign-in / sign-out.
if (typeof window !== 'undefined') window.addEventListener(SESSION_EVENT, () => blobService.clear());
export default blobService;
