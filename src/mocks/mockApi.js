/**
 * Mock API for endpoints the backend has not deployed yet (they return 404 on APIM).
 *
 * backendClient.js asks `mockFor(method, path)` before every call. When a handler
 * exists here (and VITE_MOCK_API is not 'off'), the request never leaves the
 * browser and the handler's response is returned in the same ApiResponse shape
 * httpClient produces. Everything else goes to the real API untouched.
 *
 * Shapes follow the contracts in MOCK-APIS.md. When an endpoint goes live:
 * delete its entry from HANDLERS below — no UI change is needed.
 *
 * All values here are SAMPLE DATA for development only. The UI never reads
 * plan names, prices or credit numbers from anywhere but these responses.
 */
import { MOCK_MODE } from '../services/apiConfig.js';
import { session } from '../services/session.js';
import { studio } from '../data/flagship.js';

const STORE_KEY = 'wl-mock-state';
const delay = () => new Promise((r) => setTimeout(r, 250 + Math.random() * 350));

// ---------- sample catalogue ----------
const FAMILIES = [
  { familyCode: 'DIY', familyName: 'DIY Memberships', description: 'Learn, make and build with the Weekend-Live community.', displayOrder: 1 },
  { familyCode: 'SERVICE', familyName: 'Service Memberships', description: 'Outdoor-living design, reviews and priority support for your home.', displayOrder: 2 },
];

const PLANS = [
  { planId: 1, planCode: 'EXPLORER', planName: 'Explorer', familyCode: 'DIY', description: 'Start your DIY journey.', price: 0, currency: 'INR', billingPeriod: 'month', displayOrder: 1, isFeatured: false },
  { planId: 2, planCode: 'MAKER', planName: 'Maker', familyCode: 'DIY', description: 'For regular weekend makers.', price: 499, currency: 'INR', billingPeriod: 'month', displayOrder: 2, isFeatured: true },
  { planId: 3, planCode: 'CREATOR', planName: 'Creator', familyCode: 'DIY', description: 'Build, prototype and launch your ideas.', price: 999, currency: 'INR', billingPeriod: 'month', displayOrder: 3, isFeatured: false },
  { planId: 4, planCode: 'BRONZE', planName: 'Bronze', familyCode: 'SERVICE', description: 'Design help for one outdoor space.', price: 799, currency: 'INR', billingPeriod: 'month', displayOrder: 1, isFeatured: false },
  { planId: 5, planCode: 'SILVER', planName: 'Silver', familyCode: 'SERVICE', description: 'Reviews and consultations for the whole home.', price: 1499, currency: 'INR', billingPeriod: 'month', displayOrder: 2, isFeatured: true },
  { planId: 6, planCode: 'GOLD', planName: 'Gold', familyCode: 'SERVICE', description: 'Priority everything, all year.', price: 2499, currency: 'INR', billingPeriod: 'month', displayOrder: 3, isFeatured: false },
];

// Entitlement definitions (rows of the comparison matrix).
const ENTITLEMENT_DEFS = [
  { code: 'AI_MONTHLY_CREDITS', name: 'AI design credits / month', valueType: 'number', displayOrder: 1 },
  { code: 'AI_WELCOME_CREDITS', name: 'Welcome AI credits', valueType: 'number', displayOrder: 2 },
  { code: 'AI_MAX_REFERENCE_IMAGES', name: 'Reference images per design', valueType: 'number', displayOrder: 3 },
  { code: 'AI_PRIORITY_QUEUE', name: 'Priority AI queue', valueType: 'boolean', displayOrder: 4 },
  { code: 'COMMUNITY_ACCESS', name: 'Community access', valueType: 'boolean', displayOrder: 5 },
  { code: 'WORKSHOP_DISCOUNT_PERCENT', name: 'Workshop discount', valueType: 'percent', displayOrder: 6 },
  { code: 'INCUBATOR_ACCESS', name: 'DIY incubator access', valueType: 'boolean', displayOrder: 7 },
  { code: 'DESIGN_REVIEW_ACCESS', name: 'Design reviews', valueType: 'boolean', displayOrder: 8 },
  { code: 'HERITAGE_REVIEW_ACCESS', name: 'Heritage restoration review', valueType: 'boolean', displayOrder: 9 },
  { code: 'FREE_CONSULTATION_COUNT', name: 'Free consultations', valueType: 'number', displayOrder: 10 },
  { code: 'PRIORITY_SUPPORT', name: 'Priority support', valueType: 'boolean', displayOrder: 11 },
];

// planCode → { code: value } (values are strings, like the real API).
const PLAN_VALUES = {
  EXPLORER: { AI_MONTHLY_CREDITS: '2', AI_WELCOME_CREDITS: '1', AI_MAX_REFERENCE_IMAGES: '2', AI_PRIORITY_QUEUE: 'false', COMMUNITY_ACCESS: 'true', WORKSHOP_DISCOUNT_PERCENT: '0' },
  MAKER: { AI_MONTHLY_CREDITS: '15', AI_WELCOME_CREDITS: '1', AI_MAX_REFERENCE_IMAGES: '5', AI_PRIORITY_QUEUE: 'false', COMMUNITY_ACCESS: 'true', WORKSHOP_DISCOUNT_PERCENT: '10' },
  CREATOR: { AI_MONTHLY_CREDITS: '30', AI_WELCOME_CREDITS: '1', AI_MAX_REFERENCE_IMAGES: '8', AI_PRIORITY_QUEUE: 'true', COMMUNITY_ACCESS: 'true', WORKSHOP_DISCOUNT_PERCENT: '20', INCUBATOR_ACCESS: 'true' },
  BRONZE: { AI_MONTHLY_CREDITS: '10', AI_MAX_REFERENCE_IMAGES: '4', DESIGN_REVIEW_ACCESS: 'true', FREE_CONSULTATION_COUNT: '0' },
  SILVER: { AI_MONTHLY_CREDITS: '20', AI_MAX_REFERENCE_IMAGES: '8', AI_PRIORITY_QUEUE: 'true', DESIGN_REVIEW_ACCESS: 'true', HERITAGE_REVIEW_ACCESS: 'true', FREE_CONSULTATION_COUNT: '1' },
  GOLD: { AI_MONTHLY_CREDITS: '30', AI_MAX_REFERENCE_IMAGES: '12', AI_PRIORITY_QUEUE: 'true', DESIGN_REVIEW_ACCESS: 'true', HERITAGE_REVIEW_ACCESS: 'true', FREE_CONSULTATION_COUNT: '2', PRIORITY_SUPPORT: 'true' },
};

// Studio categories. businessArea / visualizationTypeId are what /ai-visualization/submit needs.
const AREA = { pergola: 'OutdoorLiving', gazebo: 'OutdoorLiving', terrace: 'OutdoorLiving', senior: 'SeniorLiving', heritage: 'Heritage', product: 'DIY' };
const TYPE = { pergola: 1, gazebo: 2, terrace: 3, senior: 4, heritage: 5, product: 6 };
const CATEGORIES = studio.categories.map((c, i) => ({
  categoryId: i + 1, code: c.id, name: c.label, description: c.hint, icon: c.icon,
  businessArea: AREA[c.id] || 'OutdoorLiving', visualizationTypeId: TYPE[c.id] || 1, promptTemplate: c.prompt, displayOrder: i + 1,
}));

// ---------- per-user mock state (localStorage, so it survives reloads) ----------
const userKey = () => String(session.user()?.id || session.user()?.email || 'guest');
function loadState() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } }
function saveState(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* storage blocked */ } }
function userState() {
  const all = loadState();
  const k = userKey();
  if (!all[k]) {
    // Every new mock user starts as a Maker + Silver member with the welcome gift unused.
    all[k] = { plans: ['MAKER', 'SILVER'], consumed: 0, bonus: 0, welcomeUsed: false };
    saveState(all);
  }
  return all[k];
}
function updateUser(change) { const all = loadState(); all[userKey()] = { ...userState(), ...change }; saveState(all); }

// Highest value wins per code across the user's plans (numbers: max, booleans: any true).
function effectiveEntitlements(planCodes) {
  const out = {};
  planCodes.forEach((p) => Object.entries(PLAN_VALUES[p] || {}).forEach(([code, value]) => {
    const prev = out[code];
    if (prev === undefined) out[code] = value;
    else if (value === 'true' || prev === 'true') out[code] = String(value === 'true' || prev === 'true');
    else if (Number.isFinite(Number(value))) out[code] = String(Math.max(Number(prev) || 0, Number(value)));
  }));
  return ENTITLEMENT_DEFS.filter((d) => out[d.code] !== undefined).map((d) => ({ code: d.code, value: out[d.code] }));
}

function credits() {
  const u = userState();
  const ents = effectiveEntitlements(u.plans);
  const val = (code) => Number(ents.find((e) => e.code === code)?.value) || 0;
  // The welcome credit is part of the allocation; spending it is just consumed + 1.
  const allocated = val('AI_MONTHLY_CREDITS') + val('AI_WELCOME_CREDITS') + u.bonus;
  return { allocated, consumed: u.consumed, remaining: Math.max(0, allocated - u.consumed) };
}

const ok = (data, status = 200) => ({ success: true, status, data, mocked: true });
const fail = (status, error) => ({ success: false, status, error, mocked: true });
const needAuth = (fn) => (req) => (session.token() ? fn(req) : fail(401, 'Please sign in to continue.'));

// ---------- handlers: "METHOD /path" → (req) => ApiResponse ----------
const HANDLERS = {
  'GET /membership/families': () => ok(FAMILIES),
  'GET /membership/plans': () => ok(PLANS),
  'GET /membership/entitlements': () => ok({
    definitions: ENTITLEMENT_DEFS,
    values: Object.entries(PLAN_VALUES).flatMap(([planCode, vals]) => Object.entries(vals).map(([code, value]) => ({ planCode, code, value }))),
  }),
  'GET /membership/my-memberships': needAuth(() => ok({
    plans: userState().plans.map((code, i) => {
      const p = PLANS.find((x) => x.planCode === code);
      const fam = FAMILIES.find((f) => f.familyCode === p.familyCode);
      return { membershipId: 100 + i, planId: p.planId, planCode: p.planCode, planName: p.planName, familyCode: p.familyCode, familyName: fam.familyName, membershipSource: 'DirectPurchase', status: 'Active', startDate: '2026-10-01', endDate: null };
    }),
  })),
  'GET /membership/my-entitlements': needAuth(() => ok({ plans: userState().plans, entitlements: effectiveEntitlements(userState().plans) })),
  'GET /membership/my-benefits': needAuth(() => ok({ entitlements: effectiveEntitlements(userState().plans).filter((e) => !e.code.startsWith('AI_')) })),
  'GET /membership/my-ai-credits': needAuth(() => ok(credits())),
  'GET /user/onboarding-status': needAuth(() => {
    const u = userState();
    return ok({ hasReceivedWelcomeBenefit: u.welcomeUsed, availableWelcomeCredits: u.welcomeUsed ? 0 : 1 });
  }),
  'GET /design-categories': () => ok(CATEGORIES),
  'GET /incubator/eligibility': needAuth(() => ok({ eligible: effectiveEntitlements(userState().plans).some((e) => e.code === 'INCUBATOR_ACCESS' && e.value === 'true') })),
  'POST /admin/membership/grant-bonus-credits': needAuth(({ body }) => {
    if (!session.user()?.isAdmin) return fail(403, 'You do not have permission to perform this action.');
    const n = Number(body?.credits);
    if (!Number.isInteger(n) || n <= 0) return fail(400, 'Credits must be a positive whole number.');
    if (!body?.userId) return fail(400, 'User id is required.');
    // Mock: bonus is applied to the signed-in admin's own mock balance so it is visible.
    updateUser({ bonus: userState().bonus + n });
    return ok({ success: true, message: `Granted ${n} bonus credits to user ${body.userId}.`, data: { userId: body.userId, credits: n, reason: body.reason || '' } });
  }),
};

/** Mock handler for this request, or null to call the real API. */
export function mockFor(method, path) {
  if (MOCK_MODE === 'off') return null;
  const clean = String(path).split('?')[0];
  const handler = HANDLERS[`${method.toUpperCase()} ${clean}`];
  if (!handler) return null;
  return async (req) => { await delay(); return handler(req); };
}

/** Endpoints currently served by this file (shown in dev tools / docs). */
export const MOCKED_ENDPOINTS = Object.keys(HANDLERS);

/**
 * Mock side effects of LIVE calls, so mocked balances behave like the real ones
 * will: a successful AI submission spends a credit and uses up the welcome gift.
 * Remove once /membership/my-ai-credits is live (the server will do this).
 */
export function afterLiveCall(method, path, res) {
  if (MOCK_MODE === 'off' || !res?.success) return;
  if (method === 'POST' && String(path).startsWith('/ai-visualization/submit')) {
    const u = userState();
    updateUser({ consumed: u.consumed + 1, welcomeUsed: true });
  }
}

if (import.meta.env.DEV && MOCK_MODE !== 'off') console.info('[mock api] serving', MOCKED_ENDPOINTS.length, 'planned endpoints from src/mocks/mockApi.js');
