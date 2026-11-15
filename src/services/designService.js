/**
 * AI Design Studio categories — a local catalogue (src/data/studioCategories.js). The backend has
 * no category endpoint; the request carries the category's id, prompt template and business area.
 */
import { pick } from './adapters.js';
import { STUDIO_CATEGORIES } from '../data/studioCategories.js';

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
  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  categories(_opts = {}) {
    const data = STUDIO_CATEGORIES.map(toCategory).filter((c) => c.id && c.label).sort((a, b) => a.order - b.order);
    return Promise.resolve({ success: true, status: 200, data });
  }
}

export const designService = new DesignService();
export default designService;
