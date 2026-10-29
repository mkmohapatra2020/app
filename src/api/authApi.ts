/**
 * Sign-in, refresh and sign-out against the WeekendLive API.
 *
 *  1. GET  /auth/encryption-key   → RSA public key (JWK), cached in memory for 10 minutes
 *  2. POST /auth/login            → `EncryptedLoginRequest { cipherText }`, the RSA-OAEP-256
 *                                   encryption of `{ usernameOrEmail, password }` (utils/authCrypto.js).
 *                                   Plaintext credentials are never sent.
 *  3. The full response (`data.token`, `data.refreshToken`, UTC expiries, user) is validated
 *     and stored together (services/session.js, sessionStorage).
 *  4. POST /auth/refresh-token    → see tokenManager.ts (rotation, single-flight, no retries).
 *
 * The user id used by user-specific calls comes from the signed-in user, never from the UI.
 */
import { apiClient, apiGet } from './apiClient.ts';
import { ApiError, field, unwrapEnvelope } from './errors.ts';
import { currentUserId, decodeJwt, endSession, parseAuthResponse, refreshSession, saveAuth } from './tokenManager.ts';
import { session } from '../services/session.js';
import { encryptPayload } from '../utils/authCrypto.js';
import type { AuthEncryptionKeyResponse, AuthSession, AuthUser, EncryptedLoginRequest, LoginCredentials, StoredAuth } from './types.ts';

export { currentUserId, decodeJwt } from './tokenManager.ts';

const KEY_TTL = 10 * 60 * 1000;
let cachedKey: { at: number; key: AuthEncryptionKeyResponse } | null = null;

/** Id for a user-specific request, or an `unauthorized` ApiError before anything is sent. */
export function requireUserId(): number {
  const id = currentUserId();
  if (!id) throw new ApiError('unauthorized', 'Please sign in to continue.', 401);
  return id;
}

/** Throws `unauthorized` when nobody is signed in, so the request is never made. */
export function requireAuth(): void {
  if (!session.token()) throw new ApiError('unauthorized', 'Please sign in to continue.', 401);
}

export async function getEncryptionKey(fresh = false): Promise<AuthEncryptionKeyResponse> {
  if (!fresh && cachedKey && Date.now() - cachedKey.at < KEY_TTL) return cachedKey.key;
  const body = await apiGet<unknown>('/auth/encryption-key', { skipAuth: true });
  const key = {
    kty: String(field(body, 'kty') ?? 'RSA'),
    n: String(field(body, 'n') ?? ''),
    e: String(field(body, 'e') ?? ''),
    kid: String(field(body, 'kid') ?? ''),
    alg: String(field(body, 'alg') ?? ''),
    use: String(field(body, 'use') ?? ''),
  };
  if (!key.n || !key.e) throw new ApiError('server', 'Secure sign-in is unavailable right now. Please try again shortly.');
  cachedKey = { at: Date.now(), key };
  return key;
}

function validate(creds: LoginCredentials): LoginCredentials {
  const usernameOrEmail = String(creds.usernameOrEmail ?? '').trim();
  const password = String(creds.password ?? '');
  const fieldErrors: Record<string, string[]> = {};
  if (!usernameOrEmail) fieldErrors.usernameOrEmail = ['Enter your email or username.'];
  if (!password) fieldErrors.password = ['Enter your password.'];
  if (Object.keys(fieldErrors).length) throw new ApiError('validation', 'Please fill in both fields.', 0, fieldErrors);
  return { usernameOrEmail, password };
}

async function postLogin(creds: LoginCredentials, freshKey: boolean): Promise<unknown> {
  const key = await getEncryptionKey(freshKey);
  let cipherText: string;
  try {
    cipherText = await encryptPayload(key, creds);
  } catch (e) {
    throw new ApiError('validation', e instanceof Error ? e.message : 'Your details could not be encrypted.');
  }
  const body: EncryptedLoginRequest = { cipherText };
  const res = await apiClient.post('/auth/login', body, { skipAuth: true });
  unwrapEnvelope<unknown>(res.data, res.status); // success:false → ApiError
  return res.data;
}

/**
 * Encrypted sign-in. The complete response is validated and stored; a missing, malformed
 * or already-expired token is a failure. If the server can't decrypt (e.g. a rotated key),
 * the key is fetched again and the request retried once — never more.
 */
export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  const creds = validate(credentials);
  let body: unknown;
  try {
    body = await postLogin(creds, false);
  } catch (e) {
    const err = e as ApiError;
    const retry = !err.fromEnvelope && (err.status === 400 || err.kind === 'server');
    if (!retry) throw err.kind === 'unauthorized' ? new ApiError('unauthorized', 'Invalid email or password.', 401) : err;
    body = await postLogin(creds, true);
  }
  const email = creds.usernameOrEmail.includes('@') ? creds.usernameOrEmail : '';
  const auth: StoredAuth = parseAuthResponse(body, { fallbackUser: { email } });
  saveAuth(auth);
  return { token: auth.token, user: auth.user };
}

/** POST /auth/refresh-token — new access + refresh token (shared, single-flight). */
export const refresh = (): Promise<string> => refreshSession();

/** GET /users/profile → fresh user details (keeps the same tokens). */
export async function fetchProfile(): Promise<AuthUser> {
  requireAuth();
  const before = session.get();
  const data = await apiGet<unknown>('/users/profile');
  const raw = field(data, 'user') ?? data;
  const prev = (session.user() || {}) as Partial<AuthUser>;
  const fresh = parseProfile(raw, prev);
  const now = session.get();
  // Only write if the tokens didn't change meanwhile (sign-out / refresh).
  if (now && before && now.token === before.token) session.set({ ...now, user: fresh });
  return fresh;
}

function parseProfile(raw: unknown, prev: Partial<AuthUser>): AuthUser {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const pick = (k: string) => { const v = field(r, k); return typeof v === 'string' && v.trim() ? v.trim() : ''; };
  return {
    id: prev.id ?? null, // identity never comes from a profile payload
    username: pick('username') || prev.username || '',
    name: pick('displayName') || pick('name') || prev.name || '',
    email: pick('email') || prev.email || '',
    phone: pick('phone') || pick('phoneNumber') || prev.phone || '',
    city: pick('city') || prev.city || '',
    photo: pick('profilePhotoUrl') || pick('photoUrl') || prev.photo || '',
    role: prev.role || 'user',
    isAdmin: !!prev.isAdmin,
    membership: pick('membership') || prev.membership || '',
    memberships: prev.memberships ?? [],
  };
}

/** Clear every authentication value. */
export function logout(): void {
  endSession('logout');
}

export const authApi = { getEncryptionKey, login, logout, refresh, fetchProfile, decodeJwt, currentUserId, requireUserId, requireAuth };
export default authApi;
