// Generates an image from a prompt. The Azure key never reaches the browser:
// in dev the Vite proxy adds it; on Netlify the background function does.
/* global __IMAGE_DEPLOYMENT__ */

const POLL_MS = 3000;
const MAX_WAIT_MS = 4 * 60 * 1000;

const wait = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
});

async function errorFrom(res) {
  let data = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (res.status === 429) return new Error('Too many requests right now — please wait about a minute and try again.');
  return new Error(data?.error?.message || data?.error || `Image service returned ${res.status} ${res.statusText}`);
}

function blobFromResponseJson(data) {
  const item = data?.data?.[0];
  if (!item?.b64_json) throw new Error('No image came back from the service.');
  const bytes = Uint8Array.from(atob(item.b64_json), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: 'image/png' });
}

// Local dev (npm run dev): the Vite proxy adds the key and waits for Azure.
async function generateViaDevProxy({ prompt, size, signal }) {
  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: __IMAGE_DEPLOYMENT__, prompt, n: 1, size }),
    signal,
  });
  if (!res.ok) throw await errorFrom(res);
  return blobFromResponseJson(await res.json());
}

// Deployed (Netlify): start a background job, then poll until the image is ready.
// Normal functions are cut off at ~30 s; image generation can take 25–80 s.
async function generateViaNetlifyJob({ prompt, size, signal }) {
  const id = crypto.randomUUID();
  const start = await fetch('/api/start-image-job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, prompt, size }),
    signal,
  });
  if (start.status !== 202 && !start.ok) throw await errorFrom(start);

  return pollJob(id, signal);
}

// Shared poller for Netlify background jobs.
async function pollJob(id, signal) {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await wait(POLL_MS, signal);
    const res = await fetch(`/api/image-jobs/${id}`, { cache: 'no-store', signal });
    if (res.status === 202) continue;
    const type = res.headers.get('Content-Type') || '';
    if (res.ok && type.startsWith('image/')) return res.blob();
    if (!res.ok) throw await errorFrom(res);
    const data = await res.json();
    throw new Error(data?.error || 'Image generation failed. Please try again.');
  }
  throw new Error('This is taking longer than usual. Please try again in a minute.');
}

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1]);
  r.onerror = () => reject(new Error('Could not read the photo.'));
  r.readAsDataURL(blob);
});

// Edit a photo (Outdoor Space Visualizer). `image` is a JPEG/PNG Blob.
export async function editImage({ image, prompt, size = '1536x1024', signal }) {
  if (import.meta.env.DEV) {
    const form = new FormData();
    form.append('model', __IMAGE_DEPLOYMENT__);
    form.append('prompt', prompt);
    form.append('size', size);
    form.append('n', '1');
    form.append('image', image, 'photo.jpg');
    const res = await fetch('/api/edit-image', { method: 'POST', body: form, signal });
    if (!res.ok) throw await errorFrom(res);
    return blobFromResponseJson(await res.json());
  }
  const id = crypto.randomUUID();
  const up = await fetch('/api/upload-image-source', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, image: await blobToBase64(image), type: image.type || 'image/jpeg' }),
    signal,
  });
  if (!up.ok) throw await errorFrom(up);
  const start = await fetch('/api/start-image-job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, prompt, size, mode: 'edit' }),
    signal,
  });
  if (start.status !== 202 && !start.ok) throw await errorFrom(start);
  return pollJob(id, signal);
}

export async function generateImage({ prompt, size = '1024x1024', signal }) {
  return import.meta.env.DEV
    ? generateViaDevProxy({ prompt, size, signal })
    : generateViaNetlifyJob({ prompt, size, signal });
}

export function filenameFromPrompt(prompt) {
  const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  return `${slug || 'weekend-live-image'}.png`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
