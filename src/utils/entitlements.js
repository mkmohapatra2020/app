// Entitlement helpers. Entitlements come from the API as [{ code, value }] with
// string values; these read them without knowing any plan names.
export const entitlementValue = (list = [], code) => list.find((e) => e.code === code)?.value;
export const numericEntitlement = (list, code) => { const n = Number(entitlementValue(list, code)); return Number.isFinite(n) ? n : 0; };
export const booleanEntitlement = (list, code) => String(entitlementValue(list, code)).toLowerCase() === 'true';

// Display-only labels. NEVER use this map to decide eligibility or access.
const LABELS = {
  AI_MONTHLY_CREDITS: 'AI design credits / month',
  AI_WELCOME_CREDITS: 'Welcome AI credits',
  AI_MAX_REFERENCE_IMAGES: 'Reference images per design',
  AI_PRIORITY_QUEUE: 'Priority AI queue',
  COMMUNITY_ACCESS: 'Community access',
  INCUBATOR_ACCESS: 'DIY incubator access',
  WORKSHOP_DISCOUNT_PERCENT: 'Workshop discount',
  FREE_CONSULTATION_COUNT: 'Free consultations',
  DESIGN_REVIEW_ACCESS: 'Design reviews',
  HERITAGE_REVIEW_ACCESS: 'Heritage restoration review',
  SENIOR_HOME_REVIEW_ACCESS: 'Senior home improvement review',
  OUTDOOR_DESIGN_ACCESS: 'Outdoor design access',
  PRIORITY_SUPPORT: 'Priority support',
};

// Unknown codes still render: SOME_NEW_CODE becomes "Some new code".
const humanise = (code) => { const s = String(code).toLowerCase().replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };
export const entitlementLabel = (code, name) => name || LABELS[code] || humanise(code);

// "true" → ✓, "false"/"0"/empty → —, *_PERCENT codes get a %, numbers as is.
export function formatEntitlement(code, value) {
  const v = String(value ?? '').trim();
  if (!v || v.toLowerCase() === 'false' || v === '0') return '—';
  if (v.toLowerCase() === 'true') return '✓';
  if (/PERCENT$/.test(code)) return `${v}%`;
  return v;
}

// A benefit is "on" when it is true or a positive number.
export const isActiveBenefit = (value) => { const v = String(value ?? '').toLowerCase(); return v === 'true' || Number(v) > 0; };
