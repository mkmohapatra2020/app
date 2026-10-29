/** API error type shared by the Axios client and the token manager. */
import axios, { AxiosError } from 'axios';

/** Fired once when the session ends because authentication failed (401 / refresh rejected). */
export const AUTH_EXPIRED_EVENT = 'wl:auth-expired';

export type ApiErrorKind =
  | 'validation' // 400 / 422, or success:false in the body
  | 'unauthorized' // 401 — authentication failed
  | 'forbidden' // 403 — signed in but not allowed (never triggers a token refresh)
  | 'notFound' // 404
  | 'conflict' // 409
  | 'network' // no response (offline, DNS, CORS) — temporary, not an auth failure
  | 'timeout'
  | 'cancelled'
  | 'server' // 5xx
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  /** Field → messages, when the server returns ASP.NET-style validation errors. */
  readonly fieldErrors: Record<string, string[]>;
  /** True when HTTP succeeded but the body said `success: false`. */
  readonly fromEnvelope: boolean;

  constructor(kind: ApiErrorKind, message: string, status = 0, fieldErrors: Record<string, string[]> = {}, fromEnvelope = false) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.fromEnvelope = fromEnvelope;
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

export const DEFAULT_MESSAGES: Record<ApiErrorKind, string> = {
  validation: 'Please check the details and try again.',
  unauthorized: 'Please sign in to continue.',
  forbidden: "You don't have permission to do that.",
  notFound: "We couldn't find what you were looking for.",
  conflict: 'That conflicts with something that already exists.',
  network: "We couldn't reach the server. Check your connection and try again.",
  timeout: 'The server took too long to answer. Please try again.',
  cancelled: 'Cancelled.',
  server: 'Something went wrong on our side. Please try again shortly.',
  unknown: 'Something went wrong. Please try again.',
};

export const kindForStatus = (status: number): ApiErrorKind => {
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'server';
  return 'unknown';
};

type Obj = Record<string, unknown>;
export const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
/** Read a key in camelCase or PascalCase. */
export const field = (o: unknown, key: string): unknown => (isObj(o) ? (o[key] ?? o[key.charAt(0).toUpperCase() + key.slice(1)]) : undefined);

export function messageOf(body: unknown): string {
  if (typeof body === 'string') return body.length < 300 ? body : '';
  for (const k of ['error', 'message', 'title', 'detail']) {
    const v = field(body, k);
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

export function fieldErrorsOf(body: unknown): Record<string, string[]> {
  const errs = field(body, 'errors');
  if (!isObj(errs)) return {};
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(errs)) out[k] = (Array.isArray(v) ? v : [v]).map(String);
  return out;
}

export function toApiError(err: unknown): ApiError {
  if (isApiError(err)) return err;
  if (axios.isCancel(err)) return new ApiError('cancelled', DEFAULT_MESSAGES.cancelled);
  if (err instanceof AxiosError) {
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return new ApiError('timeout', DEFAULT_MESSAGES.timeout);
    if (!err.response) return new ApiError('network', DEFAULT_MESSAGES.network);
    const { status, data } = err.response;
    const kind = kindForStatus(status);
    // 5xx bodies can contain server internals: show the friendly text instead.
    const msg = kind === 'server' ? '' : messageOf(data);
    return new ApiError(kind, msg || DEFAULT_MESSAGES[kind], status, fieldErrorsOf(data));
  }
  return new ApiError('unknown', DEFAULT_MESSAGES.unknown);
}

/** Returns `data` of an `ApiResponse` envelope, or the body itself when it isn't one. */
export function unwrapEnvelope<T>(body: unknown, status = 200): T {
  if (isObj(body) && ('success' in body || 'Success' in body)) {
    if (field(body, 'success') === false) {
      throw new ApiError('validation', messageOf(body) || DEFAULT_MESSAGES.validation, status, fieldErrorsOf(body), true);
    }
    const data = field(body, 'data');
    return (data === undefined ? body : data) as T;
  }
  return body as T;
}
