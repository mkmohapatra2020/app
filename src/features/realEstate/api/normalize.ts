/**
 * Response → UI model mapping. Reads camelCase or PascalCase (like the rest of the app)
 * and tolerates missing fields so a partial response never crashes a screen.
 */
import { field, isObj } from '../../../api/errors.ts';
import { REAL_ESTATE_FEATURES, type Booking, type Customer, type DashboardSummary, type Id, type LedgerTransaction, type Paged, type Partner, type Plot, type Project, type RealEstateAccess, type RealEstateFeature, type UploadGrant } from '../types/realEstateTypes.ts';
import { OCR_FIELDS, type OcrBatch, type OcrCell, type OcrField, type OcrMatchStatus, type OcrRow, type OcrValidationIssue } from '../types/ocrTypes.ts';

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
});

export const toTransaction = (o: unknown): LedgerTransaction => ({
  id: id(o, 'transactionId'),
  bookingId: idOrNull(pick(o, 'bookingId')),
  transactionDate: str(pick(o, 'transactionDate', 'date')),
  amount: num(pick(o, 'amount')),
  paymentMode: str(pick(o, 'paymentMode', 'mode')),
  referenceNumber: str(pick(o, 'referenceNumber', 'reference')),
  remarks: str(pick(o, 'remarks', 'description')),
});

export const toDashboard = (o: unknown): DashboardSummary => ({
  partnerName: str(pick(o, 'partnerName', 'businessName')),
  projectCount: num(pick(o, 'projectCount', 'projects')),
  availablePlots: num(pick(o, 'availablePlots')),
  bookedPlots: num(pick(o, 'bookedPlots')),
  soldPlots: num(pick(o, 'soldPlots')),
  activeBookings: num(pick(o, 'activeBookings')),
  outstandingBalance: num(pick(o, 'outstandingBalance', 'outstanding')),
  recentTransactions: arr(pick(o, 'recentTransactions')).map((t) => ({
    ...toTransaction(t),
    customerName: str(pick(t, 'customerName')),
    plotNumber: str(pick(t, 'plotNumber')),
  })),
  ocrBatchesAwaitingReview: num(pick(o, 'ocrBatchesAwaitingReview', 'ocrAwaitingReview')),
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

/**
 * A row may be flat (`{ customerName, …, corrections: { amount } }`) or nested
 * (`{ extracted: {…}, corrected: {…}, fieldConfidence: {…} }`).
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
  const issues: OcrValidationIssue[] = arr(pick(o, 'validationErrors', 'issues', 'errors')).map((e) => {
    const f = str(pick(e, 'field'));
    const known = OCR_FIELDS.find((k) => k.toLowerCase() === f.toLowerCase()) ?? null;
    return { field: known, message: typeof e === 'string' ? e : str(pick(e, 'message', 'error')) || 'Invalid value' };
  });
  const status = str(pick(o, 'matchStatus', 'match'));
  return {
    id: id(o, 'rowId'),
    rowNumber: num(pick(o, 'rowNumber', 'lineNumber')) || index + 1,
    cells,
    confidence: toConfidence(pick(o, 'confidence')),
    issues,
    match: {
      status: MATCH.find((m) => m.toLowerCase() === status.toLowerCase()) ?? 'Pending',
      bookingId: idOrNull(pick(o, 'matchedBookingId', 'bookingId')),
      label: str(pick(o, 'matchLabel', 'matchDescription')),
    },
  };
}

export function toOcrBatch(o: unknown): OcrBatch {
  const rows = arr(pick(o, 'rows', 'items')).map(toOcrRow);
  return {
    id: id(o, 'batchId'),
    status: str(pick(o, 'status')) || 'Uploaded',
    fileName: str(pick(o, 'fileName', 'originalFileName')),
    createdAt: str(pick(o, 'createdAt', 'uploadedAt')),
    partnerId: idOrNull(pick(o, 'partnerId')),
    rowCount: num(pick(o, 'rowCount')) || rows.length,
    rows,
    error: str(pick(o, 'error', 'errorMessage', 'failureReason')),
  };
}
