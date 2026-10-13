/**
 * Photo edits with a fallback chain:
 *   1. Weekend-Live backend AI visualisation (saved to "My AI designs")
 *   2. Our own Azure image route (Netlify functions / dev proxy)
 * After a backend failure we skip it for a while so visitors don't wait twice.
 */
import { visualizationService } from './visualizationService.js';
import { imageService } from './imageService.js';

const SKIP_MS = 10 * 60 * 1000;
let backendDownUntil = 0;

export async function editPhoto({ image, prompt, size, spaceType, zones, signal }) {
  if (Date.now() > backendDownUntil) {
    const r = await visualizationService.visualize({ image, prompt, size, spaceType, zones, signal });
    if (r.success || r.aborted) return { ...r, via: 'backend' };
    backendDownUntil = Date.now() + SKIP_MS;
    if (import.meta.env.DEV) console.info('[ai] backend visualisation unavailable, using Azure route:', r.error);
  }
  const f = await imageService.edit({ image, prompt, size, signal });
  return { ...f, via: 'azure' };
}

export const aiImageService = { editPhoto, generate: (a) => imageService.generate(a) };
export default aiImageService;
