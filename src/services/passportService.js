/** Kids DIY passport — earn badge, my badges, progress. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toBadge, toProgress, unwrapList } from './adapters.js';

const E = BACKEND_ENDPOINTS.PASSPORT;

class PassportService {
  earn({ code, badgeId, childName, signal }) { return api.post(E.EARN_BADGE, { code, badgeCode: code, badgeId, childName }, { signal }).then((r) => mapRes(r, (d) => toBadge(d?.data || d || {}))); }
  badges({ signal } = {}) { return api.get(E.USER_BADGES, { signal }).then((r) => mapRes(r, (d) => unwrapList(d, 'badges').map(toBadge))); }
  progress({ signal } = {}) { return api.get(E.PROGRESS, { signal }).then((r) => mapRes(r, toProgress)); }
}
export const passportService = new PassportService();
export default passportService;
