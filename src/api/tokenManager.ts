/**
 * Access/refresh token lifecycle, shared by the Axios client (src/api) and the fetch
 * client used by the JavaScript services (services/httpClient.js).
 *
 *  - `parseAuthResponse`: validates a login/refresh response (token, refresh token,
 *    UTC expiries, user) — missing, malformed or already-expired values are rejected.
 *  - `refreshSession`: POST /auth/refresh-token { refreshToken }. Single-flight: concurrent
 *    callers share one request. Refresh tokens are single-use, so both tokens are replaced
 *    together, and only after the new response has been validated. Never retried.
 *    401 (or `success: false`) → the session is cleared and AUTH_EXPIRED_EVENT fires.
 *    Network / 5xx failures keep the session (temporary) and are rethrown.
 *  - `getAccessToken`: the token to send, refreshed first when it expires within 30 s.
 *  - `restoreSession`: startup — keep the stored session only while the refresh token is valid.
 *
 * Nothing here logs tokens, and tokens never go into URLs.
 */
import axios from 'axios';
import { API_BASE_URL, apimHeaders } from './config.ts';
import { ApiError, AUTH_EXPIRED_EVENT, field, isApiError, toApiError, unwrapEnvelope } from './errors.ts';
import { session } from '../services/session.js';
import { toUser } from '../services/adapters.js';
import type { AuthUser, RefreshTokenRequest, StoredAuth } from './types.ts';

/** Refresh this long before the access token expires (clock-skew safety window). */
export const REFRESH_WINDOW_MS = 30_000;

/** Bare client for the refresh call: no interceptors, so it never gets a bearer token or a retry. */
export const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...apimHeaders },
});

const SESSION_ENDED = 'Your session has expired. Please sign in again.';
const NOT_AUTHORISED = "You couldn't be authorised for this right now. Please try again.";

/** Development-only note of auth decisions (paths and statuses only — never tokens). */
export function authDebug(...args: unknown[]): void {
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') console.warn('[auth]', ...args);
}
const INCOMPLETE = 'The sign-in response was incomplete. Please try again.';

// ---------- time & JWT helpers ----------
/** UTC epoch ms from an ISO string (no offset ⇒ UTC) or epoch number; 0 when absent/invalid. */
export function toUtcMs(v: unknown): number {
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? (v < 1e12 ? v * 1000 : v) : 0;
  const s = String(v).trim();
  const iso = /([zZ]|[+-]\d\d:?\d\d)$/.test(s) ? s : `${s}Z`;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/** JWT payload, read for display/expiry only — the API is what validates the token. */
export function decodeJwt(token: string | null | undefined): Record<string, unknown> | null {
  const part = token?.split('.')[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const json = decodeURIComponent(Array.from(atob(b64), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
    const claims: unknown = JSON.parse(json);
    return claims && typeof claims === 'object' ? (claims as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
const jwtExpMs = (token: string | null | undefined) => toUtcMs(decodeJwt(token)?.exp);

const ID_CLAIMS = ['sub', 'nameid', 'userId', 'uid', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];

// ---------- parsing ----------
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v));

function buildUser(data: unknown, token: string, fallback: Partial<AuthUser> = {}): AuthUser {
  const raw = field(data, 'user') ?? data;
  const u = toUser((raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>);
  const claims = decodeJwt(token) || {};
  const idFromLogin = Number(field(data, 'id') ?? field(data, 'userId') ?? u.id);
  const idFromJwt = ID_CLAIMS.map((c) => Number(claims[c])).find((n) => Number.isInteger(n) && n > 0);
  const memberships = field(data, 'memberships');
  const role = (u.role || 'user').toLowerCase();
  return {
    id: Number.isInteger(idFromLogin) && idFromLogin > 0 ? idFromLogin : idFromJwt ?? fallback.id ?? null,
    username: text(field(data, 'username')) || fallback.username || '',
    name: text(field(data, 'displayName')) || u.name || fallback.name || '',
    email: u.email || fallback.email || '',
    phone: u.phone || fallback.phone || '',
    city: u.city || fallback.city || '',
    photo: u.photo || fallback.photo || '',
    role,
    isAdmin: u.isAdmin || role.includes('admin') || !!fallback.isAdmin,
    membership: u.membership || fallback.membership || '',
    memberships: Array.isArray(memberships) ? memberships : fallback.memberships ?? [],
  };
}

/**
 * Validates a login / refresh response and returns the record to store.
 * Accepts the `data.token` name (and `accessToken` for compatibility).
 */
export function parseAuthResponse(body: unknown, opts: { requireRefreshToken?: boolean; fallbackUser?: Partial<AuthUser>; now?: number } = {}): StoredAuth {
  const { requireRefreshToken = false, fallbackUser = {}, now = Date.now() } = opts;
  const data = unwrapEnvelope<unknown>(body); // success:false → ApiError (fromEnvelope)
  const token = text(field(data, 'token') ?? field(data, 'accessToken'));
  const refreshToken = text(field(data, 'refreshToken'));
  if (!token || token.split('.').length !== 3) throw new ApiError('server', INCOMPLETE);
  if (requireRefreshToken && !refreshToken) throw new ApiError('server', INCOMPLETE);

  const expiresIn = Number(field(data, 'expiresInSeconds'));
  const accessTokenExpiresAt = toUtcMs(field(data, 'accessTokenExpiresAtUtc'))
    || (Number.isFinite(expiresIn) && expiresIn > 0 ? now + expiresIn * 1000 : 0)
    || jwtExpMs(token);
  const refreshTokenExpiresAt = refreshToken ? toUtcMs(field(data, 'refreshTokenExpiresAtUtc')) : 0;
  if (accessTokenExpiresAt && accessTokenExpiresAt <= now) throw new ApiError('server', INCOMPLETE);
  if (refreshTokenExpiresAt && refreshTokenExpiresAt <= now) throw new ApiError('server', INCOMPLETE);

  return { token, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, user: buildUser(data, token, fallbackUser) };
}

/** Store a validated login / social-sign-in response. */
export function saveAuth(auth: StoredAuth): void {
  session.set(auth);
}

/** Clear every authentication value; `expired` also tells the UI (redirect to /login). */
export function endSession(reason: 'expired' | 'logout' = 'expired'): void {
  const had = !!session.token();
  session.clear(reason);
  if (had && reason === 'expired') window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

// ---------- state checks (UTC ms) ----------
export const accessExpiry = (): number => session.accessExpiresAt() || jwtExpMs(session.token());
export const accessExpired = (now = Date.now()): boolean => { const e = accessExpiry(); return !!e && e <= now; };
export const accessNeedsRefresh = (now = Date.now()): boolean => { const e = accessExpiry(); return !!e && e - REFRESH_WINDOW_MS <= now; };
/** A refresh token is stored and not (about to be) expired. Unknown expiry ⇒ let the server decide. */
export const refreshUsable = (now = Date.now()): boolean => {
  if (!session.refreshToken()) return false;
  const e = session.refreshExpiresAt();
  return !e || e - REFRESH_WINDOW_MS > now;
};

/** The signed-in user's id (from the login response, else the JWT subject). Never from the UI. */
export function currentUserId(): number | null {
  if (!session.token()) return null;
  const fromLogin = Number(session.user()?.id);
  if (Number.isInteger(fromLogin) && fromLogin > 0) return fromLogin;
  const claims = decodeJwt(session.token());
  const fromJwt = ID_CLAIMS.map((c) => Number(claims?.[c])).find((n) => Number.isInteger(n) && n > 0);
  return fromJwt ?? null;
}

// ---------- refresh ----------
let inflight: Promise<string> | null = null;

/** Exchange the refresh token for new tokens. Concurrent callers share one request. */
export function refreshSession(): Promise<string> {
  if (!inflight) inflight = doRefresh().finally(() => { inflight = null; });
  return inflight;
}

async function doRefresh(): Promise<string> {
  const used = session.refreshToken();
  if (!used && session.token() && !accessExpired()) {
    // No refresh token, but the access token is still within its lifetime: a single 401
    // doesn't prove the session is gone, so keep it and report the failure to the caller.
    authDebug('401 without a refresh token — keeping the session (access token not expired)');
    throw new ApiError('unauthorized', NOT_AUTHORISED, 401);
  }
  if (!used || !refreshUsable()) {
    authDebug('no usable refresh token — ending session');
    endSession('expired');
    throw new ApiError('unauthorized', SESSION_ENDED, 401);
  }
  let body: unknown;
  try {
    const req: RefreshTokenRequest = { refreshToken: used };
    body = (await refreshClient.post('/auth/refresh-token', req)).data;
  } catch (e) {
    const err = toApiError(e);
    authDebug('refresh-token failed:', err.status || err.kind);
    if (err.kind === 'unauthorized') { endSession('expired'); throw new ApiError('unauthorized', SESSION_ENDED, 401); }
    throw err; // network / server: temporary — keep the session
  }
  let next: StoredAuth;
  try {
    next = parseAuthResponse(body, { requireRefreshToken: true, fallbackUser: (session.user() || {}) as Partial<AuthUser> });
  } catch (e) {
    authDebug('refresh-token response rejected:', isApiError(e) ? e.message : 'invalid');
    if (isApiError(e) && e.fromEnvelope) { endSession('expired'); throw new ApiError('unauthorized', SESSION_ENDED, 401); }
    throw e;
  }
  // Signed out (or replaced) while the request was in flight: don't resurrect the old session.
  if (session.refreshToken() !== used) {
    const current = session.token();
    if (!current) throw new ApiError('unauthorized', SESSION_ENDED, 401);
    return current;
  }
  session.set(next); // both tokens + expiries in one write
  return next.token;
}

/** Token for an authenticated request, refreshed first when it expires within the safety window. */
export async function getAccessToken(): Promise<string | null> {
  const token = session.token();
  if (!token) return null;
  const now = Date.now();
  if (!accessNeedsRefresh(now)) return token;
  if (refreshUsable(now)) {
    try {
      return await refreshSession();
    } catch (e) {
      if (isApiError(e) && e.kind === 'unauthorized') return null;
      return session.token(); // temporary failure: try with what we have; a 401 will retry the refresh
    }
  }
  if (accessExpired(now)) { endSession('expired'); return null; }
  return token;
}

/** Startup: true when a usable session remains (refreshing first if the access token is stale). */
export async function restoreSession(): Promise<boolean> {
  if (!session.token()) return false;
  const now = Date.now();
  if (session.refreshToken()) {
    const rExp = session.refreshExpiresAt();
    if (rExp && rExp <= now) { endSession('expired'); return false; }
  } else if (accessExpired(now)) {
    endSession('expired');
    return false;
  }
  if (accessNeedsRefresh(now) && session.refreshToken()) {
    try { await refreshSession(); } catch (e) { if (isApiError(e) && e.kind === 'unauthorized') return false; }
  }
  return !!session.token();
}

/** For tests: forget a pending refresh. */
export function _resetRefreshForTests(): void { inflight = null; }

export { NOT_AUTHORISED };
