// Thin wrapper so every backend service call is consistent:
// JSON in, ApiResponse out, Bearer token attached when signed in.
import { httpClient } from './httpClient.js';
import { backendUrl } from './apiConfig.js';

// Local dev can call APIM directly from the browser (VITE_BACKEND_URL +
// VITE_WL_API_KEY in .env.development). Production uses the /wl-api proxy, which
// adds the key on the server — VITE_WL_API_KEY must never be set for builds.
const APIM_KEY = import.meta.env.DEV ? (import.meta.env.VITE_WL_API_KEY || '').trim() : '';
const keyHeader = APIM_KEY ? { 'Ocp-Apim-Subscription-Key': APIM_KEY } : {};

const opts = (o = {}) => ({ auth: true, ...o, headers: { ...keyHeader, ...(o.headers || {}) } });

export const api = {
  get: (ep, { arg, query, ...o } = {}) => httpClient.get(backendUrl(ep, arg, query), opts(o)),
  post: (ep, body, { arg, query, ...o } = {}) => httpClient.post(backendUrl(ep, arg, query), body, opts(o)),
  put: (ep, body, { arg, query, ...o } = {}) => httpClient.put(backendUrl(ep, arg, query), body, opts(o)),
  delete: (ep, { arg, query, ...o } = {}) => httpClient.delete(backendUrl(ep, arg, query), opts(o)),
};

// Map a successful ApiResponse's data through an adapter.
export const mapRes = (res, fn) => (res.success ? { ...res, data: fn(res.data) } : res);
