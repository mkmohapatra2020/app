/**
 * Membership — exactly the endpoints in the backend swagger (tags Membership,
 * MembershipAdmin, Users):
 *
 *   GET  /membership                          ApiResponse { success, message, data }
 *   GET  /membership/my-memberships           object
 *   GET  /membership/my-benefits              object
 *   GET  /membership/my-entitlements          MembershipEntitlementResponse
 *   GET  /membership/my-credits               MembershipEntitlementResponse
 *   GET  /membership/my-ai-credits            object
 *   POST /membership/subscribe                (userService.subscribe)
 *   POST /admin/membership/grant-bonus-credits { userId, credits, reason }
 *
 * MembershipEntitlementResponse = { membership, allocatedCredits, bonusCredits, usedCredits,
 * remainingCredits, maxReferenceImages, priorityQueue, maxConcurrentRequests }.
 *
 * No mocks: every call goes to the live API with the login token (Authorization: Bearer …).
 * Mapped records keep the untouched API object in `raw`, so the UI can show every field.
 */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { pick, unwrap, unwrapList } from './adapters.js';

const E = BACKEND_ENDPOINTS.MEMBERSHIP;
const AUTH = { auth: true };
const str = (v, d = '') => (v === undefined || v === null ? d : String(v));
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const has = (o, ...keys) => pick(o, ...keys) !== undefined;
const listOf = (v, ...keys) => (Array.isArray(v) ? v : unwrapList(v, ...keys));
const get = (ep, signal) => api.get(ep, { ...AUTH, signal });

const toMembershipRow = (m) => ({
  id: pick(m, 'membershipId', 'id'),
  planCode: str(pick(m, 'planCode', 'membership', 'code')),
  planName: str(pick(m, 'planName', 'membershipName', 'name', 'planCode', 'membership')),
  familyCode: str(pick(m, 'familyCode', 'family')),
  familyName: str(pick(m, 'familyName', 'family')),
  source: str(pick(m, 'membershipSource', 'source')),
  status: str(pick(m, 'status'), 'Active'),
  startDate: str(pick(m, 'startDate')),
  endDate: str(pick(m, 'endDate')),
  raw: m,
});
const toEntitlement = (e) => ({ code: str(pick(e, 'code', 'name', 'benefit')), value: str(pick(e, 'value'), 'true') });

/** Credits from MembershipEntitlementResponse (or { allocated, consumed, remaining }). */
function toCredits(p = {}) {
  const bonus = num(pick(p, 'bonusCredits'));
  const allocated = has(p, 'allocated') ? num(pick(p, 'allocated')) : num(pick(p, 'allocatedCredits')) + bonus;
  const consumed = num(pick(p, 'consumed', 'used', 'usedCredits'));
  const remaining = has(p, 'remaining', 'remainingCredits') ? num(pick(p, 'remaining', 'remainingCredits')) : Math.max(0, allocated - consumed);
  return { membership: str(pick(p, 'membership')), allocated, consumed, remaining, bonus, raw: p };
}

class MembershipService {
  /** GET /membership — returned as sent (inside the ApiResponse envelope). */
  overview({ signal } = {}) { return get(E.OVERVIEW, signal).then((r) => mapRes(r, (d) => unwrap(d) ?? null)); }

  myMemberships({ signal } = {}) {
    return get(E.MY_MEMBERSHIPS, signal).then((r) => mapRes(r, (d) => {
      const p = unwrap(d);
      // A list, an object holding a list, or a single membership object.
      const rows = Array.isArray(p) || listOf(p, 'plans', 'memberships').length ? listOf(p, 'plans', 'memberships') : p && typeof p === 'object' ? [p] : [];
      return rows.map(toMembershipRow).filter((m) => m.planCode || m.planName);
    }));
  }
  /** MembershipEntitlementResponse → { plans: [membership], entitlements, raw }. */
  myEntitlements({ signal } = {}) {
    return get(E.MY_ENTITLEMENTS, signal).then((r) => mapRes(r, (d) => {
      const p = unwrap(d) || {};
      const plans = listOf(pick(p, 'plans') || []).map(String);
      const single = pick(p, 'membership', 'planCode');
      return {
        plans: plans.length ? plans : single ? [String(single)] : [],
        entitlements: listOf(pick(p, 'entitlements') || []).map(toEntitlement).filter((e) => e.code),
        raw: p,
      };
    }));
  }
  /** GET /membership/my-benefits → { list: [{ code, value }], raw }. */
  myBenefits({ signal } = {}) {
    return get(E.MY_BENEFITS, signal).then((r) => mapRes(r, (d) => {
      const p = unwrap(d) ?? {};
      const list = listOf(p, 'benefits', 'entitlements').map((e) => (typeof e === 'string' ? { code: e, value: 'true' } : toEntitlement(e))).filter((e) => e.code);
      return { list, raw: p };
    }));
  }
  myAiCredits({ signal } = {}) { return get(E.MY_AI_CREDITS, signal).then((r) => mapRes(r, (d) => toCredits(unwrap(d) || {}))); }
  /** GET /membership/my-credits — MembershipEntitlementResponse (credits + limits). */
  myCredits({ signal } = {}) { return get(E.MY_CREDITS, signal).then((r) => mapRes(r, (d) => toCredits(unwrap(d) || {}))); }
  grantBonusCredits({ userId, credits, reason, signal }) { return api.post(E.GRANT_BONUS_CREDITS, { userId: Number(userId), credits: Number(credits), reason }, { ...AUTH, signal }); }
}

export const membershipService = new MembershipService();
export default membershipService;
