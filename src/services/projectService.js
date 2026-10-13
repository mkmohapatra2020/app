/** Projects — categories, gallery, details, before/after comparison. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toComparison, toProject, toProjectCategory, unwrap, unwrapList } from './adapters.js';

const E = BACKEND_ENDPOINTS.PROJECTS;

class ProjectService {
  categories({ signal } = {}) { return api.get(E.CATEGORIES, { signal }).then((r) => mapRes(r, (d) => unwrapList(d, 'categories').map(toProjectCategory).filter((c) => c.label))); }
  gallery({ signal, query } = {}) { return api.get(E.GALLERY, { signal, query }).then((r) => mapRes(r, (d) => unwrapList(d, 'projects', 'gallery').map(toProject).filter((p) => p.title && p.image))); }
  get({ id, signal }) { return api.get(E.BY_ID, { arg: id, signal }).then((r) => mapRes(r, (d) => toProject(unwrap(d)))); }
  comparison({ id, signal }) { return api.get(E.COMPARISON, { arg: id, signal }).then((r) => mapRes(r, toComparison)); }
}
export const projectService = new ProjectService();
export default projectService;
