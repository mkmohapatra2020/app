/** Authentication — register (encrypted + OTP), login, password reset, social sign-in. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { pick, toAuth, unwrap } from './adapters.js';
import { endSession, parseAuthResponse, saveAuth } from '../api/tokenManager.ts';
import { encryptPayload } from '../utils/authCrypto.js';

const E = BACKEND_ENDPOINTS.AUTH;

const str = (v) => (v === undefined || v === null ? '' : String(v));
const stripEmpty = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null));

// Store the complete auth response (tokens, UTC expiries, user) when it carries a token —
// validated by the same parser as the encrypted login (src/api/tokenManager.ts).
function startSession(res, fallbackUser = {}) {
  const r = mapRes(res, toAuth);
  if (!r.success || !r.data.token) return r;
  try {
    const auth = parseAuthResponse(res.data, { fallbackUser: { ...fallbackUser, ...stripEmpty(r.data.user) } });
    saveAuth(auth);
    return { ...r, data: { ...r.data, user: auth.user } };
  } catch (err) {
    return { success: false, status: res.status, error: err?.message || 'Sign-in failed. Please try again.' };
  }
}

// Most auth endpoints answer HTTP 200 with { Success: false, Message } on failure.
function envelopeError(res, fallback) {
  if (res.success && pick(res.data, 'success') === false) return { success: false, status: res.status, error: str(pick(res.data, 'message')) || fallback };
  return null;
}

// The public key is cached in memory for 10 minutes (it is not a secret).
const KEY_TTL = 10 * 60 * 1000;
let cachedKey = null;

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

  // Sign-in (encrypted POST /auth/login) lives in src/api/authApi.ts, used through useAuth().login.
  forgotPassword({ email, signal }) { return api.post(E.FORGOT_PASSWORD, { email }, { auth: false, signal }); }
  resetPassword({ token, email, password, signal }) { return api.post(E.RESET_PASSWORD, { token, newPassword: password }, { auth: false, signal }); }
  async google({ idToken, signal }) { return startSession(await api.post(E.GOOGLE, { provider: 'google', token: idToken }, { auth: false, signal })); }
  async facebook({ accessToken, signal }) { return startSession(await api.post(E.FACEBOOK, { provider: 'facebook', token: accessToken }, { auth: false, signal })); }
  logout() { endSession('logout'); }
}
export const authService = new AuthService();
export default authService;
