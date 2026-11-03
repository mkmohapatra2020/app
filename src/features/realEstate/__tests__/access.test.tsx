/** Feature gate: navigation appears only when GET /realestate/access enables the module. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { apiClient } from '../../../api/apiClient.ts';
import { RealEstateAccessProvider, accessValue, RealEstateAccessContext, useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import RealEstateNavigation from '../components/RealEstateNavigation.tsx';
import RealEstateLayout from '../components/RealEstateLayout.tsx';
import { toAccess } from '../api/normalize.ts';
import { flush, ok, render, signIn, stubApi, type Rendered } from './helpers.tsx';

const original = apiClient.defaults.adapter;
let view: Rendered | null = null;
beforeEach(() => { view = null; });
afterEach(() => { view?.unmount(); apiClient.defaults.adapter = original; });

function Probe() {
  const a = useRealEstateAccess();
  return <span data-testid="status">{a.status}:{String(a.enabled)}</span>;
}
const app = () => (
  <MemoryRouter>
    <RealEstateAccessProvider>
      <Probe />
    </RealEstateAccessProvider>
  </MemoryRouter>
);
const navLink = () => document.querySelector('[data-testid="re-nav-link"]');
const status = () => document.querySelector('[data-testid="status"]')?.textContent;

describe('Real Estate access gate', () => {
  it('stays disabled and makes no request when signed out', async () => {
    const calls = stubApi(() => ok({ enabled: true, features: ['Partners'] }));
    view = await render(app());
    await flush();
    expect(calls).toHaveLength(0);
    expect(status()).toBe('signedOut:false');
  });

  it('is enabled when the backend enables access', async () => {
    signIn();
    const calls = stubApi(() => ok({ enabled: true, partnerId: 12, features: ['Partners', 'Projects', 'OCR'] }));
    view = await render(app());
    await flush();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['GET /realestate/access']);
    expect(calls[0].auth).toMatch(/^Bearer /); // reuses the existing token handling
    expect(status()).toBe('ready:true');
  });

  it('stays disabled when access is disabled', async () => {
    signIn();
    stubApi(() => ok({ enabled: false, features: ['Partners'] }));
    view = await render(app());
    await flush();
    expect(status()).toBe('ready:false');
  });

  it.each([404, 403, 500])('stays disabled when discovery returns HTTP %i (never assumes access)', async (code) => {
    signIn();
    stubApi(() => ({ status: code, data: { error: 'nope' } }));
    view = await render(app());
    await flush();
    expect(status()).toBe('error:false');
  });

  it('shows the "Real Estate" menu-bar item to every visitor (pages stay gated)', async () => {
    // No access provider, signed out: the item is still there.
    view = await render(<MemoryRouter initialEntries={['/real-estate/plots']}><ul className="nav-links"><RealEstateNavigation index={5} /></ul></MemoryRouter>);
    const link = navLink()!;
    expect(link.getAttribute('href')).toBe('/real-estate');
    expect(link.textContent).toContain('Real Estate');
    expect(link.className).toContain('nav-studio');
    expect(link.className).toContain('is-active'); // highlighted on Real Estate pages
    expect(link.closest('li')?.parentElement?.className).toBe('nav-links');
  });

  it('only an explicit enabled:true enables the module', () => {
    expect(toAccess({ enabled: 'true', features: ['Partners'] }).enabled).toBe(false);
    expect(toAccess({}).enabled).toBe(false);
    expect(toAccess({ Enabled: true, Features: ['partners', 'Bogus'] })).toEqual({ enabled: true, partnerId: null, features: ['Partners'], permissions: [] });
  });

  it('layout hides content and sub-navigation when access is disabled', async () => {
    view = await render(
      <MemoryRouter>
        <RealEstateAccessContext.Provider value={accessValue({ enabled: false, partnerId: null, features: [], permissions: [] })}>
          <RealEstateLayout title="Partners" feature="Partners"><p data-testid="secret">content</p></RealEstateLayout>
        </RealEstateAccessContext.Provider>
      </MemoryRouter>,
    );
    expect(document.querySelector('[data-testid="secret"]')).toBeNull();
    expect(document.querySelector('.re-tabs')).toBeNull();
    expect(document.body.textContent).toContain("Real Estate isn't enabled");
  });

  it('layout blocks a feature the backend did not grant and hides its tab', async () => {
    view = await render(
      <MemoryRouter>
        <RealEstateAccessContext.Provider value={accessValue({ enabled: true, partnerId: 1, features: ['Projects'], permissions: [] })}>
          <RealEstateLayout title="OCR" feature="OCR"><p data-testid="secret">content</p></RealEstateLayout>
        </RealEstateAccessContext.Provider>
      </MemoryRouter>,
    );
    expect(document.querySelector('[data-testid="secret"]')).toBeNull();
    const tabs = [...document.querySelectorAll('.re-tab')].map((a) => a.textContent);
    expect(tabs).toEqual(['Overview', 'Projects and plots']);
  });

  it('partner creation needs a backend grant (or admin)', () => {
    const base = { enabled: true, partnerId: 1, features: ['Partners' as const], permissions: [] as string[] };
    expect(accessValue(base).can('Partners.Create')).toBe(false);
    expect(accessValue({ ...base, permissions: ['partners.create'] }).can('Partners.Create')).toBe(true);
    expect(accessValue(base, true).can('Partners.Create')).toBe(true);
  });
});
