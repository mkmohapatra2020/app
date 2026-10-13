/** Users — profile, profile photo, membership. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toMembership, toUser, unwrap } from './adapters.js';
import { session } from './session.js';

const E = BACKEND_ENDPOINTS.USERS;

class UserService {
  async getProfile({ signal } = {}) {
    const r = mapRes(await api.get(E.PROFILE, { signal }), (d) => toUser(unwrap(d)));
    if (r.success) session.update(Object.fromEntries(Object.entries(r.data).filter(([, v]) => v !== '' && v !== undefined)));
    return r;
  }
  async updateProfile({ profile, signal }) {
    const r = mapRes(await api.put(E.PROFILE, { ...profile, fullName: profile.name, phoneNumber: profile.phone }, { signal }), (d) => toUser(unwrap(d) || {}));
    if (r.success) session.update(profile);
    return r;
  }
  async uploadPhoto({ file, signal }) {
    const form = new FormData();
    form.append('file', file, file.name || 'photo.jpg');
    form.append('photo', file, file.name || 'photo.jpg');
    const r = mapRes(await api.post(E.PROFILE_PHOTO, form, { signal }), (d) => toUser(unwrap(d) || {}).photo);
    if (r.success && r.data) session.update({ photo: r.data });
    return r;
  }
  getMembership({ signal } = {}) { return api.get(E.MEMBERSHIP, { signal }).then((r) => mapRes(r, toMembership)); }
  subscribe({ tier, signal }) { return api.post(E.SUBSCRIBE, { tier, plan: tier, membershipTier: tier }, { signal }); }
}
export const userService = new UserService();
export default userService;
