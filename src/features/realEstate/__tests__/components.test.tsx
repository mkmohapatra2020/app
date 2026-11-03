/** UI behaviour: badges, booking validation, ledger totals, OCR review, masking. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import BookingForm from '../components/BookingForm.tsx';
import OcrBatchActions from '../components/OcrBatchActions.tsx';
import OcrReviewTable from '../components/OcrReviewTable.tsx';
import RealEstateStatusBadge, { statusTone } from '../components/RealEstateStatusBadge.tsx';
import { toOcrBatch } from '../api/normalize.ts';
import { CustomerRow } from '../pages/CustomersPage.tsx';
import type { OcrBatch, OcrDraft } from '../types/ocrTypes.ts';
import type { Customer, Plot } from '../types/realEstateTypes.ts';
import { ledgerTotals, maskAadhaar, maskPan } from '../utils/format.ts';
import { batchBlockers, buildCorrections, canImport, cellState } from '../utils/ocr.ts';
import { validateBooking } from '../utils/validation.ts';
import { change, click, render, type Rendered } from './helpers.tsx';

let view: Rendered | null = null;
afterEach(() => { view?.unmount(); view = null; });
const $ = (sel: string) => document.querySelector(sel);

describe('status badges', () => {
  it.each([['Available', 'ok'], ['Blocked', 'warn'], ['Booked', 'info'], ['Sold', 'done']])('plot %s renders with tone %s', async (status, tone) => {
    view = await render(<RealEstateStatusBadge status={status} />);
    const el = $('.re-badge')!;
    expect(el.textContent).toBe(status);
    expect(el.className).toContain(`re-badge-${tone}`);
  });
  it('covers booking and OCR statuses, unknown is muted', () => {
    expect(['Pending', 'Confirmed', 'Cancelled', 'Completed'].map(statusTone)).toEqual(['warn', 'ok', 'bad', 'done']);
    expect(['Uploaded', 'Parsed', 'Validated', 'Approved', 'Imported', 'Rejected'].map(statusTone)).toEqual(['muted', 'info', 'ok', 'ok', 'done', 'bad']);
    expect(statusTone('Weird')).toBe('muted');
  });
});

describe('booking form', () => {
  const customers: Customer[] = [{ id: 1, partnerId: 12, name: 'Ramesh', phone: '9876543210', email: '', address: '', aadhaarNumber: '', panNumber: '' }];
  const plots: Plot[] = [
    { id: 10, projectId: 5, plotNumber: 'A-1', area: 1400, areaUnit: 'SqFt', facing: 'East', roadWidth: 30, status: 'Available' },
    { id: 11, projectId: 5, plotNumber: 'A-2', area: 1200, areaUnit: 'SqFt', facing: 'West', roadWidth: 30, status: 'Sold' },
  ];

  it('validates required fields and never submits an empty form', async () => {
    const onSubmit = vi.fn(async () => true);
    view = await render(<BookingForm customers={customers} plots={plots} pending={false} error={null} onSubmit={onSubmit} />);
    await click($('button[type="submit"]'));
    const errors = [...document.querySelectorAll('.f-error')].map((e) => e.textContent);
    expect(errors).toEqual(['Customer is required.', 'Plot is required.', 'Booking amount is required.', 'Agreed value is required.']);
    expect($('[role="dialog"]')).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables unavailable plots and confirms before booking', async () => {
    const onSubmit = vi.fn(async () => true);
    view = await render(<BookingForm customers={customers} plots={plots} pending={false} error={null} onSubmit={onSubmit} />);
    const options = [...document.querySelectorAll('select')[1].options];
    expect(options.find((o) => o.value === '11')?.disabled).toBe(true);
    expect(options.find((o) => o.value === '10')?.disabled).toBe(false);

    const [customer, plot] = document.querySelectorAll('select');
    const [amount, agreed] = document.querySelectorAll('input');
    await change(customer, '1');
    await change(plot, '10');
    await change(amount, '50000');
    await change(agreed, '1400000');
    await click($('button[type="submit"]'));
    expect($('[role="dialog"]')?.textContent).toContain('A-1');
    expect(onSubmit).not.toHaveBeenCalled();
    await click([...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent === 'Create booking')!);
    expect(onSubmit).toHaveBeenCalledWith({ customerId: 1, plotId: 10, bookingAmount: 50000, agreedValue: 1400000 });
  });

  it('rule checks: unavailable plot, amounts', () => {
    const base = { customerId: '1', plotId: '11', bookingAmount: '100', agreedValue: '50' };
    const e = validateBooking(base, { status: 'Sold' });
    expect(e.plotId).toMatch(/sold/);
    expect(e.bookingAmount).toMatch(/exceed/);
    expect(validateBooking({ ...base, plotId: '10', bookingAmount: '-1' }, { status: 'Available' }).bookingAmount).toMatch(/more than 0/);
  });
});

describe('ledger totals', () => {
  it('sums payments and computes outstanding without float drift', () => {
    const tx = (amount: number, commissionAmount: number | null = null, propertyAmount: number | null = null) => ({ amount, commissionAmount, propertyAmount });
    expect(ledgerTotals(1400000, [tx(50000, 2500, 47500), tx(250000.1, null, 0.1), tx(0.2)])).toEqual({
      agreedValue: 1400000, totalReceived: 300000.3, totalCommission: 2500, totalProperty: 47500.1, outstanding: 1099999.7,
    });
    expect(ledgerTotals(1000, [])).toEqual({ agreedValue: 1000, totalReceived: 0, totalCommission: 0, totalProperty: 0, outstanding: 1000 });
    expect(ledgerTotals(1000, [tx(1200)]).outstanding).toBe(-200);
  });

  it('never folds commission or property amount into total received', () => {
    const t = ledgerTotals(100000, [{ amount: 60000, commissionAmount: 5000, propertyAmount: 95000 }]);
    expect(t.totalReceived).toBe(60000);
    expect(t.outstanding).toBe(40000);
  });
});

describe('sensitive identity numbers', () => {
  it('masks Aadhaar and PAN', () => {
    expect(maskAadhaar('2345 6789 0123')).toBe('XXXX XXXX 0123');
    expect(maskPan('abcde1234f')).toBe('XXXXXX234F');
    expect(maskAadhaar('')).toBe('—');
    expect(maskPan('AB1')).toBe('XXXXXXXXXX');
  });
  it('never renders full values in the customer list', async () => {
    const c: Customer = { id: 1, partnerId: 12, name: 'Ramesh', phone: '9876543210', email: '', address: '', aadhaarNumber: '234567890123', panNumber: 'ABCDE1234F' };
    view = await render(<table><tbody><CustomerRow c={c} /></tbody></table>);
    const text = document.body.textContent ?? '';
    expect(text).toContain('XXXX XXXX 0123');
    expect(text).toContain('XXXXXX234F');
    expect(text).not.toContain('234567890123');
    expect(text).not.toContain('ABCDE1234F');
  });
});

describe('OCR review', () => {
  const raw = (overrides: Record<string, unknown> = {}) => ({
    id: 3, status: 'Parsed', fileName: 'page1.jpg',
    ledgerRows: [
      { rowNumber: 1, transactionDate: '2026-09-01', customerName: 'Ramesh', plotNumber: 'A-1', totalAmountReceived: '25000', commissionAmount: '1250', propertyAmount: '23750', paymentMode: 'UPI', referenceNumber: 'U1', remarks: '', confidence: 0.95, matchStatus: 'Matched', matchedBookingId: 77 },
      { rowNumber: 2, transactionDate: '2026-09-03', customerName: 'Sita', plotNumber: 'B-9', totalAmountReceived: '1O000', commissionAmount: null, propertyAmount: '9000', paymentMode: 'Cash', referenceNumber: '', remarks: '', confidence: 0.55, fieldConfidence: { totalAmountReceived: 0.4 },
        matchStatus: 'UnmatchedPlot', corrections: { customerName: 'Sita Devi' } },
    ],
    validationIssues: [{ code: 'AMOUNT_NOT_NUMERIC', message: 'Amount is not a number', fieldName: 'ledgerRows[1].TotalAmountReceived', severity: 'Error' }],
    ...overrides,
  });
  const batch = (o?: Record<string, unknown>): OcrBatch => toOcrBatch(raw(o));

  it('distinguishes extracted, corrected, error, low-confidence and edited cells', () => {
    const [r1, r2] = batch().rows;
    expect(cellState(r1, 'totalAmountReceived')).toBe('extracted');
    expect(cellState(r2, 'customerName')).toBe('corrected');
    expect(cellState(r2, 'totalAmountReceived')).toBe('error');
    expect(cellState(r2, 'plotNumber')).toBe('lowConfidence');
    expect(cellState(r1, 'remarks', 'paid in full')).toBe('edited');
  });

  it('cells are editable and edits reach the draft', async () => {
    const onEdit = vi.fn();
    view = await render(<MemoryRouter><OcrReviewTable rows={batch().rows} draft={{}} editable onEdit={onEdit} /></MemoryRouter>);
    const input = $('input[aria-label="Row 2 Total received"]') as HTMLInputElement;
    expect(input.value).toBe('1O000');
    // A missing commission stays empty — never filled from another amount.
    expect(($('input[aria-label="Row 2 Commission (lower black amount)"]') as HTMLInputElement).value).toBe('');
    await change($('input[aria-label="Row 2 Plot number"]'), 'B-10');
    expect(onEdit).toHaveBeenCalledWith('1', 'plotNumber', 'B-10');
    await change($('input[aria-label="Row 1 Property amount (red)"]'), '24000');
    expect(onEdit).toHaveBeenCalledWith('0', 'propertyAmount', '24000');
    // Matching state is shown, and the matched booking link comes from the backend id.
    expect(document.body.textContent).toContain('Plot not found');
    expect($('a.re-match-link')?.getAttribute('href')).toBe('/real-estate/bookings/77');
  });

  it('is read-only once approved', async () => {
    view = await render(<MemoryRouter><OcrReviewTable rows={batch().rows} draft={{}} editable={false} onEdit={() => {}} /></MemoryRouter>);
    expect(document.querySelectorAll('input')).toHaveLength(0);
  });

  it('builds only real corrections', () => {
    const b = batch();
    const draft: OcrDraft = { 0: { totalAmountReceived: '25000', remarks: ' first ' }, 1: { totalAmountReceived: '10000', commissionAmount: '500', propertyAmount: '9500', customerName: 'Sita Devi' } };
    expect(buildCorrections(b.rows, draft)).toEqual([
      { fieldName: 'ledgerRows[0].Remarks', value: 'first' },
      { fieldName: 'ledgerRows[1].TotalAmountReceived', value: '10000' },
      { fieldName: 'ledgerRows[1].CommissionAmount', value: '500' },
      { fieldName: 'ledgerRows[1].PropertyAmount', value: '9500' },
    ]);
  });

  it('keeps Import disabled while validation issues remain', async () => {
    const approvedWithIssues = batch({ status: 'Approved' });
    expect(canImport(approvedWithIssues, {})).toBe(false);
    expect(batchBlockers(approvedWithIssues).reasons).toEqual(['1 validation issue', '1 row not matched to a booking']);
    view = await render(<OcrBatchActions batch={approvedWithIssues} draft={{}} pending={null} onAction={() => {}} />);
    expect(($('[data-action="import"]') as HTMLButtonElement).disabled).toBe(true);
    expect(($('[data-action="approve"]') as HTMLButtonElement).disabled).toBe(true);
    expect($('#ocr-blockers')?.textContent).toContain('validation issue');
  });

  it('enables Import only for a clean, approved batch with no unsaved edits', async () => {
    const clean = toOcrBatch({ ...raw({ status: 'Approved' }), ledgerRows: [raw().ledgerRows[0]], validationIssues: [] });
    expect(canImport(clean, {})).toBe(true);
    expect(canImport(clean, { 0: { totalAmountReceived: '1' } })).toBe(false);
    expect(canImport({ ...clean, status: 'Validated' }, {})).toBe(false);
    const onAction = vi.fn();
    view = await render(<OcrBatchActions batch={clean} draft={{}} pending={null} onAction={onAction} />);
    const btn = $('[data-action="import"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    await click(btn);
    expect(onAction).toHaveBeenCalledWith('import');
  });
});
