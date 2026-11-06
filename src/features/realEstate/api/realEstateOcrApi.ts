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
const act = async (batchId: Id, action: string, body: object = {}): Promise<OcrBatch> => {
  requireAuth();
  return toOcrBatch(await apiPost<unknown>(batchUrl(batchId, action), body));
};

export const realEstateOcrApi = {
  /**
   * POST /realestate/ocr/batches
   * { fileName, contentType, inputType (int enum), blobName, businessModule: "RealEstate" } —
   * the blob is already in the dedicated container (upload grant).
   */
  create: async (blob: StoredBlob): Promise<OcrBatch> => {
    requireAuth();
    return toOcrBatch(await apiPost<unknown>(OCR, {
      fileName: blob.fileName, contentType: blob.contentType, inputType: OCR_INPUT_TYPE_CODE[ocrInputType(blob.contentType)], blobName: blob.blobName, businessModule: 'RealEstate',
    }));
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
  /** POST …/import — the server imports its own approved, validated rows. */
  import: (batchId: Id) => act(batchId, 'import'),
  /** POST …/reject — `{ reason }` */
  reject: (batchId: Id, reason: string) => act(batchId, 'reject', { reason: reason.trim() }),
};

export default realEstateOcrApi;
