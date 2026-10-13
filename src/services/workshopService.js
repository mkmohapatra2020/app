/** Workshops — list, details, booking, attendance, certificate. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { pick, toCampaign, toImage, unwrap, unwrapList } from './adapters.js';

const E = BACKEND_ENDPOINTS.WORKSHOPS;

class WorkshopService {
  list({ signal, query } = {}) { return api.get(E.LIST, { signal, query }).then((r) => mapRes(r, (d) => unwrapList(d, 'workshops').map(toCampaign))); }
  get({ id, signal }) { return api.get(E.BY_ID, { arg: id, signal }).then((r) => mapRes(r, (d) => toCampaign(unwrap(d)))); }
  book({ workshopId, seats, name, phone, childrenAges, signal }) {
    return api.post(E.BOOKING, { workshopId, seats: Number(seats) || 1, participants: Number(seats) || 1, name, phone, childrenAges }, { signal });
  }
  markAttendance({ workshopId, code, userId, signal }) { return api.post(E.ATTENDANCE, { workshopId, code, attendanceCode: code, userId }, { signal }); }
  certificate({ workshopId, signal }) {
    return api.post(E.CERTIFICATE, { workshopId }, { signal, responseType: 'auto' }).then((r) => mapRes(r, (d) => (d instanceof Blob ? { blob: d } : { url: toImage(pick(unwrap(d), 'certificateUrl', 'url', 'downloadUrl', 'fileUrl')) })));
  }
}
export const workshopService = new WorkshopService();
export default workshopService;
