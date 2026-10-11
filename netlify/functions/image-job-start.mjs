// Background function (runs up to 15 min): generates the image with Azure and
// stores it in Netlify Blobs. The browser gets an immediate 202 and polls
// /api/image-jobs/:id for the result.
import { getStore } from '@netlify/blobs';
import { STORE_NAME, runJob } from '../lib/imageJobs.mjs';

export default async (req) => {
  let body = null;
  try { body = await req.json(); } catch { return; }
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  await runJob({ body, store, env: process.env });
};

export const config = {
  path: '/api/start-image-job',
  method: 'POST',
  background: true,
};
