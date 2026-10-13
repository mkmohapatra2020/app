// ============================================================
// API configuration — single source of truth for every endpoint,
// timeout and status code used by the site (Flowerna pattern).
// ============================================================
/* global __IMAGE_DEPLOYMENT__ */

export const IS_DEV = import.meta.env.DEV;

export const API_BASE_URLS = {
  // Same-origin by default: Netlify functions in production, Vite proxy in dev.
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
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

export default { IS_DEV, API_BASE_URLS, API_ENDPOINTS, API_CONFIG, DEFAULT_HEADERS, IMAGE_DEPLOYMENT, buildUrl };
