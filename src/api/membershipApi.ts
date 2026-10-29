/**
 * Membership — the signed-in user's own data. The user comes from the JWT on the
 * server; nothing identifying is sent from the UI.
 */
import { apiGet } from './apiClient.ts';
import { requireAuth } from './authApi.ts';
import type { MembershipEntitlementResponse, MembershipObject } from './types.ts';

const mine = async <T>(path: string, signal?: AbortSignal): Promise<T> => {
  requireAuth();
  return apiGet<T>(`/membership/${path}`, { signal });
};

export const membershipApi = {
  /** GET /membership/my-credits */
  myCredits: (signal?: AbortSignal) => mine<MembershipEntitlementResponse>('my-credits', signal),
  /** GET /membership/my-memberships */
  myMemberships: (signal?: AbortSignal) => mine<MembershipObject>('my-memberships', signal),
  /** GET /membership/my-benefits */
  myBenefits: (signal?: AbortSignal) => mine<MembershipObject>('my-benefits', signal),
  /**
   * GET /membership/my-membership-entitlements
   * Note: not in the swagger (checked 2026-10-29) — expect 404 until the backend adds it.
   */
  myMembershipEntitlements: (signal?: AbortSignal) => mine<MembershipObject>('my-membership-entitlements', signal),
  /** GET /membership/my-ai-credits */
  myAiCredits: (signal?: AbortSignal) => mine<MembershipObject>('my-ai-credits', signal),
  /** GET /membership/my-entitlements */
  myEntitlements: (signal?: AbortSignal) => mine<MembershipEntitlementResponse>('my-entitlements', signal),
};

export default membershipApi;
