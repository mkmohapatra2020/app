// Thin wrapper so every backend service call is consistent:
// JSON in, ApiResponse out, Bearer token attached when signed in.
import { httpClient } from './httpClient.js';
import { backendUrl } from './apiConfig.js';
import { afterLiveCall, mockFor } from '../mocks/mockApi.js';

// The APIM subscription key (VITE_WL_API_KEY) is sent from the browser as the
// Ocp-Apim-Subscription-Key request header on every backend call, in dev and in
// production builds. It is bundled into the site JavaScript, so it is public.
const APIM_KEY = (import.meta.env.VITE_WL_API_KEY || '').trim();
const keyHeader = APIM_KEY ? { 'Ocp-Apim-Subscription-Key': APIM_KEY } : {};

const opts = (o = {}) => ({ auth: true, ...o, headers: { ...keyHeader, ...(o.headers || {}) } });
const pathOf = (ep, arg) => (typeof ep === 'function' ? ep(arg) : ep);

// Endpoints not deployed yet are answered by src/mocks/mockApi.js (see MOCK-APIS.md).
async function call(method, ep, body, { arg, query, ...o } = {}) {
  const path = pathOf(ep, arg);
  const mock = mockFor(method, path);
  if (mock) return mock({ body, query, signal: o.signal });
  const url = backendUrl(ep, arg, query);
  const config = opts(o);
  const res = method === 'GET' ? await httpClient.get(url, config)
    : method === 'DELETE' ? await httpClient.delete(url, config)
      : await httpClient[method.toLowerCase()](url, body, config);
  afterLiveCall(method, path, res);
  return res;
}

export const api = {
  get: (ep, o) => call('GET', ep, undefined, o),
  post: (ep, body, o) => call('POST', ep, body, o),
  put: (ep, body, o) => call('PUT', ep, body, o),
  delete: (ep, o) => call('DELETE', ep, undefined, o),
};

// Map a successful ApiResponse's data through an adapter.
export const mapRes = (res, fn) => (res.success ? { ...res, data: fn(res.data) } : res);
