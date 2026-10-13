/**
 * Centralised HTTP client (Flowerna pattern).
 * Every call resolves to an ApiResponse — it never throws:
 *   { success, status, data, error, errorDetails, aborted }
 *
 * Handles: JSON / FormData / raw bodies, timeouts merged with a caller's
 * AbortSignal, JSON / blob / text responses, and friendly error messages.
 */
import { API_CONFIG, DEFAULT_HEADERS } from './apiConfig.js';
import { session } from './session.js';

const { STATUS_CODES: S } = API_CONFIG;

/** Human-friendly message for common failures. */
export function friendlyError(status, payload) {
  if (status === S.TOO_MANY_REQUESTS) return 'Too many requests right now — please wait about a minute and try again.';
  if (status === S.PAYLOAD_TOO_LARGE) return 'That file is too large. Please use a smaller photo.';
  if (status === 0) return 'Network error — please check your connection and try again.';
  if (status === S.UNAUTHORIZED) return payload?.message || 'Please sign in to continue.';
  if (status === S.FORBIDDEN) return 'You do not have permission to do that.';
  if (status === S.NOT_FOUND && !payload?.message) return 'Not found.';
  if (status >= 500 && !payload?.message) return 'The server had a problem. Please try again shortly.';
  const msg = payload?.error?.message || payload?.message || (typeof payload?.error === 'string' ? payload.error : '');
  return msg || `Request failed (${status}).`;
}

// Combine an optional caller signal with our timeout.
function withTimeout(signal, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), timeout);
  const onAbort = () => controller.abort(signal.reason ?? new DOMException('Aborted', 'AbortError'));
  if (signal) { if (signal.aborted) onAbort(); else signal.addEventListener('abort', onAbort, { once: true }); }
  return { signal: controller.signal, done: () => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); } };
}

class HttpClient {
  /**
   * @param {string} url
   * @param {{ method?: string, body?: any, headers?: object, timeout?: number,
   *           signal?: AbortSignal, responseType?: 'auto'|'json'|'blob'|'text',
   *           rawBody?: boolean, auth?: boolean }} [config]
   *  auth: attach the signed-in user's Bearer token (backend calls).
   */
  async request(url, config = {}) {
    const { method = 'GET', body, headers = {}, timeout = API_CONFIG.TIMEOUT_MS, signal, responseType = 'auto', rawBody = false, auth = false } = config;
    const finalHeaders = { ...DEFAULT_HEADERS };
    const token = auth ? session.token() : null;
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
    Object.assign(finalHeaders, headers); // caller headers win
    let payload = body;
    if (body !== undefined && !rawBody && !(body instanceof FormData) && !(body instanceof Blob)) {
      payload = JSON.stringify(body);
      finalHeaders['Content-Type'] = 'application/json';
    }
    const t = withTimeout(signal, timeout);
    try {
      const res = await fetch(url, { method, headers: finalHeaders, body: payload, signal: t.signal, cache: method === 'GET' ? 'no-store' : undefined });
      // Expired / invalid token: sign out so the UI can ask the user to log in again.
      if (res.status === S.UNAUTHORIZED && token) session.clear('expired');
      return await this.handleResponse(res, responseType);
    } catch (err) {
      if (err?.name === 'AbortError' || signal?.aborted) return { success: false, status: 0, aborted: true, error: 'Cancelled' };
      if (err?.name === 'TimeoutError' || t.signal.reason?.name === 'TimeoutError') return { success: false, status: 0, error: 'The request timed out. Please try again.' };
      return { success: false, status: 0, error: friendlyError(0) };
    } finally {
      t.done();
    }
  }

  async handleResponse(res, responseType) {
    const status = res.status;
    const type = res.headers.get('Content-Type') || '';
    if (!res.ok) {
      let data = null;
      try { data = type.includes('json') ? await res.json() : { message: await res.text() }; } catch { /* empty body */ }
      return { success: false, status, error: friendlyError(status, data), errorDetails: data };
    }
    try {
      const wantBlob = responseType === 'blob' || (responseType === 'auto' && /^(image|video|audio)\/|octet-stream/.test(type));
      if (wantBlob) return { success: true, status, data: await res.blob() };
      if (responseType === 'text') return { success: true, status, data: await res.text() };
      const text = await res.text();
      if (!text) return { success: true, status, data: null };
      try { return { success: true, status, data: JSON.parse(text) }; } catch { return { success: true, status, data: text }; }
    } catch (err) {
      return { success: false, status, error: err?.message || 'Could not read the response.' };
    }
  }

  get(url, config) { return this.request(url, { ...config, method: 'GET' }); }
  post(url, data, config) { return this.request(url, { ...config, method: 'POST', body: data }); }
  put(url, data, config) { return this.request(url, { ...config, method: 'PUT', body: data }); }
  patch(url, data, config) { return this.request(url, { ...config, method: 'PATCH', body: data }); }
  delete(url, config) { return this.request(url, { ...config, method: 'DELETE' }); }
}

export const httpClient = new HttpClient();
export default httpClient;
