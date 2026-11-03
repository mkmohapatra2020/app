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
    expect(ledgerTotals(1400000, [{ amount: 50000 }, { amount: 250000.1 }, { amount: 0.2 }])).toEqual({ agreedValue: 1400000, totalPaid: 300000.3, outstanding: 1099999.7 });
    expect(ledgerTotals(1000, [])).toEqual({ agreedValue: 1000, totalPaid: 0, outstanding: 1000 });
    expect(ledgerTotals(1000, [{ amount: 1200 }]).outstanding).toBe(-200);
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
    rows: [
      { rowId: 'r1', rowNumber: 1, transactionDate: '2026-09-01', customerName: 'Ramesh', plotNumber: 'A-1', amount: '25000', paymentMode: 'UPI', referenceNumber: 'U1', remarks: '', confidence: 0.95, matchStatus: 'Matched', matchedBookingId: 77 },
      { rowId: 'r2', rowNumber: 2, transactionDate: '2026-09-03', customerName: 'Sita', plotNumber: 'B-9', amount: '1O000', paymentMode: 'Cash', referenceNumber: '', remarks: '', confidence: 0.55, fieldConfidence: { amount: 0.4 },
        matchStatus: 'UnmatchedPlot', validationErrors: [{ field: 'amount', message: 'Amount is not a number' }], corrections: { customerName: 'Sita Devi' } },
    ],
    ...overrides,
  });
  const batch = (o?: Record<string, unknown>): OcrBatch => toOcrBatch(raw(o));

  it('distinguishes extracted, corrected, error, low-confidence and edited cells', () => {
    const [r1, r2] = batch().rows;
    expect(cellState(r1, 'amount')).toBe('extracted');
    expect(cellState(r2, 'customerName')).toBe('corrected');
    expect(cellState(r2, 'amount')).toBe('error');
    expect(cellState(r2, 'plotNumber')).toBe('lowConfidence');
    expect(cellState(r1, 'remarks', 'paid in full')).toBe('edited');
  });

  it('cells are editable and edits reach the draft', async () => {
    const onEdit = vi.fn();
    view = await render(<MemoryRouter><OcrReviewTable rows={batch().rows} draft={{}} editable onEdit={onEdit} /></MemoryRouter>);
    const input = $('input[aria-label="Row 2 Amount"]') as HTMLInputElement;
    expect(input.value).toBe('1O000');
    await change($('input[aria-label="Row 2 Plot number"]'), 'B-10');
    expect(onEdit).toHaveBeenCalledWith('r2', 'plotNumber', 'B-10');
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
    const draft: OcrDraft = { r1: { amount: '25000', remarks: ' first ' }, r2: { amount: '10000', customerName: 'Sita Devi' } };
    expect(buildCorrections(b.rows, draft)).toEqual([
      { rowId: 'r1', field: 'remarks', value: 'first' },
      { rowId: 'r2', field: 'amount', value: '10000' },
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
    const clean = toOcrBatch({ ...raw({ status: 'Approved' }), rows: [raw().rows[0]] });
    expect(canImport(clean, {})).toBe(true);
    expect(canImport(clean, { r1: { amount: '1' } })).toBe(false);
    expect(canImport({ ...clean, status: 'Validated' }, {})).toBe(false);
    const onAction = vi.fn();
    view = await render(<OcrBatchActions batch={clean} draft={{}} pending={null} onAction={onAction} />);
    const btn = $('[data-action="import"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    await click(btn);
    expect(onAction).toHaveBeenCalledWith('import');
  });
});
