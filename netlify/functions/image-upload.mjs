// Stores a visitor's photo (base64 JSON, resized in the browser) so the
// background job can send it to Azure for the Outdoor Space Visualizer.
import { getStore } from '@netlify/blobs';
import { STORE_NAME, saveSource } from '../lib/imageJobs.mjs';

export default async (req) => {
  let body = null;
  try { body = await req.json(); } catch { /* handled below */ }
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  return saveSource({ body, store });
};

export const config = {
  path: '/api/upload-image-source',
  method: 'POST',
};
