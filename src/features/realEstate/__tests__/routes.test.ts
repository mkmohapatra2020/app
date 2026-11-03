/** Existing application routes are untouched; Real Estate lives only under /real-estate/*. */
import { describe, expect, it } from 'vitest';
import { REAL_ESTATE_PATHS } from '../routes/realEstateRoutes.tsx';

const app = Object.values(import.meta.glob('/src/App.jsx', { query: '?raw', import: 'default', eager: true }))[0] as string;
const paths = [...app.matchAll(/<Route\s+(?:index\s|path="([^"]*)")/g)].map((m) => m[1] ?? '(index)');

// Routes as they were before the Real Estate module was added.
const EXISTING = [
  '(index)', 'login', 'register', 'forgot-password', 'reset-password', 'profile', 'my-designs', 'workshops', 'outdoor', 'seniors',
  'kids', 'build-together', 'workshops/:id', 'campaigns/:id', 'events', 'community', 'learn', 'learn/workshops/:id', 'learn/:slug',
  'heritage', 'elderly-diy', 'incubator', 'design-studio', 'projects/:id', 'shop', 'shop/:id', 'cart', 'checkout', 'contact',
  'admin', 'admin/ai-visualizations', 'membership', 'membership/benefits', 'image-generator', '*',
];

describe('routes', () => {
  it('keeps every existing route, in order, and adds only real-estate/*', () => {
    expect(paths.filter((p) => p !== 'real-estate/*')).toEqual(EXISTING);
    expect(paths.filter((p) => p === 'real-estate/*')).toHaveLength(1);
  });

  it('mounts Real Estate behind sign-in', () => {
    expect(app).toMatch(/path="real-estate\/\*" element=\{auth\(<P\.RealEstate \/>\)\}/);
  });

  it('defines the documented child routes without clashing with existing ones', () => {
    expect([...REAL_ESTATE_PATHS]).toEqual(['', 'partners', 'projects', 'projects/:projectId/plots', 'customers', 'bookings', 'bookings/:bookingId', 'bookings/:bookingId/ledger', 'ocr', 'ocr/:batchId']);
    // /projects/:id (existing) and /real-estate/projects are different trees.
    expect(EXISTING.some((p) => p.startsWith('real-estate'))).toBe(false);
  });
});
