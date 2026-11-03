/**
 * OCR ledger import. The UI only drives the batch workflow; the backend parses
 * (GPT-4o Vision), matches rows to existing bookings, validates and imports.
 * Nothing here writes ledger transactions directly: `import` sends no row data.
 */
import { apiGet, apiPost, pathId } from '../../../api/apiClient.ts';
import { requireAuth } from '../../../api/authApi.ts';
import type { Id, PageQuery, Paged, StoredBlob } from '../types/realEstateTypes.ts';
import type { OcrBatch, OcrCorrection } from '../types/ocrTypes.ts';
import { toOcrBatch, toPaged } from './normalize.ts';
import { RE_BASE } from './realEstateApi.ts';

const OCR = `${RE_BASE}/ocr/batches`;
const batchUrl = (batchId: Id, action = '') => `${OCR}/${pathId(batchId, 'batch id')}${action ? `/${action}` : ''}`;
const act = async (batchId: Id, action: string, body: object = {}): Promise<OcrBatch> => {
  requireAuth();
  return toOcrBatch(await apiPost<unknown>(batchUrl(batchId, action), body));
};

export const realEstateOcrApi = {
  /** GET /realestate/ocr/batches — assumed list endpoint (see README). */
  list: async (q: PageQuery = {}, signal?: AbortSignal): Promise<Paged<OcrBatch>> => {
    requireAuth();
    const params = Object.fromEntries(Object.entries({ page: q.page, pageSize: q.pageSize, status: q.status || undefined }).filter(([, v]) => v !== undefined));
    return toPaged(await apiGet<unknown>(OCR, { signal, params }), toOcrBatch, q.page, q.pageSize);
  },

  /** POST /realestate/ocr/batches — references a blob already in the dedicated container. */
  create: async (blob: StoredBlob, partnerId: Id | null): Promise<OcrBatch> => {
    requireAuth();
    return toOcrBatch(await apiPost<unknown>(OCR, {
      blobName: blob.blobName, container: blob.container, fileName: blob.fileName, contentType: blob.contentType, partnerId,
    }));
  },

  /** GET /realestate/ocr/batches/:batchId */
  get: async (batchId: Id, signal?: AbortSignal): Promise<OcrBatch> => {
    requireAuth();
    return toOcrBatch(await apiGet<unknown>(batchUrl(batchId), { signal }));
  },

  /** POST …/parse — runs GPT-4o Vision extraction on the server. */
  parse: (batchId: Id) => act(batchId, 'parse'),
  /** POST …/corrections — `{ corrections: [{ rowId, field, value }] }`. */
  submitCorrections: (batchId: Id, corrections: OcrCorrection[]) =>
    act(batchId, 'corrections', { corrections: corrections.map(({ rowId, field, value }) => ({ rowId, field, value })) }),
  /** POST …/validate */
  validate: (batchId: Id) => act(batchId, 'validate'),
  /** POST …/approve */
  approve: (batchId: Id) => act(batchId, 'approve'),
  /** POST …/import — the server imports its own approved, validated rows. */
  import: (batchId: Id) => act(batchId, 'import'),
  /** POST …/reject */
  reject: (batchId: Id, reason: string) => act(batchId, 'reject', { reason: reason.trim() }),
};

export default realEstateOcrApi;
