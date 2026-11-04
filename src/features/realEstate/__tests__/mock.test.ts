/** Sample-data mode: the in-browser store answers the real API layer consistently. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '../../../api/apiClient.ts';
import { ApiError } from '../../../api/errors.ts';
import { realEstateApi } from '../api/realEstateApi.ts';
import { realEstateOcrApi } from '../api/realEstateOcrApi.ts';
import { fetchRealEstateAccess } from '../api/realEstateAccessApi.ts';
import { realEstateMockAdapter } from '../mocks/realEstateMock.ts';
import { ledgerTotals } from '../utils/format.ts';
import { signIn } from './helpers.tsx';

const original = apiClient.defaults.adapter;
beforeEach(() => { signIn(); apiClient.defaults.adapter = realEstateMockAdapter; });
afterEach(() => { apiClient.defaults.adapter = original; });

describe('Real Estate sample data', () => {
  it('enables the module and serves the CRM lists', async () => {
    expect((await fetchRealEstateAccess()).enabled).toBe(true);
    const partners = await realEstateApi.partners.list();
    expect(partners.map((p) => p.businessName)).toContain('Sai Developers');
    expect(partners.some((p) => p.isActive === false)).toBe(true);
    const projects = await realEstateApi.projects.list(1);
    expect(projects.every((p) => p.partnerId === 1)).toBe(true);
    const plots = await realEstateApi.plots.list(projects[0].id);
    expect(new Set(plots.map((p) => p.status))).toEqual(new Set(['Available', 'Booked', 'Sold', 'Blocked']));
    const customers = await realEstateApi.customers.list(1, { page: 1, pageSize: 2 });
    expect(customers.items).toHaveLength(2);
    expect(customers.total).toBeGreaterThan(2);
  });

  it('keeps the three ledger amounts separate', async () => {
    const tx = await realEstateApi.ledger.list(9001);
    expect(tx[0]).toMatchObject({ amount: 100000, commissionAmount: 5000, propertyAmount: 95000 });
    expect(tx[1].commissionAmount).toBeNull();
    const b = await realEstateApi.bookings.get(9001);
    expect(ledgerTotals(b.agreedValue, tx)).toMatchObject({ totalReceived: 350000, totalCommission: 5000, totalProperty: 335000, outstanding: 1050000 });
    const o = await realEstateApi.overview();
    expect(o?.totalReceived).toBeGreaterThan(0);
    expect(o?.totalCommission).toBeGreaterThan(0);
  });

  it('refuses booking an unavailable plot (409) and books an available one', async () => {
    const err = await realEstateApi.bookings.create({ customerId: 504, plotId: 1003, bookingAmount: 1, agreedValue: 2 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).kind).toBe('conflict');
    const created = await realEstateApi.bookings.create({ customerId: 504, plotId: 1001, bookingAmount: 50000, agreedValue: 1400000 });
    expect(created).toMatchObject({ customerName: 'Priyanka Das', plotNumber: 'A-1', status: 'Pending' });
    expect((await realEstateApi.plots.list(101)).find((p) => p.plotNumber === 'A-1')?.status).toBe('Booked');
  });

  it('runs the OCR workflow end to end: parse → correct → validate → approve → import', async () => {
    const batch = await realEstateOcrApi.create({ blobName: 'realestate/x.jpg', container: 'realestate-ocr', contentType: 'image/jpeg', size: 1, fileName: 'x.jpg' });
    let b = await realEstateOcrApi.parse(batch.id);
    expect(b.status).toBe('Parsed');
    expect(b.rows[1].issues.some((i) => i.field === 'totalAmountReceived' && i.severity === 'Error')).toBe(true);
    // Approval is refused while errors remain.
    await realEstateOcrApi.validate(b.id);
    expect(await realEstateOcrApi.approve(b.id).catch((e: unknown) => (e as ApiError).kind)).toBe('validation');
    b = await realEstateOcrApi.submitCorrections(b.id, [{ fieldName: 'ledgerRows[1].TotalAmountReceived', value: '50000' }]);
    b = await realEstateOcrApi.validate(b.id);
    expect(b.status).toBe('Validated');
    expect(b.rows.every((r) => r.match.status === 'Matched')).toBe(true);
    b = await realEstateOcrApi.approve(b.id);
    expect(b.status).toBe('Approved');
    const before = (await realEstateApi.ledger.list(9001)).length;
    b = await realEstateOcrApi.import(b.id);
    expect(b.status).toBe('Imported');
    const after = await realEstateApi.ledger.list(9001);
    expect(after).toHaveLength(before + 1);
    expect(after[after.length - 1]).toMatchObject({ amount: 50000, commissionAmount: 2500, propertyAmount: 47500 });
  });
});
