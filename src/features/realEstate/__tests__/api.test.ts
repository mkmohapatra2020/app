/** API layer: endpoints, error kinds, dedicated uploads, OCR safety. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../api/apiClient.ts';
import { ApiError } from '../../../api/errors.ts';
import { realEstateApi } from '../api/realEstateApi.ts';
import { realEstateOcrApi } from '../api/realEstateOcrApi.ts';
import { ocrInputType, UPLOAD_GRANT_PATH, uploadRealEstateFile, validateUploadFile } from '../api/realEstateUpload.ts';
import { ok, signIn, stubApi } from './helpers.tsx';

const original = apiClient.defaults.adapter;
afterEach(() => { apiClient.defaults.adapter = original; vi.unstubAllGlobals(); });

const expectKind = async (p: Promise<unknown>, kind: string) => {
  const e = await p.catch((x: unknown) => x);
  expect(e).toBeInstanceOf(ApiError);
  expect((e as ApiError).kind).toBe(kind);
};

describe('realEstateApi', () => {
  it('rejects before any request when signed out', async () => {
    const calls = stubApi(() => ok([]));
    await expectKind(realEstateApi.projects.list(), 'unauthorized');
    expect(calls).toHaveLength(0);
  });

  it('maps 403 to forbidden (no token refresh, no sign-out) and 409 to conflict', async () => {
    signIn();
    const calls = stubApi((c) => (c.url === '/realestate/partners' ? { status: 403, data: { error: 'Not your partner' } } : { status: 409, data: { error: 'Plot is not available' } }));
    await expectKind(realEstateApi.partners.list(), 'forbidden');
    await expectKind(realEstateApi.bookings.create({ customerId: 1, plotId: 2, bookingAmount: 1000, agreedValue: 50000 }), 'conflict');
    expect(calls.every((c) => !c.url.includes('refresh'))).toBe(true);
  });

  it('maps a 401 that survives refresh to unauthorized', async () => {
    signIn();
    stubApi(() => ({ status: 401 }));
    vi.spyOn((await import('../../../api/tokenManager.ts')), 'refreshSession').mockRejectedValue(new ApiError('unauthorized', 'expired', 401));
    await expectKind(realEstateApi.partners.list(), 'unauthorized');
  });

  it('calls the documented endpoints with only the expected fields', async () => {
    signIn();
    const calls = stubApi(() => ok({}));
    await realEstateApi.projects.create({ partnerId: 12, name: ' Green City ', phase: 'Phase-2', location: 'Khurda', district: 'Khurda', state: 'Odisha' });
    await realEstateApi.plots.list(5);
    await realEstateApi.customers.list(12, { page: 2, pageSize: 20 });
    await realEstateApi.projects.list(12);
    await realEstateApi.documents.create({ bookingId: 9, documentType: 'Agreement', blob: { blobName: 're/a.pdf', container: 're', contentType: 'application/pdf', size: 5, fileName: 'a.pdf' } });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'POST /realestate/projects', 'GET /realestate/projects/5/plots', 'GET /realestate/partners/12/customers', 'GET /realestate/projects', 'POST /realestate/documents',
    ]);
    expect(calls[0].body).toEqual({ partnerId: 12, projectName: 'Green City', phase: 'Phase-2', location: 'Khurda', district: 'Khurda', state: 'Odisha' });
    expect(calls[2].params).toEqual({ page: 2, pageSize: 20 });
    expect(calls[3].params).toEqual({ partnerId: 12 });
    expect(calls[4].body).toEqual({ bookingId: 9, documentType: 'Agreement', blobName: 're/a.pdf', fileName: 'a.pdf', contentType: 'application/pdf' });
  });

  it('sends the three ledger amounts independently, ISO date, empty optionals as null', async () => {
    signIn();
    const calls = stubApi(() => ok({}));
    await realEstateApi.ledger.create(9, { transactionDate: '2026-01-15', amount: 100000, commissionAmount: 5000, propertyAmount: 95000, paymentMode: 'Cash', referenceNumber: ' R-1 ', remarks: '' });
    await realEstateApi.ledger.create(9, { transactionDate: '2026-01-16', amount: 25000, commissionAmount: null, propertyAmount: null, paymentMode: 'UPI', referenceNumber: '', remarks: '' });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['POST /realestate/bookings/9/transactions', 'POST /realestate/bookings/9/transactions']);
    expect(calls[0].body).toEqual({ transactionDate: '2026-01-15T00:00:00Z', amount: 100000, commissionAmount: 5000, propertyAmount: 95000, paymentMode: 'Cash', referenceNumber: 'R-1', remarks: null });
    expect(calls[1].body).toMatchObject({ amount: 25000, commissionAmount: null, propertyAmount: null });
    // Buyer payments never go to the membership payment API.
    expect(calls.some((c) => /membership/i.test(c.url))).toBe(false);
  });

  it('reads the three amounts back without deriving one from another', async () => {
    signIn();
    stubApi(() => ok([{ id: 1, amount: 100000, commissionAmount: 5000, propertyAmount: null }]));
    const [tx] = await realEstateApi.ledger.list(9);
    expect(tx).toMatchObject({ amount: 100000, commissionAmount: 5000, propertyAmount: null });
  });

  it('treats a missing overview endpoint as "not available" instead of inventing totals', async () => {
    signIn();
    stubApi(() => ({ status: 404 }));
    expect(await realEstateApi.overview()).toBeNull();
  });

  it('reads PascalCase and paged responses', async () => {
    signIn();
    stubApi(() => ok({ Items: [{ CustomerId: 3, Name: 'Ramesh', AadhaarNumber: '234567890123' }], TotalCount: 41 }));
    const page = await realEstateApi.customers.list(12, { page: 1, pageSize: 20 });
    expect(page.total).toBe(41);
    expect(page.items[0]).toMatchObject({ id: 3, name: 'Ramesh' });
  });
});

describe('dedicated Real Estate uploads', () => {
  class FakeXhr {
    static last: FakeXhr | null = null;
    method = ''; url = ''; headers: Record<string, string> = {}; status = 0; body: unknown = null;
    upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
    onload: (() => void) | null = null; onerror: (() => void) | null = null; onabort: (() => void) | null = null;
    constructor() { FakeXhr.last = this; }
    open(m: string, u: string) { this.method = m; this.url = u; }
    setRequestHeader(k: string, v: string) { this.headers[k] = v; }
    abort() { this.onabort?.(); }
    send(body: unknown) { this.body = body; this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 }); this.status = 201; this.onload?.(); }
  }
  const GRANT_URL = 'https://realestatedocs.blob.core.windows.net/realestate-ocr/p12/abc.jpg?sv=2024&sig=SECRET';

  it('gets a grant from /realestate/images/upload-grant and PUTs to exactly that URL', async () => {
    signIn();
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const calls = stubApi(() => ok({ uploadUrl: GRANT_URL, blobName: 'p12/abc.jpg', container: 'realestate-ocr', expiresOn: '2026-11-03T10:00:00Z' }));
    const progress: number[] = [];
    const file = new File([new Uint8Array(10)], 'ledger.jpg', { type: 'image/jpeg' });
    const blob = await uploadRealEstateFile(file, { purpose: 'OcrLedger', onProgress: (p) => progress.push(p) });

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([`POST ${UPLOAD_GRANT_PATH}`]);
    expect(calls[0].body).toEqual({ fileName: 'ledger.jpg', contentType: 'image/jpeg' });
    // No storage account key / credentials in anything the browser sends.
    expect(JSON.stringify(calls)).not.toMatch(/AccountKey|accountKey|SharedAccessKey/);
    // Never the app's media endpoints.
    expect(calls.some((c) => /write-sas-token|ai-visualization|images\/generate/.test(c.url))).toBe(false);
    const xhr = FakeXhr.last!;
    expect(xhr.method).toBe('PUT');
    expect(xhr.url).toBe(GRANT_URL);
    expect(xhr.headers.Authorization).toBeUndefined(); // the bearer token never goes to storage
    expect(progress).toEqual([0.5, 1]);
    // Only backend metadata is kept — no SAS URL / signature.
    expect(blob).toEqual({ blobName: 'p12/abc.jpg', container: 'realestate-ocr', contentType: 'image/jpeg', size: 10, fileName: 'ledger.jpg' });
    expect(JSON.stringify(blob)).not.toContain('sig=');
  });

  it('refuses a non-https grant URL and never uploads', async () => {
    signIn();
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    FakeXhr.last = null;
    stubApi(() => ok({ uploadUrl: 'http://evil.example/x', blobName: 'a', container: 'c' }));
    await expectKind(uploadRealEstateFile(new File(['x'], 'a.png', { type: 'image/png' }), { purpose: 'Document' }), 'server');
    expect(FakeXhr.last).toBeNull();
  });

  it('maps PDF and Excel ledgers to their OCR input types', () => {
    expect(ocrInputType('application/pdf')).toBe('Pdf');
    expect(ocrInputType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('Excel');
    expect(ocrInputType('image/png')).toBe('ScannedLedgerPage');
  });

  it('validates type and size before asking for a grant', async () => {
    signIn();
    const calls = stubApi(() => ok({}));
    expect(validateUploadFile(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toMatch(/type/);
    expect(validateUploadFile(new File([new Uint8Array(11 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' }))).toMatch(/too large/);
    await expect(uploadRealEstateFile(new File(['x'], 'a.gif', { type: 'image/gif' }), { purpose: 'Document' })).rejects.toThrow(/type/);
    expect(calls).toHaveLength(0);
  });
});

describe('OCR workflow API', () => {
  it('submits corrections as { corrections: [{ fieldName: "ledgerRows[n].Field", value }] }', async () => {
    signIn();
    const calls = stubApi(() => ok({ id: 4, status: 'Parsed', ledgerRows: [] }));
    await realEstateOcrApi.submitCorrections(4, [{ fieldName: 'ledgerRows[1].CommissionAmount', value: '5000' }]);
    expect(calls[0]).toMatchObject({ method: 'POST', url: '/realestate/ocr/batches/4/corrections', body: { corrections: [{ fieldName: 'ledgerRows[1].CommissionAmount', value: '5000' }] } });
  });

  it('rejects with { reason }', async () => {
    signIn();
    const calls = stubApi(() => ok({ id: 4, status: 'Rejected' }));
    await realEstateOcrApi.reject(4, ' Unable to match the ledger row to an existing booking. ');
    expect(calls[0].body).toEqual({ reason: 'Unable to match the ledger row to an existing booking.' });
  });

  it('never sends OCR rows to production endpoints: import is a bare action on the batch', async () => {
    signIn();
    const calls = stubApi(() => ok({ id: 4, status: 'Imported', rows: [] }));
    await realEstateOcrApi.create({ blobName: 'realestate/ledger-page-01.jpg', container: 'realestate-ocr', contentType: 'image/jpeg', size: 10, fileName: 'ledger-page-01.jpg' });
    await realEstateOcrApi.parse(4);
    await realEstateOcrApi.validate(4);
    await realEstateOcrApi.approve(4);
    await realEstateOcrApi.import(4);
    expect(calls.map((c) => c.url)).toEqual([
      '/realestate/ocr/batches', '/realestate/ocr/batches/4/parse', '/realestate/ocr/batches/4/validate', '/realestate/ocr/batches/4/approve', '/realestate/ocr/batches/4/import',
    ]);
    expect(calls[4].body).toEqual({});
    expect(calls.some((c) => /transactions|bookings|customers|plots/.test(c.url))).toBe(false);
    // Batch creation references the stored blob; no ids invented.
    expect(calls[0].body).toEqual({ fileName: 'ledger-page-01.jpg', contentType: 'image/jpeg', inputType: 'ScannedLedgerPage', blobName: 'realestate/ledger-page-01.jpg', businessModule: 'RealEstate' });
  });
});
