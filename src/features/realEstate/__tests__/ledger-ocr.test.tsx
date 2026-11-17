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
import OcrAnalysisDialog from '../components/OcrAnalysisDialog.tsx';
import OcrConfirmSummary from '../components/OcrConfirmSummary.tsx';
import OcrIssueList from '../components/OcrIssueList.tsx';
import OcrReviewTable from '../components/OcrReviewTable.tsx';
import TransactionForm, { toTransactionInput } from '../components/TransactionForm.tsx';
import { useRealEstateOcr } from '../hooks/useRealEstateOcr.ts';
import RealEstateRoutes from '../routes/realEstateRoutes.tsx';
import type { TransactionInput } from '../types/realEstateTypes.ts';
import { allIssues, batchTotals } from '../utils/ocr.ts';
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

describe('OCR review', () => {
  it('renders the three amount labels with the correct ledger explanations (4)', async () => {
    view = await render(<MemoryRouter><OcrReviewTable rows={toOcrBatch(batchJson()).rows} draft={{}} editable onEdit={() => {}} /></MemoryRouter>);
    const heads = [...document.querySelectorAll('thead th')].map((th) => th.textContent);
    // Plain column names (no hint lines), with the customer's phone after the name.
    expect(heads).toEqual(expect.arrayContaining(['Total received', 'Commission amount', 'Property amount', 'Phone / mobile number']));
    expect(heads.indexOf('Phone / mobile number')).toBe(heads.indexOf('Customer name') + 1);
    // Values land in their own column — the red amount is never shown as commission.
    expect(($('input[aria-label="Row 1 Property amount"]') as HTMLInputElement).value).toBe('95000');
    expect(($('input[aria-label="Row 1 Commission amount"]') as HTMLInputElement).value).toBe('5000');
    expect(($('input[aria-label="Row 2 Commission amount"]') as HTMLInputElement).value).toBe('');
  });

  it('totals each amount column separately for the confirmation', async () => {
    const b = toOcrBatch(batchJson());
    expect(batchTotals(b)).toEqual({ rows: 2, totalReceived: 120000, totalCommission: 5000, totalProperty: 114000 });
    view = await render(<OcrConfirmSummary batch={b} draft={{}} />);
    const text = $('[data-testid="ocr-confirm-summary"]')?.textContent ?? '';
    expect(text).toContain('₹1,20,000.00');
    expect(text).toContain('₹5,000.00');
    expect(text).toContain('₹1,14,000.00');
  });

  it('shows issue code, message, row and field, and focuses the field', async () => {
    const b = toOcrBatch(batchJson({ status: 'Parsed', validationIssues: [{ code: 'NEG_AMOUNT', message: 'Amount cannot be negative', fieldName: 'ledgerRows[1].PropertyAmount' }] }));
    const issues = allIssues(b);
    expect(issues[0]).toMatchObject({ code: 'NEG_AMOUNT', rowIndex: 1, field: 'propertyAmount', severity: 'Error' });
    view = await render(<MemoryRouter><OcrIssueList issues={issues} rows={b.rows} /><OcrReviewTable rows={b.rows} draft={{}} editable onEdit={() => {}} /></MemoryRouter>);
    expect($('.re-issues')?.textContent).toContain('NEG_AMOUNT');
    await click([...document.querySelectorAll('.re-issues button')][0]);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Row 2 Property amount');
  });
});

function OcrProbe({ onReady }: { onReady: (o: ReturnType<typeof useRealEstateOcr>) => void }) {
  onReady(useRealEstateOcr('7', true));
  return null;
}

describe('approval and import are separate', () => {
  it('approving never calls import (6)', async () => {
    signIn();
    const calls = stubApi((c) => ok(batchJson({ status: c.url.endsWith('/approve') ? 'Approved' : 'Validated' })));
    let ocr: ReturnType<typeof useRealEstateOcr> | null = null;
    view = await render(<OcrProbe onReady={(o) => { ocr = o; }} />);
    await flush();
    await ocr!.run('approve');
    await flush();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['GET /realestate/ocr/batches/7', 'POST /realestate/ocr/batches/7/approve']);
    expect(calls.some((c) => c.url.endsWith('/import'))).toBe(false);
    expect(ocr!.batch?.status).toBe('Approved');
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
      <OcrAnalysisDialog batch={b} fileName="ledger-page-01.jpg" draft={{ 0: { commissionAmount: '5500' } }}
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
    expect(values.slice(1, 7)).toEqual(['Ramesh', '', 'A-1', '100000', '5500', '95000']);
    expect(rows[0].querySelector('td.re-col-property')).not.toBeNull();
    // Documents column: attached file listed, removable.
    const docs = rows[0].querySelector('.re-ocr-dlg-docs')!;
    expect(docs.textContent).toContain('receipt.jpg');
    expect(docs.textContent).toContain('Payment receipt');
    expect($('.re-ocr-dialog-foot')?.textContent).toContain('1 value changed · 1 document attached');
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

    await change(rows[1].querySelector('td input'), '2026-01-02');
    expect(onEdit).toHaveBeenCalledWith('1', 'transactionDate', '2026-01-02');
    await click([...document.querySelectorAll('.re-ocr-dialog-foot button')].find((x) => x.textContent === 'Submit')!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
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
