/**
 * AI Design Studio requests for this browser session.
 * Kept in a module-level store so requests keep running (and stay visible)
 * when the visitor moves to another page and comes back.
 *
 * Status flow: submitted → queued → generating → completed | failed
 */
import { useSyncExternalStore } from 'react';
import { editPhoto } from '../../services/aiImageService.js';

let requests = [];
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const patch = (id, change) => { requests = requests.map((r) => (r.id === id ? { ...r, ...change } : r)); emit(); };

export function useStudioRequests() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => requests);
}

export function removeRequest(id) {
  const r = requests.find((x) => x.id === id);
  r?.controller?.abort();
  requests = requests.filter((x) => x.id !== id);
  emit();
}

function buildPrompt({ category, notes, refCount, hasSite }) {
  const base = hasSite
    ? `Edit this photo of a real space in Odisha, India to show a Weekend-Live design concept: ${category.prompt}. Keep the existing walls, floor, buildings, perspective and lighting exactly as they are; add new elements at realistic scale.`
    : `Create a design concept based on this reference image: ${category.prompt}.`;
  const refs = refCount ? ` The client supplied ${refCount} reference image${refCount > 1 ? 's' : ''} for style: use natural wood, warm earthy tones and craftsmanship in keeping with them.` : '';
  const extra = notes ? ` Client notes: ${notes.slice(0, 400)}.` : '';
  return `${base}${refs}${extra} Use materials suited to a hot, humid, monsoon climate. Photorealistic, no text or watermarks.`;
}

// Server errors can be raw HTML or stack traces — never show those to visitors.
const friendly = (e) => (!e || /<[a-z!]/i.test(e) || e.length > 220
  ? 'Our design service is busy right now. Please try again in a few minutes, or ask the team for a hand-drawn concept.'
  : e);

/** Create a request and start it. sitePhotos / refPhotos come from preparePhoto(). */
export function submitDesign({ category, sitePhotos, refPhotos, notes }) {
  const id = `req-${Date.now().toString(36)}`;
  const controller = new AbortController();
  const source = sitePhotos[0] || refPhotos[0];
  requests = [{
    id, category, notes, controller,
    sitePhotos: sitePhotos.map((p) => p.url), refPhotos: refPhotos.map((p) => p.url),
    original: source.url, aspect: source.aspect,
    status: 'submitted', createdAt: new Date().toISOString(), times: { submitted: Date.now() },
  }, ...requests];
  emit();

  (async () => {
    const { signal } = controller;
    const stamp = (status) => patch(id, { status, times: { ...requests.find((r) => r.id === id)?.times, [status]: Date.now() } });
    await new Promise((r) => setTimeout(r, 400));
    stamp('queued');
    const prompt = buildPrompt({ category, notes, refCount: refPhotos.length, hasSite: !!sitePhotos.length });
    const references = refPhotos.slice(sitePhotos.length ? 0 : 1).map((p) => p.blob);
    let last = 'queued';
    const onStage = (stage, requestId) => {
      if (requestId) patch(id, { backendId: requestId });
      // Only move forward through the timeline; completed/failed are set below.
      const order = ['submitted', 'queued', 'generating'];
      if (order.indexOf(stage) > order.indexOf(last)) { last = stage; stamp(stage); }
    };
    const res = await editPhoto({
      image: source.blob, prompt, size: source.size, references, onStage, signal,
      category: category.id, projectName: `${category.label} — Design Studio`,
    });
    if (res.aborted || signal.aborted) return;
    if (res.success) {
      patch(id, { result: URL.createObjectURL(res.data), prompt, savedToAccount: res.via === 'backend' });
      stamp('completed');
    } else {
      patch(id, { error: friendly(res.error) });
      stamp('failed');
    }
  })();
  return id;
}
