/**
 * Interim ledger analysis straight from the site's own server route (POST /api/ledger-ocr),
 * which calls the Azure AI model "gpt-6-luna" with a fixed prompt (api/src/lib/ledgerOcr.mjs).
 * Used until the backend's POST /realestate/ocr/batches/:id/parse is ready
 * (switch with VITE_LEDGER_OCR_MODE=backend). The Azure key never reaches the browser.
 */
import { session } from '../../../services/session.js';
import type { OcrBatch } from '../types/ocrTypes.ts';
import { toOcrBatch } from './normalize.ts';
import { EXCEL_TYPES } from './realEstateUpload.ts';

export const LEDGER_OCR_PATH = '/api/ledger-ocr';
/** 'direct' (default, this file) or 'backend' (create batch + backend parse). */
export const LEDGER_OCR_MODE: 'direct' | 'backend' = (import.meta.env.VITE_LEDGER_OCR_MODE as string | undefined) === 'backend' ? 'backend' : 'direct';

export class LedgerAnalysisError extends Error {
  constructor(message: string) { super(message); this.name = 'LedgerAnalysisError'; }
}

const MAX_SIDE = 2400;
const SHRINK_OVER_BYTES = 3 * 1024 * 1024;

const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''));
  r.onerror = () => reject(new LedgerAnalysisError('The file could not be read.'));
  r.readAsDataURL(blob);
});

/** Large photos are scaled down (longest side 2400 px, JPEG) to keep the request small. */
async function prepareImage(file: File): Promise<{ data: string; contentType: string }> {
  if (file.size <= SHRINK_OVER_BYTES || typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return { data: await toBase64(file), contentType: file.type };
  }
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
    if (out) return { data: await toBase64(out), contentType: 'image/jpeg' };
  } catch { /* fall back to the original file */ }
  return { data: await toBase64(file), contentType: file.type };
}

/** Reads one ledger page with the model and returns it as an (unsaved) OCR batch for review. */
export async function analyseLedgerFile(file: File, signal?: AbortSignal): Promise<OcrBatch> {
  const token = session.token();
  if (!token) throw new LedgerAnalysisError('Please sign in to continue.');
  if (EXCEL_TYPES.includes(file.type)) throw new LedgerAnalysisError('Excel sheets cannot be analysed here yet. Upload a photo or PDF of the ledger page.');
  const { data, contentType } = file.type.startsWith('image/') ? await prepareImage(file) : { data: await toBase64(file), contentType: file.type };

  let res: Response;
  try {
    res = await fetch(LEDGER_OCR_PATH, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fileName: file.name, contentType, data }),
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new LedgerAnalysisError("We couldn't reach the ledger analysis service. Check your connection and try again.");
  }
  let body: { rows?: unknown[]; pageNotes?: string | null; model?: string; error?: { message?: string } } | null = null;
  try { body = await res.json(); } catch { /* handled below */ }
  if (!res.ok || !body || !Array.isArray(body.rows)) {
    throw new LedgerAnalysisError(body?.error?.message || "We couldn't read this ledger image. Try a clearer, well-lit photo of a single page, or try again.");
  }
  return toOcrBatch({ status: 'Parsed', fileName: file.name, ledgerRows: body.rows, rawText: body.pageNotes ?? '' });
}
