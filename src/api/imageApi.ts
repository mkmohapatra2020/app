/** Image generation, history and quota. `userId` always comes from the JWT. */
import { ApiError, apiGet, apiPost } from './apiClient.ts';
import { requireUserId } from './authApi.ts';
import type { GenerateImageInput, GenerateImageResponse, ImageHistoryResponse, ImageQuotaResponse } from './types.ts';

export const imageApi = {
  /** POST /images/generate */
  async generate(input: GenerateImageInput, signal?: AbortSignal) {
    const prompt = String(input.prompt ?? '').trim();
    if (!prompt) throw new ApiError('validation', 'Describe the image you want.', 0, { prompt: ['Describe the image you want.'] });
    const { style, size, referenceImageUrls, referenceImageBlobName, referenceImageContainerName, referenceImageUrl } = input;
    return apiPost<GenerateImageResponse>('/images/generate', {
      userId: requireUserId(), prompt, style, size, referenceImageUrls, referenceImageBlobName, referenceImageContainerName, referenceImageUrl,
    }, { signal, timeout: 120_000 });
  },
  /** GET /images/history?userId=<from JWT> */
  async history(signal?: AbortSignal) {
    return apiGet<ImageHistoryResponse>('/images/history', { params: { userId: requireUserId() }, signal });
  },
  /** GET /images/quota?userId=<from JWT> */
  async quota(signal?: AbortSignal) {
    return apiGet<ImageQuotaResponse>('/images/quota', { params: { userId: requireUserId() }, signal });
  },
};

export default imageApi;
