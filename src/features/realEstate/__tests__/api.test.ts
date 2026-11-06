/** API layer: endpoints, error kinds, dedicated uploads, OCR safety. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../api/apiClient.ts';
import { ApiError } from '../../../api/errors.ts';
import { realEstateApi } from '../api/realEstateApi.ts';
import { toOverview } from '../api/normalize.ts';
import { realEstateOcrApi } from '../api/realEstateOcrApi.ts';
import { ocrInputType, RE_CONTAINER, STORAGE_NOT_CONFIGURED_MESSAGE, UploadError, WRITE_SAS_PATH, uploadRealEstateFile, validateUploadFile } from '../api/realEstateUpload.ts';
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
    await realEstateApi.customers.list(12);
    await realEstateApi.projects.list(12);
    await realEstateApi.documents.create({ bookingId: 9, documentType: 'Agreement', blob: { blobName: 're/a.pdf', container: 're', contentType: 'application/pdf', size: 5, fileName: 'a.pdf' } });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'POST /realestate/projects', 'GET /realestate/projects/5/plots', 'GET /realestate/partners/12/customers', 'GET /realestate/projects', 'POST /realestate/documents',
    ]);
    expect(calls[0].body).toEqual({ partnerId: 12, projectName: 'Green City', phase: 'Phase-2', location: 'Khurda', district: 'Khurda', state: 'Odisha' });
    expect(calls[2].params).toBeNull(); // the API has no paging/search parameters
    expect(calls[3].params).toEqual({ partnerId: 12 });
    // createDocumentRequest: only swagger fields; no client-built documentUrl.
    expect(calls[4].body).toEqual({ bookingId: 9, documentType: 'Agreement', blobName: 're/a.pdf' });
  });

  it('sends the three ledger amounts independently, ISO date, and omits empty optional fields', async () => {
    signIn();
    const calls = stubApi(() => ok({}));
    await realEstateApi.ledger.create(9, { transactionDate: '2026-01-15', amount: 100000, commissionAmount: 5000, propertyAmount: 95000, paymentMode: 'Cash', referenceNumber: ' R-1 ', remarks: '' });
    await realEstateApi.ledger.create(9, { transactionDate: '2026-01-16', amount: 25000, commissionAmount: null, propertyAmount: null, paymentMode: 'UPI', referenceNumber: '', remarks: '' });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['POST /realestate/bookings/9/transactions', 'POST /realestate/bookings/9/transactions']);
    expect(calls[0].body).toEqual({ transactionDate: '2026-01-15T00:00:00Z', amount: 100000, commissionAmount: 5000, propertyAmount: 95000, paymentMode: 'Cash', referenceNumber: 'R-1' });
    // createTransactionRequest types the amounts as double: empty ones are left out — never sent as 0 or null.
    expect(calls[1].body).toEqual({ transactionDate: '2026-01-16T00:00:00Z', amount: 25000, paymentMode: 'UPI' });
    // Buyer payments never go to the membership payment API.
    expect(calls.some((c) => /membership/i.test(c.url))).toBe(false);
  });

  it('reads the three amounts back without deriving one from another', async () => {
    signIn();
    stubApi(() => ok([{ id: 1, amount: 100000, commissionAmount: 5000, propertyAmount: null }]));
    const [tx] = await realEstateApi.ledger.list(9);
    expect(tx).toMatchObject({ amount: 100000, commissionAmount: 5000, propertyAmount: null });
  });

  it('only calls routes that exist in the live API', () => {
    // No bookings list / booking by id / OCR batch list in the API.
    expect(Object.keys(realEstateApi.bookings)).toEqual(['create']);
    expect('list' in realEstateOcrApi).toBe(false);
  });

  it('loads the overview from GET /realestate/overview with the login token', async () => {
    signIn();
    const calls = stubApi(() => ok({ TotalPlots: 13, AvailablePlots: 6, TotalReceived: 2225000, TotalCommission: 77500, TotalPropertyAmount: 2062500, OcrBatchesAwaitingReview: 2 }));
    const o = await realEstateApi.overview();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['GET /realestate/overview']);
    expect(calls[0].auth).toMatch(/^Bearer /);
    expect(o).toMatchObject({ totalPlots: 13, availablePlots: 6, totalReceived: 2225000, totalCommission: 77500, totalProperty: 2062500, ocrAwaitingReview: 2 });
    // Values the API didn't send stay null — never invented.
    expect(o).toMatchObject({ partners: null, bookings: null, outstanding: null, ocrReadyToImport: null });
  });

  it('maps the live partner response exactly (GSTNumber, nulls, soft-deleted rows)', async () => {
    signIn();
    const live = {
      BusinessName: 'Greater Aska Real Estate Con', ContactPerson: 'Bapi', Phone: null, Email: null, Address: null, GSTNumber: '21AABCG1234F1Z5',
      IsActive: true, Id: 1, CreatedBy: 'manual-admin', CreatedDate: '2026-11-04T02:38:49.2815783', ModifiedBy: null, ModifiedDate: null, IsDeleted: false,
    };
    stubApi(() => ok([live, { ...live, Id: 2, BusinessName: 'Removed', IsDeleted: true }]));
    expect(await realEstateApi.partners.list()).toEqual([
      { id: 1, businessName: 'Greater Aska Real Estate Con', contactPerson: 'Bapi', phone: '', email: '', address: '', gstNumber: '21AABCG1234F1Z5', isActive: true },
    ]);
  });

  it('reads the PANNumber casing used by the API', async () => {
    signIn();
    stubApi(() => ok([{ Id: 5, PartnerId: 1, Name: 'Ramesh', PANNumber: 'ABCPS1234F', AadhaarNumber: '234567890123', IsDeleted: false }]));
    expect((await realEstateApi.customers.list(1))[0]).toMatchObject({ id: 5, partnerId: 1, panNumber: 'ABCPS1234F', aadhaarNumber: '234567890123' });
  });

  it('maps the live overview response exactly', () => {
    const o = toOverview({
      PartnerCount: 1, ProjectCount: 0, PlotCount: 0, CustomerCount: 0, BookingCount: 0,
      TotalAmountReceived: 0, TotalCommissionAmount: 0, TotalPropertyAmount: 0, OcrPendingCount: 0,
    });
    expect(o).toMatchObject({
      partners: 1, projects: 0, totalPlots: 0, customers: 0, bookings: 0,
      totalReceived: 0, totalCommission: 0, totalProperty: 0, ocrAwaitingReview: 0,
    });
    // Zero is a real value, not "missing"; fields the API doesn't send stay null.
    expect(o).toMatchObject({ activeProjects: null, availablePlots: null, outstanding: null, ocrReadyToImport: null });
  });

  it('reads grouped overview responses too', () => {
    const o = toOverview({
      partnerName: 'Sai Developers',
      plots: { total: 13, available: 6, booked: 4, sold: 3 },
      ledger: { totalReceived: 100, commissionAmount: 5, propertyAmount: 95, outstanding: 900 },
      ocr: { awaitingReview: 1, readyToImport: 0 },
      projects: [{ id: 1 }, { id: 2 }],
    });
    expect(o).toMatchObject({
      partnerName: 'Sai Developers', totalPlots: 13, availablePlots: 6, bookedPlots: 4, soldPlots: 3,
      totalReceived: 100, totalCommission: 5, totalProperty: 95, outstanding: 900, ocrAwaitingReview: 1, ocrReadyToImport: 0, projects: 2,
    });
  });

  it('surfaces overview errors (e.g. 401) instead of showing zeros', async () => {
    signIn();
    stubApi(() => ({ status: 403, data: { Success: false, Message: 'Forbidden' } }));
    await expectKind(realEstateApi.overview(), 'forbidden');
  });

  it('reads PascalCase responses, as a plain array or wrapped in Items', async () => {
    signIn();
    stubApi(() => ok({ Items: [{ CustomerId: 3, Name: 'Ramesh', AadhaarNumber: '234567890123' }], TotalCount: 41 }));
    expect((await realEstateApi.customers.list(12))[0]).toMatchObject({ id: 3, name: 'Ramesh' });
    stubApi(() => ok([{ Id: 4, Name: 'Sita' }]));
    expect((await realEstateApi.customers.list(12))[0]).toMatchObject({ id: 4, name: 'Sita' });
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
  const BLOB_URI = 'https://wlstorage.blob.core.windows.net/uploaded/7/2026/11/06/abc.jpg';
  const SAS = 'sv=2024&se=2026-11-06T10%3A00%3A00Z&sp=cw&sig=SECRET';

  it('gets a write SAS from /write-sas-token (like the Visualizer) and PUTs to blobUri?sasToken', async () => {
    signIn();
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const calls = stubApi(() => ok({ blobUri: BLOB_URI, sasToken: `?${SAS}`, blobName: '7/2026/11/06/abc.jpg', expiresOn: '2026-11-06T10:00:00Z' }));
    const progress: number[] = [];
    const file = new File([new Uint8Array(10)], 'ledger.jpg', { type: 'image/jpeg' });
    const blob = await uploadRealEstateFile(file, { purpose: 'OcrLedger', onProgress: (p) => progress.push(p) });

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([`POST ${WRITE_SAS_PATH}`]);
    const body = calls[0].body as Record<string, unknown>;
    expect(body).toMatchObject({ userId: 7, containerName: 'uploaded', storageType: 'blob', contentType: 'image/jpeg' });
    expect(body.blobName).toMatch(/^7\/\d{4}\/\d{2}\/\d{2}\/[\w-]+\.jpg$/);
    // No storage account key / credentials in anything the browser sends.
    expect(JSON.stringify(calls)).not.toMatch(/AccountKey|accountKey|SharedAccessKey/);
    const xhr = FakeXhr.last!;
    expect(xhr.method).toBe('PUT');
    expect(xhr.url).toBe(`${BLOB_URI}?${SAS}`);
    expect(xhr.headers['x-ms-blob-type']).toBe('BlockBlob');
    expect(xhr.headers.Authorization).toBeUndefined(); // the bearer token never goes to storage
    expect(progress).toEqual([0.5, 1]);
    // Only metadata is kept — no SAS URL / signature.
    expect(blob).toEqual({ blobName: '7/2026/11/06/abc.jpg', container: RE_CONTAINER, contentType: 'image/jpeg', size: 10, fileName: 'ledger.jpg' });
    expect(JSON.stringify(blob)).not.toContain('sig=');
  });

  it('uses the suggested blob name for a PDF ledger when the server returns none', async () => {
    signIn();
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const calls = stubApi(() => ok({ blobUri: 'https://wlstorage.blob.core.windows.net/uploaded/x.pdf', sasToken: SAS }));
    const blob = await uploadRealEstateFile(new File(['%PDF'], 'page.pdf', { type: 'application/pdf' }), { purpose: 'OcrLedger' });
    expect(blob.blobName).toBe((calls[0].body as { blobName: string }).blobName);
    expect(blob.blobName).toMatch(/\.pdf$/);
  });

  it('refuses a non-https upload URL and never uploads', async () => {
    signIn();
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    FakeXhr.last = null;
    stubApi(() => ok({ blobUri: 'http://evil.example/x', sasToken: 'sig=1', blobName: 'a' }));
    await expectKind(uploadRealEstateFile(new File(['x'], 'a.png', { type: 'image/png' }), { purpose: 'Document' }), 'server');
    expect(FakeXhr.last).toBeNull();
  });

  it('turns "storage not configured" (409) into a plain, non-retryable message', async () => {
    signIn();
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    FakeXhr.last = null;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stubApi(() => ({ status: 409, data: { success: false, message: 'BlobServiceUri must be an absolute HTTPS Azure Blob service URI when BLOB_CONNECTION_STRING is not configured.' } }));
    const err = await uploadRealEstateFile(new File(['x'], 'a.png', { type: 'image/png' }), { purpose: 'OcrLedger' }).catch((e) => e);
    expect(err).toBeInstanceOf(UploadError);
    expect(err.retryable).toBe(false);
    expect(err.message).toBe(STORAGE_NOT_CONFIGURED_MESSAGE);
    expect(warn).toHaveBeenCalled();
    expect(FakeXhr.last).toBeNull();
    warn.mockRestore();
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
    // inputType is the swagger's int32 enum (3 = scanned ledger page).
    expect(calls[0].body).toEqual({ fileName: 'ledger-page-01.jpg', contentType: 'image/jpeg', inputType: 3, blobName: 'realestate/ledger-page-01.jpg', businessModule: 'RealEstate' });
  });
});
