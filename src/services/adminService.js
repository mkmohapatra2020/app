/** Admin — dashboard, statistics, revenue, occupancy, flagship programme stats. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toKpis, toSeries } from './adapters.js';

const E = BACKEND_ENDPOINTS.ADMIN;

class AdminService {
  dashboard({ signal } = {}) { return api.get(E.DASHBOARD, { signal }).then((r) => mapRes(r, toKpis)); }
  statistics({ signal } = {}) { return api.get(E.STATISTICS, { signal }).then((r) => mapRes(r, toKpis)); }
  revenue({ signal, query } = {}) { return api.get(E.REVENUE, { signal, query }).then((r) => mapRes(r, (d) => ({ series: toSeries(d), kpis: toKpis(d) }))); }
  occupancy({ signal } = {}) { return api.get(E.CAMPAIGN_OCCUPANCY, { signal }).then((r) => mapRes(r, (d) => toSeries(d))); }
  heritageStats({ signal } = {}) { return api.get(E.HERITAGE_STATS, { signal }).then((r) => mapRes(r, toKpis)); }
  incubatorStats({ signal } = {}) { return api.get(E.INCUBATOR_STATS, { signal }).then((r) => mapRes(r, toKpis)); }
  elderlyDiyStats({ signal } = {}) { return api.get(E.ELDERLY_DIY_STATS, { signal }).then((r) => mapRes(r, toKpis)); }
  aiCostStats({ signal } = {}) { return api.get(E.AI_COST_STATS, { signal }).then((r) => mapRes(r, toKpis)); }
}
export const adminService = new AdminService();
export default adminService;
