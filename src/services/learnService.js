/**
 * Knowledge Center / Learning API (swagger tag "Learning").
 *   GET  /learn/categories                 → [{ id, name }]
 *   GET  /learn/workshops?ageGroup&skillLevel&projectType&toolType&duration → [learningWorkshop]
 *   GET  /learn/workshops/{id}             → learningWorkshop
 *   POST /learn/workshops/{id}/register    → apiResponse
 *   GET  /learn/paths                      → [{ id, title, description, steps: [learningPathStep] }]
 *   GET  /learn/certifications             → [{ id, name, description, badgeImageUrl }]
 *   GET  /learn/dashboard/{userId}         → learningDashboard
 *   POST /learn/incubator/concepts         { userId, title, description } → apiResponse
 *   POST /learn/media?conceptId&userId&fileName&fileType&youtubeVideoLink  (binary body)
 * Until APIM publishes these, backendClient falls back to src/mocks/learnMock.js on 404.
 */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { pick, unwrap, unwrapList } from './adapters.js';
import { session } from './session.js';

const L = BACKEND_ENDPOINTS.LEARN;
const str = (v, d = '') => (v === undefined || v === null ? d : String(v));
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const listOf = (d, ...keys) => { const p = unwrap(d); return Array.isArray(p) ? p : unwrapList(p, ...keys); };
const userId = () => { const id = Number(session.user()?.id); return Number.isInteger(id) && id > 0 ? id : null; };
const split = (v) => str(v).split(/[;,]/).map((x) => x.trim()).filter(Boolean);

// Envelope answers (register, concepts) can be 200 with { Success:false, Message }.
const envelope = (res, fallback) => {
  if (!res.success) return res;
  if (pick(res.data, 'success') === false) return { success: false, status: res.status, error: str(pick(res.data, 'message')) || fallback };
  return { ...res, message: str(pick(res.data, 'message')), data: unwrap(res.data) };
};

export const toWorkshop = (w = {}) => ({
  id: str(pick(w, 'id')),
  title: str(pick(w, 'title')),
  series: str(pick(w, 'series')),
  ageGroup: str(pick(w, 'ageGroup')),
  skillLevel: str(pick(w, 'skillLevel')),
  duration: str(pick(w, 'duration')),
  tools: split(pick(w, 'toolsUsed')),
  outcome: str(pick(w, 'learningOutcome')),
  safety: str(pick(w, 'safetyRequirements')),
  takeHome: str(pick(w, 'takeHomeProject')),
  badge: str(pick(w, 'certificationBadge')),
  seats: pick(w, 'seatsAvailable') == null ? null : num(pick(w, 'seatsAvailable')),
  projectType: str(pick(w, 'projectType')),
  image: str(pick(w, 'imageUrl')),
  video: str(pick(w, 'youTubeVideoLink', 'youtubeVideoLink')),
});
const toStep = (s = {}) => ({
  id: str(pick(s, 'id')), sequence: num(pick(s, 'sequence')), title: str(pick(s, 'title')), duration: str(pick(s, 'duration')),
  tools: split(pick(s, 'tools')), outcome: str(pick(s, 'learningOutcome')), project: str(pick(s, 'project')),
});
const toPath = (p = {}) => ({
  id: str(pick(p, 'id')), title: str(pick(p, 'title')), description: str(pick(p, 'description')),
  steps: (pick(p, 'steps') || []).map(toStep).sort((a, b) => a.sequence - b.sequence),
});
const toCert = (c = {}) => ({ id: str(pick(c, 'id')), name: str(pick(c, 'name')), description: str(pick(c, 'description')), image: str(pick(c, 'badgeImageUrl')) });
const toDashboard = (d = {}) => {
  const p = unwrap(d) || {};
  return {
    workshopsCompleted: num(pick(p, 'workshopsCompleted')), learningHours: num(pick(p, 'learningHours')), badgesEarned: num(pick(p, 'badgesEarned')),
    currentPath: str(pick(p, 'currentLearningPath')), upcomingWorkshops: num(pick(p, 'upcomingWorkshops')), aiDesignCredits: num(pick(p, 'aiDesignCredits')),
  };
};

// YouTube watch/share links → embeddable URL (or '' when not YouTube).
export function youtubeEmbed(url) {
  const m = str(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : '';
}

class LearnService {
  categories({ signal } = {}) { return api.get(L.CATEGORIES, { signal }).then((r) => mapRes(r, (d) => listOf(d, 'categories').map((c) => ({ id: str(pick(c, 'id')), name: str(pick(c, 'name')) })).filter((c) => c.name).sort((a, b) => a.name.localeCompare(b.name)))); }
  workshops({ filters = {}, signal } = {}) { return api.get(L.WORKSHOPS, { signal, query: filters }).then((r) => mapRes(r, (d) => listOf(d, 'workshops', 'items').map(toWorkshop).filter((w) => w.id && w.title))); }
  workshop({ id, signal }) { return api.get(L.WORKSHOP, { arg: id, signal }).then((r) => mapRes(r, (d) => toWorkshop(unwrap(d)))); }
  paths({ signal } = {}) { return api.get(L.PATHS, { signal }).then((r) => mapRes(r, (d) => listOf(d, 'paths').map(toPath).filter((p) => p.title))); }
  certifications({ signal } = {}) { return api.get(L.CERTIFICATIONS, { signal }).then((r) => mapRes(r, (d) => listOf(d, 'certifications').map(toCert).filter((c) => c.name))); }

  async dashboard({ signal } = {}) {
    const id = userId();
    if (!id) return { success: false, status: 401, error: 'Please sign in to see your learning.' };
    return api.get(L.DASHBOARD, { arg: id, signal }).then((r) => mapRes(r, toDashboard));
  }

  async register({ id, participants = 1, notes = '', signal }) {
    const uid = userId();
    if (!uid) return { success: false, status: 401, error: 'Please sign in to register.' };
    const u = session.user() || {};
    const res = await api.post(L.REGISTER, { userId: uid, name: u.name, email: u.email, phone: u.phone, participants: Number(participants) || 1, notes }, { arg: id, signal });
    return envelope(res, 'We could not register you for this workshop.');
  }

  async submitConcept({ title, description, signal }) {
    const uid = userId();
    if (!uid) return { success: false, status: 401, error: 'Please sign in to submit an idea.' };
    const res = await api.post(L.INCUBATOR_CONCEPTS, { userId: uid, title: title.trim(), description: description.trim() }, { signal });
    const r = envelope(res, 'We could not submit your idea.');
    return r.success ? { ...r, data: { ...(r.data || {}), conceptId: num(pick(r.data || {}, 'conceptId', 'id'), null) } } : r;
  }

  /** Binary upload for a concept (file and/or a YouTube link). */
  async uploadMedia({ conceptId, file, youtubeVideoLink = '', signal }) {
    const uid = userId();
    const query = { conceptId, userId: uid, fileName: file?.name || '', fileType: file?.type || '', youtubeVideoLink };
    const res = await api.post(L.MEDIA, file || new Blob([]), { signal, query, rawBody: true, timeout: 120000, headers: { 'Content-Type': file?.type || 'application/octet-stream' } });
    return envelope(res, 'The file could not be uploaded.');
  }
}

export const learnService = new LearnService();
export default learnService;
