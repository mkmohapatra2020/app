// ============================================================
// API configuration — single source of truth for every endpoint,
// timeout and status code used by the site (Flowerna pattern).
// ============================================================
/* global __IMAGE_DEPLOYMENT__ */

export const IS_DEV = import.meta.env.DEV;

export const API_BASE_URLS = {
  // Same-origin by default: Netlify functions in production, Vite proxy in dev.
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  // Weekend-Live backend (Azure Functions). Called through a same-origin proxy
  // (/wl-api → https://func-weekendlive-api…/api/api) so the browser never hits CORS.
  // Set VITE_BACKEND_URL to call another URL directly.
  BACKEND: import.meta.env.VITE_BACKEND_URL || '/wl-api',
};

// Azure model deployment name (not a secret — the key never reaches the browser).
export const IMAGE_DEPLOYMENT = typeof __IMAGE_DEPLOYMENT__ !== 'undefined' ? __IMAGE_DEPLOYMENT__ : 'gpt-image-2.5-sunburst';

export const API_ENDPOINTS = {
  IMAGE: {
    // Local dev only — Vite proxy adds the api-key and forwards to Azure.
    DEV_GENERATE: '/api/generate-image',
    DEV_EDIT: '/api/edit-image',
    // Production — Netlify functions (background job + polling).
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
    MY_REQUESTS: '/ai-visualization/my-requests',
  },
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
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
