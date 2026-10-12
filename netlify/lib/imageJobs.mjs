// Shared logic for the image job functions. Kept free of Netlify imports so it
// can be tested with an in-memory store and a fake fetch.

export const STORE_NAME = 'image-jobs';
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIZES = new Set(['1024x1024', '1536x1024', '1024x1536']);
const MAX_PROMPT = 4000;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export function readConfig(env) {
  let base = 'https://weekend-live-new-resource.services.ai.azure.com';
  try { if (env.AZURE_OPENAI_ENDPOINT) base = new URL(env.AZURE_OPENAI_ENDPOINT).origin; } catch { /* keep default */ }
  return {
    url: `${base}/openai/v1/images/generations`,
    editUrl: `${base}/openai/v1/images/edits`,
    apiKey: (env.AZURE_OPENAI_API_KEY || '').trim(),
    deployment: env.AZURE_IMAGE_DEPLOYMENT || 'gpt-image-2.5-sunburst',
  };
}

export function validateJob(body) {
  const id = String(body?.id || '');
  const prompt = String(body?.prompt || '').trim();
  const size = String(body?.size || '1024x1024');
  if (!ID_RE.test(id)) return { error: 'Invalid job id.' };
  if (!prompt) return { error: 'Prompt is empty.' };
  if (prompt.length > MAX_PROMPT) return { error: 'Prompt is too long.' };
  if (!SIZES.has(size)) return { error: 'Unsupported image size.' };
  return { id, prompt, size, mode: body?.mode === 'edit' ? 'edit' : 'generate' };
}

function friendlyError(status, data) {
  if (status === 429) return 'Too many requests right now — please wait about a minute and try again.';
  if (status === 401 || status === 403) return 'The image service rejected the API key. Check AZURE_OPENAI_API_KEY in Netlify.';
  if (status === 404) return 'Image model not found. Check AZURE_OPENAI_ENDPOINT and AZURE_IMAGE_DEPLOYMENT in Netlify.';
  return data?.error?.message || `Image service returned ${status}.`;
}

// Background step: call Azure and save the result (or the error) in the store.
// Never throws, so Netlify does not retry and bill a second generation.
export async function runJob({ body, store, env, fetchImpl = fetch }) {
  const job = validateJob(body);
  if (job.error) {
    if (ID_RE.test(String(body?.id || ''))) await store.setJSON(`${body.id}.json`, { status: 'error', error: job.error });
    return;
  }
  const { id, prompt, size, mode } = job;
  const cfg = readConfig(env);
  try {
    await store.setJSON(`${id}.json`, { status: 'pending', started: Date.now() });
    if (!cfg.apiKey) throw Object.assign(new Error('AZURE_OPENAI_API_KEY is not set in Netlify environment variables.'), { safe: true });

    let res;
    if (mode === 'edit') {
      const src = await store.get(`${id}.src`, { type: 'arrayBuffer' });
      if (!src) throw Object.assign(new Error('The uploaded photo was not found. Please upload it again.'), { safe: true });
      const srcMeta = await store.get(`${id}.srcmeta`, { type: 'json' });
      const form = new FormData();
      form.append('model', cfg.deployment);
      form.append('prompt', prompt);
      form.append('size', size);
      form.append('n', '1');
      form.append('image', new Blob([src], { type: srcMeta?.type || 'image/jpeg' }), 'photo.jpg');
      res = await fetchImpl(cfg.editUrl, { method: 'POST', headers: { 'api-key': cfg.apiKey }, body: form });
      await Promise.all([store.delete(`${id}.src`), store.delete(`${id}.srcmeta`)]);
    } else {
      res = await fetchImpl(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': cfg.apiKey },
        body: JSON.stringify({ model: cfg.deployment, prompt, n: 1, size }),
      });
    }
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON */ }
    if (!res.ok) throw Object.assign(new Error(friendlyError(res.status, data)), { safe: true });

    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw Object.assign(new Error('No image came back from the service.'), { safe: true });
    const bytes = Buffer.from(b64, 'base64');
    await store.set(`${id}.img`, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    await store.setJSON(`${id}.json`, { status: 'done', type: data.output_format ? `image/${data.output_format}` : 'image/png' });
  } catch (err) {
    console.error('image job failed', id, err);
    await store.setJSON(`${id}.json`, { status: 'error', error: err.safe ? err.message : 'Image generation failed. Please try again.' });
  }
}

// Status step: pending → 202 JSON, error → 200 JSON, done → 200 image bytes.
export async function jobStatus({ id, store }) {
  if (!ID_RE.test(String(id || ''))) return json({ status: 'error', error: 'Invalid job id.' }, 400);
  const meta = await store.get(`${id}.json`, { type: 'json' });
  if (!meta || meta.status === 'pending') return json({ status: 'pending' }, 202);
  if (meta.status === 'error') {
    await store.delete(`${id}.json`);
    return json({ status: 'error', error: meta.error });
  }
  const image = await store.get(`${id}.img`, { type: 'arrayBuffer' });
  if (!image) return json({ status: 'error', error: 'The image has expired. Please generate again.' });
  await Promise.all([store.delete(`${id}.json`), store.delete(`${id}.img`)]);
  return new Response(image, { status: 200, headers: { 'Content-Type': meta.type || 'image/png', 'Cache-Control': 'no-store' } });
}

// Upload step for photo edits: stores the visitor's photo for the background job.
const MAX_UPLOAD = 4 * 1024 * 1024;
export async function saveSource({ body, store }) {
  const id = String(body?.id || '');
  if (!ID_RE.test(id)) return json({ error: { message: 'Invalid job id.' } }, 400);
  const type = body?.type === 'image/png' ? 'image/png' : 'image/jpeg';
  let bytes;
  try { bytes = Buffer.from(String(body?.image || ''), 'base64'); } catch { bytes = Buffer.alloc(0); }
  if (!bytes.length) return json({ error: { message: 'No photo received.' } }, 400);
  if (bytes.length > MAX_UPLOAD) return json({ error: { message: 'Photo is too large — please use one under 4 MB.' } }, 413);
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  if (!isJpeg && !isPng) return json({ error: { message: 'Please upload a JPG or PNG photo.' } }, 415);
  await store.set(`${id}.src`, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  await store.setJSON(`${id}.srcmeta`, { type: isPng ? 'image/png' : type });
  return json({ ok: true });
}
