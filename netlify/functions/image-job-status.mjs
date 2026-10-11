// Returns a job's state: 202 while generating, the image bytes when done,
// or { status: 'error', error } if it failed.
import { getStore } from '@netlify/blobs';
import { STORE_NAME, jobStatus } from '../lib/imageJobs.mjs';

export default async (req, context) => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  return jobStatus({ id: context.params?.id, store });
};

export const config = {
  path: '/api/image-jobs/:id',
  method: 'GET',
};
