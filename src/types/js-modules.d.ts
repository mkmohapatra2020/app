/**
 * Types for the JavaScript modules that the TypeScript auth/API layer imports.
 * (allowJs is off, so these declarations are what `tsc` sees for them.)
 */
declare module '*/services/apiConfig.js' {
  export const API_BASE_URLS: { API_BASE_URL: string; BACKEND: string };
}

declare module '*/services/session.js' {
  export interface StoredSession {
    token: string;
    refreshToken?: string;
    accessTokenExpiresAt?: number;
    refreshTokenExpiresAt?: number;
    user: object & { id?: number | string | null; name?: string; email?: string };
  }
  export const SESSION_EVENT: string;
  export const session: {
    get(): StoredSession | null;
    token(): string | null;
    refreshToken(): string | null;
    accessExpiresAt(): number;
    refreshExpiresAt(): number;
    user(): (Record<string, unknown> & { id?: number | string | null }) | null;
    isAuthenticated(): boolean;
    set(next: StoredSession): void;
    update(userPatch: Record<string, unknown>): void;
    clear(reason?: string): void;
  };
  export default session;
}

declare module '*/services/adapters.js' {
  export function toUser(u?: Record<string, unknown>): {
    id: unknown; name: string; email: string; phone: string; city: string; photo: string; role: string; isAdmin: boolean; membership: string;
  };
}

declare module '*/utils/authCrypto.js' {
  export function encryptPayload(jwk: { n: string; e: string }, payload: object): Promise<string>;
}

declare module '*/components/common/Form.jsx' {
  import type { ComponentType, InputHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
  export const TextInput: ComponentType<InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; error?: ReactNode; hint?: ReactNode; optional?: boolean }>;
  export const FormAlert: ComponentType<{ tone?: 'error' | 'success' | 'info'; children?: ReactNode }>;
  export const SubmitButton: ComponentType<ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingText?: string }>;
  export function isEmail(v: string): boolean;
}

declare module '*/pages/auth/AuthLayout.jsx' {
  import type { ComponentType, ReactNode } from 'react';
  const AuthLayout: ComponentType<{ title: ReactNode; subtitle?: ReactNode; image?: string; footer?: ReactNode; children?: ReactNode }>;
  export default AuthLayout;
}
declare module '*/pages/auth/SocialLogin.jsx' {
  import type { ComponentType } from 'react';
  const SocialLogin: ComponentType<{ onSuccess: (data: { user?: { name?: string } }) => void; onError: (message: string) => void }>;
  export default SocialLogin;
}

declare module '*/context/ToastContext.jsx' {
  export function useToast(): { toast: (text: string, tone?: 'success' | 'error', ms?: number) => void };
}

declare module '*/services/httpClient.js' {
  export interface ApiResponse<T = unknown> { success: boolean; status: number; data?: T; error?: string; errorDetails?: unknown; aborted?: boolean }
  export const httpClient: {
    get<T = unknown>(url: string, config?: Record<string, unknown>): Promise<ApiResponse<T>>;
    post<T = unknown>(url: string, body?: unknown, config?: Record<string, unknown>): Promise<ApiResponse<T>>;
  };
  export default httpClient;
}
