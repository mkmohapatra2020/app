/**
 * Photo edits with a fallback chain:
 *   1. Weekend-Live backend AI visualisation (signed-in users; saved to "My AI designs")
 *   2. Our own Azure image route (Netlify functions / dev proxy)
 * After a backend outage we skip it for a while so visitors don't wait twice.
 */
import { customerId, visualizationService } from './visualizationService.js';
import { imageService } from './imageService.js';
import { VISUALIZATION_TYPES } from './apiConfig.js';

const SKIP_MS = 10 * 60 * 1000;
let backendDownUntil = 0;

/**
 * @param {{ image: Blob, prompt: string, size?: string, category?: string, typeId?: number,
 *           projectName?: string, references?: Blob[], onStage?: Function, signal?: AbortSignal }} a
 */
export async function editPhoto({ image, prompt, size, category, typeId, projectName, references, onStage, signal }) {
  if (customerId() && Date.now() > backendDownUntil) {
    const r = await visualizationService.visualize({
      image, prompt, references, onStage, signal, projectName,
      typeId: typeId ?? VISUALIZATION_TYPES[category] ?? VISUALIZATION_TYPES.outdoor,
    });
    if (r.success || r.aborted) return { ...r, via: 'backend' };
    // Only treat infrastructure failures as an outage (not a single failed design).
    if (!r.requestId || r.status === 0 || r.status >= 500) backendDownUntil = Date.now() + SKIP_MS;
    if (import.meta.env.DEV) console.info('[ai] backend visualisation unavailable, using Azure route:', r.error);
  }
  onStage?.('generating');
  const f = await imageService.edit({ image, prompt, size, signal });
  return { ...f, via: 'azure' };
}

export const aiImageService = { editPhoto, generate: (a) => imageService.generate(a) };
export default aiImageService;
