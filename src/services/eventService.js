/** Events — all, upcoming, booking. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toCampaign, unwrapList } from './adapters.js';

const E = BACKEND_ENDPOINTS.EVENTS;
const toList = (d) => unwrapList(d, 'events').map(toCampaign);

class EventService {
  list({ signal, query } = {}) { return api.get(E.LIST, { signal, query }).then((r) => mapRes(r, toList)); }
  upcoming({ signal } = {}) { return api.get(E.UPCOMING, { signal }).then((r) => mapRes(r, toList)); }
  book({ eventId, seats, name, phone, signal }) { return api.post(E.BOOK, { eventId, seats: Number(seats) || 1, name, phone }, { signal }); }
}
export const eventService = new EventService();
export default eventService;
