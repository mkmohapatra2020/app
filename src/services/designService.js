/** AI Design Studio categories — GET /design-categories (mocked until deployed). */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { pick, unwrap, unwrapList } from './adapters.js';

const str = (v, d = '') => (v === undefined || v === null ? d : String(v));

export const toCategory = (c) => ({
  id: str(pick(c, 'code', 'categoryCode', 'id', 'categoryId')),
  label: str(pick(c, 'name', 'label', 'title')),
  hint: str(pick(c, 'description', 'hint')),
  icon: str(pick(c, 'icon'), '✨'),
  prompt: str(pick(c, 'promptTemplate', 'prompt'), str(pick(c, 'name'))),
  businessArea: str(pick(c, 'businessArea'), 'OutdoorLiving'),
  typeId: Number(pick(c, 'visualizationTypeId')) || null, // from the catalog — never hardcoded
  order: Number(pick(c, 'displayOrder')) || 99,
  fieldSet: str(pick(c, 'fieldSet')), // 'kids' | 'family' | '' → extra campaign fields
});

class DesignService {
  categories({ signal } = {}) {
    return api.get(BACKEND_ENDPOINTS.DESIGN.CATEGORIES, { signal }).then((r) => mapRes(r, (d) => {
      const p = unwrap(d);
      return (Array.isArray(p) ? p : unwrapList(p, 'categories')).map(toCategory).filter((c) => c.id && c.label).sort((a, b) => a.order - b.order);
    }));
  }
}

export const designService = new DesignService();
export default designService;
