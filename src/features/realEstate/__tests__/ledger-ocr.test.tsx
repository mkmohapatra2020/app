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
    expect(heads).toContain('Total receivedFrom the previous column');
    expect(heads).toContain('Commission (lower black amount)Lower amount written in black, after Payment Details');
    expect(heads).toContain('Property amount (red)Amount written in red');
    // Values land in their own column — the red amount is never shown as commission.
    expect(($('input[aria-label="Row 1 Property amount (red)"]') as HTMLInputElement).value).toBe('95000');
    expect(($('input[aria-label="Row 1 Commission (lower black amount)"]') as HTMLInputElement).value).toBe('5000');
    expect(($('input[aria-label="Row 2 Commission (lower black amount)"]') as HTMLInputElement).value).toBe('');
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
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Row 2 Property amount (red)');
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
    expect($('[role="dialog"] h2')?.textContent).toBe('Ledger analysis (GPT-6 Luna)');
    expect($('[role="dialog"] img')).toBeNull();
    const heads = [...document.querySelectorAll('.re-ocr-dlg-table thead th')].map((th) => th.firstChild?.textContent);
    expect(heads).toEqual(['#', 'Transaction date', 'Customer name', 'Plot number', 'Total received', 'Commission (lower black amount)', 'Property amount (red)', 'Payment mode', 'Reference number', 'Documents']);
    const rows = document.querySelectorAll('.re-ocr-dlg-table tbody tr');
    expect(rows).toHaveLength(2);
    const values = [...rows[0].querySelectorAll('td input')].map((i) => (i as HTMLInputElement).value);
    expect(values.slice(1, 6)).toEqual(['Ramesh', 'A-1', '100000', '5500', '95000']);
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

  it('locks values and attachments once the batch can no longer be edited', async () => {
    const b = toOcrBatch(batchJson({ status: 'Approved' }));
    view = await render(<OcrAnalysisDialog batch={b} fileName="x.pdf" draft={{}} attachments={{}} editable={false} pending={false} error="" onEdit={() => {}} onAttach={() => {}} onRemoveAttachment={() => {}} onSubmit={() => {}} onClose={() => {}} />);
    expect([...document.querySelectorAll('.re-ocr-dlg-table td input')].every((i) => (i as HTMLInputElement).disabled)).toBe(true);
    expect($('.re-ocr-dlg-docs button')).toBeNull();
    expect(([...document.querySelectorAll('.re-ocr-dialog-foot button')].find((x) => x.textContent === 'Submit') as HTMLButtonElement).disabled).toBe(true);
  });
});
