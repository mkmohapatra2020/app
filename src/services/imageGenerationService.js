/**
 * Image Generator — POST /images/generate, GET /images/history, GET /images/quota.
 * In swagger (Images tag). Responses are bare camelCase objects; errors are { error: "message" }.
 *
 * Photo flow (generateFromPhoto):
 *   1. blobService.uploadImage → POST /write-sas-token, then PUT the photo to Blob Storage
 *   2. POST /images/generate  { userId, prompt, style, size } + reference fields (see below)
 *   3. imageUrl → blobService.displayUrl → POST /read-sas-token only if the URL is private
 * generateImageRequest has no image field yet, so the uploaded photo is sent as extra
 * fields (referenceImageBlobName / referenceImageContainerName / referenceImageUrl) that
 * .NET ignores until the backend adds them — see MOCK-APIS.md.
 */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS, ENCRYPTION } from './apiConfig.js';
import { pick, unwrap } from './adapters.js';
import { customerId } from './visualizationService.js';
import { authService } from './authService.js';
import { encryptHybrid } from '../utils/authCrypto.js';
import { blobService } from './blobService.js';

/**
 * @typedef {{ userId: number, prompt: string, style: string, size: string }} GenerateImageRequest
 * @typedef {{ imageId: string, imageUrl: string, remainingQuota: number }} GenerateImageResponse
 * @typedef {{ imageId: string, userId: number, prompt: string, style: string, size: string, imageUrl: string, createdDate: string }} ImageHistoryItem
 * @typedef {{ total: number, items: ImageHistoryItem[] }} ImageHistoryResponse
 * @typedef {{ membership: string, monthlyQuota: number, used: number, remaining: number }} ImageQuotaResponse
 * Service methods resolve to an ApiResponse whose `data` is the mapped shape:
 *   generate → { id, url, remainingQuota }, history → { total, items: [{ id, prompt, style, size, url, createdAt }] },
 *   quota → ImageQuotaResponse.
 */

const E = BACKEND_ENDPOINTS.IMAGES;
const str = (v, d = '') => (v === undefined || v === null ? d : String(v));
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

export const IMAGE_STYLES = ['photorealistic', 'modern', 'rustic', 'minimalist'];
export const IMAGE_SIZES = ['1024x1024', '1536x1024', '1024x1536'];

// Status-specific messages from the image API contract.
function imageError(res) {
  // Strip .NET argument details such as " (Parameter 'request')" before showing it.
  const apiMsg = str(res.errorDetails?.error || res.errorDetails?.message).replace(/\s*\(Parameter '[^']*'\)\s*$/, '').slice(0, 200);
  switch (res.status) {
    case 400: return apiMsg || 'Please check your prompt and try again.';
    case 401: return 'Please sign in to generate images.';
    case 403: return 'Your image-generation quota has been exhausted.';
    case 404: return 'No active membership was found.';
    case 422: return apiMsg || 'The image could not be generated from that prompt.';
    default: return res.status === 0 && res.error ? res.error : 'Something went wrong. Please try again.';
  }
}
const withError = (res) => (res.success ? res : { ...res, error: imageError(res) });

const toItem = (i) => ({
  id: str(pick(i, 'imageId', 'id')),
  prompt: str(pick(i, 'prompt')),
  style: str(pick(i, 'style')),
  size: str(pick(i, 'size')),
  url: str(pick(i, 'imageUrl', 'url')),
  createdAt: str(pick(i, 'createdDate', 'createdAt')),
});

class ImageGenerationService {
  userId() { return customerId(); }

  /** @param {{ prompt: string, style?: string, size?: string, reference?: { blobName: string, container: string, url: string }, signal?: AbortSignal }} a */
  async generate({ prompt, style = 'photorealistic', size = '1024x1024', reference, signal }) {
    const userId = this.userId();
    if (!userId) return { success: false, status: 401, error: imageError({ status: 401 }) };
    if (!String(prompt || '').trim()) return { success: false, status: 400, error: 'Please describe the image you want.' };
    const plain = { userId, prompt, style, size };
    if (reference?.blobName) Object.assign(plain, { referenceImageBlobName: reference.blobName, referenceImageContainerName: reference.container, referenceImageUrl: reference.url });
    let body = plain;
    // Hybrid-encrypted body when enabled (VITE_IMAGE_ENCRYPTION=on). The backend must
    // decrypt { cipherText, encryptedKey, iv, kid, alg } — see MOCK-APIS.md.
    if (ENCRYPTION.IMAGE === 'on') {
      const key = await authService.encryptionKey({ signal });
      if (!key.success || !key.data.n) return { success: false, status: key.status || 0, error: 'Secure image generation is unavailable right now. Please try again shortly.' };
      try { body = await encryptHybrid(key.data, plain); } catch (err) { return { success: false, status: 0, error: err.message }; }
    }
    const res = await api.post(E.GENERATE, body, { signal, timeout: 180000 });
    const r = withError(mapRes(res, (d) => { const p = unwrap(d) || {}; return { id: str(pick(p, 'imageId')), url: str(pick(p, 'imageUrl')), remainingQuota: num(pick(p, 'remainingQuota'), NaN) }; }));
    if (!r.success) return r;
    if (!r.data.url) return { success: false, status: r.status, error: 'No image came back from the service.' };
    // Private blob → one read SAS (cached); already-readable URLs are used as returned.
    return { ...r, data: { ...r.data, url: await blobService.displayUrl(r.data.url, { signal }), rawUrl: r.data.url } };
  }

  /**
   * Upload a photo (once) and generate from it. Pass `reference` from a previous
   * result to retry without uploading again. Resolves to { ...generate data, reference }.
   */
  async generateFromPhoto({ file, prompt, style, size, reference, signal }) {
    let ref = reference;
    if (!ref) {
      const up = await blobService.uploadImage({ file, signal });
      if (!up.success) return up;
      ref = up.data;
    }
    const r = await this.generate({ prompt, style, size, reference: ref, signal });
    return r.success ? { ...r, data: { ...r.data, reference: ref } } : { ...r, reference: ref };
  }

  async history({ signal } = {}) {
    const userId = this.userId();
    if (!userId) return { success: true, status: 200, data: { total: 0, items: [] } };
    const res = await api.get(E.HISTORY, { signal, query: { userId } });
    const r = withError(mapRes(res, (d) => { const p = unwrap(d) || {}; const items = (pick(p, 'items') || []).map(toItem).filter((x) => x.url); return { total: num(pick(p, 'total'), items.length), items }; }));
    if (!r.success) return r;
    // Read SAS only for private items (limited to 4 at a time, cached per blob).
    const items = await Promise.all(r.data.items.map(async (i) => ({ ...i, url: await blobService.displayUrl(i.url, { signal }) })));
    return { ...r, data: { ...r.data, items } };
  }

  async quota({ signal } = {}) {
    const userId = this.userId();
    if (!userId) return { success: false, status: 401, error: imageError({ status: 401 }) };
    const res = await api.get(E.QUOTA, { signal, query: { userId } });
    return withError(mapRes(res, (d) => { const p = unwrap(d) || {}; return { membership: str(pick(p, 'membership')), monthlyQuota: num(pick(p, 'monthlyQuota')), used: num(pick(p, 'used')), remaining: num(pick(p, 'remaining')) }; }));
  }
}

export const imageGenerationService = new ImageGenerationService();
export default imageGenerationService;
