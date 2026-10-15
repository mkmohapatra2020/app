/** Authentication — register, login, password reset, social sign-in. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toAuth } from './adapters.js';
import { session } from './session.js';

const E = BACKEND_ENDPOINTS.AUTH;

// Store the session when the response carries a token.
function startSession(res, fallbackUser = {}) {
  const r = mapRes(res, toAuth);
  if (r.success && r.data.token) session.set({ token: r.data.token, refreshToken: r.data.refreshToken, user: { ...fallbackUser, ...stripEmpty(r.data.user) } });
  return r;
}
const stripEmpty = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null));

class AuthService {
  async register({ name, email, phone, password, city, signal }) {
    const res = await api.post(E.REGISTER, { username: email, email, password, name, fullName: name, phone, phoneNumber: phone, city }, { auth: false, signal });
    return startSession(res, { name, email, phone, city });
  }
  async login({ email, password, signal }) {
    const res = await api.post(E.LOGIN, { usernameOrEmail: email, password }, { auth: false, signal });
    return startSession(res, { email });
  }
  forgotPassword({ email, signal }) { return api.post(E.FORGOT_PASSWORD, { email }, { auth: false, signal }); }
  resetPassword({ token, email, password, signal }) { return api.post(E.RESET_PASSWORD, { token, newPassword: password }, { auth: false, signal }); }
  async google({ idToken, signal }) { return startSession(await api.post(E.GOOGLE, { provider: 'google', token: idToken }, { auth: false, signal })); }
  async facebook({ accessToken, signal }) { return startSession(await api.post(E.FACEBOOK, { provider: 'facebook', token: accessToken }, { auth: false, signal })); }
  logout() { session.clear('logout'); }
}
export const authService = new AuthService();
export default authService;
