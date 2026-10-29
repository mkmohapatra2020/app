// Thin wrapper so every backend service call is consistent:
// JSON in, ApiResponse out, Bearer token attached when signed in.
import { httpClient } from './httpClient.js';
import { MOCK_MODE, backendUrl } from './apiConfig.js';
import { PASS, mockFor } from '../mocks/mockApi.js';
import { learnFallbackFor } from '../mocks/learnMock.js';

// The APIM subscription key (VITE_WL_API_KEY) is sent from the browser as the
// Ocp-Apim-Subscription-Key request header on every backend call, in dev and in
// production builds. It is bundled into the site JavaScript, so it is public.
const APIM_KEY = (import.meta.env.VITE_WL_API_KEY || '').trim();
const keyHeader = APIM_KEY ? { 'Ocp-Apim-Subscription-Key': APIM_KEY } : {};

// Every call sends the login token (Authorization: Bearer …) when the user is signed in.
// Only the sign-in / sign-up / password calls in authService opt out (auth: false).
const opts = (o = {}) => ({ auth: true, ...o, headers: { ...keyHeader, ...(o.headers || {}) } });
const pathOf = (ep, arg) => (typeof ep === 'function' ? ep(arg) : ep);

// Endpoints not deployed yet are answered by src/mocks/mockApi.js (see MOCK-APIS.md).
async function call(method, ep, body, { arg, query, ...o } = {}) {
  const path = pathOf(ep, arg);
  const mock = mockFor(method, path);
  if (mock) {
    const res = await mock({ body, query, signal: o.signal });
    if (res !== PASS) return res; // PASS = not a mocked record → use the real API
  }
  const url = backendUrl(ep, arg, query);
  const config = opts(o);
  const res = method === 'GET' ? await httpClient.get(url, config)
    : method === 'DELETE' ? await httpClient.delete(url, config)
      : await httpClient[method.toLowerCase()](url, body, config);
  // Published-later endpoints (Learning): live first; snapshot only while APIM 404s
  // (and, in local dev, when CORS blocks the browser call).
  if (MOCK_MODE !== 'off' && !res.aborted && (res.status === 404 || (import.meta.env.DEV && res.status === 0))) {
    const fallback = learnFallbackFor(method, path);
    if (fallback) return fallback({ body, query, signal: o.signal });
  }
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
