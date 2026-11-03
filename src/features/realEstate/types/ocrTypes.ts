/** OCR ledger import (GPT-4o Vision extraction, reviewed by a person before import). */
import type { Id } from './realEstateTypes.ts';

export const OCR_STATUSES = ['Uploaded', 'Parsed', 'Validated', 'Approved', 'Imported', 'Rejected'] as const;
export type OcrStatus = (typeof OCR_STATUSES)[number];

/** Canonical backend field names, in review-table order. */
export const OCR_FIELDS = ['transactionDate', 'customerName', 'plotNumber', 'amount', 'paymentMode', 'referenceNumber', 'remarks'] as const;
export type OcrField = (typeof OCR_FIELDS)[number];

export const OCR_FIELD_LABELS: Record<OcrField, string> = {
  transactionDate: 'Transaction date',
  customerName: 'Customer name',
  plotNumber: 'Plot number',
  amount: 'Amount',
  paymentMode: 'Payment mode',
  referenceNumber: 'Reference number',
  remarks: 'Remarks',
};

/** Below this, a value is flagged "low confidence" for the reviewer. */
export const LOW_CONFIDENCE = 0.8;

export type OcrMatchStatus = 'Matched' | 'UnmatchedCustomer' | 'UnmatchedPlot' | 'Unmatched' | 'Ambiguous' | 'Pending';

export interface OcrCell {
  /** What GPT-4o Vision read. */
  extracted: string;
  /** Saved manual correction, if any. */
  corrected: string | null;
  /** 0–1 for this field, when the backend reports per-field confidence. */
  confidence: number | null;
}

export interface OcrValidationIssue {
  field: OcrField | null;
  message: string;
}

export interface OcrRow {
  id: Id;
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
  partnerId: Id | null;
  rowCount: number;
  rows: OcrRow[];
  /** Batch-level error, e.g. extraction failed. */
  error: string;
}

export interface OcrCorrection {
  rowId: Id;
  field: OcrField;
  value: string;
}

/** Local, unsaved edits: rowId → field → value. */
export type OcrDraft = Record<string, Partial<Record<OcrField, string>>>;
