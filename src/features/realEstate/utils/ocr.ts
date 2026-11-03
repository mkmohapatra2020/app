/** OCR review rules: what a cell shows, what blocks approval/import, which edits to send. */
import { enT, type T } from '../../../i18n/language.ts';
import { LOW_CONFIDENCE, OCR_FIELDS, type OcrBatch, type OcrCell, type OcrCorrection, type OcrDraft, type OcrField, type OcrRow } from '../types/ocrTypes.ts';

export type CellState = 'extracted' | 'corrected' | 'edited' | 'error' | 'lowConfidence';

/** Value shown in the review table: unsaved edit > saved correction > extracted. */
export function cellValue(cell: OcrCell, draft?: string): string {
  if (draft !== undefined) return draft;
  return cell.corrected ?? cell.extracted;
}

export function cellState(row: OcrRow, field: OcrField, draft?: string): CellState {
  const cell = row.cells[field];
  if (draft !== undefined && draft !== (cell.corrected ?? cell.extracted)) return 'edited';
  if (row.issues.some((i) => i.field === field)) return 'error';
  if (cell.corrected !== null && cell.corrected !== cell.extracted) return 'corrected';
  const conf = cell.confidence ?? row.confidence;
  if (conf !== null && conf < LOW_CONFIDENCE) return 'lowConfidence';
  return 'extracted';
}

/** Draft entries that actually change the stored value, in table order. */
export function buildCorrections(rows: OcrRow[], draft: OcrDraft): OcrCorrection[] {
  const out: OcrCorrection[] = [];
  for (const row of rows) {
    const edits = draft[String(row.id)];
    if (!edits) continue;
    for (const field of OCR_FIELDS) {
      const value = edits[field];
      if (value === undefined) continue;
      const cell = row.cells[field];
      if (value.trim() !== (cell.corrected ?? cell.extracted).trim()) out.push({ rowId: row.id, field, value: value.trim() });
    }
  }
  return out;
}

export interface BatchBlockers {
  validationErrors: number;
  unmatched: number;
  unsavedEdits: number;
  /** Reasons, for display next to disabled actions. */
  reasons: string[];
}

export function batchBlockers(batch: Pick<OcrBatch, 'rows'>, draft: OcrDraft = {}, t: T = enT): BatchBlockers {
  const validationErrors = batch.rows.reduce((n, r) => n + r.issues.length, 0);
  const unmatched = batch.rows.filter((r) => r.match.status !== 'Matched').length;
  const unsavedEdits = buildCorrections(batch.rows, draft).length;
  const reasons: string[] = [];
  const n = (count: number, one: string, many: string) => t(count === 1 ? one : many, { n: count });
  if (unsavedEdits) reasons.push(n(unsavedEdits, '{n} unsaved correction', '{n} unsaved corrections'));
  if (validationErrors) reasons.push(n(validationErrors, '{n} validation issue', '{n} validation issues'));
  if (unmatched) reasons.push(n(unmatched, '{n} row not matched to a booking', '{n} rows not matched to a booking'));
  return { validationErrors, unmatched, unsavedEdits, reasons };
}

const clear = (b: BatchBlockers) => b.reasons.length === 0;
const ACTIVE = ['Uploaded', 'Parsed', 'Validated', 'Approved'];

export const canParse = (batch: OcrBatch) => batch.status === 'Uploaded';
export const canSaveCorrections = (batch: OcrBatch, draft: OcrDraft) => ['Parsed', 'Validated'].includes(String(batch.status)) && buildCorrections(batch.rows, draft).length > 0;
export const canValidate = (batch: OcrBatch, draft: OcrDraft) => ['Parsed', 'Validated'].includes(String(batch.status)) && buildCorrections(batch.rows, draft).length === 0;
export const canApprove = (batch: OcrBatch, draft: OcrDraft) => batch.status === 'Validated' && batch.rows.length > 0 && clear(batchBlockers(batch, draft));
/** Import only an approved batch with no remaining issues of any kind. */
export const canImport = (batch: OcrBatch, draft: OcrDraft) => batch.status === 'Approved' && batch.rows.length > 0 && clear(batchBlockers(batch, draft));
export const canReject = (batch: OcrBatch) => ACTIVE.includes(String(batch.status));
export const isEditable = (batch: OcrBatch) => ['Parsed', 'Validated'].includes(String(batch.status));
