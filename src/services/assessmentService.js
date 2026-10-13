/** Elderly home-safety assessment — questions, submit, book a visit. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toAssessmentResult, toQuestions } from './adapters.js';

const E = BACKEND_ENDPOINTS.ASSESSMENT;

class AssessmentService {
  questions({ signal } = {}) { return api.get(E.QUESTIONS, { signal, auth: false }).then((r) => mapRes(r, toQuestions)); }
  submit({ answers, score, signal }) {
    const list = Object.entries(answers).map(([questionId, a]) => ({ questionId, answer: a === 'yes', value: a }));
    return api.post(E.SUBMIT, { answers: list, score }, { signal }).then((r) => mapRes(r, toAssessmentResult));
  }
  bookVisit({ name, phone, area, notes, assessmentId, preferredDate, signal }) {
    return api.post(E.VISIT, { name, phone, area, address: area, notes, assessmentId, preferredDate }, { signal });
  }
}
export const assessmentService = new AssessmentService();
export default assessmentService;
