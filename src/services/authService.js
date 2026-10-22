/** Authentication — register (encrypted + OTP), login, password reset, social sign-in. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS, ENCRYPTION } from './apiConfig.js';
import { pick, toAuth, unwrap } from './adapters.js';
import { session } from './session.js';
import { encryptPayload } from '../utils/authCrypto.js';

const E = BACKEND_ENDPOINTS.AUTH;

const str = (v) => (v === undefined || v === null ? '' : String(v));
const stripEmpty = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null));

// Store the session when the response carries a token. Memberships from the
// login response are kept for first render only; screens refresh them from the API.
function startSession(res, fallbackUser = {}) {
  const r = mapRes(res, toAuth);
  if (r.success && r.data.token) {
    const memberships = pick(unwrap(res.data) || {}, 'memberships');
    session.set({ token: r.data.token, refreshToken: r.data.refreshToken, user: { ...fallbackUser, ...stripEmpty(r.data.user), ...(Array.isArray(memberships) ? { memberships } : {}) } });
  }
  return r;
}

// Most auth endpoints answer HTTP 200 with { Success: false, Message } on failure.
function envelopeError(res, fallback) {
  if (res.success && pick(res.data, 'success') === false) return { success: false, status: res.status, error: str(pick(res.data, 'message')) || fallback };
  return null;
}

// The public key is cached in memory for 10 minutes (it is not a secret).
const KEY_TTL = 10 * 60 * 1000;
let cachedKey = null;

// Encrypted endpoint failed on the server (not a credentials problem) → fallback allowed.
const serverFailed = (res) => !res.aborted && (res.status === 0 || res.status === 404 || res.status >= 500);

class AuthService {
  /** Public RSA key (JWK) used to encrypt register/login/image payloads. */
  async encryptionKey({ signal, fresh = false } = {}) {
    if (!fresh && cachedKey && Date.now() - cachedKey.at < KEY_TTL) return { success: true, status: 200, data: cachedKey.data };
    const res = await api.get(E.ENCRYPTION_KEY, { auth: false, signal });
    const r = mapRes(res, (d) => { const p = unwrap(d) || {}; return { n: str(pick(p, 'n')), e: str(pick(p, 'e')), kid: str(pick(p, 'kid')), alg: str(pick(p, 'alg')) }; });
    if (r.success && r.data.n) cachedKey = { at: Date.now(), data: r.data };
    return r;
  }

  /**
   * Step 1 of sign-up: encrypted POST /auth/register → OTP is sent.
   * Resolves to { userId, deliveryChannel, maskedDestination, expiresAtUtc }.
   */
  async register({ name, email, phone, password, city, signal }) {
    const key = await this.encryptionKey({ signal });
    if (!key.success || !key.data.n) return key.success ? { success: false, status: 0, error: 'Secure sign-up is unavailable right now. Please try again shortly.' } : key;
    let cipherText;
    try {
      cipherText = await encryptPayload(key.data, stripEmpty({ username: email, email, phone, displayName: name, city, password }));
    } catch (err) { return { success: false, status: 0, error: err.message }; }
    const res = await api.post(E.REGISTER, { cipherText }, { auth: false, signal });
    return envelopeError(res, 'We could not create your account.') || mapRes(res, (d) => {
      const p = unwrap(d) || {};
      return { userId: Number(pick(p, 'userId', 'id')) || null, channel: str(pick(p, 'deliveryChannel')), destination: str(pick(p, 'maskedDestination')), expiresAt: str(pick(p, 'expiresAtUtc')) };
    });
  }

  /** Step 2 of sign-up: POST /auth/register/verify { userId, otp }. */
  async verifyRegistration({ userId, otp, signal }) {
    const res = await api.post(E.REGISTER_VERIFY, { userId: Number(userId), otp: String(otp).trim() }, { auth: false, signal });
    return envelopeError(res, 'That code did not work. Please check it and try again.') || res;
  }

  /**
   * Sign in. Default: encrypted POST /auth/login { cipherText }. When that endpoint
   * itself fails (5xx/404/network) and ENCRYPTION.AUTH is 'auto', falls back to
   * POST /auth/logincheck so sign-in keeps working until the backend is fixed.
   */
  async login({ email, password, signal }) {
    const creds = { usernameOrEmail: email, password };
    let res = null;
    if (ENCRYPTION.AUTH !== 'off') {
      const key = await this.encryptionKey({ signal });
      if (key.success && key.data.n) {
        try {
          res = await api.post(E.LOGIN, { cipherText: await encryptPayload(key.data, creds) }, { auth: false, signal });
        } catch (err) { if (ENCRYPTION.AUTH === 'strict') return { success: false, status: 0, error: err.message }; }
      } else if (ENCRYPTION.AUTH === 'strict') {
        return key.success ? { success: false, status: 0, error: 'Secure sign-in is unavailable right now. Please try again shortly.' } : key;
      }
      if (res?.aborted) return res;
      if (res && serverFailed(res) && ENCRYPTION.AUTH === 'strict') return { ...res, error: 'Secure sign-in is unavailable right now. Please try again shortly.' };
      if (res && serverFailed(res)) {
        if (import.meta.env.DEV) console.warn('[auth] encrypted /auth/login failed with', res.status, '— falling back to /auth/logincheck');
        res = null;
      }
    }
    if (!res) res = await api.post(E.LOGIN_CHECK, creds, { auth: false, signal });
    const failed = envelopeError(res, 'Invalid email or password.');
    if (failed) return failed;
    const r = startSession(res, { email });
    if (r.success && !r.data.token) return { success: false, status: res.status, error: 'Sign-in succeeded but no token came back. Please try again.' };
    return r;
  }
  forgotPassword({ email, signal }) { return api.post(E.FORGOT_PASSWORD, { email }, { auth: false, signal }); }
  resetPassword({ token, email, password, signal }) { return api.post(E.RESET_PASSWORD, { token, newPassword: password }, { auth: false, signal }); }
  async google({ idToken, signal }) { return startSession(await api.post(E.GOOGLE, { provider: 'google', token: idToken }, { auth: false, signal })); }
  async facebook({ accessToken, signal }) { return startSession(await api.post(E.FACEBOOK, { provider: 'facebook', token: accessToken }, { auth: false, signal })); }
  logout() { session.clear('logout'); }
}
export const authService = new AuthService();
export default authService;
