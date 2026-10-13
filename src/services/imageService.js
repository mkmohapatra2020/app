/**
 * Image service — AI image generation and photo edits.
 *  dev (npm run dev): Vite proxy → Azure directly.
 *  production (Netlify): upload → background job → poll for the result.
 * All methods resolve to an ApiResponse whose `data` is an image Blob.
 */
import { httpClient } from './httpClient.js';
import { API_BASE_URLS, API_CONFIG, API_ENDPOINTS, IMAGE_DEPLOYMENT, IS_DEV, buildUrl } from './apiConfig.js';

const E = API_ENDPOINTS.IMAGE;
const url = (endpoint, params) => buildUrl(API_BASE_URLS.API_BASE_URL, endpoint, params);

const wait = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
});

export function base64ToBlob(b64, type = 'image/png') {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type });
}

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1]);
  r.onerror = () => reject(new Error('Could not read the photo.'));
  r.readAsDataURL(blob);
});

// Azure returns { data: [{ b64_json }] } — turn it into an ApiResponse<Blob>.
function fromAzure(res) {
  if (!res.success) return res;
  const b64 = res.data?.data?.[0]?.b64_json;
  if (!b64) return { success: false, status: res.status, error: 'No image came back from the service.' };
  return { success: true, status: res.status, data: base64ToBlob(b64) };
}

class ImageService {
  /** Generate an image from a text prompt. */
  async generate({ prompt, size = '1024x1024', signal }) {
    if (IS_DEV) {
      const res = await httpClient.post(url(E.DEV_GENERATE), { model: IMAGE_DEPLOYMENT, prompt, n: 1, size }, { signal, timeout: API_CONFIG.IMAGE_TIMEOUT_MS });
      return fromAzure(res);
    }
    return this.runJob({ prompt, size, mode: 'generate' }, signal);
  }

  /** Edit a photo (Blob) according to a prompt. */
  async edit({ image, prompt, size = '1536x1024', signal }) {
    if (IS_DEV) {
      const form = new FormData();
      form.append('model', IMAGE_DEPLOYMENT);
      form.append('prompt', prompt);
      form.append('size', size);
      form.append('n', '1');
      form.append('image', image, 'photo.jpg');
      const res = await httpClient.post(url(E.DEV_EDIT), form, { signal, timeout: API_CONFIG.IMAGE_TIMEOUT_MS });
      return fromAzure(res);
    }
    const id = crypto.randomUUID();
    let b64;
    try { b64 = await blobToBase64(image); } catch (err) { return { success: false, status: 0, error: err.message }; }
    const up = await httpClient.post(url(E.UPLOAD_SOURCE), { id, image: b64, type: image.type || 'image/jpeg' }, { signal });
    if (!up.success) return up;
    return this.runJob({ id, prompt, size, mode: 'edit' }, signal);
  }

  /** Start a Netlify background job, then poll until the image is ready. */
  async runJob({ id = crypto.randomUUID(), ...job }, signal) {
    const start = await httpClient.post(url(E.START_JOB), { id, ...job }, { signal });
    if (!start.success) return start;
    return this.pollJob(id, signal);
  }

  async pollJob(id, signal) {
    const deadline = Date.now() + API_CONFIG.POLL_MAX_WAIT_MS;
    while (Date.now() < deadline) {
      try { await wait(API_CONFIG.POLL_INTERVAL_MS, signal); } catch { return { success: false, status: 0, aborted: true, error: 'Cancelled' }; }
      const res = await httpClient.get(url(E.JOB_STATUS, id), { signal });
      if (res.aborted) return res;
      if (res.status === API_CONFIG.STATUS_CODES.ACCEPTED) continue;
      if (res.success && res.data instanceof Blob) return res;
      if (res.success) return { success: false, status: res.status, error: res.data?.error || 'Image generation failed. Please try again.' };
      return res;
    }
    return { success: false, status: 0, error: 'This is taking longer than usual. Please try again in a minute.' };
  }
}

export const imageService = new ImageService();
export default imageService;
