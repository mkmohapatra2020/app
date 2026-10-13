/** AI helpers — workshop / project recommendations, skill assessment. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toRecommendations, toSkill } from './adapters.js';

const E = BACKEND_ENDPOINTS.AI;

class AiService {
  recommendProjects({ type, skill, budget, hours, signal }) {
    return api.post(E.RECOMMEND_PROJECTS, { projectType: type, skillLevel: skill, budget: Number.isFinite(budget) ? budget : null, timeAvailableHours: hours }, { signal }).then((r) => mapRes(r, toRecommendations));
  }
  recommendWorkshop({ interests, skill, age, city, signal }) {
    return api.post(E.RECOMMEND_WORKSHOP, { interests, skillLevel: skill, age, city }, { signal }).then((r) => mapRes(r, toRecommendations));
  }
  skillAssessment({ answers, signal }) { return api.post(E.SKILL_ASSESSMENT, { answers }, { signal }).then((r) => mapRes(r, toSkill)); }
}
export const aiService = new AiService();
export default aiService;
