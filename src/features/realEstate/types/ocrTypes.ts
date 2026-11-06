/** Platform OCR import (Azure Vision extraction, reviewed by a person before import). */
import type { Id } from './realEstateTypes.ts';

export const OCR_STATUSES = ['Uploaded', 'Parsed', 'Validated', 'Approved', 'Imported', 'Rejected'] as const;
export type OcrStatus = (typeof OCR_STATUSES)[number];

/**
 * Canonical row fields, in review order. The three amounts are independent:
 *   totalAmountReceived — previous column
 *   commissionAmount    — lower amount in black after "Payment Details"
 *   propertyAmount      — amount written in red
 */
export const OCR_FIELDS = [
  'transactionDate', 'customerName', 'plotNumber',
  'totalAmountReceived', 'commissionAmount', 'propertyAmount',
  'paymentMode', 'referenceNumber', 'remarks',
] as const;
export type OcrField = (typeof OCR_FIELDS)[number];
export const OCR_AMOUNT_FIELDS: OcrField[] = ['totalAmountReceived', 'commissionAmount', 'propertyAmount'];

export const OCR_FIELD_LABELS: Record<OcrField, string> = {
  transactionDate: 'Transaction date',
  customerName: 'Customer name',
  plotNumber: 'Plot number',
  totalAmountReceived: 'Total received',
  commissionAmount: 'Commission (lower black amount)',
  propertyAmount: 'Property amount (red)',
  paymentMode: 'Payment mode',
  referenceNumber: 'Reference number',
  remarks: 'Remarks',
};

/** Where each amount is read from on the paper ledger. */
export const OCR_FIELD_HELP: Partial<Record<OcrField, string>> = {
  totalAmountReceived: 'From the previous column',
  commissionAmount: 'Lower amount written in black, after Payment Details',
  propertyAmount: 'Amount written in red',
  customerName: 'Matching hint, not an id',
  plotNumber: 'Matching hint, not an id',
};

/** Field names the API uses in correction keys: ledgerRows[n].<Name>. */
export const OCR_API_FIELD: Record<OcrField, string> = {
  transactionDate: 'TransactionDate',
  customerName: 'CustomerName',
  plotNumber: 'PlotNumber',
  totalAmountReceived: 'TotalAmountReceived',
  commissionAmount: 'CommissionAmount',
  propertyAmount: 'PropertyAmount',
  paymentMode: 'PaymentMode',
  referenceNumber: 'ReferenceNumber',
  remarks: 'Remarks',
};

/** Below this, a value is flagged "low confidence" for the reviewer. */
export const LOW_CONFIDENCE = 0.8;

export type OcrMatchStatus = 'Matched' | 'UnmatchedCustomer' | 'UnmatchedPlot' | 'Unmatched' | 'Ambiguous' | 'Pending';

export interface OcrCell {
  /** What Azure Vision read ('' when absent or unreadable). */
  extracted: string;
  /** Saved manual correction, if any. */
  corrected: string | null;
  /** 0–1 for this field, when the backend reports per-field confidence. */
  confidence: number | null;
}

export interface OcrValidationIssue {
  code: string;
  message: string;
  /** Index into the batch's ledgerRows, when the issue belongs to a row. */
  rowIndex: number | null;
  field: OcrField | null;
  /** Only errors block approval; warnings are shown but don't block. */
  severity: 'Error' | 'Warning';
}

export interface OcrRow {
  id: Id;
  /** Position in the API's ledgerRows array (used in correction keys). */
  index: number;
  rowNumber: number;
  cells: Record<OcrField, OcrCell>;
  /** Row-level confidence 0–1. */
  confidence: number | null;
  issues: OcrValidationIssue[];
  match: {
    status: OcrMatchStatus;
    /** Existing booking the backend matched this row to (never chosen by the UI). */
    bookingId: Id | null;
    label: string;
  };
}

export interface OcrBatch {
  id: Id;
  status: OcrStatus | string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
  confidence: number | null;
  rowCount: number;
  issueCount: number;
  rows: OcrRow[];
  /** Issues not tied to a row. */
  batchIssues: OcrValidationIssue[];
  /** Raw OCR text, when the backend returns it (source context for the reviewer). */
  rawText: string;
  /** Batch-level error, e.g. extraction failed. */
  error: string;
}

/** API correction: { fieldName: "ledgerRows[1].CommissionAmount", value: "5000" }. */
export interface OcrCorrection {
  fieldName: string;
  value: string;
}

/** Local, unsaved edits: row index → field → value. */
export type OcrDraft = Record<string, Partial<Record<OcrField, string>>>;

/** Sums of each amount column across rows (never combined with each other). */
export interface OcrBatchTotals {
  rows: number;
  totalReceived: number;
  totalCommission: number;
  totalProperty: number;
}
