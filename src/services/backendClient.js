// Thin wrapper so every backend service call is consistent:
// JSON in, ApiResponse out, Bearer token attached when signed in.
import { httpClient } from './httpClient.js';
import { backendUrl } from './apiConfig.js';

const opts = (o = {}) => ({ auth: true, ...o });

export const api = {
  get: (ep, { arg, query, ...o } = {}) => httpClient.get(backendUrl(ep, arg, query), opts(o)),
  post: (ep, body, { arg, query, ...o } = {}) => httpClient.post(backendUrl(ep, arg, query), body, opts(o)),
  put: (ep, body, { arg, query, ...o } = {}) => httpClient.put(backendUrl(ep, arg, query), body, opts(o)),
  delete: (ep, { arg, query, ...o } = {}) => httpClient.delete(backendUrl(ep, arg, query), opts(o)),
};

// Map a successful ApiResponse's data through an adapter.
export const mapRes = (res, fn) => (res.success ? { ...res, data: fn(res.data) } : res);
