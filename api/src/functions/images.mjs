// AI image endpoints for Azure Static Web Apps (same routes and behaviour as the
// Netlify functions in netlify/functions/image-*.mjs):
//   POST /api/upload-image-source   store the visitor's photo for an edit job
//   POST /api/start-image-job       202 at once, generates in the background
//   GET  /api/image-jobs/{id}       202 while pending, image bytes when done
//
// Static Web App → Settings → Environment variables:
//   AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_IMAGE_DEPLOYMENT (optional)
//   AZURE_STORAGE_CONNECTION_STRING  storage account for job state (recommended;
//     without it jobs live in memory and only work while one instance serves them)
import { app } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import { STORE_NAME, jobStatus, runJob, saveSource } from '../lib/imageJobs.mjs';

// Same { get, set, setJSON, delete } shape as a Netlify Blobs store.
function blobStore(connection) {
  const container = BlobServiceClient.fromConnectionString(connection).getContainerClient(STORE_NAME);
  let ready;
  const blob = async (key) => { ready ||= container.createIfNotExists(); await ready; return container.getBlockBlobClient(key); };
  const store = {
    async set(key, data) { await (await blob(key)).uploadData(Buffer.from(data)); },
    setJSON: (key, value) => store.set(key, Buffer.from(JSON.stringify(value))),
    async get(key, { type } = {}) {
      try {
        const buf = await (await blob(key)).downloadToBuffer();
        return type === 'json' ? JSON.parse(buf.toString('utf8')) : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      } catch (err) {
        if (err.statusCode === 404) return null;
        throw err;
      }
    },
    async delete(key) { await (await blob(key)).deleteIfExists(); },
  };
  return store;
}

function memoryStore() {
  const items = new Map();
  return {
    async set(key, data) { items.set(key, Buffer.from(data)); },
    async setJSON(key, value) { items.set(key, Buffer.from(JSON.stringify(value))); },
    async get(key, { type } = {}) {
      const buf = items.get(key);
      if (!buf) return null;
      return type === 'json' ? JSON.parse(buf.toString('utf8')) : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    },
    async delete(key) { items.delete(key); },
  };
}

const conn = (process.env.AZURE_STORAGE_CONNECTION_STRING || '').trim();
const store = conn ? blobStore(conn) : memoryStore();

// Web Response (from imageJobs) → Azure Functions response.
async function toHttp(res) {
  return { status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.from(await res.arrayBuffer()) };
}
const readJson = async (request) => { try { return await request.json(); } catch { return null; } };

app.http('imageUpload', {
  route: 'upload-image-source',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request) => toHttp(await saveSource({ body: await readJson(request), store })),
});

app.http('imageJobStart', {
  route: 'start-image-job',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const body = await readJson(request);
    if (!body) return { status: 400, jsonBody: { error: { message: 'Invalid request.' } } };
    // Mark pending before replying so the first poll never sees an unknown job,
    // then keep generating after the 202 (Static Web Apps cuts requests at ~45 s).
    if (/^[0-9a-f-]{36}$/i.test(String(body.id))) await store.setJSON(`${body.id}.json`, { status: 'pending', started: Date.now() }).catch(() => {});
    runJob({ body, store, env: process.env }).catch((err) => context.error('image job crashed', err));
    return { status: 202, jsonBody: { status: 'pending' } };
  },
});

app.http('imageJobStatus', {
  route: 'image-jobs/{id}',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request) => toHttp(await jobStatus({ id: request.params.id, store })),
});
