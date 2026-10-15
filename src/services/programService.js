/** Elderly DIY + family (intergenerational) programmes (swagger: ElderlyDIY, FamilyPrograms). */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toProgram, unwrapList } from './adapters.js';

const ED = BACKEND_ENDPOINTS.ELDERLY_DIY;
const FP = BACKEND_ENDPOINTS.FAMILY_PROGRAMS;
const programs = (d) => unwrapList(d, 'programs').map(toProgram).filter((p) => p.title);

class ProgramService {
  elderlyList({ signal } = {}) { return api.get(ED.LIST, { signal }).then((r) => mapRes(r, programs)); }
  /** registerElderlyDIYRequest { programId, emergencyContact, notes } */
  elderlyRegister({ programId, emergencyContact, notes, signal }) {
    return api.post(ED.REGISTER, { programId: Number(programId), emergencyContact, notes }, { signal });
  }
  elderlyMine({ signal } = {}) { return api.get(ED.MY_PROGRAMS, { signal }).then((r) => mapRes(r, programs)); }

  familyList({ signal } = {}) { return api.get(FP.LIST, { signal }).then((r) => mapRes(r, programs)); }
  /** registerFamilyProgramRequest { programId, participantCount } */
  familyRegister({ programId, participantCount, signal }) {
    return api.post(FP.REGISTER, { programId: Number(programId), participantCount: Number(participantCount) || 1 }, { signal });
  }
}
export const programService = new ProgramService();
export default programService;
