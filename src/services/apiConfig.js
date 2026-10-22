// ============================================================
// API configuration — single source of truth for every endpoint,
// timeout and status code used by the site (Flowerna pattern).
// ============================================================
/* global __IMAGE_DEPLOYMENT__ */

export const IS_DEV = import.meta.env.DEV;

export const API_BASE_URLS = {
  // Same-origin: Azure Static Web Apps functions (api/) in production, Vite proxy in dev.
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  // Weekend-Live backend: the browser calls the APIM gateway directly (needs the
  // APIM CORS policy for the site origin). Set VITE_BACKEND_URL to override.
  // VITE_APIM_BASE_URL (…/service, as in the image-generation spec) is accepted too.
  BACKEND: import.meta.env.VITE_BACKEND_URL
    || (import.meta.env.VITE_APIM_BASE_URL ? `${import.meta.env.VITE_APIM_BASE_URL.replace(/\/$/, '')}/api` : '')
    || 'https://appi-wl.azure-api.net/service/api',
};

// Azure model deployment name (not a secret — the key never reaches the browser).
export const IMAGE_DEPLOYMENT = typeof __IMAGE_DEPLOYMENT__ !== 'undefined' ? __IMAGE_DEPLOYMENT__ : 'gpt-image-2.5-sunburst';

export const API_ENDPOINTS = {
  IMAGE: {
    // Local dev only — Vite proxy adds the api-key and forwards to Azure.
    DEV_GENERATE: '/api/generate-image',
    DEV_EDIT: '/api/edit-image',
    // Production — Azure Static Web Apps functions in api/ (background job + polling).
    UPLOAD_SOURCE: '/api/upload-image-source',
    START_JOB: '/api/start-image-job',
    JOB_STATUS: (id) => `/api/image-jobs/${encodeURIComponent(id)}`,
  },
};

// Every endpoint from weekendlive_swagger.json (paths are relative to BACKEND).
const enc = encodeURIComponent;
export const BACKEND_ENDPOINTS = {
  AI_VISUALIZATION: {
    UPLOAD: '/ai-visualization/upload',
    SUBMIT: '/ai-visualization/submit',
    BY_ID: (id) => `/ai-visualization/${enc(id)}`,
    STATUS: (id) => `/ai-visualization/${enc(id)}/status`,
    MY_HISTORY: '/ai-visualization/my-history', // ?customerId= (required)
    // SAS tokens moved to /read-sas-token and /write-sas-token (FILES below).
  },
  HERITAGE_RESTORATION: {
    CREATE: '/heritage-restoration',
    LIST: '/heritage-restoration',
    BY_ID: (id) => `/heritage-restoration/${enc(id)}`,
    PHOTOS: (id) => `/heritage-restoration/${enc(id)}/photos`,
    ASSESSMENT: (id) => `/heritage-restoration/${enc(id)}/assessment`,
  },
  ELDERLY_DIY: {
    LIST: '/elderly-diy',
    REGISTER: '/elderly-diy/register',
    MY_PROGRAMS: '/elderly-diy/my-programs',
  },
  FAMILY_PROGRAMS: {
    LIST: '/family-programs',
    REGISTER: '/family-programs/register',
  },
  INCUBATOR: {
    CREATE: '/incubator/projects',
    LIST: '/incubator/projects',
    BY_ID: (id) => `/incubator/projects/${enc(id)}`,
    FILES: (id) => `/incubator/projects/${enc(id)}/files`,
    MENTOR_SESSION: (id) => `/incubator/projects/${enc(id)}/mentor-session`,
  },
  AUTH: {
    ENCRYPTION_KEY: '/auth/encryption-key',
    REGISTER: '/auth/register',          // { cipherText } (RSA-OAEP-256)
    REGISTER_VERIFY: '/auth/register/verify',
    LOGIN: '/auth/login',           // encrypted { cipherText } (RSA-OAEP-256)
    LOGIN_CHECK: '/auth/logincheck', // plain { usernameOrEmail, password } — fallback only
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    GOOGLE: '/auth/google',
    FACEBOOK: '/auth/facebook',
  },
  CAMPAIGNS: {
    LIST: '/campaigns',
    BY_ID: (id) => `/campaigns/${enc(id)}`,
    REGISTER: (id) => `/campaigns/${enc(id)}/register`,
    CANCEL: (id) => `/campaigns/${enc(id)}/registration`,
    PARTICIPANTS: (id) => `/campaigns/${enc(id)}/participants`,
  },
  COMMUNITY: {
    POSTS: '/community/posts',
    LIKE: (id) => `/community/posts/${enc(id)}/like`,
    COMMENT: (id) => `/community/posts/${enc(id)}/comment`,
  },
  CONTENT: {
    TESTIMONIALS: '/testimonials',
    ARTICLES: '/articles',
    ARTICLE: (slug) => `/articles/${enc(slug)}`,
    ARTICLE_SEARCH: '/articles/search',
    HERITAGE: '/heritage-projects',
    CRAFTS: '/crafts',
    CRAFT_GALLERY: '/crafts/gallery',
  },
  SHOP: {
    PRODUCTS: '/products',
    PRODUCT: (id) => `/products/${enc(id)}`,
    CART: '/cart',
    CHECKOUT: '/checkout',
  },
  ASSESSMENT: {
    QUESTIONS: '/elderly-assessment/questions',
    SUBMIT: '/elderly-assessment',
    VISIT: '/elderly-assessment/visit',
  },
  EVENTS: {
    LIST: '/events',
    UPCOMING: '/events/upcoming',
    BOOK: '/events/book',
  },
  LEADS: {
    SITE_VISIT: '/leads/site-visit',
    QUOTATION: '/leads/quotation',
    CALLBACK: '/leads/callback',
  },
  LOCATIONS: {
    LIST: '/locations',
    NEARBY: '/locations/nearby',
  },
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    STATISTICS: '/admin/statistics',
    REVENUE: '/admin/revenue',
    CAMPAIGN_OCCUPANCY: '/admin/campaign-occupancy',
    HERITAGE_STATS: '/admin/heritage-stats',
    INCUBATOR_STATS: '/admin/incubator-stats',
    ELDERLY_DIY_STATS: '/admin/elderly-diy-stats',
    AI_COST_STATS: '/admin/ai-cost-stats',
  },
  AI: {
    RECOMMEND_WORKSHOP: '/ai/recommend-workshop',
    RECOMMEND_PROJECTS: '/ai/recommend-projects',
    SKILL_ASSESSMENT: '/ai/skill-assessment',
  },
  NOTIFICATIONS: {
    EMAIL: '/notifications/email',
    SMS: '/notifications/sms',
    WHATSAPP: '/notifications/whatsapp',
    PUSH: '/notifications/push',
  },
  PASSPORT: {
    EARN_BADGE: '/passport/badges',
    USER_BADGES: '/passport/user-badges',
    PROGRESS: '/passport/progress',
  },
  PAYMENT: {
    CREATE: '/payment/create',
    VERIFY: '/payment/verify',
  },
  PROJECTS: {
    CATEGORIES: '/projects/categories',
    GALLERY: '/projects/gallery',
    BY_ID: (id) => `/projects/${enc(id)}`,
    COMPARISON: (id) => `/projects/${enc(id)}/comparison`,
  },
  // Membership & entitlements. Everything except BY_USER / SUBSCRIBE is mocked
  // until the backend ships it — see src/mocks/mockApi.js and MOCK-APIS.md.
  MEMBERSHIP: {
    FAMILIES: '/membership/families',
    PLANS: '/membership/plans',
    ENTITLEMENTS: '/membership/entitlements',
    MY_MEMBERSHIPS: '/membership/my-memberships',
    MY_ENTITLEMENTS: '/membership/my-entitlements',
    MY_BENEFITS: '/membership/my-benefits',
    MY_AI_CREDITS: '/membership/my-ai-credits',
    ONBOARDING_STATUS: '/user/onboarding-status',
    INCUBATOR_ELIGIBILITY: '/incubator/eligibility',
    GRANT_BONUS_CREDITS: '/admin/membership/grant-bonus-credits',
  },
  DESIGN: {
    CATEGORIES: '/design-categories',
  },
  // Image Generator — live on APIM, not yet in swagger.
  // Blob SAS tokens (swagger tag "File"): imageSasRequest { userId, blobName, containerName, storageType, contentType }
  // → imageSasResponse { blobUri, sasToken, blobName, expiresOn }.
  FILES: {
    WRITE_SAS: '/write-sas-token', // upload a photo straight to Blob Storage
    READ_SAS: '/read-sas-token',   // read a private blob (e.g. a generated image)
  },
  IMAGES: {
    GENERATE: '/images/generate',
    HISTORY: '/images/history', // ?userId=
    QUOTA: '/images/quota',     // ?userId=
  },
  USERS: {
    PROFILE: '/users/profile',
    PROFILE_PHOTO: '/users/profile-photo',
    MEMBERSHIP: '/membership',
    SUBSCRIBE: '/membership/subscribe',
  },
  VISUALIZER: {
    UPLOAD: '/visualizer/upload',
    GENERATE: '/visualizer/generate',
  },
  WORKSHOPS: {
    LIST: '/workshops',
    BY_ID: (id) => `/workshops/${enc(id)}`,
    BOOKING: '/workshops/booking',
    ATTENDANCE: '/workshops/attendance',
    CERTIFICATE: '/workshops/certificate',
  },
};

// Blob containers in the storage account → imageSasRequest.containerName.
export const STORAGE_TYPES = {
  UPLOAD: import.meta.env.VITE_STORAGE_UPLOAD || 'uploaded',       // user photos
  GENERATED: import.meta.env.VITE_STORAGE_GENERATED || 'aigenerated', // AI results
};
// imageSasRequest.storageType. ASSUMPTION: the swagger does not list its values —
// confirm with the backend (override with VITE_STORAGE_TYPE).
export const STORAGE_KIND = import.meta.env.VITE_STORAGE_TYPE || 'blob';
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // checked before asking for a write SAS

// Business areas accepted by POST /ai-visualization/submit.
export const BUSINESS_AREAS = ['OutdoorLiving', 'Heritage', 'DIY', 'SeniorLiving', 'Incubator'];

// Used only when the membership API gives no AI_MAX_REFERENCE_IMAGES entitlement.
export const DEFAULT_MAX_REFERENCE_IMAGES = 4;

// Mock API switch. 'planned' (default) = mock only endpoints that are not deployed
// yet; 'off' = always call the real API. See src/mocks/mockApi.js.
export const MOCK_MODE = (import.meta.env.VITE_MOCK_API || 'planned').toLowerCase();

// Request encryption (public key from GET /auth/encryption-key).
//  AUTH:  'auto' (default) = encrypted /auth/login, falling back to /auth/logincheck only
//         when the encrypted endpoint itself fails (5xx/404); 'strict' = never fall back;
//         'off' = plain /auth/logincheck.
//  IMAGE: 'on' = POST /images/generate sends a hybrid-encrypted body (see authCrypto.js);
//         'off' (default) until the backend accepts it — today it ignores { cipherText }.
export const ENCRYPTION = {
  AUTH: (import.meta.env.VITE_AUTH_ENCRYPTION || 'auto').toLowerCase(),
  IMAGE: (import.meta.env.VITE_IMAGE_ENCRYPTION || 'off').toLowerCase(),
};

// AI Design Studio category → visualizationTypeId (SubmitVisualizationDto).
// ASSUMPTION: the swagger gives no list of type ids. Confirm these with the
// backend team and edit here; `outdoor` is used by the homepage visualizer.
export const VISUALIZATION_TYPES = {
  outdoor: 1,
  pergola: 1,
  gazebo: 2,
  terrace: 3,
  senior: 4,
  heritage: 5,
  product: 6,
};

// Builds a full backend URL: backendUrl(BACKEND_ENDPOINTS.CAMPAIGNS.BY_ID, 12)
export function backendUrl(endpoint, arg, query) {
  const path = typeof endpoint === 'function' ? endpoint(arg) : endpoint;
  return buildUrl(API_BASE_URLS.BACKEND, path, query);
}

export const API_CONFIG = {
  TIMEOUT_MS: 30000,
  IMAGE_TIMEOUT_MS: 180000,     // a single Azure call can take up to ~90 s
  POLL_INTERVAL_MS: 3000,
  POLL_MAX_WAIT_MS: 4 * 60 * 1000,
  IMAGE_SIZES: ['1024x1024', '1536x1024', '1024x1536'],
  STATUS_CODES: {
    SUCCESS: 200,
    ACCEPTED: 202,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    PAYLOAD_TOO_LARGE: 413,
    UNSUPPORTED_MEDIA: 415,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
  },
};

export const DEFAULT_HEADERS = { Accept: 'application/json' };

// Joins base + endpoint (string or builder fn) and appends query params.
export function buildUrl(baseUrl, endpoint, params) {
  const path = typeof endpoint === 'function' ? endpoint(params) : endpoint;
  if (/^https?:\/\//.test(path)) return path;
  const full = `${baseUrl || ''}${path}`;
  if (!params || typeof endpoint === 'function') return full;
  const url = new URL(full, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.append(k, String(v)); });
  return baseUrl ? url.toString() : `${url.pathname}${url.search}`;
}

export default { IS_DEV, API_BASE_URLS, API_ENDPOINTS, BACKEND_ENDPOINTS, API_CONFIG, DEFAULT_HEADERS, IMAGE_DEPLOYMENT, buildUrl, backendUrl };
