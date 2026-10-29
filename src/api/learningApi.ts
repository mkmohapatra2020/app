/**
 * Knowledge Center / Learning.
 *
 * Public endpoints work signed out (the token is still sent when there is one).
 * Authenticated endpoints use the signed-in user's id from the JWT; the UI can't
 * pass a user id, and the dashboard can only be read for the signed-in user.
 */
import { ApiError, apiGet, apiPost, pathId } from './apiClient.ts';
import { requireAuth, requireUserId } from './authApi.ts';
import type {
  ApiEnvelope, IncubatorConceptInput, JsonObject, LearningCategory, LearningCertification, LearningDashboard,
  LearningMediaInput, LearningPath, LearningWorkshop, LearningWorkshopFilters,
} from './types.ts';

const clean = (o: object) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

export const learningApi = {
  // ---------- public ----------
  /** GET /learn/categories */
  categories: async (signal?: AbortSignal) => apiGet<LearningCategory[]>('/learn/categories', { signal }),
  /** GET /learn/workshops?ageGroup=&skillLevel=&projectType=&toolType=&duration= */
  workshops: async (filters: LearningWorkshopFilters = {}, signal?: AbortSignal) => apiGet<LearningWorkshop[]>('/learn/workshops', { params: clean(filters), signal }),
  /** GET /learn/workshops/{id} */
  workshop: async (id: number, signal?: AbortSignal) => apiGet<LearningWorkshop>(`/learn/workshops/${pathId(id, 'workshop id')}`, { signal }),
  /** GET /learn/paths */
  paths: async (signal?: AbortSignal) => apiGet<LearningPath[]>('/learn/paths', { signal }),
  /** GET /learn/certifications */
  certifications: async (signal?: AbortSignal) => apiGet<LearningCertification[]>('/learn/certifications', { signal }),

  // ---------- authenticated ----------
  /** POST /learn/workshops/{id}/register — body is free JSON (e.g. `{ participants: 2 }`); no user id is sent. */
  async register(id: number, details: JsonObject = {}, signal?: AbortSignal) {
    requireAuth();
    const { userId: _u, customerId: _c, ...body } = details; // never let the UI choose the user
    return apiPost<ApiEnvelope | JsonObject>(`/learn/workshops/${pathId(id, 'workshop id')}/register`, body, { signal });
  },
  /** GET /learn/dashboard/{userId} — always the signed-in user's own dashboard. */
  async myDashboard(signal?: AbortSignal) {
    return apiGet<LearningDashboard>(`/learn/dashboard/${requireUserId()}`, { signal });
  },
  /** POST /learn/incubator/concepts — `userId` from the JWT. */
  async submitConcept(input: IncubatorConceptInput, signal?: AbortSignal) {
    const title = String(input.title ?? '').trim();
    const description = String(input.description ?? '').trim();
    const fieldErrors: Record<string, string[]> = {};
    if (!title) fieldErrors.title = ['Give your idea a title.'];
    if (!description) fieldErrors.description = ['Describe your idea.'];
    if (Object.keys(fieldErrors).length) throw new ApiError('validation', 'Please fill in the title and description.', 0, fieldErrors);
    return apiPost<ApiEnvelope | JsonObject>('/learn/incubator/concepts', { userId: requireUserId(), title, description }, { signal });
  },
  /** POST /learn/media — binary body; `userId` query from the JWT. */
  async uploadMedia(input: LearningMediaInput, signal?: AbortSignal) {
    const userId = requireUserId();
    if (!Number.isInteger(input.conceptId) || input.conceptId <= 0) throw new ApiError('validation', 'A concept id is required.');
    if (!input.file?.size) throw new ApiError('validation', 'Choose a file to upload.', 0, { file: ['Choose a file to upload.'] });
    if (input.file.size > MAX_MEDIA_BYTES) throw new ApiError('validation', 'Please upload a file under 50 MB.', 0, { file: ['Please upload a file under 50 MB.'] });
    const fileType = input.fileType || input.file.type || 'application/octet-stream';
    const fileName = input.fileName || (input.file instanceof File ? input.file.name : 'upload');
    return apiPost<ApiEnvelope | JsonObject>('/learn/media', input.file, {
      params: clean({ conceptId: input.conceptId, userId, fileName, fileType, youtubeVideoLink: input.youtubeVideoLink }),
      headers: { 'Content-Type': 'application/octet-stream' },
      timeout: 300_000,
      signal,
    });
  },
};

export default learningApi;
