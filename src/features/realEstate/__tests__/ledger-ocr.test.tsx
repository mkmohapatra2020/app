/**
 * Requirements from the React UI implementation prompt: three independent ledger amounts,
 * OCR labels/corrections, approval ≠ import, error states, route protection, mobile layout.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { apiClient } from '../../../api/apiClient.ts';
import { ApiError } from '../../../api/errors.ts';
import { AuthProvider } from '../../../auth/AuthContext.tsx';
import ProtectedRoute from '../../../auth/ProtectedRoute.tsx';
import { toOcrBatch } from '../api/normalize.ts';
import { ErrorView } from '../components/ApiStateView.tsx';
import BookingLedgerTable from '../components/BookingLedgerTable.tsx';
import BookingLedgerView from '../components/BookingLedgerView.tsx';
import PaymentsTable from '../components/PaymentsTable.tsx';
import UnfinishedImports from '../components/UnfinishedImports.tsx';
import BookingForm from '../components/BookingForm.tsx';
import OcrAnalysisDialog from '../components/OcrAnalysisDialog.tsx';
import TransactionForm, { toTransactionInput } from '../components/TransactionForm.tsx';
import { RealEstateAccessProvider } from '../access/RealEstateAccessProvider.tsx';
import RealEstateRoutes from '../routes/realEstateRoutes.tsx';
import type { TransactionInput } from '../types/realEstateTypes.ts';
import { allIssues, batchTotals, documentCorrections, validateLedgerValues } from '../utils/ocr.ts';
import { change, click, flush, ok, render, signIn, stubApi, type Rendered } from './helpers.tsx';

const original = apiClient.defaults.adapter;
let view: Rendered | null = null;
afterEach(() => { view?.unmount(); view = null; apiClient.defaults.adapter = original; });
const $ = (sel: string) => document.querySelector(sel);
const byName = (name: string) => $(`input[name="${name}"], select[name="${name}"]`);

describe('transaction form: three independent amounts', () => {
  const fill = async (v: Record<string, string>) => { for (const [k, val] of Object.entries(v)) await change(byName(k), val); };

  it('submits amount, commissionAmount and propertyAmount independently (1)', async () => {
    const onSubmit = vi.fn(async (_: TransactionInput) => true);
    view = await render(<TransactionForm pending={false} error={null} onSubmit={onSubmit} />);
    await fill({ amount: '100000', commissionAmount: '5000', propertyAmount: '95000', paymentMode: 'Cash' });
    await click($('button[type="submit"]'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ amount: 100000, commissionAmount: 5000, propertyAmount: 95000, paymentMode: 'Cash' });
    // Unrelated values are not derived: changing one never changes another.
    expect(toTransactionInput({ transactionDate: '2026-01-15', amount: '100', commissionAmount: '7', propertyAmount: '', paymentMode: 'UPI', referenceNumber: '', remarks: '' }))
      .toEqual({ transactionDate: '2026-01-15', amount: 100, commissionAmount: 7, propertyAmount: null, paymentMode: 'UPI', referenceNumber: '', remarks: '' });
  });

  it('keeps empty commission / property amounts as null (2)', async () => {
    const onSubmit = vi.fn(async (_: TransactionInput) => true);
    view = await render(<TransactionForm pending={false} error={null} onSubmit={onSubmit} />);
    await fill({ amount: '25000' });
    await click($('button[type="submit"]'));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ amount: 25000, commissionAmount: null, propertyAmount: null });
  });

  it('rejects negative amounts client-side and requires a positive total (3)', async () => {
    const onSubmit = vi.fn(async (_: TransactionInput) => true);
    view = await render(<TransactionForm pending={false} error={null} onSubmit={onSubmit} />);
    await fill({ amount: '-5', commissionAmount: '-1', propertyAmount: '-2' });
    await click($('button[type="submit"]'));
    const errors = [...document.querySelectorAll('.f-error')].map((e) => e.textContent);
    expect(errors).toEqual(['Total received must be more than 0.', "Commission can't be negative.", "Property amount can't be negative."]);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('labels each amount with where it comes from on the ledger', async () => {
    view = await render(<TransactionForm pending={false} error={null} onSubmit={async () => true} />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('Total received (₹)');
    expect(text).toContain('From the previous column');
    expect(text).toContain('Commission (lower black amount) (₹)');
    expect(text).toContain('Lower amount written in black, after Payment Details');
    expect(text).toContain('Property amount (red) (₹)');
    expect(text).toContain('Amount written in red');
    expect($('.re-amount-property')).not.toBeNull();
  });
});

const batchJson = (over: Record<string, unknown> = {}) => ({
  id: 7, status: 'Validated', fileName: 'ledger-page-01.jpg',
  ledgerRows: [
    { rowNumber: 1, customerName: 'Ramesh', plotNumber: 'A-1', totalAmountReceived: 100000, commissionAmount: 5000, propertyAmount: 95000, paymentMode: 'Cash', matchStatus: 'Matched', matchedBookingId: 77 },
    { rowNumber: 2, customerName: 'Sita', plotNumber: 'B-2', totalAmountReceived: 20000, commissionAmount: null, propertyAmount: 19000, paymentMode: 'UPI', matchStatus: 'Matched', matchedBookingId: 78 },
  ],
  ...over,
});

describe('OCR totals', () => {
  it('totals each amount column separately', () => {
    expect(batchTotals(toOcrBatch(batchJson()))).toEqual({ rows: 2, totalReceived: 120000, totalCommission: 5000, totalProperty: 114000 });
  });
  it('attaches row issues to their row and field', () => {
    const b = toOcrBatch(batchJson({ status: 'Parsed', validationIssues: [{ code: 'NEG_AMOUNT', message: 'Amount cannot be negative', fieldName: 'ledgerRows[1].PropertyAmount' }] }));
    expect(allIssues(b)[0]).toMatchObject({ code: 'NEG_AMOUNT', rowIndex: 1, field: 'propertyAmount', severity: 'Error' });
  });
});

describe('error states', () => {
  it.each([
    [new ApiError('network', 'x'), "You're offline", 'Try again'],
    [new ApiError('server', 'x', 500), 'Something went wrong on our side', 'Try again'],
    [new ApiError('forbidden', 'x', 403), "You don't have access to this", null],
    [new ApiError('unauthorized', 'x', 401), 'Your session has expired', 'Sign in'],
  ])('shows a useful message for %s (7)', async (error, title, action) => {
    view = await render(<MemoryRouter><ErrorView error={error} onRetry={() => {}} /></MemoryRouter>);
    expect($('[role="alert"] h3')?.textContent).toBe(title);
    if (action) expect(document.body.textContent).toContain(action);
    expect(document.body.textContent).not.toMatch(/undefined|stack|Error:/);
  });
});

describe('booking ledger list', () => {
  it('lists bookings from GET /realestate/transactions 10 per page, with a Transaction details link', async () => {
    signIn();
    const row = (id: number) => ({ BookingId: id, BookingDate: '2026-04-17T00:00:00', BookingAmount: 50000, AgreedValue: 900000, BookingStatus: 'Confirmed', CustomerId: id, CustomerName: `Buyer ${id}`, CustomerPhone: '9876543210', CustomerAddress: 'Bhubaneswar', PlotNumber: `P${id}`, Area: 1200, AreaUnit: 'SqFt', ProjectName: 'Green city', TotalPaid: 1000 * id, TransactionCount: 2 });
    const calls = stubApi((c) => {
      const page = Number((c.params as { page?: number })?.page ?? 1);
      const ids = page === 1 ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [11, 12];
      return ok({ Items: ids.map(row), TotalCount: 12, Page: page, PageSize: 10 });
    });
    view = await render(<MemoryRouter><BookingLedgerTable /></MemoryRouter>);
    await flush();
    expect(calls.find((c) => c.url === '/realestate/transactions')?.params).toMatchObject({ page: 1, pageSize: 10 });
    expect(document.querySelectorAll('tbody tr')).toHaveLength(10);
    const heads = [...document.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(heads.slice(0, 7)).toEqual(['Booking date', 'Booking number', 'Customer name', 'Phone', 'Address', 'Plot and area', 'Total paid']);
    const first = document.querySelector('tbody tr')!;
    expect(first.textContent).toContain('#1');
    expect(first.textContent).toContain('Bhubaneswar');
    expect(first.textContent).toContain('P1 · 1200');
    const link = first.querySelector('a')!;
    expect(link.textContent).toBe('Transaction details →');
    expect(link.getAttribute('href')).toBe('/real-estate/bookings/1');
    expect(document.body.textContent).toContain('Page 1 of 2');
    await click([...document.querySelectorAll('.re-pager button')].find((b) => b.textContent?.includes('Next'))!);
    await flush();
    expect(calls.filter((c) => c.url === '/realestate/transactions').pop()?.params).toMatchObject({ page: 2, pageSize: 10 });
    expect(document.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('transaction details show the booking, its payments and its documents', async () => {
    signIn();
    stubApi((c) => {
      if (c.url === '/realestate/bookings/6') return ok({ Booking: { BookingId: 6, BookingDate: '2026-04-17T00:00:00', AgreedValue: 2000000, BookingAmount: 0, BookingStatus: 'Confirmed', CustomerName: 'Bhagaban Pradhan', CustomerPhone: '9437000000', CustomerAddress: 'Puri', PlotNumber: '48', Area: 20, AreaUnit: 'Decimal', ProjectName: 'Green city', TotalPaid: 1020000 }, CustomerEmail: null,
        Documents: [{ Id: 3, DocumentType: 'PaymentReceipt', FileName: 'receipt.jpg', UploadedDate: '2026-04-18T00:00:00', DocumentUrl: 'https://example.test/receipt.jpg?sig=1' }] });
      if (c.url === '/realestate/bookings/6/transactions') return ok([{ Id: 9, BookingId: 6, TransactionDate: '2026-04-17T00:00:00', Amount: 1020000, CommissionAmount: 25000, PropertyAmount: 625000, PaymentMode: 'LedgerImport', ReferenceNumber: 'OCR-17-6' }]);
      if (c.url === '/realestate/access') return ok({ Enabled: true, Features: ['Ledger', 'Bookings'] });
      return ok({});
    });
    view = await render(<AuthProvider><MemoryRouter><RealEstateAccessProvider><BookingLedgerView bookingId="6" /></RealEstateAccessProvider></MemoryRouter></AuthProvider>);
    await flush(6);
    const text = document.body.textContent ?? '';
    expect(text).toContain('Bhagaban Pradhan');
    expect(text).toContain('Puri');
    expect(text).toContain('OCR-17-6');
    expect(document.querySelector('a.re-doc-name[href="https://example.test/receipt.jpg?sig=1"]')?.textContent).toBe('receipt.jpg');
    // Images get a preview.
    expect(document.querySelector('.re-doc-thumb img')?.getAttribute('src')).toBe('https://example.test/receipt.jpg?sig=1');
  });
});

describe('all payments list', () => {
  it('lists payments from GET /realestate/transactions?view=payments with the requested columns and a View link', async () => {
    signIn();
    const calls = stubApi(() => ok({ Items: [{ Id: 9, BookingId: 6, TransactionDate: '2026-04-17T00:00:00', Amount: 1020000, CommissionAmount: 25000, PropertyAmount: 625000, PaymentMode: 'LedgerImport', ReferenceNumber: 'OCR-17-6', CustomerName: 'Bhagaban Pradhan', CustomerPhone: '9437000000', BookingDate: '2026-03-01T00:00:00' }], TotalCount: 1, Page: 1, PageSize: 10 }));
    view = await render(<MemoryRouter><PaymentsTable /></MemoryRouter>);
    await flush();
    expect(calls.find((c) => c.url === '/realestate/transactions')?.params).toMatchObject({ view: 'payments', page: 1, pageSize: 10 });
    expect([...document.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual(['Booking date', 'Booking number', 'Customer name', 'Phone', 'Property amount', 'Total paid', 'Action']);
    const row = document.querySelector('tbody tr')!;
    expect(row.textContent).toContain('#6');
    expect(row.textContent).toContain('Bhagaban Pradhan');
    expect(row.textContent).toContain('9437000000');
    expect(row.textContent).toContain('1 Mar 2026');
    const link = row.querySelector('a')!;
    expect(link.textContent).toBe('View →');
    expect(link.getAttribute('href')).toBe('/real-estate/bookings/6');
  });
});

describe('unfinished imports', () => {
  it('lists only batches not yet imported or rejected, with Continue and Reject (reason required)', async () => {
    signIn();
    const calls = stubApi(() => ok({ batchId: 22, status: 'Rejected' }));
    const onChanged = vi.fn();
    const list = [
      toOcrBatch({ Id: 23, Status: 4, FileName: 'a.jpeg' }),
      toOcrBatch({ Id: 22, Status: 1, FileName: 'a.jpeg' }),
      toOcrBatch({ Id: 21, Status: 5, FileName: 'a.jpeg' }),
      toOcrBatch({ Id: 20, Status: 2, FileName: 'b.jpeg' }),
    ];
    view = await render(<MemoryRouter><UnfinishedImports batches={list} currentId={20} onChanged={onChanged} /></MemoryRouter>);
    const rows = document.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('22');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/real-estate/ocr/22');
    // With onContinue (the Ledger OCR page), Continue reopens the popup instead of linking.
    const onContinue = vi.fn();
    view.unmount();
    view = await render(<MemoryRouter><UnfinishedImports batches={list} currentId={20} onChanged={onChanged} onContinue={onContinue} /></MemoryRouter>);
    await click([...document.querySelectorAll('tbody tr button')].find((b) => b.textContent?.startsWith('Continue'))!);
    expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ id: 22 }));
    await click([...document.querySelectorAll('tbody tr button')].find((b) => b.textContent === 'Reject')!);
    const confirm = [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent === 'Reject batch') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    await change(document.querySelector('[role="dialog"] textarea'), 'Duplicate of 23');
    await click(confirm);
    await flush();
    expect(calls.find((c) => c.url === '/realestate/ocr/batches/22/reject')?.body).toEqual({ reason: 'Duplicate of 23' });
    expect(onChanged).toHaveBeenCalled();
  });

  it('shows nothing when every batch is finished', async () => {
    view = await render(<MemoryRouter><UnfinishedImports batches={[toOcrBatch({ Id: 23, Status: 4 })]} onChanged={() => {}} /></MemoryRouter>);
    expect(document.querySelector('#re-unfinished')).toBeNull();
  });
});

describe('payment slips attached on ledger upload', () => {
  it('are sent with the batch as "ledgerRows[n].Documents" and read back per row', () => {
    const corrections = documentCorrections({ '3': [{ blob: { blobName: '7/abc_receipt.jpg', fileName: 'receipt.jpg' } as never, documentType: 'PaymentReceipt' }], '4': [] });
    expect(corrections).toEqual([{ fieldName: 'ledgerRows[3].Documents', value: JSON.stringify([{ blobName: '7/abc_receipt.jpg', documentType: 'PaymentReceipt', fileName: 'receipt.jpg' }]) }]);
    const batch = toOcrBatch({ Id: 5, Status: 2, Fields: [
      { Name: 'ledgerRows[3].CustomerName', Value: 'Lata Jena', Confidence: 0.9 },
      { Name: 'ledgerRows[3].Documents', Value: corrections[0].value, Confidence: 1 },
    ] });
    expect(batch.rows[0].documents).toEqual([{ blobName: '7/abc_receipt.jpg', documentType: 'PaymentReceipt', fileName: 'receipt.jpg' }]);
    expect(batch.rows[0].confidence).toBe(0.9);
  });
});

describe('new booking with a new customer', () => {
  it('"+ Add a new customer" asks for name and mobile, and passes them with the booking', async () => {
    const onSubmit = vi.fn(async () => true);
    view = await render(<BookingForm customers={[]} plots={[{ id: 4, projectId: 1, plotNumber: 'A-4', area: 1200, areaUnit: 'SqFt', facing: '', roadWidth: null, status: 'Available' } as never]} canAddCustomer pending={false} error={null} onSubmit={onSubmit} />);
    const selects = document.querySelectorAll('select');
    await change(selects[0], '__new__');
    expect(document.querySelector('.re-new-customer')).not.toBeNull();
    await click($('button[type="submit"]'));
    expect(document.querySelectorAll('.re-new-customer [aria-invalid="true"], .re-new-customer .f-error').length).toBeGreaterThan(0);
    const inputs = document.querySelectorAll<HTMLInputElement>('.re-new-customer input');
    await change(inputs[0], 'Lata Jena');
    await change(inputs[1], '9876543210');
    await change(document.querySelectorAll('select')[1], '4');
    const amounts = document.querySelectorAll<HTMLInputElement>('input[type="number"]');
    await change(amounts[0], '50000');
    await change(amounts[1], '900000');
    await change(amounts[2], '20000');
    const mode = [...document.querySelectorAll('select')].find((el) => [...el.options].some((o) => o.value === 'Cheque'))!;
    await change(mode, 'Cash');
    await click($('button[type="submit"]'));
    expect(document.body.textContent).toContain('A new customer Lata Jena (9876543210) will be added.');
    expect(document.body.textContent).toContain('The booking amount is recorded as the first payment (Cash, commission');
    await click([...document.querySelectorAll('button')].find((b) => b.textContent === 'Create booking')!);
    await flush();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ plotId: 4, bookingAmount: 50000, agreedValue: 900000 }), expect.objectContaining({ name: 'Lata Jena', phone: '9876543210' }),
      { commissionAmount: 20000, paymentMode: 'Cash', documents: [] });
  });
});

describe('route protection', () => {
  it('sends signed-out visitors from /real-estate/* to sign in (8)', async () => {
    const calls = stubApi(() => ok({}));
    view = await render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/real-estate/ledger?bookingId=9']}>
          <Routes>
            <Route path="/real-estate/*" element={<ProtectedRoute><RealEstateRoutes /></ProtectedRoute>} />
            <Route path="/login" element={<p data-testid="login">login</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
    await flush();
    expect($('[data-testid="login"]')).not.toBeNull();
    expect(calls.some((c) => c.url.startsWith('/realestate'))).toBe(false);
  });
});

describe('mobile layout (10)', () => {
  // Vitest turns CSS imports into empty strings, so read the stylesheet from disk.
  const readCss = async (): Promise<string> => {
    const fs = (await import(/* @vite-ignore */ ['node', 'fs'].join(':'))) as { readFileSync: (p: string, enc: string) => string };
    const cwd = (globalThis as unknown as { process: { cwd: () => string } }).process.cwd(); // vitest runs from the project root
    return fs.readFileSync(`${cwd}/src/features/realEstate/realEstate.css`, 'utf8');
  };
  it('stacks tables into cards and forms into one column on phones', async () => {
    const css = await readCss();
    const phone = css.slice(css.indexOf('@media (max-width:640px)'));
    expect(phone).toContain('.re-table tr{display:block');
    expect(phone).toContain('.re-row{grid-template-columns:1fr;}');
    expect(css).toMatch(/@media \(max-width:1180px\)\{\.re-split\{grid-template-columns:1fr;\}\}/);
  });
});

describe('OCR analysis popup', () => {
  const BLOB = { blobName: '7/2026/11/06/r.jpg', container: 'uploaded', contentType: 'image/jpeg', size: 10, fileName: 'receipt.jpg' };

  it('shows the transactions as an editable table with a Documents column (no screenshot)', async () => {
    const onEdit = vi.fn();
    const onSubmit = vi.fn();
    const onRemove = vi.fn();
    const b = toOcrBatch(batchJson({ status: 'Parsed' }));
    view = await render(
      <OcrAnalysisDialog batch={b} fileName="ledger-page-01.jpg" draft={{ 0: { commissionAmount: '5500', transactionDate: '2026-01-01' }, 1: { transactionDate: '2026-01-02' } }}
        attachments={{ 0: [{ blob: BLOB, documentType: 'PaymentReceipt' }] }}
        editable pending={false} error="" onEdit={onEdit} onAttach={() => {}} onRemoveAttachment={onRemove} onSubmit={onSubmit} onClose={() => {}} />,
    );
    expect($('[role="dialog"] h2')?.textContent).toBe('Ledger analysis');
    expect($('[role="dialog"] img')).toBeNull();
    // Opens one customer at a time; switch to the full table.
    await click([...document.querySelectorAll('.re-ocr-view button')].find((b) => b.textContent === 'All rows')!);
    const heads = [...document.querySelectorAll('.re-ocr-dlg-table thead th')].map((th) => th.firstChild?.textContent);
    expect(heads).toEqual(['#', 'Transaction date', 'Customer name', 'Phone / mobile number', 'Plot number', 'Total received', 'Commission amount', 'Property amount', 'Payment mode', 'Reference number', 'Documents']);
    const rows = document.querySelectorAll('.re-ocr-dlg-table tbody tr');
    expect(rows).toHaveLength(2);
    const values = [...rows[0].querySelectorAll('td input')].map((i) => (i as HTMLInputElement).value);
    expect(values.slice(0, 7)).toEqual(['2026-01-01', 'Ramesh', '', 'A-1', '100000', '5500', '95000']);
    expect(rows[0].querySelector('td.re-col-property')).not.toBeNull();
    // Documents column: attached file listed, removable.
    const docs = rows[0].querySelector('.re-ocr-dlg-docs')!;
    expect(docs.textContent).toContain('receipt.jpg');
    expect(docs.textContent).toContain('Payment receipt');
    expect($('.re-ocr-dialog-foot')?.textContent).toContain('3 values changed · 1 document attached');
    await click(docs.querySelector('.re-link-btn'));
    expect(onRemove).toHaveBeenCalledWith('0', 0);

    // "Attach" opens an upload strip under that row only.
    expect($('.re-ocr-attach-row')).toBeNull();
    await click([...rows[1].querySelectorAll('.re-ocr-dlg-docs button')].find((x) => x.textContent?.includes('Attach'))!);
    const strip = document.querySelectorAll('.re-ocr-attach-row');
    expect(strip).toHaveLength(1);
    expect(strip[0].previousElementSibling).toBe(document.querySelectorAll('.re-ocr-dlg-table tbody tr')[1]);
    expect(strip[0].querySelector('select')).not.toBeNull();
    expect(strip[0].querySelector('input[type="file"]')).not.toBeNull();

    await change(rows[1].querySelector('td input'), '2026-01-03');
    expect(onEdit).toHaveBeenCalledWith('1', 'transactionDate', '2026-01-03');
    await click([...document.querySelectorAll('.re-ocr-dialog-foot button')].find((x) => x.textContent === 'Submit')!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('checks every field in the popup and refuses Submit while a row has errors', async () => {
    const onSubmit = vi.fn();
    const b = toOcrBatch(batchJson({ status: 'Parsed' }));
    // Row 1 has no date and a bad phone; row 2 has no date.
    view = await render(<OcrAnalysisDialog batch={b} fileName="p.jpg" draft={{ 0: { phoneNumber: '12345' } }} attachments={{}} editable pending={false} error="" onEdit={() => {}} onAttach={() => {}} onRemoveAttachment={() => {}} onSubmit={onSubmit} onClose={() => {}} />);
    const card = $('.re-ocr-step-card')!;
    expect(card.textContent).toContain('Transaction date is required.');
    expect(card.textContent).toContain('Enter a 10-digit mobile number.');
    expect(document.querySelectorAll('.re-ocr-step-chips button.has-error')).toHaveLength(2);
    expect($('.re-ocr-dialog-foot')?.textContent).toContain('Fix 3 fields before submitting.');
    await click([...document.querySelectorAll('.re-ocr-dialog-foot button')].find((x) => x.textContent === 'Submit')!);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates the ledger values like the backend (and what Import needs)', () => {
    expect(validateLedgerValues({ transactionDate: '2026-02-30', totalAmountReceived: '0', customerName: '', plotNumber: '', commissionAmount: '-5', propertyAmount: '0' })).toEqual({
      transactionDate: 'Enter the date as YYYY-MM-DD, e.g. 2026-04-17.', totalAmountReceived: 'Total received must be a number more than 0.',
      commissionAmount: 'Enter a number (0 or more).', propertyAmount: 'Property amount must be a number more than 0.',
      customerName: 'Customer name is required.', plotNumber: 'Plot number is required.',
    });
    expect(validateLedgerValues({ transactionDate: '2026-04-17', totalAmountReceived: '1000', customerName: 'Lata', plotNumber: '49' }).propertyAmount).toBe('Property amount is required.');
    expect(validateLedgerValues({ transactionDate: '2026-04-17', totalAmountReceived: '6,50,000', customerName: 'Lata', plotNumber: '49', phoneNumber: '+91 98765 43210', propertyAmount: '630000.50' })).toEqual({});
  });

  it('shows one customer at a time with Previous / Next and numbered chips', async () => {
    const onEdit = vi.fn();
    const b = toOcrBatch(batchJson({ status: 'Parsed' }));
    view = await render(<OcrAnalysisDialog batch={b} fileName="p.jpg" draft={{}} attachments={{}} editable pending={false} error="" onEdit={onEdit} onAttach={() => {}} onRemoveAttachment={() => {}} onSubmit={() => {}} onClose={() => {}} />);
    expect($('.re-ocr-dlg-table')).toBeNull();
    expect($('.re-ocr-step-nav p')?.textContent).toBe('Customer 1 of 2');
    expect($('.re-ocr-step-card h3')?.textContent).toContain('Ramesh');
    expect(document.querySelectorAll('.re-ocr-step-chips button')).toHaveLength(2);
    const next = [...document.querySelectorAll('.re-ocr-step-nav button')].find((x) => x.textContent?.startsWith('Next'))!;
    await click(next);
    expect($('.re-ocr-step-nav p')?.textContent).toBe('Customer 2 of 2');
    expect($('.re-ocr-step-card h3')?.textContent).toContain('Sita');
    expect(($('.re-ocr-step-nav button:last-child') as HTMLButtonElement).disabled).toBe(true);
    await change($('.re-ocr-step-card input'), '2026-02-01');
    expect(onEdit).toHaveBeenCalledWith('1', 'transactionDate', '2026-02-01');
    await click(document.querySelectorAll('.re-ocr-step-chips button')[0]);
    expect($('.re-ocr-step-nav p')?.textContent).toBe('Customer 1 of 2');
  });

  it('locks values and attachments once the batch can no longer be edited', async () => {
    const b = toOcrBatch(batchJson({ status: 'Approved' }));
    view = await render(<OcrAnalysisDialog batch={b} fileName="x.pdf" draft={{}} attachments={{}} editable={false} pending={false} error="" onEdit={() => {}} onAttach={() => {}} onRemoveAttachment={() => {}} onSubmit={() => {}} onClose={() => {}} />);
    expect([...document.querySelectorAll('.re-ocr-step-card input')].every((i) => (i as HTMLInputElement).disabled)).toBe(true);
    expect($('.re-ocr-step-docs button')).toBeNull();
    expect(([...document.querySelectorAll('.re-ocr-dialog-foot button')].find((x) => x.textContent === 'Submit') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('WLService OCR response shapes', () => {
  it('reads OcrBatchSummary: numeric Status, PascalCase Issues and Fields grouped into rows', () => {
    const b = toOcrBatch({
      Id: 12, Status: 1, Confidence: 0.82, RowCount: 4,
      Issues: [{ Code: 'MATCH_HINT_REQUIRED', Message: 'CustomerName or PlotNumber is required', FieldName: 'ledgerRows[1].CustomerName' }],
      Fields: [
        { Name: 'ledgerRows[0].CustomerName', Value: 'Ramesh', Confidence: 0.9, IsCorrected: false },
        { Name: 'ledgerRows[0].CommissionAmount', Value: '5000', Confidence: 0.7, IsCorrected: true },
        { Name: 'ledgerRows[1].PropertyAmount', Value: '95000', Confidence: 0.6, IsCorrected: false },
      ],
    });
    expect(b.id).toBe(12);
    expect(b.status).toBe('Parsed');
    expect(b.rows).toHaveLength(2);
    expect(b.rows[0].cells.customerName).toEqual({ extracted: 'Ramesh', corrected: null, confidence: 0.9 });
    expect(b.rows[0].cells.commissionAmount.corrected).toBe('5000');
    expect(b.rows[0].confidence).toBe(0.8);
    expect(b.rows[1].cells.propertyAmount.extracted).toBe('95000');
    expect(b.rows[1].cells.customerName.extracted).toBe('');
    expect(b.rows[1].issues[0]).toMatchObject({ code: 'MATCH_HINT_REQUIRED', field: 'customerName', rowIndex: 1 });
    expect(toOcrBatch({ Id: 3, Status: 2 }).status).toBe('Validated');
    expect(toOcrBatch({ Id: 3, Status: 'Approved' }).status).toBe('Approved');
  });

  it('create: the backend returns only the new batch id, then the batch is loaded', async () => {
    signIn();
    const calls = stubApi((c) => (c.method === 'POST'
      ? { status: 200, data: { Success: true, Data: 12 } }
      : { status: 200, data: { Success: true, Data: { Id: 12, Status: 0, Confidence: null, RowCount: 0, Issues: [] } } }));
    const { realEstateOcrApi } = await import('../api/realEstateOcrApi.ts');
    const b = await realEstateOcrApi.create({ blobName: '7/3f2a_ledger.jpg', container: 'realestate-images', contentType: 'image/jpeg', size: 1, fileName: 'ledger.jpg' });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['POST /realestate/ocr/batches', 'GET /realestate/ocr/batches/12']);
    expect(calls[0].body).toEqual({ fileName: 'ledger.jpg', contentType: 'image/jpeg', inputType: 3, blobName: '7/3f2a_ledger.jpg', businessModule: 'RealEstate' });
    expect(b).toMatchObject({ id: 12, status: 'Uploaded', fileName: 'ledger.jpg' });
  });
});

describe('OCR request time limits', () => {
  it('gives parse 200 s and the other OCR calls 90 s (the app default of 30 s cancels them)', async () => {
    signIn();
    const calls = stubApi((c) => (c.method === 'POST' && c.url.endsWith('/batches')
      ? { status: 200, data: { Success: true, Data: 5 } }
      : { status: 200, data: { Success: true, Data: { Id: 5, Status: 1, Issues: [] } } }));
    const { realEstateOcrApi } = await import('../api/realEstateOcrApi.ts');
    await realEstateOcrApi.create({ blobName: '7/a.jpg', container: 'realestate-images', contentType: 'image/jpeg', size: 1, fileName: 'a.jpg' });
    await realEstateOcrApi.parse(5);
    await realEstateOcrApi.validate(5);
    const t = Object.fromEntries(calls.map((c) => [`${c.method} ${c.url.replace('/realestate/ocr/batches', '')}`, c.timeout]));
    expect(t).toEqual({ 'POST ': 90_000, 'GET /5': 30_000, 'POST /5/parse': 200_000, 'POST /5/validate': 90_000 });
  });
});

describe('WLService workflow rules', () => {
  it('numbers rows by position when the backend counts from 1, keeping the API index for corrections', async () => {
    const { correctionKey } = await import('../utils/ocr.ts');
    const b = toOcrBatch({ Id: 1, Status: 1, Fields: [
      { Name: 'ledgerRows[1].CustomerName', Value: 'Ramesh', Confidence: 0.9 },
      { Name: 'ledgerRows[2].CustomerName', Value: 'Sita', Confidence: 0.9 },
      { Name: '__batch__', Value: null, Confidence: 0 },
    ] });
    expect(b.rows.map((r) => [r.rowNumber, r.index])).toEqual([[1, 1], [2, 2]]);
    expect(correctionKey(b.rows[0].index, 'customerName')).toBe('ledgerRows[1].CustomerName');
  });

  it('allows Validate only on Parsed batches (the backend refuses Validated ones)', async () => {
    const { canValidate } = await import('../utils/ocr.ts');
    expect(canValidate(toOcrBatch({ Id: 1, Status: 1 }), {})).toBe(true);
    expect(canValidate(toOcrBatch({ Id: 1, Status: 2 }), {})).toBe(false);
  });

  it('keeps Reject disabled until a reason is typed', async () => {
    const { default: ConfirmDialog } = await import('../components/ConfirmDialog.tsx');
    view = await render(<ConfirmDialog open title="Reject this batch?" confirmLabel="Reject batch" confirmDisabled onConfirm={() => {}} onCancel={() => {}} />);
    const btn = [...document.querySelectorAll('.re-dialog button')].find((b) => b.textContent === 'Reject batch') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

describe('import with a project', () => {
  it('sends { projectId } to /import when a project is given, {} otherwise', async () => {
    signIn();
    const calls = stubApi(() => ({ status: 200, data: { Success: true, Data: { Id: 16, Status: 4, Issues: [] } } }));
    const { realEstateOcrApi } = await import('../api/realEstateOcrApi.ts');
    await realEstateOcrApi.import(16, '3');
    await realEstateOcrApi.import(16);
    expect(calls.map((c) => [c.url, c.body])).toEqual([['/realestate/ocr/batches/16/import', { projectId: 3 }], ['/realestate/ocr/batches/16/import', {}]]);
  });
});

describe('phone / mobile number column', () => {
  it('reads PhoneNumber from the backend fields and corrects it as ledgerRows[n].PhoneNumber', async () => {
    const { correctionKey, buildCorrections } = await import('../utils/ocr.ts');
    const b = toOcrBatch({ Id: 1, Status: 1, Fields: [
      { Name: 'ledgerRows[1].CustomerName', Value: 'Rohita Gouda', Confidence: 0.9 },
      { Name: 'ledgerRows[1].PhoneNumber', Value: '9556084878', Confidence: 0.9 },
    ] });
    expect(b.rows[0].cells.phoneNumber.extracted).toBe('9556084878');
    expect(correctionKey(1, 'phoneNumber')).toBe('ledgerRows[1].PhoneNumber');
    expect(buildCorrections(b.rows, { 1: { phoneNumber: '9556084879' } })).toEqual([{ fieldName: 'ledgerRows[1].PhoneNumber', value: '9556084879' }]);
  });
});

describe('booking number from Import', () => {
  it('reads ledgerRows[n].BookingId as the row booking and shows amounts without ".0"', () => {
    const b = toOcrBatch({ Id: 16, Status: 4, Fields: [
      { Name: 'ledgerRows[1].CustomerName', Value: 'Rohita Gowda', Confidence: 0.9 },
      { Name: 'ledgerRows[1].TotalAmountReceived', Value: '650000.0', Confidence: 0.9 },
      { Name: 'ledgerRows[1].BookingId', Value: '42', Confidence: 1 },
      { Name: 'ledgerRows[2].CustomerName', Value: 'Sita', Confidence: 0.9 },
    ] });
    expect(b.rows[0].match).toMatchObject({ status: 'Matched' });
    expect(String(b.rows[0].match.bookingId)).toBe('42');
    expect(b.rows[0].cells.totalAmountReceived.extracted).toBe('650000');
    expect(b.rows[1].match.bookingId).toBeNull();
  });
});

describe('saved import batches', () => {
  it('lists the user batches from GET /realestate/ocr/batches (numeric status, dates)', async () => {
    signIn();
    const calls = stubApi(() => ({ status: 200, data: { Success: true, Data: [
      { Id: 17, FileName: 'page-2.jpeg', Status: 4, Confidence: 0.83, CreatedDate: '2026-11-17T09:00:00', ModifiedDate: '2026-11-17T09:05:00' },
      { Id: 16, FileName: 'page-1.jpeg', Status: 3, Confidence: null, CreatedDate: '2026-11-16T09:00:00', ModifiedDate: null },
    ] } }));
    const { realEstateOcrApi } = await import('../api/realEstateOcrApi.ts');
    const list = await realEstateOcrApi.list();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['GET /realestate/ocr/batches']);
    expect(list.map((b) => [b.id, b.fileName, b.status])).toEqual([[17, 'page-2.jpeg', 'Imported'], [16, 'page-1.jpeg', 'Approved']]);
  });
});
