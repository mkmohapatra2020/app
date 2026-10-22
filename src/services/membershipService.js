/**
 * Membership, entitlements and AI credits. Plans, families and benefits come
 * only from these calls — the UI never hardcodes them.
 * Most endpoints are mocked until deployed (src/mocks/mockApi.js, MOCK-APIS.md).
 */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { pick, unwrap, unwrapList } from './adapters.js';

const E = BACKEND_ENDPOINTS.MEMBERSHIP;
const str = (v, d = '') => (v === undefined || v === null ? d : String(v));
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const listOf = (v, ...keys) => (Array.isArray(v) ? v : unwrapList(v, ...keys));

const toFamily = (f) => ({ code: str(pick(f, 'familyCode', 'code')), name: str(pick(f, 'familyName', 'name')), description: str(pick(f, 'description')), order: num(pick(f, 'displayOrder'), 99) });
const toPlan = (p) => ({
  id: pick(p, 'planId', 'id'),
  code: str(pick(p, 'planCode', 'code')),
  name: str(pick(p, 'planName', 'name')),
  familyCode: str(pick(p, 'familyCode', 'family')),
  description: str(pick(p, 'description')),
  price: pick(p, 'price') === undefined ? undefined : num(pick(p, 'price')),
  currency: str(pick(p, 'currency'), 'INR'),
  period: str(pick(p, 'billingPeriod', 'period')),
  order: num(pick(p, 'displayOrder'), 99),
  featured: pick(p, 'isFeatured', 'featured') === true,
});
const toMembershipRow = (m) => ({
  id: pick(m, 'membershipId', 'id'),
  planCode: str(pick(m, 'planCode')),
  planName: str(pick(m, 'planName', 'planCode')),
  familyCode: str(pick(m, 'familyCode', 'family')),
  familyName: str(pick(m, 'familyName', 'family')),
  source: str(pick(m, 'membershipSource', 'source')),
  status: str(pick(m, 'status'), 'Active'),
  startDate: str(pick(m, 'startDate')),
  endDate: str(pick(m, 'endDate')),
});
const toEntitlement = (e) => ({ code: str(pick(e, 'code')), value: str(pick(e, 'value')) });
const byOrder = (a, b) => a.order - b.order;

class MembershipService {
  families({ signal } = {}) { return api.get(E.FAMILIES, { signal }).then((r) => mapRes(r, (d) => listOf(unwrap(d), 'families').map(toFamily).filter((f) => f.code).sort(byOrder))); }
  plans({ signal } = {}) { return api.get(E.PLANS, { signal }).then((r) => mapRes(r, (d) => listOf(unwrap(d), 'plans').map(toPlan).filter((p) => p.code).sort(byOrder))); }

  /** Comparison matrix → { rows: [{ code, name }], values: { [planCode]: { [code]: value } } } */
  entitlementMatrix({ signal } = {}) {
    return api.get(E.ENTITLEMENTS, { signal }).then((r) => mapRes(r, (d) => {
      const p = unwrap(d) || {};
      const defs = listOf(pick(p, 'definitions') || []);
      const vals = listOf(pick(p, 'values') || []);
      const values = {};
      vals.forEach((v) => { const plan = str(pick(v, 'planCode')); (values[plan] ||= {})[str(pick(v, 'code'))] = str(pick(v, 'value')); });
      const codes = defs.length ? defs : [...new Set(vals.map((v) => str(pick(v, 'code'))))].map((code) => ({ code }));
      const rows = codes.map((x) => ({ code: str(pick(x, 'code')), name: str(pick(x, 'name')), order: num(pick(x, 'displayOrder'), 99) })).filter((x) => x.code).sort(byOrder);
      return { rows, values };
    }));
  }

  myMemberships({ signal } = {}) {
    return api.get(E.MY_MEMBERSHIPS, { signal }).then((r) => mapRes(r, (d) => listOf(unwrap(d), 'plans', 'memberships').map(toMembershipRow).filter((m) => m.planCode)));
  }
  myEntitlements({ signal } = {}) {
    return api.get(E.MY_ENTITLEMENTS, { signal }).then((r) => mapRes(r, (d) => {
      const p = unwrap(d) || {};
      return { plans: listOf(pick(p, 'plans') || []).map(String), entitlements: listOf(pick(p, 'entitlements') || []).map(toEntitlement).filter((e) => e.code) };
    }));
  }
  myBenefits({ signal } = {}) { return api.get(E.MY_BENEFITS, { signal }).then((r) => mapRes(r, (d) => listOf(unwrap(d), 'entitlements').map(toEntitlement).filter((e) => e.code))); }
  myAiCredits({ signal } = {}) {
    return api.get(E.MY_AI_CREDITS, { signal }).then((r) => mapRes(r, (d) => {
      const p = unwrap(d) || {};
      return { allocated: num(pick(p, 'allocated')), consumed: num(pick(p, 'consumed', 'used')), remaining: num(pick(p, 'remaining')) };
    }));
  }
  onboardingStatus({ signal } = {}) {
    return api.get(E.ONBOARDING_STATUS, { signal }).then((r) => mapRes(r, (d) => {
      const p = unwrap(d) || {};
      return { received: pick(p, 'hasReceivedWelcomeBenefit') === true, welcomeCredits: num(pick(p, 'availableWelcomeCredits')) };
    }));
  }
  incubatorEligibility({ signal } = {}) { return api.get(E.INCUBATOR_ELIGIBILITY, { signal }).then((r) => mapRes(r, (d) => pick(unwrap(d) || {}, 'eligible') === true)); }
  grantBonusCredits({ userId, credits, reason, signal }) { return api.post(E.GRANT_BONUS_CREDITS, { userId: Number(userId), credits: Number(credits), reason }, { signal }); }
}

export const membershipService = new MembershipService();
export default membershipService;
