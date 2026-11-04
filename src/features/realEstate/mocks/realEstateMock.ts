/**
 * Sample data for the Real Estate module while its backend isn't deployed.
 *
 * Follows the app's mock convention (src/mocks/mockApi.js, MOCK-APIS.md): active unless
 * VITE_MOCK_API=off. Every /realestate/* request on the shared Axios client is answered in
 * the browser from an in-memory store (reset on page reload), so the normal envelope
 * unwrapping and error handling still apply. Writes (create, book, pay, OCR actions) change
 * the store, so the screens behave like the real thing. Nothing leaves the browser.
 *
 * When the backend is live: set VITE_MOCK_API=off, or delete this file's install call.
 */
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '../../../api/apiClient.ts';

export const REAL_ESTATE_MOCK = String(import.meta.env.VITE_MOCK_API || 'planned').toLowerCase() !== 'off';
/** Upload URLs the mock hands out; the uploader simulates the PUT for these. */
export const MOCK_UPLOAD_PREFIX = 'https://realestate-sample.invalid/';
export const isMockUploadUrl = (url: string) => url.startsWith(MOCK_UPLOAD_PREFIX);

type Row = Record<string, unknown>;
const today = () => new Date().toISOString().slice(0, 10);
let seq = 10_000;
const nextId = () => ++seq;

// ---------- sample store ----------
const partners: Row[] = [
  { id: 1, businessName: 'Sai Developers', contactPerson: 'Prakash Nayak', phone: '9437012345', email: 'sai.developers@example.in', address: 'Patia, Bhubaneswar', gstNumber: '21AABCS1234F1Z5', isActive: true },
  { id: 2, businessName: 'Kalinga Land Promoters', contactPerson: 'Sunita Mishra', phone: '9861023456', email: 'kalinga.land@example.in', address: 'Badambadi, Cuttack', gstNumber: '21AACCK5678K1Z2', isActive: true },
  { id: 3, businessName: 'Jagannath Estates', contactPerson: 'Debashis Rath', phone: '9938034567', email: '', address: 'Grand Road, Puri', gstNumber: '', isActive: false },
];
const projects: Row[] = [
  { id: 101, partnerId: 1, projectName: 'Green City', phase: 'Phase-2', location: 'Jatni Road', district: 'Khurda', state: 'Odisha', status: 'Active' },
  { id: 102, partnerId: 1, projectName: 'Lake View Enclave', phase: 'Phase-1', location: 'Pipili', district: 'Puri', state: 'Odisha', status: 'Active' },
  { id: 201, partnerId: 2, projectName: 'Mahanadi Residency', phase: '', location: 'Naraj', district: 'Cuttack', state: 'Odisha', status: 'Active' },
];
const plot = (id: number, projectId: number, plotNumber: string, area: number, facing: string, roadWidth: number, status: string): Row =>
  ({ id, projectId, plotNumber, area, areaUnit: 'SqFt', facing, roadWidth, status });
const plots: Row[] = [
  plot(1001, 101, 'A-1', 1400, 'East', 30, 'Available'), plot(1002, 101, 'A-2', 1200, 'West', 30, 'Booked'),
  plot(1003, 101, 'A-3', 1500, 'North', 40, 'Sold'), plot(1004, 101, 'A-4', 1350, 'South', 30, 'Blocked'),
  plot(1005, 101, 'A-5', 1600, 'North-East', 40, 'Booked'), plot(1006, 101, 'A-6', 1400, 'East', 30, 'Available'),
  plot(1007, 101, 'B-1', 1800, 'East', 40, 'Available'), plot(1008, 101, 'B-2', 1200, 'West', 20, 'Available'),
  plot(1101, 102, 'L-1', 2000, 'East', 40, 'Available'), plot(1102, 102, 'L-2', 2000, 'West', 40, 'Booked'),
  plot(1103, 102, 'L-3', 2400, 'North', 40, 'Available'),
  plot(2001, 201, 'M-1', 1500, 'South', 30, 'Sold'), plot(2002, 201, 'M-2', 1500, 'South', 30, 'Available'),
];
const customers: Row[] = [
  { id: 501, partnerId: 1, name: 'Ramesh Sahoo', phone: '9876543210', email: 'ramesh.sahoo@example.in', address: 'Cuttack', aadhaarNumber: '234567890123', panNumber: 'ABCPS1234F' },
  { id: 502, partnerId: 1, name: 'Sita Devi Mohanty', phone: '9123456780', email: '', address: 'Puri', aadhaarNumber: '345678901234', panNumber: '' },
  { id: 503, partnerId: 1, name: 'Bikash Nayak', phone: '9437765432', email: 'bikash.n@example.in', address: 'Khurda', aadhaarNumber: '', panNumber: 'BNKPN5678Q' },
  { id: 504, partnerId: 1, name: 'Priyanka Das', phone: '9861234567', email: '', address: 'Bhubaneswar', aadhaarNumber: '456789012345', panNumber: 'CDEPD4321R' },
  { id: 601, partnerId: 2, name: 'Anil Behera', phone: '9938123456', email: '', address: 'Cuttack', aadhaarNumber: '567890123456', panNumber: '' },
];
const booking = (id: number, customerId: number, plotId: number, bookingDate: string, bookingAmount: number, agreedValue: number, status: string, documents: Row[] = []): Row =>
  ({ id, customerId, plotId, bookingDate, bookingAmount, agreedValue, status, documents });
const bookings: Row[] = [
  booking(9001, 501, 1002, '2026-08-14', 100000, 1400000, 'Confirmed', [{ id: 1, documentType: 'Agreement', fileName: 'sale-agreement-A2.pdf', uploadedDate: '2026-08-14' }]),
  booking(9002, 502, 1005, '2026-09-02', 150000, 1850000, 'Confirmed'),
  booking(9003, 503, 1102, '2026-10-11', 75000, 2600000, 'Pending'),
  booking(9004, 601, 2001, '2026-03-20', 200000, 1650000, 'Completed', [{ id: 2, documentType: 'PaymentReceipt', fileName: 'final-receipt-M1.jpg', uploadedDate: '2026-10-01' }]),
];
const tx = (id: number, bookingId: number, transactionDate: string, amount: number, commissionAmount: number | null, propertyAmount: number | null, paymentMode: string, referenceNumber: string, remarks: string): Row =>
  ({ id, bookingId, transactionDate: `${transactionDate}T00:00:00Z`, amount, commissionAmount, propertyAmount, paymentMode, referenceNumber, remarks });
const transactions: Row[] = [
  tx(1, 9001, '2026-08-14', 100000, 5000, 95000, 'UPI', 'UPI4471823', 'Booking advance'),
  tx(2, 9001, '2026-09-20', 250000, null, 240000, 'Cheque', 'CHQ 004512', '1st installment'),
  tx(3, 9002, '2026-09-02', 150000, 7500, 142500, 'BankTransfer', 'NEFT88213', 'Booking advance'),
  tx(4, 9003, '2026-10-11', 75000, null, null, 'Cash', '', 'Token amount'),
  tx(5, 9004, '2026-03-20', 200000, 10000, 190000, 'UPI', 'UPI3301245', 'Booking advance'),
  tx(6, 9004, '2026-06-15', 750000, 30000, 720000, 'Cheque', 'CHQ 118842', '2nd installment'),
  tx(7, 9004, '2026-10-01', 700000, 25000, 675000, 'BankTransfer', 'RTGS5520', 'Final payment'),
];
const ledgerRow = (r: Row): Row => ({ confidence: 0.9, matchStatus: 'Matched', ...r });
const ocrBatches: Row[] = [
  {
    id: 3, status: 'Validated', fileName: 'ledger-page-01.jpg', createdAt: '2026-11-01T09:30:00Z', updatedAt: '2026-11-01T09:42:00Z', confidence: 0.82,
    rawText: '05/10  Ramesh Sahoo  A-2   1,50,000\n       Payment Details: UPI 5512\n       7,500 (black)    1,42,500 (red)\n09/10  Sita   B-9   1O,000  Cash\n       9,000 (red)',
    ledgerRows: [
      ledgerRow({ rowNumber: 1, transactionDate: '2026-10-05', customerName: 'Ramesh Sahoo', plotNumber: 'A-2', totalAmountReceived: '150000', commissionAmount: '7500', propertyAmount: '142500', paymentMode: 'UPI', referenceNumber: 'UPI5512', remarks: '2nd installment', confidence: 0.96, matchedBookingId: 9001, matchLabel: 'Ramesh Sahoo · A-2' }),
      ledgerRow({ rowNumber: 2, transactionDate: '2026-10-09', customerName: 'Sita', plotNumber: 'B-9', totalAmountReceived: '1O000', commissionAmount: null, propertyAmount: '9000', paymentMode: 'Cash', referenceNumber: '', remarks: '', confidence: 0.58, fieldConfidence: { totalAmountReceived: 0.41, plotNumber: 0.52 }, matchStatus: 'UnmatchedPlot' }),
    ],
    validationIssues: [] as Row[],
  },
  {
    id: 4, status: 'Parsed', fileName: 'hisab-khata-p7.jpg', createdAt: '2026-11-02T11:05:00Z', updatedAt: '2026-11-02T11:06:00Z', confidence: 0.91,
    ledgerRows: [
      ledgerRow({ rowNumber: 1, transactionDate: '2026-10-20', customerName: 'Sita Devi Mohanty', plotNumber: 'A-5', totalAmountReceived: '200000', commissionAmount: '10000', propertyAmount: '190000', paymentMode: 'Cheque', referenceNumber: 'CHQ 220119', remarks: '2nd installment', confidence: 0.93, matchedBookingId: 9002, matchLabel: 'Sita Devi Mohanty · A-5' }),
    ],
    validationIssues: [] as Row[],
  },
  { id: 5, status: 'Imported', fileName: 'ledger-march.pdf', createdAt: '2026-04-02T08:00:00Z', updatedAt: '2026-04-03T10:15:00Z', confidence: 0.95, ledgerRows: [], validationIssues: [] as Row[] },
  { id: 6, status: 'Uploaded', fileName: 'new-page.jpg', createdAt: '2026-11-03T16:20:00Z', updatedAt: '2026-11-03T16:20:00Z', confidence: null, ledgerRows: [], validationIssues: [] as Row[] },
];

// ---------- helpers ----------
const byId = (list: Row[], id: unknown) => list.find((r) => String(r.id) === String(id));
const num = (v: unknown) => { const n = Number(String(v ?? '').replace(/[,\s₹]/g, '')); return Number.isFinite(n) ? n : NaN; };
class MockHttpError extends Error { constructor(readonly status: number, message: string) { super(message); } }
const fail = (status: number, message: string): never => { throw new MockHttpError(status, message); };
const paged = (list: Row[], params: Row) => {
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || list.length || 20;
  return { items: list.slice((page - 1) * pageSize, page * pageSize), totalCount: list.length, page, pageSize };
};
const bookingView = (b: Row): Row => {
  const p = byId(plots, b.plotId);
  const pr = p ? byId(projects, p.projectId) : undefined;
  return { ...b, customerName: byId(customers, b.customerId)?.name ?? '', plotNumber: p?.plotNumber ?? '', projectName: pr ? `${pr.projectName}${pr.phase ? ` ${pr.phase}` : ''}` : '' };
};
const projectView = (p: Row): Row => ({ ...p, partnerName: byId(partners, p.partnerId)?.businessName ?? '' });

/** Re-check a batch's rows: amounts must be numbers; rows match a booking by customer + plot. */
function revalidate(batch: Row) {
  const issues: Row[] = [];
  (batch.ledgerRows as Row[]).forEach((r, i) => {
    const val = (f: string) => ((r.corrections as Row | undefined)?.[f] ?? r[f]);
    for (const [f, api] of [['totalAmountReceived', 'TotalAmountReceived'], ['commissionAmount', 'CommissionAmount'], ['propertyAmount', 'PropertyAmount']]) {
      const v = val(f);
      const required = f === 'totalAmountReceived';
      if ((v === null || v === undefined || v === '') ? required : Number.isNaN(num(v)) || num(v) < 0) {
        issues.push({ code: required && (v === null || v === '') ? 'AMOUNT_REQUIRED' : 'AMOUNT_NOT_NUMERIC', message: `${api.replace(/([a-z])([A-Z])/g, '$1 $2')} is not a valid amount`, fieldName: `ledgerRows[${i}].${api}`, severity: 'Error' });
      }
    }
    if (val('commissionAmount') === null || val('commissionAmount') === '') {
      issues.push({ code: 'COMMISSION_MISSING', message: 'Commission amount not found — check the lower black amount', fieldName: `ledgerRows[${i}].CommissionAmount`, severity: 'Warning' });
    }
    const p = plots.find((x) => String(x.plotNumber).toLowerCase() === String(val('plotNumber') ?? '').trim().toLowerCase());
    const b = p ? bookings.find((x) => x.plotId === p.id && x.status !== 'Cancelled') : undefined;
    const c = b ? byId(customers, b.customerId) : undefined;
    const nameHint = String(val('customerName') ?? '').trim().toLowerCase();
    if (b && c && String(c.name).toLowerCase().includes(nameHint.split(' ')[0] || '~')) {
      Object.assign(r, { matchStatus: 'Matched', matchedBookingId: b.id, matchLabel: `${c.name} · ${p!.plotNumber}` });
    } else {
      Object.assign(r, { matchStatus: p ? 'UnmatchedCustomer' : 'UnmatchedPlot', matchedBookingId: null, matchLabel: '' });
    }
  });
  batch.validationIssues = issues;
}
ocrBatches.forEach((b) => { if ((b.ledgerRows as Row[]).length) revalidate(b); });
const errorsIn = (b: Row) => (b.validationIssues as Row[]).filter((i) => i.severity === 'Error').length;
const unmatchedIn = (b: Row) => (b.ledgerRows as Row[]).filter((r) => r.matchStatus !== 'Matched').length;
const touch = (b: Row) => { b.updatedAt = new Date().toISOString(); return b; };

// ---------- routes ----------
type Handler = (m: RegExpMatchArray, body: Row, params: Row) => unknown;
const routes: [string, RegExp, Handler][] = [
  ['GET', /^\/realestate\/access$/, () => ({ enabled: true, partnerId: 1, features: ['Partners', 'Projects', 'Plots', 'Customers', 'Bookings', 'Ledger', 'Reports', 'OCR'], permissions: ['Partners.Create'] })],
  ['GET', /^\/realestate\/overview$/, () => {
    const sum = (k: string) => transactions.reduce((s, t) => s + (typeof t[k] === 'number' ? (t[k] as number) : 0), 0);
    return {
      totalPlots: plots.length, customers: customers.length, bookings: bookings.length,
      totalReceived: sum('amount'), totalCommission: sum('commissionAmount'), totalProperty: sum('propertyAmount'),
      ocrAwaitingReview: ocrBatches.filter((b) => ['Parsed', 'Validated'].includes(String(b.status))).length,
      ocrReadyToImport: ocrBatches.filter((b) => b.status === 'Approved').length,
    };
  }],
  ['GET', /^\/realestate\/partners$/, () => partners],
  ['POST', /^\/realestate\/partners$/, (_m, b) => { const p = { id: nextId(), isActive: true, ...b }; partners.push(p); return p; }],
  ['GET', /^\/realestate\/projects$/, (_m, _b, q) => projects.filter((p) => !q.partnerId || String(p.partnerId) === String(q.partnerId)).map(projectView)],
  ['POST', /^\/realestate\/projects$/, (_m, b) => { const p = { id: nextId(), status: 'Active', ...b }; projects.push(p); return projectView(p); }],
  ['GET', /^\/realestate\/projects\/([^/]+)\/plots$/, (m) => (byId(projects, m[1]) ? plots.filter((p) => String(p.projectId) === m[1]) : fail(404, 'Project not found.'))],
  ['POST', /^\/realestate\/plots$/, (_m, b) => {
    if (plots.some((p) => String(p.projectId) === String(b.projectId) && String(p.plotNumber).toLowerCase() === String(b.plotNumber).toLowerCase())) fail(409, 'A plot with this number already exists in the project.');
    const p = { id: nextId(), status: 'Available', ...b }; plots.push(p); return p;
  }],
  ['GET', /^\/realestate\/partners\/([^/]+)\/customers$/, (m, _b, q) => {
    const s = String(q.search ?? '').toLowerCase();
    return paged(customers.filter((c) => String(c.partnerId) === m[1] && (!s || String(c.name).toLowerCase().includes(s) || String(c.phone).includes(s))), q);
  }],
  ['POST', /^\/realestate\/customers$/, (_m, b) => { const c = { id: nextId(), ...b }; customers.push(c); return c; }],
  ['GET', /^\/realestate\/bookings$/, (_m, _b, q) => paged(bookings.filter((b) => !q.status || b.status === q.status).map(bookingView), q)],
  ['GET', /^\/realestate\/bookings\/([^/]+)$/, (m) => bookingView(byId(bookings, m[1]) ?? fail(404, 'Booking not found.'))],
  ['POST', /^\/realestate\/bookings$/, (_m, b) => {
    const p = byId(plots, b.plotId) ?? fail(404, 'Plot not found.');
    if (p.status !== 'Available') fail(409, 'This plot is no longer available.');
    p.status = 'Booked';
    const nb = { id: nextId(), bookingDate: today(), status: 'Pending', documents: [], ...b }; bookings.push(nb); return bookingView(nb);
  }],
  ['GET', /^\/realestate\/bookings\/([^/]+)\/transactions$/, (m) => (byId(bookings, m[1]) ? transactions.filter((t) => String(t.bookingId) === m[1]) : fail(404, 'Booking not found.'))],
  ['POST', /^\/realestate\/bookings\/([^/]+)\/transactions$/, (m, b) => {
    byId(bookings, m[1]) ?? fail(404, 'Booking not found.');
    if (b.referenceNumber && transactions.some((t) => t.referenceNumber === b.referenceNumber)) fail(409, 'This payment reference has already been recorded.');
    const t = { id: nextId(), bookingId: Number(m[1]), ...b }; transactions.push(t); return t;
  }],
  ['POST', /^\/realestate\/documents$/, (_m, b) => {
    const bk = byId(bookings, b.bookingId) ?? fail(404, 'Booking not found.');
    const d = { id: nextId(), bookingId: bk.id, documentType: b.documentType, fileName: b.fileName, uploadedDate: today() };
    (bk.documents as Row[]).push(d); return d;
  }],
  ['POST', /^\/realestate\/images\/upload-grant$/, (_m, b) => {
    const blobName = `realestate/${Date.now()}-${String(b.fileName ?? 'file').replace(/[^\w.-]+/g, '-')}`;
    return { uploadUrl: `${MOCK_UPLOAD_PREFIX}${blobName}?sig=sample`, blobName, container: 'realestate-ocr', expiresOn: new Date(Date.now() + 600_000).toISOString() };
  }],
  // OCR
  ['GET', /^\/realestate\/ocr\/batches$/, (_m, _b, q) => paged(ocrBatches.filter((b) => !q.status || b.status === q.status)
    .map((b) => ({ ...b, rowCount: (b.ledgerRows as Row[]).length, issueCount: (b.validationIssues as Row[]).length, ledgerRows: undefined, validationIssues: undefined })), q)],
  ['POST', /^\/realestate\/ocr\/batches$/, (_m, b) => {
    const nb = { id: nextId(), status: 'Uploaded', fileName: b.fileName, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), confidence: null, ledgerRows: [], validationIssues: [] };
    ocrBatches.unshift(nb); return nb;
  }],
  ['GET', /^\/realestate\/ocr\/batches\/([^/]+)$/, (m) => byId(ocrBatches, m[1]) ?? fail(404, 'Batch not found.')],
  ['POST', /^\/realestate\/ocr\/batches\/([^/]+)\/parse$/, (m) => {
    const b = byId(ocrBatches, m[1]) ?? fail(404, 'Batch not found.');
    if (b.status !== 'Uploaded') fail(409, 'This batch has already been parsed.');
    // Sample extraction: what a real page might produce, including one unreadable amount.
    b.ledgerRows = [
      ledgerRow({ rowNumber: 1, transactionDate: '2026-10-28', customerName: 'Bikash Nayak', plotNumber: 'L-2', totalAmountReceived: '300000', commissionAmount: '15000', propertyAmount: '285000', paymentMode: 'BankTransfer', referenceNumber: 'NEFT99120', remarks: '1st installment', confidence: 0.92 }),
      ledgerRow({ rowNumber: 2, transactionDate: '2026-10-30', customerName: 'Ramesh', plotNumber: 'A-2', totalAmountReceived: '5O000', commissionAmount: '2500', propertyAmount: '47500', paymentMode: 'Cash', referenceNumber: '', remarks: '', confidence: 0.64, fieldConfidence: { totalAmountReceived: 0.38 } }),
    ];
    b.confidence = 0.78; b.status = 'Parsed'; b.rawText = '28/10 Bikash Nayak L-2 3,00,000 NEFT99120 15,000 (black) 2,85,000 (red)\n30/10 Ramesh A-2 5O,000 Cash 2,500 (black) 47,500 (red)';
    revalidate(b); return touch(b);
  }],
  ['POST', /^\/realestate\/ocr\/batches\/([^/]+)\/corrections$/, (m, body) => {
    const b = byId(ocrBatches, m[1]) ?? fail(404, 'Batch not found.');
    for (const c of (body.corrections as Row[]) ?? []) {
      const mm = /ledgerRows\[(\d+)\]\.(\w+)/.exec(String(c.fieldName));
      const row = mm ? (b.ledgerRows as Row[])[Number(mm[1])] : undefined;
      if (!row || !mm) fail(400, `Unknown field ${String(c.fieldName)}.`);
      const key = mm![2].charAt(0).toLowerCase() + mm![2].slice(1);
      row!.corrections = { ...(row!.corrections as Row | undefined), [key]: c.value };
    }
    b.status = 'Parsed'; revalidate(b); return touch(b);
  }],
  ['POST', /^\/realestate\/ocr\/batches\/([^/]+)\/validate$/, (m) => {
    const b = byId(ocrBatches, m[1]) ?? fail(404, 'Batch not found.');
    revalidate(b); b.status = 'Validated'; return touch(b);
  }],
  ['POST', /^\/realestate\/ocr\/batches\/([^/]+)\/approve$/, (m) => {
    const b = byId(ocrBatches, m[1]) ?? fail(404, 'Batch not found.');
    if (b.status !== 'Validated') fail(409, 'Validate the batch before approving it.');
    if (errorsIn(b) || unmatchedIn(b)) fail(400, 'Resolve validation errors and unmatched rows before approving.');
    b.status = 'Approved'; return touch(b);
  }],
  ['POST', /^\/realestate\/ocr\/batches\/([^/]+)\/import$/, (m) => {
    const b = byId(ocrBatches, m[1]) ?? fail(404, 'Batch not found.');
    if (b.status !== 'Approved') fail(409, 'Only an approved batch can be imported.');
    for (const r of b.ledgerRows as Row[]) {
      const v = (f: string) => ((r.corrections as Row | undefined)?.[f] ?? r[f]);
      const amt = (f: string) => (v(f) === null || v(f) === '' || v(f) === undefined ? null : num(v(f)));
      transactions.push({ id: nextId(), bookingId: r.matchedBookingId, transactionDate: `${String(v('transactionDate'))}T00:00:00Z`, amount: amt('totalAmountReceived'), commissionAmount: amt('commissionAmount'), propertyAmount: amt('propertyAmount'), paymentMode: v('paymentMode'), referenceNumber: v('referenceNumber') ?? '', remarks: v('remarks') ?? 'Imported from ledger OCR' });
    }
    b.status = 'Imported'; return touch(b);
  }],
  ['POST', /^\/realestate\/ocr\/batches\/([^/]+)\/reject$/, (m) => {
    const b = byId(ocrBatches, m[1]) ?? fail(404, 'Batch not found.');
    if (b.status === 'Imported') fail(409, 'An imported batch cannot be rejected.');
    b.status = 'Rejected'; return touch(b);
  }],
];

const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  await new Promise((r) => setTimeout(r, 250));
  const method = String(config.method).toUpperCase();
  const path = String(config.url).split('?')[0];
  let body: Row = {};
  if (typeof config.data === 'string' && config.data) { try { body = JSON.parse(config.data) as Row; } catch { /* ignore */ } }
  const params = (config.params ?? {}) as Row;
  const respond = (status: number, data: unknown) => ({ data, status, statusText: '', headers: {}, config });
  for (const [m, re, handler] of routes) {
    const match = method === m ? path.match(re) : null;
    if (!match) continue;
    try {
      // Plain JSON clone so screens never hold references into the store.
      return respond(200, { success: true, message: '', data: JSON.parse(JSON.stringify(handler(match, body, params) ?? null)) });
    } catch (e) {
      const status = e instanceof MockHttpError ? e.status : 500;
      throw new AxiosError('mock', 'ERR_BAD_RESPONSE', config, {}, respond(status, { success: false, message: e instanceof Error ? e.message : 'Error' }));
    }
  }
  throw new AxiosError('mock', 'ERR_BAD_RESPONSE', config, {}, respond(404, { success: false, message: 'Not found.' }));
};

/** Exposed for tests. */
export const realEstateMockAdapter = adapter;

let installed = false;
/** Routes /realestate/* requests on the shared client to the sample store. */
export function installRealEstateMock() {
  if (!REAL_ESTATE_MOCK || installed) return;
  installed = true;
  apiClient.interceptors.request.use((config) => {
    if (String(config.url ?? '').startsWith('/realestate')) config.adapter = adapter;
    return config;
  });
  if (import.meta.env.DEV) console.info('[mock api] Real Estate sample data active (VITE_MOCK_API=off to use the real API)');
}
