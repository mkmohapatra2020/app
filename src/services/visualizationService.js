/**
 * Backend AI visualisation (swagger: AiVisualization) + visualizer suggestions.
 *
 *  1. POST /ai-visualization/upload        { fileName, contentType, contentBase64 } → { blobUrl }
 *  2. POST /ai-visualization/submit        { customerId, visualizationTypeId, projectName,
 *                                            userPrompt, systemPrompt, referenceImages[] } → { requestId, status }
 *  3. GET  /ai-visualization/{id}/status   → { status }
 *  4. GET  /ai-visualization/{id}          → aiVisualizationRequest
 *  5. POST /ai-visualization/read-sas-token { blobName } → { blobUri, sasToken }  (private result blobs)
 *     GET  /ai-visualization/my-requests?customerId=
 */
import { api, mapRes } from './backendClient.js';
import { API_CONFIG, BACKEND_ENDPOINTS, VISUALIZATION_TYPES } from './apiConfig.js';
import { toSasUrl, toUploadRef, toVisualization, unwrapList } from './adapters.js';
import { base64ToBlob } from './imageService.js';
import { httpClient } from './httpClient.js';
import { session } from './session.js';

const A = BACKEND_ENDPOINTS.AI_VISUALIZATION;
const V = BACKEND_ENDPOINTS.VISUALIZER;
const wait = (ms, signal) => new Promise((res, rej) => { const t = setTimeout(res, ms); signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted', 'AbortError')); }, { once: true }); });
const fileForm = (blob, extra = {}) => { const f = new FormData(); f.append('file', blob, 'photo.jpg'); f.append('image', blob, 'photo.jpg'); Object.entries(extra).forEach(([k, v]) => v !== undefined && f.append(k, String(v))); return f; };

const SYSTEM_PROMPT = 'You are the Weekend-Live design assistant for homes in Odisha, India. Produce photorealistic, buildable concepts using natural wood, local materials and climate-appropriate details (heat, humidity, monsoon). Keep the existing structure, perspective and lighting of any site photo. No text, logos or watermarks.';

// Blob → base64 (no data: prefix).
const toBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

/** Signed-in customer id (int) — required by submit and my-requests. */
export function customerId() {
  const id = Number(session.user()?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

class VisualizationService {
  async upload({ image, fileName, signal }) {
    const type = image.type || 'image/jpeg';
    const name = fileName || `wl-${Date.now()}.${type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'}`;
    const body = { fileName: name, contentType: type, contentBase64: await toBase64(image) };
    return api.post(A.UPLOAD, body, { signal, timeout: 90000 }).then((r) => mapRes(r, toUploadRef));
  }

  submit({ typeId, projectName, prompt, systemPrompt = SYSTEM_PROMPT, referenceImages = [], signal }) {
    const body = {
      customerId: customerId(),
      visualizationTypeId: typeId ?? VISUALIZATION_TYPES.outdoor,
      projectName: projectName || 'Weekend-Live design',
      userPrompt: prompt,
      systemPrompt,
      referenceImages,
    };
    return api.post(A.SUBMIT, body, { signal }).then((r) => mapRes(r, toVisualization));
  }

  status({ id, signal }) { return api.get(A.STATUS, { arg: id, signal }).then((r) => mapRes(r, toVisualization)); }
  get({ id, signal }) { return api.get(A.BY_ID, { arg: id, signal }).then((r) => mapRes(r, toVisualization)); }
  readSas({ blobName, signal }) { return api.post(A.READ_SAS, { blobName }, { signal }).then((r) => mapRes(r, toSasUrl)); }

  myRequests({ signal } = {}) {
    const id = customerId();
    if (!id) return Promise.resolve({ success: true, status: 200, data: [] });
    return api.get(A.MY_REQUESTS, { signal, query: { customerId: id } })
      .then((r) => mapRes(r, (d) => unwrapList(d, 'requests', 'visualizations').map(toVisualization).filter((v) => v.id)));
  }

  /** A usable URL for a finished request (direct URL, or SAS for a private blob). */
  async resultUrl(v, signal) {
    if (v.image) return v.image;
    if (v.resultBlobName) { const s = await this.readSas({ blobName: v.resultBlobName, signal }); if (s.success && s.data) return s.data; }
    return '';
  }

  /**
   * Full flow → ApiResponse<Blob>. Fails fast (so callers can fall back to the
   * Azure route) if the visitor isn't signed in or any step is unavailable.
   *   onStage('queued' | 'generating' | 'completed' | 'failed', requestId?)
   */
  async visualize({ image, prompt, typeId, projectName, references = [], onStage, signal }) {
    if (!customerId()) return { success: false, status: 401, error: 'Sign in to save designs to your account.' };
    const uploads = await Promise.all([image, ...references].filter(Boolean).map((img) => this.upload({ image: img, signal })));
    const failed = uploads.find((u) => !u.success || !u.data.url);
    if (failed) return failed.success ? { success: false, status: failed.status, error: 'Upload did not return a blob URL.' } : failed;

    const sub = await this.submit({ typeId, projectName, prompt, referenceImages: uploads.map((u) => u.data.url), signal });
    if (!sub.success || !sub.data.id) return sub.success ? { success: false, status: sub.status, error: 'Submit did not return a request id.' } : sub;
    const id = sub.data.id;
    let current = sub.data;
    onStage?.(current.stage || 'queued', id);

    const deadline = Date.now() + API_CONFIG.POLL_MAX_WAIT_MS;
    while (current.status !== 'done') {
      if (current.status === 'error') { onStage?.('failed', id); return { success: false, status: 200, error: current.error || 'The visualisation failed.', requestId: id }; }
      if (Date.now() > deadline) return { success: false, status: 0, error: 'This is taking longer than usual. It will appear in My design requests when ready.', requestId: id };
      try { await wait(API_CONFIG.POLL_INTERVAL_MS, signal); } catch { return { success: false, aborted: true, status: 0, error: 'Cancelled' }; }
      const st = await this.status({ id, signal });
      if (!st.success) return { ...st, requestId: id };
      current = { ...current, ...Object.fromEntries(Object.entries(st.data).filter(([, v]) => v)) };
      if (current.stage) onStage?.(current.stage, id);
    }

    const full = (current.image || current.b64 || current.resultBlobName) ? { success: true, data: current } : await this.get({ id, signal });
    if (!full.success) return { ...full, requestId: id };
    const v = { ...current, ...full.data };
    if (v.b64) return { success: true, status: 200, data: base64ToBlob(v.b64), meta: v };
    const url = await this.resultUrl(v, signal);
    if (!url) return { success: false, status: 200, error: 'The design finished but no image was returned.', requestId: id };
    const img = await httpClient.get(url, { signal, responseType: 'blob', timeout: 60000, auth: false });
    return img.success ? { ...img, meta: { ...v, image: url } } : { ...img, requestId: id };
  }

  // Visualizer suggestions (no request schema in swagger — multipart upload kept).
  uploadHomePhoto({ image, signal }) { return api.post(V.UPLOAD, fileForm(image), { signal, timeout: 60000 }).then((r) => mapRes(r, toUploadRef)); }
  suggestions({ reference, spaceType, zones, signal }) {
    return api.post(V.GENERATE, { photoId: reference.id, imageUrl: reference.url, spaceType, goals: zones, zones }, { signal }).then((r) => mapRes(r, (d) => toVisualization(d).suggestions));
  }
}
export const visualizationService = new VisualizationService();
export default visualizationService;
