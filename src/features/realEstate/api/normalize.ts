/**
 * Response → UI model mapping. Reads camelCase or PascalCase (like the rest of the app)
 * and tolerates missing fields so a partial response never crashes a screen.
 */
import { field, isObj } from '../../../api/errors.ts';
import { REAL_ESTATE_FEATURES, type Booking, type Customer, type Id, type LedgerTransaction, type OverviewTotals, type Paged, type Partner, type Plot, type Project, type RealEstateAccess, type RealEstateDocument, type RealEstateFeature, type UploadGrant } from '../types/realEstateTypes.ts';
import { OCR_API_FIELD, OCR_FIELDS, type OcrBatch, type OcrCell, type OcrField, type OcrMatchStatus, type OcrRow, type OcrValidationIssue } from '../types/ocrTypes.ts';

/** First defined value among the keys (each read as camelCase or PascalCase). */
const pick = (o: unknown, ...keys: string[]): unknown => {
  for (const k of keys) {
    const v = field(o, k);
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
};
export const str = (v: unknown): string => (v === undefined || v === null ? '' : String(v));
export const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[,\s₹]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: unknown): number | null => (v === undefined || v === null || v === '' ? null : num(v));
/** Nullable money: missing or unreadable stays null (never 0). */
export const amountOrNull = (v: unknown): number | null => {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[,\s₹]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const boolOrNull = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : null);
const idOrNull = (v: unknown): Id | null => (typeof v === 'number' || (typeof v === 'string' && v.trim()) ? v : null);
const id = (o: unknown, ...keys: string[]): Id => (idOrNull(pick(o, ...keys, 'id')) ?? '') as Id;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Array body, or `{ items | data | results, totalCount | total }`. */
export function toPaged<T>(body: unknown, map: (o: unknown) => T, page = 1, pageSize = 0): Paged<T> {
  const list = Array.isArray(body) ? body : arr(pick(body, 'items', 'data', 'results', 'records'));
  const total = Array.isArray(body) ? null : numOrNull(pick(body, 'totalCount', 'total', 'count'));
  return {
    items: list.map(map),
    total,
    page: num(pick(body, 'page', 'pageNumber')) || page,
    pageSize: num(pick(body, 'pageSize')) || pageSize || list.length,
  };
}
export const toList = <T>(body: unknown, map: (o: unknown) => T): T[] => toPaged(body, map).items;

export function toAccess(body: unknown): RealEstateAccess {
  const features = arr(pick(body, 'features'))
    .map((f) => REAL_ESTATE_FEATURES.find((k) => k.toLowerCase() === str(f).toLowerCase()))
    .filter((f): f is RealEstateFeature => !!f);
  // Only an explicit `true` enables the module.
  const enabled = pick(body, 'enabled') === true;
  return {
    enabled,
    partnerId: idOrNull(pick(body, 'partnerId')),
    features: enabled ? features : [],
    permissions: arr(pick(body, 'permissions')).map(str).filter(Boolean),
  };
}

export const toPartner = (o: unknown): Partner => ({
  id: id(o, 'partnerId'),
  businessName: str(pick(o, 'businessName', 'name')),
  contactPerson: str(pick(o, 'contactPerson')),
  phone: str(pick(o, 'phone', 'mobile')),
  email: str(pick(o, 'email')),
  address: str(pick(o, 'address')),
  gstNumber: str(pick(o, 'gstNumber', 'gst')),
  isActive: boolOrNull(pick(o, 'isActive', 'active')),
});

export const toProject = (o: unknown): Project => ({
  id: id(o, 'projectId'),
  partnerId: idOrNull(pick(o, 'partnerId')),
  partnerName: str(pick(o, 'partnerName', 'businessName')),
  name: str(pick(o, 'projectName', 'name')),
  phase: str(pick(o, 'phase')),
  location: str(pick(o, 'location')),
  district: str(pick(o, 'district')),
  state: str(pick(o, 'state')),
  status: str(pick(o, 'status')),
});

export const toPlot = (o: unknown): Plot => ({
  id: id(o, 'plotId'),
  projectId: idOrNull(pick(o, 'projectId')),
  plotNumber: str(pick(o, 'plotNumber', 'number')),
  area: numOrNull(pick(o, 'area')),
  areaUnit: str(pick(o, 'areaUnit', 'unit')),
  facing: str(pick(o, 'facing')),
  roadWidth: numOrNull(pick(o, 'roadWidth')),
  status: str(pick(o, 'status')) || 'Available',
});

export const toCustomer = (o: unknown): Customer => ({
  id: id(o, 'customerId'),
  partnerId: idOrNull(pick(o, 'partnerId')),
  name: str(pick(o, 'name', 'customerName', 'fullName')),
  phone: str(pick(o, 'phone', 'mobile')),
  email: str(pick(o, 'email')),
  address: str(pick(o, 'address')),
  aadhaarNumber: str(pick(o, 'aadhaarNumber', 'aadhaar')),
  panNumber: str(pick(o, 'panNumber', 'pan')),
});

export const toBooking = (o: unknown): Booking => ({
  id: id(o, 'bookingId'),
  customerId: idOrNull(pick(o, 'customerId')),
  customerName: str(pick(o, 'customerName') ?? pick(pick(o, 'customer'), 'name')),
  plotId: idOrNull(pick(o, 'plotId')),
  plotNumber: str(pick(o, 'plotNumber') ?? pick(pick(o, 'plot'), 'plotNumber')),
  projectName: str(pick(o, 'projectName') ?? pick(pick(o, 'project'), 'projectName', 'name')),
  bookingDate: str(pick(o, 'bookingDate', 'createdAt')),
  bookingAmount: num(pick(o, 'bookingAmount')),
  agreedValue: num(pick(o, 'agreedValue')),
  status: str(pick(o, 'status', 'bookingStatus')) || 'Pending',
  documents: arr(pick(o, 'documents')).map((d) => toDocument(d)),
});

export const toTransaction = (o: unknown): LedgerTransaction => ({
  id: id(o, 'transactionId'),
  bookingId: idOrNull(pick(o, 'bookingId')),
  transactionDate: str(pick(o, 'transactionDate', 'date')),
  amount: num(pick(o, 'amount', 'totalAmountReceived')),
  commissionAmount: amountOrNull(pick(o, 'commissionAmount')),
  propertyAmount: amountOrNull(pick(o, 'propertyAmount')),
  paymentMode: str(pick(o, 'paymentMode', 'mode')),
  referenceNumber: str(pick(o, 'referenceNumber', 'reference')),
  remarks: str(pick(o, 'remarks', 'description')),
});

/** Optional aggregate endpoint: every value stays null unless reported. */
/**
 * GET /realestate/overview. Live response (2026-11-05):
 *   { PartnerCount, ProjectCount, PlotCount, CustomerCount, BookingCount,
 *     TotalAmountReceived, TotalCommissionAmount, TotalPropertyAmount, OcrPendingCount }
 * Also accepts other flat / grouped names (camelCase or PascalCase) in case the model grows;
 * values the API doesn't send stay null.
 */
export function toOverview(o: unknown): OverviewTotals {
  const group = (k: string) => { const g = pick(o, k); return isObj(g) ? g : undefined; };
  const plots = group('plots') ?? group('plotSummary');
  const ledger = group('ledger') ?? group('transactions') ?? group('payments') ?? group('ledgerTotals');
  const ocr = group('ocr') ?? group('ocrBatches');
  const projects = group('projects');
  const bookings = group('bookings');
  const count = (v: unknown) => (Array.isArray(v) ? v.length : isObj(v) ? null : numOrNull(v));
  const first = (...vals: unknown[]) => { for (const v of vals) { const n = count(v); if (n !== null) return n; } return null; };
  const money = (...vals: unknown[]) => { for (const v of vals) { const n = amountOrNull(v); if (n !== null) return n; } return null; };
  return {
    partnerName: str(pick(o, 'partnerName', 'businessName')),
    partners: first(pick(o, 'totalPartners', 'partnerCount', 'partners')),
    projects: first(pick(o, 'totalProjects', 'projectCount'), pick(projects, 'total', 'count'), pick(o, 'projects')),
    activeProjects: first(pick(o, 'activeProjects', 'activeProjectCount'), pick(projects, 'active')),
    totalPlots: first(pick(o, 'totalPlots', 'plotCount'), pick(plots, 'total', 'count'), pick(o, 'plots')),
    availablePlots: first(pick(o, 'availablePlots'), pick(plots, 'available')),
    bookedPlots: first(pick(o, 'bookedPlots'), pick(plots, 'booked')),
    soldPlots: first(pick(o, 'soldPlots'), pick(plots, 'sold')),
    customers: first(pick(o, 'totalCustomers', 'customerCount', 'customers')),
    bookings: first(pick(o, 'totalBookings', 'bookingCount'), pick(bookings, 'total', 'count'), pick(o, 'bookings')),
    activeBookings: first(pick(o, 'activeBookings'), pick(bookings, 'active')),
    totalAgreedValue: money(pick(o, 'totalAgreedValue', 'agreedValue'), pick(ledger, 'totalAgreedValue', 'agreedValue')),
    totalReceived: money(pick(o, 'totalReceived', 'totalAmountReceived'), pick(ledger, 'totalReceived', 'totalAmountReceived', 'amount')),
    totalCommission: money(pick(o, 'totalCommission', 'totalCommissionAmount'), pick(ledger, 'totalCommission', 'commissionAmount')),
    totalProperty: money(pick(o, 'totalProperty', 'totalPropertyAmount'), pick(ledger, 'totalProperty', 'propertyAmount')),
    outstanding: money(pick(o, 'outstanding', 'outstandingBalance', 'totalOutstanding'), pick(ledger, 'outstanding', 'outstandingBalance')),
    ocrAwaitingReview: first(pick(o, 'ocrPendingCount', 'ocrAwaitingReview', 'ocrBatchesAwaitingReview'), pick(ocr, 'pendingCount', 'awaitingReview', 'pendingReview')),
    ocrReadyToImport: first(pick(o, 'ocrReadyToImport', 'ocrBatchesReadyToImport'), pick(ocr, 'readyToImport', 'approved')),
  };
}

export const toDocument = (o: unknown): RealEstateDocument => ({
  id: id(o, 'documentId'),
  bookingId: idOrNull(pick(o, 'bookingId')),
  documentType: str(pick(o, 'documentType', 'type')),
  documentUrl: str(pick(o, 'documentUrl', 'url')),
  fileName: str(pick(o, 'fileName', 'blobName')),
  uploadedDate: str(pick(o, 'uploadedDate', 'createdDate', 'createdAt')),
});

export function toGrant(o: unknown): UploadGrant {
  const headers = pick(o, 'requiredHeaders', 'headers');
  return {
    uploadUrl: str(pick(o, 'uploadUrl', 'sasUrl', 'url')),
    blobName: str(pick(o, 'blobName')),
    container: str(pick(o, 'container', 'containerName')),
    expiresOn: str(pick(o, 'expiresOn', 'expiresAt')),
    maxBytes: numOrNull(pick(o, 'maxBytes', 'maxSizeBytes')),
    allowedContentTypes: arr(pick(o, 'allowedContentTypes')).map(str).filter(Boolean),
    requiredHeaders: isObj(headers) ? Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, str(v)])) : {},
  };
}

// ---------- OCR ----------
const toConfidence = (v: unknown): number | null => {
  const n = numOrNull(v);
  if (n === null) return null;
  return n > 1 ? Math.min(1, n / 100) : Math.max(0, n); // accept 0–1 or 0–100
};
const MATCH: OcrMatchStatus[] = ['Matched', 'UnmatchedCustomer', 'UnmatchedPlot', 'Unmatched', 'Ambiguous', 'Pending'];

/** API field name (camel or Pascal, e.g. "CommissionAmount") → OcrField. */
const fieldOf = (name: string): OcrField | null => {
  const n = name.toLowerCase();
  return OCR_FIELDS.find((f) => f.toLowerCase() === n || OCR_API_FIELD[f].toLowerCase() === n) ?? (n === 'amount' ? 'totalAmountReceived' : null);
};

/** "ledgerRows[1].CommissionAmount" → { rowIndex: 1, field: 'commissionAmount' }. */
export function parseFieldPath(path: string): { rowIndex: number | null; field: OcrField | null } {
  const m = /ledgerRows\[(\d+)\]\.?(\w+)?/i.exec(path);
  if (m) return { rowIndex: Number(m[1]), field: m[2] ? fieldOf(m[2]) : null };
  return { rowIndex: null, field: path ? fieldOf(path) : null };
}

export function toIssue(e: unknown, rowIndex: number | null = null): OcrValidationIssue {
  if (typeof e === 'string') return { code: '', message: e, rowIndex, field: null, severity: 'Error' };
  const path = parseFieldPath(str(pick(e, 'fieldName', 'field', 'path')));
  const explicitRow = numOrNull(pick(e, 'rowIndex'));
  const sev = str(pick(e, 'severity', 'level')).toLowerCase();
  return {
    code: str(pick(e, 'code', 'errorCode')),
    message: str(pick(e, 'message', 'error', 'description')) || 'Invalid value',
    rowIndex: path.rowIndex ?? explicitRow ?? rowIndex,
    field: path.field,
    severity: sev === 'warning' || sev === 'info' ? 'Warning' : 'Error',
  };
}

/**
 * A row may be flat (`{ customerName, totalAmountReceived, …, corrections: {…} }`) or nested
 * (`{ extracted: {…}, corrected: {…}, fieldConfidence: {…} }`), camelCase or PascalCase.
 * A missing or unreadable amount stays '' — it is never filled from another amount.
 */
export function toOcrRow(o: unknown, index = 0): OcrRow {
  const extracted = pick(o, 'extracted', 'extractedValues') ?? o;
  const corrected = pick(o, 'corrected', 'corrections', 'correctedValues');
  const conf = pick(o, 'fieldConfidence', 'confidences');
  const cells = {} as Record<OcrField, OcrCell>;
  for (const f of OCR_FIELDS) {
    const c = isObj(corrected) ? pick(corrected, f) : undefined;
    cells[f] = { extracted: str(pick(extracted, f)), corrected: c === undefined ? null : str(c), confidence: isObj(conf) ? toConfidence(pick(conf, f)) : null };
  }
  const rowIndex = numOrNull(pick(o, 'index', 'rowIndex')) ?? index;
  const status = str(pick(o, 'matchStatus', 'match'));
  return {
    id: idOrNull(pick(o, 'rowId', 'id')) ?? rowIndex,
    index: rowIndex,
    rowNumber: num(pick(o, 'rowNumber', 'lineNumber')) || rowIndex + 1,
    cells,
    confidence: toConfidence(pick(o, 'confidence')),
    issues: arr(pick(o, 'validationErrors', 'validationIssues', 'issues', 'errors')).map((e) => ({ ...toIssue(e, rowIndex), rowIndex })),
    match: {
      status: MATCH.find((m) => m.toLowerCase() === status.toLowerCase()) ?? 'Pending',
      bookingId: idOrNull(pick(o, 'matchedBookingId', 'bookingId')),
      label: str(pick(o, 'matchLabel', 'matchDescription')),
    },
  };
}

export function toOcrBatch(o: unknown): OcrBatch {
  const rows = arr(pick(o, 'ledgerRows', 'rows', 'items')).map(toOcrRow);
  // Batch-level issues that name a row ("ledgerRows[1].CommissionAmount") are attached to it.
  const batchIssues: OcrValidationIssue[] = [];
  for (const e of arr(pick(o, 'validationIssues', 'validationErrors', 'issues'))) {
    const issue = toIssue(e);
    const row = issue.rowIndex !== null ? rows.find((r) => r.index === issue.rowIndex) : undefined;
    if (row) row.issues.push(issue); else batchIssues.push(issue);
  }
  const counted = rows.reduce((n, r) => n + r.issues.length, 0) + batchIssues.length;
  return {
    id: id(o, 'batchId'),
    status: str(pick(o, 'status')) || 'Uploaded',
    fileName: str(pick(o, 'fileName', 'originalFileName')),
    createdAt: str(pick(o, 'createdAt', 'createdDate', 'uploadedAt')),
    updatedAt: str(pick(o, 'updatedAt', 'modifiedDate', 'updatedDate')),
    confidence: toConfidence(pick(o, 'confidence', 'confidenceScore')),
    rowCount: num(pick(o, 'rowCount')) || rows.length,
    // List responses carry counts without rows.
    issueCount: rows.length || batchIssues.length ? counted : num(pick(o, 'issueCount')),
    rows,
    batchIssues,
    rawText: str(pick(o, 'rawText', 'rawOcrText', 'extractedText')),
    error: str(pick(o, 'error', 'errorMessage', 'failureReason')),
  };
}
