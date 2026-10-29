/**
 * Types for the WeekendLive Azure Functions API, taken from the swagger
 * (OpenAPI "json swa.json"). Fields the server derives from the JWT
 * (userId, customerId) are left out of the request types the UI fills in —
 * the API functions add them from the signed-in user.
 */

// ---------- envelopes & errors ----------
/** Generic `ApiResponse` envelope (`{ success, message, data }`; the live API also sends PascalCase). */
export interface ApiEnvelope<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

/** `OpenApiErrorResponse`. */
export interface OpenApiErrorResponse {
  error?: string;
}

/** Free-form JSON body (`openApiJsonRequest`). */
export type JsonObject = Record<string, unknown>;

// ---------- auth ----------
/** `AuthEncryptionKeyResponse` — RSA public key as a JWK. */
export interface AuthEncryptionKeyResponse {
  kty: string;
  n: string;
  e: string;
  kid?: string;
  alg?: string;
  use?: string;
}

/** `EncryptedLoginRequest` — RSA-OAEP-256 of `{ usernameOrEmail, password }`, base64. */
export interface EncryptedLoginRequest {
  cipherText: string;
}

export interface LoginCredentials {
  usernameOrEmail: string;
  password: string;
}

export interface AuthUser {
  id: number | null;
  username: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  photo: string;
  role: string;
  isAdmin: boolean;
  membership: string;
  memberships: unknown[];
}

/** `data` of a successful POST /auth/login (and /auth/refresh-token). */
export interface LoginResponseData {
  token: string;
  refreshToken?: string;
  accessTokenExpiresAtUtc?: string;
  refreshTokenExpiresAtUtc?: string;
  expiresInSeconds?: number;
  id?: number;
  username?: string;
  email?: string;
  displayName?: string;
  memberships?: unknown[];
}
export type RefreshTokenResponse = LoginResponseData;

/** POST /auth/refresh-token body. */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** What is kept in token storage (services/session.js). Expiries are UTC epoch ms, 0 = unknown. */
export interface StoredAuth {
  token: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  user: AuthUser;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

// ---------- membership ----------
/** `MembershipEntitlementResponse` (my-credits, my-entitlements). */
export interface MembershipEntitlementResponse {
  membership: string;
  allocatedCredits: number;
  bonusCredits: number;
  usedCredits: number;
  remainingCredits: number;
  maxReferenceImages: number;
  priorityQueue: boolean;
  maxConcurrentRequests: number;
}

/** my-memberships, my-benefits, my-ai-credits: swagger says only "object". */
export type MembershipObject = JsonObject;

// ---------- files (SAS) ----------
/** `ImageSasRequest` without `userId` (added from the JWT). */
export interface ImageSasInput {
  blobName: string;
  containerName: string;
  storageType?: string;
  contentType?: string;
}

/** `ImageSasResponse`. */
export interface ImageSasResponse {
  blobUri: string;
  sasToken: string;
  blobName: string;
  containerName: string;
  expiresOn: string;
}

// ---------- AI visualization ----------
/** `UploadAiReferenceRequest` without `userId`. */
export interface UploadAiReferenceInput {
  fileName: string;
  contentType: string;
  contentBase64: string;
}

/** `UploadAiReferenceResponse`. */
export interface UploadAiReferenceResponse {
  blobUrl: string;
}

/** `SubmitVisualizationDto` without `customerId`. */
export interface SubmitVisualizationInput {
  visualizationTypeId: number;
  projectName: string;
  userPrompt: string;
  systemPrompt?: string;
  referenceImages?: string[];
  businessArea?: string;
}

/** `SubmitAiVisualizationResponse`. */
export interface SubmitAiVisualizationResponse {
  requestId: string;
  status: string;
}

/** `AiVisualizationStatusResponse`. */
export interface AiVisualizationStatusResponse {
  status: string;
}

/** `AiVisualizationReference`. */
export interface AiVisualizationReference {
  id: number;
  visualizationRequestId: number;
  containerName: string;
  blobName: string;
  blobUrl: string;
  imageType: string;
  assetType: string;
  contentType: string;
  uploadedBy: number;
  createdBy: number;
  createdDate: string;
  modifiedBy: number;
  modifiedDate: string;
  isDeleted: boolean;
}

/** `AiVisualizationResult`. */
export interface AiVisualizationResult {
  id: number;
  visualizationRequestId: number;
  containerName: string;
  blobName: string;
  blobUrl: string;
  thumbnailUrl: string;
  imageOrder: number;
  imageVariant: string;
  createdBy: number;
  createdDate: string;
  modifiedBy: number;
  modifiedDate: string;
  isDeleted: boolean;
}

/** `AIVisualizationRequest`. */
export interface AiVisualizationRequest {
  id: number;
  requestId: string;
  customerId: number;
  visualizationTypeId: number;
  businessArea: string;
  projectName: string;
  modelName: string;
  userPrompt: string;
  systemPrompt: string;
  computedPrompt: string;
  queueMessageId: string;
  retryCount: number;
  tokenUsage: number;
  generationCost: number;
  creditsConsumed: number;
  membershipPlanSnapshot: string;
  generationMode: string;
  reviewStatus: string;
  locationCity: string;
  locationState: string;
  locationCountry: string;
  reviewNotes: string;
  lastReviewedBy: number;
  lastReviewedDate: string;
  promptVersion: number;
  submittedBy: number;
  generationStartedDate: string;
  failedDate: string;
  additionalDetail: string;
  maxBudget: number;
  budgetCurrency: string;
  status: string;
  submittedDate: string;
  completedDate: string;
  errorMessage: string;
  createdBy: number;
  createdDate: string;
  modifiedBy: number;
  modifiedDate: string;
  isDeleted: boolean;
  references: AiVisualizationReference[];
  results: AiVisualizationResult[];
}

/** Shared by `CreateVisualizationDraftRequest`, `UpdateVisualizationDraftRequest`, `SubmitVisualizationWorkflowRequest`. */
export interface VisualizationDraftFields {
  visualizationTypeId?: number;
  projectName?: string;
  userPrompt?: string;
  systemPrompt?: string;
  additionalDetail?: string;
  maxBudget?: number;
  budgetCurrency?: string;
  businessArea?: string;
  generationMode?: string;
}
export type CreateVisualizationDraftRequest = VisualizationDraftFields;
export type UpdateVisualizationDraftRequest = VisualizationDraftFields;
export type SubmitVisualizationWorkflowRequest = VisualizationDraftFields;

/** `VisualizationAssetUploadRequest`. */
export interface VisualizationAssetUploadRequest {
  fileName: string;
  contentType: string;
}

/** `VisualizationDraftResponse`. */
export interface VisualizationDraftResponse {
  requestId: string;
  status: string;
  generationMode: string;
  remainingQuota: number;
}

// ---------- images ----------
/** `GenerateImageRequest` without `userId`. */
export interface GenerateImageInput {
  prompt: string;
  style?: string;
  size?: string;
  referenceImageUrls?: string[];
  referenceImageBlobName?: string;
  referenceImageContainerName?: string;
  referenceImageUrl?: string;
}

/** `GenerateImageResponse`. */
export interface GenerateImageResponse {
  imageId: string;
  imageUrl: string;
  remainingQuota: number;
}

/** `ImageHistoryItem`. */
export interface ImageHistoryItem {
  imageId: string;
  userId: number;
  prompt: string;
  style: string;
  size: string;
  imageUrl: string;
  referenceImageUrls: string[];
  createdDate: string;
}

/** `ImageHistoryResponse`. */
export interface ImageHistoryResponse {
  total: number;
  items: ImageHistoryItem[];
}

/** `ImageQuotaResponse`. */
export interface ImageQuotaResponse {
  membership: string;
  monthlyQuota: number;
  used: number;
  remaining: number;
}

// ---------- learning ----------
/** `LearningCategory`. */
export interface LearningCategory {
  id: number;
  name: string;
}

/** `LearningWorkshop`. */
export interface LearningWorkshop {
  id: number;
  title: string;
  series: string;
  ageGroup: string;
  skillLevel: string;
  duration: string;
  toolsUsed: string;
  learningOutcome: string;
  safetyRequirements: string;
  takeHomeProject: string;
  certificationBadge: string;
  seatsAvailable: number;
  projectType: string;
  imageUrl: string;
  youTubeVideoLink: string;
}

/** Query filters for GET /learn/workshops. */
export interface LearningWorkshopFilters {
  ageGroup?: string;
  skillLevel?: string;
  projectType?: string;
  toolType?: string;
  duration?: string;
}

/** `LearningPathStep`. */
export interface LearningPathStep {
  id: number;
  learningPathId: number;
  sequence: number;
  title: string;
  duration: string;
  tools: string;
  learningOutcome: string;
  project: string;
}

/** `LearningPath`. */
export interface LearningPath {
  id: number;
  title: string;
  description: string;
  steps: LearningPathStep[];
}

/** `LearningCertification`. */
export interface LearningCertification {
  id: number;
  name: string;
  description: string;
  badgeImageUrl: string;
}

/** `LearningDashboard`. */
export interface LearningDashboard {
  workshopsCompleted: number;
  learningHours: number;
  badgesEarned: number;
  currentLearningPath: string;
  upcomingWorkshops: number;
  aiDesignCredits: number;
}

/** `CreateIncubatorConceptRequest` without `userId`. */
export interface IncubatorConceptInput {
  title: string;
  description: string;
}

/** Query + binary body of POST /learn/media (userId comes from the JWT). */
export interface LearningMediaInput {
  conceptId: number;
  file: Blob;
  fileName?: string;
  fileType?: string;
  youtubeVideoLink?: string;
}
