// Weekend-Live API proxy (production).
// The browser calls /wl-api/<path> on this site; this function forwards the
// request to the API gateway and adds the APIM subscription key server-side,
// so the key never reaches the browser and no CORS setup is needed.
//
// Netlify environment variables:
//   WL_API_URL  (optional) default https://appi-wl.azure-api.net/service/api
//   WL_API_KEY  (optional) Azure API Management subscription key
const DEFAULT_URL = 'https://appi-wl.azure-api.net/service/api';
const PASS_REQ = ['authorization', 'content-type', 'accept', 'accept-language', 'ocp-apim-subscription-key'];
const PASS_RES = ['content-type', 'cache-control', 'etag', 'last-modified', 'location'];

export default async (req) => {
  const base = (process.env.WL_API_URL || DEFAULT_URL).replace(/\/$/, '');
  const url = new URL(req.url);
  const target = base + url.pathname.replace(/^\/wl-api/, '') + url.search;

  const headers = new Headers();
  PASS_REQ.forEach((h) => { const v = req.headers.get(h); if (v) headers.set(h, v); });
  if (process.env.WL_API_KEY) headers.set('Ocp-Apim-Subscription-Key', process.env.WL_API_KEY);

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  try {
    const res = await fetch(target, { method: req.method, headers, body: hasBody ? await req.arrayBuffer() : undefined, redirect: 'manual' });
    const out = new Headers();
    PASS_RES.forEach((h) => { const v = res.headers.get(h); if (v) out.set(h, v); });
    return new Response(res.body, { status: res.status, headers: out });
  } catch (err) {
    return Response.json({ success: false, message: `Could not reach the Weekend-Live API: ${err.message}` }, { status: 502 });
  }
};

export const config = { path: '/wl-api/*' };
