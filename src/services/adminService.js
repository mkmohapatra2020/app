/** Admin — dashboard, statistics, revenue, campaign occupancy. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toKpis, toSeries } from './adapters.js';

const E = BACKEND_ENDPOINTS.ADMIN;

class AdminService {
  dashboard({ signal } = {}) { return api.get(E.DASHBOARD, { signal }).then((r) => mapRes(r, toKpis)); }
  statistics({ signal } = {}) { return api.get(E.STATISTICS, { signal }).then((r) => mapRes(r, toKpis)); }
  revenue({ signal, query } = {}) { return api.get(E.REVENUE, { signal, query }).then((r) => mapRes(r, (d) => ({ series: toSeries(d), kpis: toKpis(d) }))); }
  occupancy({ signal } = {}) { return api.get(E.CAMPAIGN_OCCUPANCY, { signal }).then((r) => mapRes(r, (d) => toSeries(d))); }
}
export const adminService = new AdminService();
export default adminService;
