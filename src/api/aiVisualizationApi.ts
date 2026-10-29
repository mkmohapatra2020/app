/**
 * AI visualization + draft workflow + SAS tokens.
 *
 * Where the swagger body has `userId` / `customerId`, the value is taken from the
 * signed-in user's JWT here — callers cannot pass or override it.
 */
import { ApiError, apiGet, apiPatch, apiPost, pathId } from './apiClient.ts';
import { requireAuth, requireUserId } from './authApi.ts';
import type {
  AiVisualizationRequest, AiVisualizationStatusResponse, CreateVisualizationDraftRequest, ImageSasInput, ImageSasResponse,
  JsonObject, SubmitAiVisualizationResponse, SubmitVisualizationInput, SubmitVisualizationWorkflowRequest,
  UpdateVisualizationDraftRequest, UploadAiReferenceInput, UploadAiReferenceResponse, VisualizationAssetUploadRequest,
  VisualizationDraftResponse,
} from './types.ts';

const rid = (requestId: string) => pathId(requestId, 'request id');

function requireText(value: string | undefined, label: string): void {
  if (!String(value ?? '').trim()) throw new ApiError('validation', `${label} is required.`, 0, { [label]: [`${label} is required.`] });
}

const asset = (b: VisualizationAssetUploadRequest): VisualizationAssetUploadRequest => {
  requireText(b.fileName, 'fileName');
  requireText(b.contentType, 'contentType');
  return { fileName: b.fileName, contentType: b.contentType };
};

export const aiVisualizationApi = {
  // ---------- AiVisualization ----------
  /** POST /ai-visualization/upload — base64 reference image; `userId` from the JWT. */
  async upload(input: UploadAiReferenceInput, signal?: AbortSignal) {
    requireText(input.contentBase64, 'contentBase64');
    const { fileName, contentType, contentBase64 } = input;
    return apiPost<UploadAiReferenceResponse>('/ai-visualization/upload', { userId: requireUserId(), fileName, contentType, contentBase64 }, { signal });
  },
  /** POST /ai-visualization/submit — `customerId` from the JWT. */
  async submit(input: SubmitVisualizationInput, signal?: AbortSignal) {
    requireText(input.userPrompt, 'userPrompt');
    const { visualizationTypeId, projectName, userPrompt, systemPrompt, referenceImages, businessArea } = input;
    return apiPost<SubmitAiVisualizationResponse>('/ai-visualization/submit', {
      customerId: requireUserId(), visualizationTypeId, projectName, userPrompt, systemPrompt, referenceImages, businessArea,
    }, { signal });
  },
  /** POST /read-sas-token — `userId` from the JWT. */
  async readSasToken(input: ImageSasInput, signal?: AbortSignal) {
    requireText(input.blobName, 'blobName');
    const { blobName, containerName, storageType, contentType } = input;
    return apiPost<ImageSasResponse>('/read-sas-token', { userId: requireUserId(), blobName, containerName, storageType, contentType }, { signal });
  },
  /** POST /write-sas-token — `userId` from the JWT. */
  async writeSasToken(input: ImageSasInput, signal?: AbortSignal) {
    requireText(input.blobName, 'blobName');
    const { blobName, containerName, storageType, contentType } = input;
    return apiPost<ImageSasResponse>('/write-sas-token', { userId: requireUserId(), blobName, containerName, storageType, contentType }, { signal });
  },
  /** GET /ai-visualization/{requestId} */
  async get(requestId: string, signal?: AbortSignal) {
    requireAuth();
    return apiGet<AiVisualizationRequest>(`/ai-visualization/${rid(requestId)}`, { signal });
  },
  /** GET /ai-visualization/{requestId}/status */
  async status(requestId: string, signal?: AbortSignal) {
    requireAuth();
    return apiGet<AiVisualizationStatusResponse>(`/ai-visualization/${rid(requestId)}/status`, { signal });
  },
  /** GET /ai-visualization/my-history — customer from the JWT. */
  async myHistory(signal?: AbortSignal) {
    requireAuth();
    return apiGet<AiVisualizationRequest[]>('/ai-visualization/my-history', { signal });
  },

  // ---------- AiVisualizationWorkflow ----------
  /** POST /ai-visualization/drafts → 201 VisualizationDraftResponse */
  async createDraft(body: CreateVisualizationDraftRequest, signal?: AbortSignal) {
    requireAuth();
    return apiPost<VisualizationDraftResponse>('/ai-visualization/drafts', body, { signal });
  },
  /** POST /ai-visualization/{requestId}/site-photo/upload */
  async createSitePhotoUpload(requestId: string, body: VisualizationAssetUploadRequest, signal?: AbortSignal) {
    requireAuth();
    return apiPost<JsonObject>(`/ai-visualization/${rid(requestId)}/site-photo/upload`, asset(body), { signal });
  },
  /** POST /ai-visualization/{requestId}/reference-image/upload */
  async createReferenceUpload(requestId: string, body: VisualizationAssetUploadRequest, signal?: AbortSignal) {
    requireAuth();
    return apiPost<JsonObject>(`/ai-visualization/${rid(requestId)}/reference-image/upload`, asset(body), { signal });
  },
  /** PATCH /ai-visualization/{requestId} */
  async updateDraft(requestId: string, body: UpdateVisualizationDraftRequest, signal?: AbortSignal) {
    requireAuth();
    return apiPatch<JsonObject>(`/ai-visualization/${rid(requestId)}`, body, { signal });
  },
  /** POST /ai-visualization/{requestId}/submit */
  async submitDraft(requestId: string, body: SubmitVisualizationWorkflowRequest, signal?: AbortSignal) {
    requireAuth();
    return apiPost<VisualizationDraftResponse>(`/ai-visualization/${rid(requestId)}/submit`, body, { signal });
  },
  /** GET /ai-visualization/{requestId}/details — only the owner's requests. */
  async details(requestId: string, signal?: AbortSignal) {
    requireAuth();
    return apiGet<JsonObject>(`/ai-visualization/${rid(requestId)}/details`, { signal });
  },
  /** GET /ai-visualization/{requestId}/workflow-status */
  async workflowStatus(requestId: string, signal?: AbortSignal) {
    requireAuth();
    return apiGet<JsonObject>(`/ai-visualization/${rid(requestId)}/workflow-status`, { signal });
  },
};

export default aiVisualizationApi;
