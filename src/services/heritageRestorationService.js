/** Heritage restoration (swagger: HeritageRestoration). */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toHeritageProject, unwrap, unwrapList } from './adapters.js';

const E = BACKEND_ENDPOINTS.HERITAGE_RESTORATION;

class HeritageRestorationService {
  /** createHeritageRestorationRequest { title, location, projectType, description, currentCondition, recommendedWork, estimatedCost } */
  create({ title, location, projectType, description, currentCondition, recommendedWork, estimatedCost, signal }) {
    return api.post(E.CREATE, { title, location, projectType, description, currentCondition, recommendedWork, estimatedCost }, { signal })
      .then((r) => mapRes(r, (d) => toHeritageProject(unwrap(d) || {})));
  }
  list({ signal } = {}) { return api.get(E.LIST, { signal }).then((r) => mapRes(r, (d) => unwrapList(d, 'projects').map(toHeritageProject).filter((p) => p.title))); }
  get({ id, signal }) { return api.get(E.BY_ID, { arg: id, signal }).then((r) => mapRes(r, (d) => toHeritageProject(unwrap(d) || {}))); }
  /** addHeritagePhotoRequest { photoType: 'Before' | 'During' | 'After', imageUrl } */
  addPhoto({ id, photoType, imageUrl, signal }) { return api.post(E.PHOTOS(id), { photoType, imageUrl }, { signal }); }
  /** addHeritageAssessmentRequest { assessmentDate, assessmentNotes, riskLevel, estimatedCost } */
  addAssessment({ id, assessmentDate, assessmentNotes, riskLevel, estimatedCost, signal }) {
    return api.post(E.ASSESSMENT(id), { assessmentDate, assessmentNotes, riskLevel, estimatedCost }, { signal });
  }
}
export const heritageRestorationService = new HeritageRestorationService();
export default heritageRestorationService;
