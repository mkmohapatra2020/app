/**
 * Platform OCR import for Real Estate ledgers. The UI only drives the staged workflow;
 * the backend parses (GPT-6 Luna), validates, matches and imports. Nothing here
 * writes ledger transactions: `import` sends no row data, and approval never imports.
 */
import { apiGet, apiPost, pathId } from '../../../api/apiClient.ts';
import { requireAuth } from '../../../api/authApi.ts';
import { OCR_INPUT_TYPE_CODE, type Id, type StoredBlob } from '../types/realEstateTypes.ts';
import type { OcrBatch, OcrCorrection } from '../types/ocrTypes.ts';
import { toOcrBatch } from './normalize.ts';
import { RE_BASE } from './realEstateApi.ts';
import { ocrInputType } from './realEstateUpload.ts';

const OCR = `${RE_BASE}/ocr/batches`;
const batchUrl = (batchId: Id, action = '') => `${OCR}/${pathId(batchId, 'batch id')}${action ? `/${action}` : ''}`;
/**
 * OCR calls can be slow: a cold Function App start, and parse sends a high-detail photo to the
 * model (often 30–90 s). The app-wide 30 s limit would cancel them, so these get longer limits
 * (parse stays under Azure's 230 s HTTP limit).
 */
export const OCR_TIMEOUT_MS = 90_000;
export const OCR_PARSE_TIMEOUT_MS = 200_000;
const act = async (batchId: Id, action: string, body: object = {}): Promise<OcrBatch> => {
  requireAuth();
  const timeout = action === 'parse' ? OCR_PARSE_TIMEOUT_MS : OCR_TIMEOUT_MS;
  return toOcrBatch(await apiPost<unknown>(batchUrl(batchId, action), body, { timeout }));
};

export const realEstateOcrApi = {
  /**
   * POST /realestate/ocr/batches
   * { fileName, contentType, inputType (int enum), blobName, businessModule: "RealEstate" } —
   * the blob is already in the dedicated container (upload grant).
   */
  create: async (blob: StoredBlob): Promise<OcrBatch> => {
    requireAuth();
    const res = await apiPost<unknown>(OCR, {
      fileName: blob.fileName, contentType: blob.contentType, inputType: OCR_INPUT_TYPE_CODE[ocrInputType(blob.contentType)], blobName: blob.blobName, businessModule: 'RealEstate',
    }, { timeout: OCR_TIMEOUT_MS });
    // The backend answers with the new batch id only (int): load the batch.
    if (typeof res === 'number' || (typeof res === 'string' && /^\d+$/.test(res))) {
      const b = await realEstateOcrApi.get(Number(res));
      return { ...b, id: b.id === '' ? Number(res) : b.id, fileName: b.fileName || blob.fileName };
    }
    return toOcrBatch(res);
  },

  /** GET /realestate/ocr/batches — the signed-in user's import batches, newest first. */
  list: async (signal?: AbortSignal): Promise<OcrBatch[]> => {
    requireAuth();
    const res = await apiGet<unknown>(OCR, { signal });
    const items = Array.isArray(res) ? res : [];
    return items.map(toOcrBatch).filter((b) => b.id !== '');
  },

  /** GET /realestate/ocr/batches/:batchId */
  get: async (batchId: Id, signal?: AbortSignal): Promise<OcrBatch> => {
    requireAuth();
    return toOcrBatch(await apiGet<unknown>(batchUrl(batchId), { signal }));
  },

  /** POST …/parse — runs extraction on the server. */
  parse: (batchId: Id) => act(batchId, 'parse'),
  /** POST …/corrections — `{ corrections: [{ fieldName: "ledgerRows[n].Field", value }] }`. */
  submitCorrections: (batchId: Id, corrections: OcrCorrection[]) =>
    act(batchId, 'corrections', { corrections: corrections.map(({ fieldName, value }) => ({ fieldName, value })) }),
  /** POST …/validate */
  validate: (batchId: Id) => act(batchId, 'validate'),
  /** POST …/approve — approval only; import is a separate, explicit action. */
  approve: (batchId: Id) => act(batchId, 'approve'),
  /**
   * POST …/import — `{ projectId, corrections? }`. projectId: the project for customers, plots and
   * bookings the import creates. For a Parsed / Validated batch the server first saves the
   * corrections, validates and approves, then imports — one call from review to Imported.
   */
  import: (batchId: Id, projectId?: Id | null, corrections?: OcrCorrection[]) => act(batchId, 'import', {
    ...(projectId !== undefined && projectId !== null && projectId !== '' ? { projectId: Number(projectId) } : {}),
    ...(corrections && corrections.length ? { corrections } : {}),
  }),
  /** POST …/reject — `{ reason }` */
  reject: (batchId: Id, reason: string) => act(batchId, 'reject', { reason: reason.trim() }),
};

export default realEstateOcrApi;
