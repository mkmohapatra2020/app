/**
 * Backend AI visualisation + visualizer suggestions.
 *  ai-visualization: upload reference → submit → poll status → fetch result; my requests.
 *  visualizer: upload home photo → generate placement suggestions.
 */
import { api, mapRes } from './backendClient.js';
import { API_CONFIG, BACKEND_ENDPOINTS } from './apiConfig.js';
import { toUploadRef, toVisualization, unwrapList } from './adapters.js';
import { base64ToBlob } from './imageService.js';
import { httpClient } from './httpClient.js';

const A = BACKEND_ENDPOINTS.AI_VISUALIZATION;
const V = BACKEND_ENDPOINTS.VISUALIZER;
const wait = (ms, signal) => new Promise((res, rej) => { const t = setTimeout(res, ms); signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted', 'AbortError')); }, { once: true }); });
const fileForm = (blob, extra = {}) => { const f = new FormData(); f.append('file', blob, 'photo.jpg'); f.append('image', blob, 'photo.jpg'); Object.entries(extra).forEach(([k, v]) => v !== undefined && f.append(k, String(v))); return f; };

class VisualizationService {
  upload({ image, signal }) { return api.post(A.UPLOAD, fileForm(image), { signal, timeout: 60000 }).then((r) => mapRes(r, toUploadRef)); }
  submit({ reference, prompt, spaceType, zones, size, signal }) {
    return api.post(A.SUBMIT, { referenceId: reference.id, uploadId: reference.id, imageUrl: reference.url, prompt, spaceType, zones, size }, { signal }).then((r) => mapRes(r, toVisualization));
  }
  status({ id, signal }) { return api.get(A.STATUS, { arg: id, signal }).then((r) => mapRes(r, toVisualization)); }
  get({ id, signal }) { return api.get(A.BY_ID, { arg: id, signal }).then((r) => mapRes(r, toVisualization)); }
  myRequests({ signal } = {}) { return api.get(A.MY_REQUESTS, { signal }).then((r) => mapRes(r, (d) => unwrapList(d, 'requests', 'visualizations').map(toVisualization).filter((v) => v.id))); }

  /** Full flow → ApiResponse<Blob>. Fails fast (so callers can fall back) if any step is unavailable. */
  async visualize({ image, prompt, spaceType, zones, size, signal }) {
    const up = await this.upload({ image, signal });
    if (!up.success || (!up.data.id && !up.data.url)) return up.success ? { success: false, status: up.status, error: 'Upload did not return a reference.' } : up;
    const sub = await this.submit({ reference: up.data, prompt, spaceType, zones, size, signal });
    if (!sub.success || !sub.data.id) return sub.success ? { success: false, status: sub.status, error: 'Submit did not return a request id.' } : sub;
    let current = sub.data;
    const deadline = Date.now() + API_CONFIG.POLL_MAX_WAIT_MS;
    while (current.status !== 'done') {
      if (current.status === 'error') return { success: false, status: 200, error: current.error || 'The visualisation failed.' };
      if (Date.now() > deadline) return { success: false, status: 0, error: 'This is taking longer than usual. Please try again in a minute.' };
      try { await wait(API_CONFIG.POLL_INTERVAL_MS, signal); } catch { return { success: false, aborted: true, status: 0, error: 'Cancelled' }; }
      const st = await this.status({ id: sub.data.id, signal });
      if (!st.success) return st;
      current = { ...current, ...Object.fromEntries(Object.entries(st.data).filter(([, v]) => v)) };
    }
    const full = (current.image || current.b64) ? { success: true, data: current } : await this.get({ id: sub.data.id, signal });
    if (!full.success) return full;
    const v = full.data;
    if (v.b64) return { success: true, status: 200, data: base64ToBlob(v.b64), meta: v };
    if (!v.image) return { success: false, status: 200, error: 'No image in the visualisation result.' };
    const img = await httpClient.get(v.image, { signal, responseType: 'blob', timeout: 60000 });
    return img.success ? { ...img, meta: v } : img;
  }

  // Visualizer suggestions (text tips for the uploaded space).
  uploadHomePhoto({ image, signal }) { return api.post(V.UPLOAD, fileForm(image), { signal, timeout: 60000 }).then((r) => mapRes(r, toUploadRef)); }
  suggestions({ reference, spaceType, zones, signal }) {
    return api.post(V.GENERATE, { photoId: reference.id, imageUrl: reference.url, spaceType, goals: zones, zones }, { signal }).then((r) => mapRes(r, (d) => toVisualization(d).suggestions));
  }
}
export const visualizationService = new VisualizationService();
export default visualizationService;
