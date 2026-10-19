// Weekend-Live API proxy for Azure Static Web Apps (same job as
// netlify/functions/wl-api.mjs). The browser calls /api/wl/<path>; this function
// forwards it to the API gateway and adds the APIM subscription key server-side,
// so the key never reaches the browser and no CORS setup is needed.
//
// Static Web App → Settings → Environment variables:
//   WL_API_URL  (optional) default https://appi-wl.azure-api.net/service/api
//   Ocp-Apim-Subscription-Key (or WL_API_KEY)  Azure API Management subscription key
const { app } = require('@azure/functions');

const DEFAULT_URL = 'https://appi-wl.azure-api.net/service/api';
// Linux hosts may turn "-" in setting names into "_", so check both spellings.
const KEY_NAMES = ['Ocp-Apim-Subscription-Key', 'Ocp_Apim_Subscription_Key', 'OCP_APIM_SUBSCRIPTION_KEY', 'WL_API_KEY'];
const apimKey = () => (KEY_NAMES.map((n) => process.env[n]).find(Boolean) || '').trim();
const PASS_REQ = ['authorization', 'content-type', 'accept', 'accept-language', 'ocp-apim-subscription-key'];
const PASS_RES = ['content-type', 'cache-control', 'etag', 'last-modified', 'location'];

app.http('wl', {
  route: 'wl/{*path}',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'],
  authLevel: 'anonymous',
  handler: async (request) => {
    const base = (process.env.WL_API_URL || DEFAULT_URL).replace(/\/$/, '');
    const target = `${base}/${request.params.path || ''}${new URL(request.url).search}`;

    const headers = new Headers();
    PASS_REQ.forEach((h) => { const v = request.headers.get(h); if (v) headers.set(h, v); });
    const key = apimKey();
    if (key) headers.set('Ocp-Apim-Subscription-Key', key);

    const hasBody = !['GET', 'HEAD'].includes(request.method);
    try {
      const res = await fetch(target, { method: request.method, headers, body: hasBody ? await request.arrayBuffer() : undefined, redirect: 'manual' });
      const out = {};
      PASS_RES.forEach((h) => { const v = res.headers.get(h); if (v) out[h] = v; });
      return { status: res.status, headers: out, body: Buffer.from(await res.arrayBuffer()) };
    } catch (err) {
      return { status: 502, jsonBody: { success: false, message: `Could not reach the Weekend-Live API: ${err.message}` } };
    }
  },
});
