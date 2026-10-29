/**
 * Mock API for endpoints the backend has not deployed yet (they return 404 on APIM).
 *
 * backendClient.js asks `mockFor(method, path)` before every call. When a handler
 * exists here (and VITE_MOCK_API is not 'off'), the request never leaves the
 * browser and the handler's response is returned in the same ApiResponse shape
 * httpClient produces. Everything else goes to the real API untouched.
 *
 * Membership is NOT mocked: all membership endpoints in the swagger are live and
 * called with the login token (src/services/membershipService.js).
 *
 * Shapes follow the contracts in MOCK-APIS.md. When an endpoint goes live:
 * delete its entry from HANDLERS below — no UI change is needed.
 */
import { MOCK_MODE } from '../services/apiConfig.js';
import { MOCK_CATEGORIES, PASS, workflowMockFor } from './visualizationWorkflowMock.js';

const delay = () => new Promise((r) => setTimeout(r, 250 + Math.random() * 350));
const ok = (data, status = 200) => ({ success: true, status, data, mocked: true });

// ---------- handlers: "METHOD /path" → (req) => ApiResponse ----------
const HANDLERS = {
  'GET /design-categories': () => ok(MOCK_CATEGORIES),
};

/** Mock handler for this request, or null to call the real API. */
export function mockFor(method, path) {
  if (MOCK_MODE === 'off') return null;
  const clean = String(path).split('?')[0];
  const handler = HANDLERS[`${method.toUpperCase()} ${clean}`] || workflowMockFor(method, clean);
  if (!handler) return null;
  return async (req) => { await delay(); return handler(req); };
}

/** Endpoints currently served by this file (shown in dev tools / docs). */
export const MOCKED_ENDPOINTS = Object.keys(HANDLERS);
export { PASS };

if (import.meta.env.DEV && MOCK_MODE !== 'off') console.info('[mock api] serving', MOCKED_ENDPOINTS.length, 'planned endpoints from src/mocks/mockApi.js');
