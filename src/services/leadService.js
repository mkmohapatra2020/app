/** Leads — site visit, quotation, callback requests. */
import { api } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';

const E = BACKEND_ENDPOINTS.LEADS;
const lead = (v) => ({ name: v.name, phone: v.phone, phoneNumber: v.phone, email: v.email, city: v.city || v.area, area: v.area, message: v.message || v.notes, source: 'website', ...v.extra });

class LeadService {
  siteVisit({ values, signal }) { return api.post(E.SITE_VISIT, { ...lead(values), preferredDate: values.date, address: values.address || values.area }, { signal }); }
  quotation({ values, signal }) { return api.post(E.QUOTATION, { ...lead(values), projectType: values.projectType, budget: values.budget, dimensions: values.dimensions }, { signal }); }
  callback({ values, signal }) { return api.post(E.CALLBACK, { ...lead(values), preferredTime: values.time }, { signal }); }
}
export const leadService = new LeadService();
export default leadService;
