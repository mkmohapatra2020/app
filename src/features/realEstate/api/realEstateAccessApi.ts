/** GET /realestate/access — which Real Estate features the signed-in user may use. */
import { apiGet } from '../../../api/apiClient.ts';
import { requireAuth } from '../../../api/authApi.ts';
import type { RealEstateAccess } from '../types/realEstateTypes.ts';
import { toAccess } from './normalize.ts';
import { RE_BASE } from './realEstateApi.ts';

export const DISABLED_ACCESS: RealEstateAccess = Object.freeze({ enabled: false, partnerId: null, features: [], permissions: [] }) as RealEstateAccess;

export async function fetchRealEstateAccess(signal?: AbortSignal): Promise<RealEstateAccess> {
  requireAuth();
  return toAccess(await apiGet<unknown>(`${RE_BASE}/access`, { signal }));
}
