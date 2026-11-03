/** OCR review rules: what a cell shows, what blocks approval/import, which edits to send. */
import { enT, type T } from '../../../i18n/language.ts';
import { amountOrNull } from '../api/normalize.ts';
import { LOW_CONFIDENCE, OCR_API_FIELD, OCR_FIELDS, type OcrBatch, type OcrBatchTotals, type OcrCell, type OcrCorrection, type OcrDraft, type OcrField, type OcrRow, type OcrValidationIssue } from '../types/ocrTypes.ts';

export type CellState = 'extracted' | 'corrected' | 'edited' | 'error' | 'lowConfidence';

/** Draft key of a row: its index in the API's ledgerRows. */
export const rowKey = (row: Pick<OcrRow, 'index'>) => String(row.index);
/** DOM id of a review input, so an issue can move focus to it. */
export const cellInputId = (rowIndex: number, field: OcrField) => `ocr-r${rowIndex}-${field}`;
/** Correction key the API expects, e.g. "ledgerRows[1].CommissionAmount". */
export const correctionKey = (rowIndex: number, field: OcrField) => `ledgerRows[${rowIndex}].${OCR_API_FIELD[field]}`;

/** Value shown in the review table: unsaved edit > saved correction > extracted. */
export function cellValue(cell: OcrCell, draft?: string): string {
  if (draft !== undefined) return draft;
  return cell.corrected ?? cell.extracted;
}

export function cellState(row: OcrRow, field: OcrField, draft?: string): CellState {
  const cell = row.cells[field];
  if (draft !== undefined && draft !== (cell.corrected ?? cell.extracted)) return 'edited';
  if (row.issues.some((i) => i.field === field && i.severity === 'Error')) return 'error';
  if (cell.corrected !== null && cell.corrected !== cell.extracted) return 'corrected';
  const conf = cell.confidence ?? row.confidence;
  if (conf !== null && conf < LOW_CONFIDENCE) return 'lowConfidence';
  return 'extracted';
}

/** Draft entries that actually change the stored value, in table order. */
export function buildCorrections(rows: OcrRow[], draft: OcrDraft): OcrCorrection[] {
  const out: OcrCorrection[] = [];
  for (const row of rows) {
    const edits = draft[rowKey(row)];
    if (!edits) continue;
    for (const field of OCR_FIELDS) {
      const value = edits[field];
      if (value === undefined) continue;
      const cell = row.cells[field];
      if (value.trim() !== (cell.corrected ?? cell.extracted).trim()) out.push({ fieldName: correctionKey(row.index, field), value: value.trim() });
    }
  }
  return out;
}

/** Current (draft-aware) value of an amount; unreadable or empty stays null. */
const amountOf = (row: OcrRow, field: OcrField, draft: OcrDraft) => amountOrNull(cellValue(row.cells[field], draft[rowKey(row)]?.[field]));

/** Each amount column summed on its own — never combined with the others. */
export function batchTotals(batch: Pick<OcrBatch, 'rows'>, draft: OcrDraft = {}): OcrBatchTotals {
  const sum = (field: OcrField) => batch.rows.reduce((s, r) => s + Math.round((amountOf(r, field, draft) ?? 0) * 100), 0) / 100;
  return { rows: batch.rows.length, totalReceived: sum('totalAmountReceived'), totalCommission: sum('commissionAmount'), totalProperty: sum('propertyAmount') };
}

/** Every issue in the batch (row issues first, in row order). */
export const allIssues = (batch: Pick<OcrBatch, 'rows' | 'batchIssues'>): OcrValidationIssue[] => [...batch.rows.flatMap((r) => r.issues), ...batch.batchIssues];

/** Rows the backend reported as not matching an existing booking ("Pending" = not reported). */
const UNMATCHED = ['UnmatchedCustomer', 'UnmatchedPlot', 'Unmatched', 'Ambiguous'];

export interface BatchBlockers {
  validationErrors: number;
  warnings: number;
  unmatched: number;
  unsavedEdits: number;
  /** Reasons, for display next to disabled actions. */
  reasons: string[];
}

export function batchBlockers(batch: Pick<OcrBatch, 'rows' | 'batchIssues'>, draft: OcrDraft = {}, t: T = enT): BatchBlockers {
  const issues = allIssues(batch);
  const validationErrors = issues.filter((i) => i.severity === 'Error').length;
  const warnings = issues.length - validationErrors;
  const unmatched = batch.rows.filter((r) => UNMATCHED.includes(r.match.status)).length;
  const unsavedEdits = buildCorrections(batch.rows, draft).length;
  const reasons: string[] = [];
  const n = (count: number, one: string, many: string) => t(count === 1 ? one : many, { n: count });
  if (unsavedEdits) reasons.push(n(unsavedEdits, '{n} unsaved correction', '{n} unsaved corrections'));
  if (validationErrors) reasons.push(n(validationErrors, '{n} validation issue', '{n} validation issues'));
  if (unmatched) reasons.push(n(unmatched, '{n} row not matched to a booking', '{n} rows not matched to a booking'));
  return { validationErrors, warnings, unmatched, unsavedEdits, reasons };
}

const clear = (b: BatchBlockers) => b.reasons.length === 0;
const ACTIVE = ['Uploaded', 'Parsed', 'Validated', 'Approved'];

export const canParse = (batch: OcrBatch) => batch.status === 'Uploaded';
export const canSaveCorrections = (batch: OcrBatch, draft: OcrDraft) => ['Parsed', 'Validated'].includes(String(batch.status)) && buildCorrections(batch.rows, draft).length > 0;
export const canValidate = (batch: OcrBatch, draft: OcrDraft) => ['Parsed', 'Validated'].includes(String(batch.status)) && buildCorrections(batch.rows, draft).length === 0;
/** Approval needs a validated batch with no errors, unmatched rows or unsaved edits. */
export const canApprove = (batch: OcrBatch, draft: OcrDraft) => batch.status === 'Validated' && batch.rows.length > 0 && clear(batchBlockers(batch, draft));
/** Import is separate from approval: only an approved batch, still clean. */
export const canImport = (batch: OcrBatch, draft: OcrDraft) => batch.status === 'Approved' && batch.rows.length > 0 && clear(batchBlockers(batch, draft));
export const canReject = (batch: OcrBatch) => ACTIVE.includes(String(batch.status));
export const isEditable = (batch: OcrBatch) => ['Parsed', 'Validated'].includes(String(batch.status));
