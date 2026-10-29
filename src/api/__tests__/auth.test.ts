/**
 * Token lifecycle: login, header injection, proactive + 401 refresh, concurrency,
 * rotation, failure handling, logout, and user-scoped requests.
 * The network is replaced by Axios adapters / a fetch stub — nothing leaves the test.
 */
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../apiClient.ts';
import { AUTH_EXPIRED_EVENT, ApiError } from '../errors.ts';
import { login, logout } from '../authApi.ts';
import { _resetRefreshForTests, refreshClient, restoreSession } from '../tokenManager.ts';
import { membershipApi } from '../membershipApi.ts';
import { imageApi } from '../imageApi.ts';
import { aiVisualizationApi } from '../aiVisualizationApi.ts';
import { session } from '../../services/session.js';
import { httpClient } from '../../services/httpClient.js';

// ---------- helpers ----------
const b64u = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = (claims: object) => `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u(claims)}.signature`;
const inSec = (s: number) => new Date(Date.now() + s * 1000).toISOString();

interface Call { url: string; method: string; auth: string | null; body: unknown; params: unknown }
type Reply = { status: number; data: unknown } | Error;
type Handler = (c: Call) => Reply | Promise<Reply>;

function stub(client: { defaults: { adapter?: unknown } }, handler: Handler, calls: Call[]) {
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    let body: unknown = config.data;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /* raw */ } }
    const auth = config.headers.get('Authorization');
    const call: Call = { url: String(config.url), method: String(config.method).toUpperCase(), auth: auth ? String(auth) : null, body, params: config.params ?? null };
    calls.push(call);
    const r = await handler(call);
    if (r instanceof Error) throw new AxiosError(r.message, 'ERR_NETWORK', config);
    if (r.status >= 400) throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, {}, { status: r.status, statusText: '', headers: {}, config, data: r.data });
    return { data: r.data, status: r.status, statusText: 'OK', headers: {}, config };
  };
  client.defaults.adapter = adapter;
}

let api: Call[];
let refreshCalls: Call[];

/** A signed-in session: access token valid for `accessIn` s, refresh token for `refreshIn` s. */
function signIn({ accessIn = 3600, refreshIn = 86400, id = 42, token = 'A1', refreshToken = 'R1' } = {}) {
  session.set({
    token: jwt({ sub: String(id), tag: token, exp: Math.floor(Date.now() / 1000) + accessIn }),
    refreshToken,
    accessTokenExpiresAt: Date.now() + accessIn * 1000,
    refreshTokenExpiresAt: Date.now() + refreshIn * 1000,
    user: { id, name: 'Test User', email: 'test@example.test' },
  });
}
const tagOf = (auth: string | null) => (auth ? JSON.parse(atob(auth.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).tag : null);

/** Refresh endpoint that rotates R<n> → R<n+1> and returns access token A<n+1>. */
function rotatingRefresh(opts: { delayMs?: number } = {}): Handler {
  let n = 1;
  return async (c) => {
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    const body = c.body as { refreshToken: string };
    if (body.refreshToken !== `R${n}`) return { status: 401, data: { Success: false, Message: 'Invalid or expired refresh token' } };
    n += 1;
    return { status: 200, data: { success: true, data: {
      token: jwt({ sub: '42', tag: `A${n}`, exp: Math.floor(Date.now() / 1000) + 3600 }),
      refreshToken: `R${n}`, accessTokenExpiresAtUtc: inSec(3600), refreshTokenExpiresAtUtc: inSec(86400), id: 42,
    } } };
  };
}

beforeEach(() => {
  api = [];
  refreshCalls = [];
  _resetRefreshForTests();
  stub(apiClient, () => ({ status: 200, data: { success: true, data: { ok: true } } }), api);
  stub(refreshClient, rotatingRefresh(), refreshCalls);
});
afterEach(() => { vi.useRealTimers(); });

// ---------- login ----------
describe('login', () => {
  // One key pair for the suite: the app caches the public key for 10 minutes, like in production.
  let keys: CryptoKeyPair;
  beforeAll(async () => {
    keys = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
  });
  const loginServer = (reply: (creds: Record<string, string>) => Reply): Handler => async (c) => {
    if (c.url === '/auth/encryption-key') {
      const jwk = await crypto.subtle.exportKey('jwk', keys.publicKey);
      return { status: 200, data: { Kty: 'RSA', N: jwk.n, E: jwk.e } };
    }
    if (c.url === '/auth/login') {
      const cipher = Uint8Array.from(atob((c.body as { cipherText: string }).cipherText), (ch) => ch.charCodeAt(0));
      const plain = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, keys.privateKey, cipher));
      return reply(JSON.parse(plain));
    }
    return { status: 200, data: {} };
  };

  it('encrypts the credentials and stores the complete response', async () => {
    stub(apiClient, loginServer((creds) => (creds.password === 'Test-pass-1'
      ? { status: 200, data: { success: true, data: {
        token: jwt({ sub: '123', exp: Math.floor(Date.now() / 1000) + 3600 }), refreshToken: 'R-login',
        accessTokenExpiresAtUtc: inSec(3600), refreshTokenExpiresAtUtc: inSec(30 * 86400), expiresInSeconds: 3600,
        id: 123, username: 'example', email: 'user@example.test', displayName: 'Example User', memberships: [{ planCode: 'MAKER' }],
      } } }
      : { status: 401, data: {} })), api);

    const s = await login({ usernameOrEmail: 'user@example.test', password: 'Test-pass-1' });

    expect(s.user).toMatchObject({ id: 123, username: 'example', name: 'Example User', email: 'user@example.test' });
    const stored = session.get()!;
    expect(stored.refreshToken).toBe('R-login');
    expect(stored.accessTokenExpiresAt).toBeGreaterThan(Date.now());
    expect(stored.refreshTokenExpiresAt).toBeGreaterThan(Date.now() + 29 * 86400_000);
    // Only cipherText is sent; no bearer token on the auth endpoints.
    const loginCall = api.find((c) => c.url === '/auth/login')!;
    expect(Object.keys(loginCall.body as object)).toEqual(['cipherText']);
    expect(JSON.stringify(loginCall.body)).not.toContain('Test-pass-1');
    expect(api.every((c) => c.auth === null)).toBe(true);
    expect(localStorage.getItem('wl-session')).toBeNull();
  });

  it('validates required fields before any request', async () => {
    await expect(login({ usernameOrEmail: ' ', password: '' })).rejects.toMatchObject({ kind: 'validation', fieldErrors: { usernameOrEmail: expect.any(Array), password: expect.any(Array) } });
    expect(api).toHaveLength(0);
  });

  it('fails on wrong credentials and stores nothing', async () => {
    stub(apiClient, loginServer(() => ({ status: 200, data: { Success: false, Message: 'Invalid email or password.' } })), api);
    await expect(login({ usernameOrEmail: 'user@example.test', password: 'wrong' })).rejects.toMatchObject({ kind: 'validation', message: 'Invalid email or password.' });
    expect(session.get()).toBeNull();
  });

  it('treats an incomplete or already-expired response as a failure', async () => {
    stub(apiClient, loginServer(() => ({ status: 200, data: { success: true, data: { refreshToken: 'R' } } })), api);
    await expect(login({ usernameOrEmail: 'u', password: 'p' })).rejects.toBeInstanceOf(ApiError);
    stub(apiClient, loginServer(() => ({ status: 200, data: { success: true, data: { token: jwt({ sub: '1' }), accessTokenExpiresAtUtc: inSec(-60) } } })), api);
    await expect(login({ usernameOrEmail: 'u', password: 'p' })).rejects.toBeInstanceOf(ApiError);
    expect(session.get()).toBeNull();
  });
});

// ---------- requests ----------
describe('authenticated requests', () => {
  it('adds the bearer token to protected calls', async () => {
    signIn();
    await membershipApi.myCredits();
    expect(tagOf(api[0].auth)).toBe('A1');
    expect(refreshCalls).toHaveLength(0);
  });

  it('refreshes before the request when the access token expires within 30 s', async () => {
    signIn({ accessIn: 10 });
    await membershipApi.myCredits();
    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0].auth).toBeNull(); // refresh request carries no bearer token
    expect(tagOf(api[0].auth)).toBe('A2');
    expect(session.refreshToken()).toBe('R2'); // rotated
  });

  it('refreshes once after a 401 and retries the original request with the same body', async () => {
    signIn();
    stub(apiClient, (c) => (tagOf(c.auth) === 'A1' ? { status: 401, data: {} } : { status: 200, data: { requestId: 'x', status: 'Submitted' } }), api);
    const r = await aiVisualizationApi.submit({ visualizationTypeId: 3, projectName: 'Deck', userPrompt: 'teak deck' });
    expect(r).toMatchObject({ requestId: 'x' });
    expect(refreshCalls).toHaveLength(1);
    expect(api).toHaveLength(2);
    expect(api[1]).toMatchObject({ method: 'POST', url: '/ai-visualization/submit' });
    expect(api[1].body).toEqual(api[0].body);
    expect(tagOf(api[1].auth)).toBe('A2');
  });

  it('shares one refresh between concurrent 401s', async () => {
    signIn();
    stub(refreshClient, rotatingRefresh({ delayMs: 20 }), refreshCalls);
    stub(apiClient, (c) => (tagOf(c.auth) === 'A1' ? { status: 401, data: {} } : { status: 200, data: { ok: true } }), api);
    await Promise.all([membershipApi.myCredits(), membershipApi.myBenefits(), membershipApi.myEntitlements()]);
    expect(refreshCalls).toHaveLength(1);
    expect(api.filter((c) => tagOf(c.auth) === 'A2')).toHaveLength(3);
  });

  it('replaces both tokens on a successful refresh', async () => {
    signIn({ accessIn: 5 });
    await membershipApi.myCredits();
    const s = session.get()!;
    expect(tagOf(`Bearer ${s.token}`)).toBe('A2');
    expect(s.refreshToken).toBe('R2');
    expect(s.user).toMatchObject({ id: 42, name: 'Test User' }); // user kept
  });

  it('clears the session and reports expiry when the refresh is rejected — no loop', async () => {
    signIn({ refreshToken: 'stale' });
    stub(apiClient, () => ({ status: 401, data: {} }), api);
    const expired = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, expired);
    await expect(membershipApi.myCredits()).rejects.toMatchObject({ kind: 'unauthorized' });
    window.removeEventListener(AUTH_EXPIRED_EVENT, expired);
    expect(refreshCalls).toHaveLength(1);
    expect(api).toHaveLength(1);
    expect(session.get()).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when an endpoint still answers 401 after a successful refresh (no loop)', async () => {
    signIn();
    stub(apiClient, () => ({ status: 401, data: {} }), api);
    await expect(membershipApi.myCredits()).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(refreshCalls).toHaveLength(1);
    expect(api).toHaveLength(2);
    expect(session.refreshToken()).toBe('R2'); // refreshed, still signed in
  });

  it('keeps a valid session on a 401 when no refresh token was issued', async () => {
    signIn({ refreshToken: '' });
    stub(apiClient, () => ({ status: 401, data: {} }), api);
    await expect(membershipApi.myCredits()).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(refreshCalls).toHaveLength(0);
    expect(session.token()).not.toBeNull();
  });

  it('ends the session on a 401 when there is no refresh token and the access token has expired', async () => {
    signIn({ refreshToken: '', accessIn: -5 });
    await membershipApi.myCredits().catch(() => {});
    expect(session.get()).toBeNull(); // ended before the request
    expect(api[0]?.auth ?? null).toBeNull(); // the expired token is not sent
  });

  it('keeps the session on a temporary network failure during refresh', async () => {
    signIn();
    stub(refreshClient, () => new Error('offline'), refreshCalls);
    stub(apiClient, () => ({ status: 401, data: {} }), api);
    await expect(membershipApi.myCredits()).rejects.toMatchObject({ kind: 'network' });
    expect(session.token()).not.toBeNull();
  });

  it('does not refresh on 403', async () => {
    signIn();
    stub(apiClient, () => ({ status: 403, data: { error: 'Forbidden' } }), api);
    await expect(membershipApi.myBenefits()).rejects.toMatchObject({ kind: 'forbidden' });
    expect(refreshCalls).toHaveLength(0);
    expect(session.token()).not.toBeNull();
  });

  it('uses the signed-in identity for user-scoped requests, ignoring ids from the UI', async () => {
    signIn({ id: 42 });
    await imageApi.history();
    await aiVisualizationApi.submit({ visualizationTypeId: 1, projectName: 'P', userPrompt: 'x', customerId: 999 } as never);
    expect(api[0].params).toEqual({ userId: 42 });
    expect(api[1].body).toMatchObject({ customerId: 42 });
    expect(api.every((c) => tagOf(c.auth) === 'A1')).toBe(true);
  });

  it('sends no bearer token on the public auth endpoints', async () => {
    signIn();
    await apiClient.get('/auth/encryption-key', { skipAuth: true });
    expect(api[0].auth).toBeNull();
  });
});

// ---------- startup & logout ----------
describe('session restore and logout', () => {
  it('keeps nothing when the refresh token has expired', async () => {
    signIn({ accessIn: -60, refreshIn: -1 });
    expect(await restoreSession()).toBe(false);
    expect(session.get()).toBeNull();
    expect(refreshCalls).toHaveLength(0);
  });

  it('refreshes on startup when the access token expired but the refresh token is valid', async () => {
    signIn({ accessIn: -60 });
    expect(await restoreSession()).toBe(true);
    expect(refreshCalls).toHaveLength(1);
    expect(session.refreshToken()).toBe('R2');
  });

  it('restores a valid session without a network call', async () => {
    signIn();
    expect(await restoreSession()).toBe(true);
    expect(refreshCalls).toHaveLength(0);
  });

  it('logout clears every authentication value', () => {
    signIn();
    logout();
    expect(session.get()).toBeNull();
    expect(session.token()).toBeNull();
    expect(session.refreshToken()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
});

// ---------- JavaScript services (fetch client) ----------
describe('fetch client used by the JavaScript services', () => {
  it('refreshes after a 401 and retries once with the new token', async () => {
    signIn();
    const seen: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;
      seen.push(tagOf(auth));
      return tagOf(auth) === 'A1'
        ? new Response('{}', { status: 401, headers: { 'Content-Type': 'application/json' } })
        : new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    const r = await httpClient.get('https://api.example.test/api/membership/my-credits', { auth: true });
    expect(r).toMatchObject({ success: true, data: { ok: true } });
    expect(seen).toEqual(['A1', 'A2']);
    expect(refreshCalls).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});
