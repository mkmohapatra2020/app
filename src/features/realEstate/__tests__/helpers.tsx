/** Test helpers: React rendering without extra libraries, and an Axios adapter stub. */
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { apiClient } from '../../../api/apiClient.ts';
import { session } from '../../../services/session.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export interface Rendered { container: HTMLElement; root: Root; rerender: (ui: ReactElement) => Promise<void>; unmount: () => void }

export async function render(ui: ReactElement): Promise<Rendered> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(ui); });
  return {
    container,
    root,
    rerender: async (next) => { await act(async () => { root.render(next); }); },
    unmount: () => { act(() => root.unmount()); container.remove(); },
  };
}

/** Let pending promises (API stubs) resolve and React re-render. */
export async function flush(times = 3) {
  for (let i = 0; i < times; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

/** Set a controlled input/select value the way a user would. */
export async function change(el: Element | null, value: string) {
  if (!el) throw new Error('element not found');
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}

export async function click(el: Element | null) {
  if (!el) throw new Error('element not found');
  await act(async () => { (el as HTMLElement).click(); });
}

export interface Call { url: string; method: string; auth: string | null; body: unknown; params: unknown }
export type Reply = { status: number; data?: unknown };

/** Replace the shared Axios client's network layer; returns the recorded calls. */
export function stubApi(handler: (c: Call) => Reply | Promise<Reply>): Call[] {
  const calls: Call[] = [];
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    let body: unknown = config.data;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /* raw */ } }
    const auth = config.headers.get('Authorization');
    const call: Call = { url: String(config.url), method: String(config.method).toUpperCase(), auth: auth ? String(auth) : null, body, params: config.params ?? null };
    calls.push(call);
    const r = await handler(call);
    if (r.status >= 400) throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, {}, { status: r.status, statusText: '', headers: {}, config, data: r.data ?? {} });
    return { data: r.data, status: r.status, statusText: 'OK', headers: {}, config };
  };
  apiClient.defaults.adapter = adapter;
  return calls;
}

const b64u = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** A valid signed-in session (token good for an hour). */
export function signIn(user: Record<string, unknown> = { id: 7, name: 'Plot Seller', email: 'seller@example.test' }) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  session.set({
    token: `${b64u({ alg: 'HS256' })}.${b64u({ sub: String(user.id), exp })}.sig`,
    refreshToken: 'R1',
    accessTokenExpiresAt: exp * 1000,
    refreshTokenExpiresAt: Date.now() + 86_400_000,
    user,
  });
}

export const ok = (data: unknown): Reply => ({ status: 200, data: { success: true, data } });
