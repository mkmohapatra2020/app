/** DIY incubator projects (swagger: DIYIncubator). */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toIncubatorProject, unwrap, unwrapList } from './adapters.js';

const E = BACKEND_ENDPOINTS.INCUBATOR;

class IncubatorService {
  /** createIncubatorProjectRequest { projectName, description, category } */
  create({ projectName, description, category, signal }) {
    return api.post(E.CREATE, { projectName, description, category }, { signal }).then((r) => mapRes(r, (d) => toIncubatorProject(unwrap(d) || {})));
  }
  list({ signal } = {}) { return api.get(E.LIST, { signal }).then((r) => mapRes(r, (d) => unwrapList(d, 'projects').map(toIncubatorProject).filter((p) => p.title))); }
  get({ id, signal }) { return api.get(E.BY_ID, { arg: id, signal }).then((r) => mapRes(r, (d) => toIncubatorProject(unwrap(d) || {}))); }
  /** addIncubatorFileRequest { fileType, fileUrl } */
  addFile({ id, fileType, fileUrl, signal }) { return api.post(E.FILES(id), { fileType, fileUrl }, { signal }); }
  /** addMentorshipSessionRequest { mentorId, sessionDate, notes } */
  addMentorSession({ id, mentorId, sessionDate, notes, signal }) { return api.post(E.MENTOR_SESSION(id), { mentorId, sessionDate, notes }, { signal }); }
}
export const incubatorService = new IncubatorService();
export default incubatorService;
