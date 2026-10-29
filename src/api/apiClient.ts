/**
 * Axios client for the WeekendLive API (through APIM).
 *
 *  - Request interceptor: `Authorization: Bearer <token>` unless `skipAuth` (sign-in /
 *    sign-up / password calls), refreshing first when the access token expires within
 *    30 s; `Content-Type: application/json`; the APIM subscription key.
 *  - Response interceptor: every failure becomes an `ApiError`. On HTTP 401 for a request
 *    that carried a token, the token is refreshed once (shared by concurrent requests) and
 *    the original request — same method, body, headers and options — is retried once.
 *    If the refresh is rejected the session is cleared (AUTH_EXPIRED_EVENT); a 401 on the
 *    retry is returned to the caller without signing out. 403 never triggers a refresh.
 *  - `ApiResponse` envelopes are unwrapped; `success: false` on HTTP 200 is an `ApiError`.
 *
 * Never logs request bodies, tokens or headers.
 */
import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, apimHeaders } from './config.ts';
import { ApiError, isApiError, toApiError, unwrapEnvelope } from './errors.ts';
import { NOT_AUTHORISED, authDebug, getAccessToken, refreshSession } from './tokenManager.ts';
import { session } from '../services/session.js';

export { API_BASE_URL } from './config.ts';
export { AUTH_EXPIRED_EVENT, ApiError, isApiError, toApiError, unwrapEnvelope, field } from './errors.ts';
export type { ApiErrorKind } from './errors.ts';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Send without the Bearer token (sign-in / sign-up calls), and don't treat 401 as an expired session. */
    skipAuth?: boolean;
    /** Internal: this request has already been retried after a token refresh. */
    _authRetried?: boolean;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...apimHeaders },
});

apiClient.interceptors.request.use(async (config) => {
  if (config.skipAuth) {
    config.headers.delete('Authorization');
    return config;
  }
  const token = await getAccessToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  else config.headers.delete('Authorization');
  return config;
});

const bearerOf = (cfg: InternalAxiosRequestConfig): string => String(cfg.headers?.get?.('Authorization') || '').replace(/^Bearer\s+/i, '');

async function retryAfterRefresh(cfg: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const used = bearerOf(cfg);
  // Still 401 with a token that was just refreshed: this endpoint rejects it, but the session
  // itself is valid (the refresh succeeded) — report the error, keep the user signed in.
  if (cfg._authRetried) { authDebug('still 401 after refresh:', cfg.method?.toUpperCase(), cfg.url); throw new ApiError('unauthorized', NOT_AUTHORISED, 401); }
  authDebug('401 from', cfg.method?.toUpperCase(), cfg.url, '— refreshing');
  // Another request may already have refreshed: reuse its token instead of refreshing again.
  const current = session.token();
  const token = current && current !== used ? current : await refreshSession();
  return apiClient.request({ ...cfg, _authRetried: true, headers: cfg.headers.set('Authorization', `Bearer ${token}`) });
}

apiClient.interceptors.response.use(
  (res) => res,
  async (err: unknown) => {
    const error = toApiError(err);
    const cfg = err instanceof AxiosError ? err.config : undefined;
    if (error.kind === 'unauthorized' && cfg && !cfg.skipAuth && bearerOf(cfg)) {
      try {
        return await retryAfterRefresh(cfg);
      } catch (e) {
        throw isApiError(e) ? e : toApiError(e);
      }
    }
    throw error;
  },
);

// ---------- helpers ----------
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.get(url, config);
  return unwrapEnvelope<T>(res.data, res.status);
}
export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.post(url, body, config);
  return unwrapEnvelope<T>(res.data, res.status);
}
export async function apiPatch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.patch(url, body, config);
  return unwrapEnvelope<T>(res.data, res.status);
}

/** Encodes a path segment and rejects empty ids before any request is made. */
export function pathId(id: string | number, label = 'id'): string {
  const s = String(id ?? '').trim();
  if (!s) throw new ApiError('validation', `A ${label} is required.`);
  return encodeURIComponent(s);
}
