/** DIY campaigns — list, details, register / cancel, participants. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toCampaign, toParticipant, unwrap, unwrapList } from './adapters.js';

const E = BACKEND_ENDPOINTS.CAMPAIGNS;

class CampaignService {
  list({ signal, query } = {}) { return api.get(E.LIST, { signal, query }).then((r) => mapRes(r, (d) => unwrapList(d, 'campaigns').map(toCampaign))); }
  get({ id, signal }) { return api.get(E.BY_ID, { arg: id, signal }).then((r) => mapRes(r, (d) => toCampaign(unwrap(d)))); }
  register({ id, seats, childrenAges, name, phone, signal }) { return api.post(E.REGISTER, { seats: Number(seats) || 1, participants: Number(seats) || 1, childrenAges, name, phone }, { arg: id, signal }); }
  cancel({ id, signal }) { return api.delete(E.CANCEL, { arg: id, signal }); }
  participants({ id, signal }) { return api.get(E.PARTICIPANTS, { arg: id, signal }).then((r) => mapRes(r, (d) => unwrapList(d, 'participants').map(toParticipant))); }
}
export const campaignService = new CampaignService();
export default campaignService;
