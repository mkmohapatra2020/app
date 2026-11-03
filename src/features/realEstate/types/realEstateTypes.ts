/**
 * Real Estate CRM / ledger types. Ids are whatever the backend sends (number or string);
 * the UI never makes one up.
 */
export type Id = number | string;

export const REAL_ESTATE_FEATURES = ['Partners', 'Projects', 'Plots', 'Customers', 'Bookings', 'Ledger', 'Reports', 'OCR'] as const;
export type RealEstateFeature = (typeof REAL_ESTATE_FEATURES)[number];

/** GET /realestate/access → data. The UI gate is for navigation only; the API decides. */
export interface RealEstateAccess {
  enabled: boolean;
  partnerId: Id | null;
  features: RealEstateFeature[];
  /** Optional fine-grained grants, e.g. "Partners.Create". */
  permissions: string[];
}

export const PLOT_STATUSES = ['Available', 'Blocked', 'Booked', 'Sold'] as const;
export type PlotStatus = (typeof PLOT_STATUSES)[number];

export const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Cancelled', 'Completed'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_MODES = ['Cash', 'UPI', 'Cheque', 'BankTransfer', 'Card', 'Other'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export interface Partner {
  id: Id;
  businessName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
}
export type PartnerInput = Omit<Partner, 'id'>;

export interface Project {
  id: Id;
  partnerId: Id | null;
  partnerName: string;
  name: string;
  phase: string;
  location: string;
  district: string;
  state: string;
}
export interface ProjectInput {
  partnerId: Id;
  name: string;
  phase: string;
  location: string;
  district: string;
  state: string;
}

export interface Plot {
  id: Id;
  projectId: Id | null;
  plotNumber: string;
  area: number | null;
  areaUnit: string;
  facing: string;
  roadWidth: number | null;
  status: PlotStatus | string;
}
export interface PlotInput {
  projectId: Id;
  plotNumber: string;
  area: number;
  areaUnit: string;
  facing: string;
  roadWidth: number | null;
}

/** Aadhaar / PAN are masked before display (utils/mask.ts) and never logged. */
export interface Customer {
  id: Id;
  partnerId: Id | null;
  name: string;
  phone: string;
  email: string;
  address: string;
  aadhaarNumber: string;
  panNumber: string;
}
export interface CustomerInput {
  partnerId: Id;
  name: string;
  phone: string;
  email: string;
  address: string;
  aadhaarNumber: string;
  panNumber: string;
}

export interface Booking {
  id: Id;
  customerId: Id | null;
  customerName: string;
  plotId: Id | null;
  plotNumber: string;
  projectName: string;
  bookingDate: string;
  bookingAmount: number;
  agreedValue: number;
  status: BookingStatus | string;
}
export interface BookingInput {
  customerId: Id;
  plotId: Id;
  bookingAmount: number;
  agreedValue: number;
}

export interface LedgerTransaction {
  id: Id;
  bookingId: Id | null;
  transactionDate: string;
  amount: number;
  paymentMode: PaymentMode | string;
  referenceNumber: string;
  remarks: string;
}
export interface TransactionInput {
  transactionDate: string;
  amount: number;
  paymentMode: string;
  referenceNumber: string;
  remarks: string;
  /** Optional payment proof (e.g. UPI screenshot) already uploaded via the upload grant. */
  proof?: StoredBlob | null;
}

export interface LedgerTotals {
  agreedValue: number;
  totalPaid: number;
  outstanding: number;
}

export interface DashboardSummary {
  partnerName: string;
  projectCount: number;
  availablePlots: number;
  bookedPlots: number;
  soldPlots: number;
  activeBookings: number;
  outstandingBalance: number;
  recentTransactions: (LedgerTransaction & { customerName: string; plotNumber: string })[];
  ocrBatchesAwaitingReview: number;
}

export interface Paged<T> {
  items: T[];
  /** Total across all pages, when the server reports it. */
  total: number | null;
  page: number;
  pageSize: number;
}
export interface PageQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

/** POST /realestate/images/upload-grant → data. The URL is used exactly as returned. */
export interface UploadGrant {
  uploadUrl: string;
  blobName: string;
  container: string;
  expiresOn: string;
  maxBytes: number | null;
  allowedContentTypes: string[];
  /** Extra headers the backend wants on the PUT (e.g. x-ms-blob-type). */
  requiredHeaders: Record<string, string>;
}

/** What the UI keeps after an upload: backend-returned metadata only, never the SAS URL. */
export interface StoredBlob {
  blobName: string;
  container: string;
  contentType: string;
  size: number;
  fileName: string;
}

export type UploadPurpose = 'Document' | 'OcrLedger';
