/**
 * Real Estate / OCR uploads to the backend's own container (default "realestate-images"),
 * matching WLService RealEstateFunctions + RealEstateBlobStorageService:
 *
 *   1. local checks (type, size)
 *   2. POST /realestate/images/upload-grant { fileName, contentType }
 *      → ImageUploadGrant { BlobUri, SasToken, BlobName ("<userId>/<guid>_<file>"), ContainerName, ExpiresOn }
 *   3. PUT the file to `${BlobUri}?${SasToken}` (x-ms-blob-type: BlockBlob; no bearer token)
 *
 * The OCR batch must use this BlobName: the backend only reads "<userId>/…" blobs from that
 * container. The SAS URL is kept in memory only; callers get { blobName, container, … } (StoredBlob).
 */
import { apiPost } from '../../../api/apiClient.ts';
import { requireAuth } from '../../../api/authApi.ts';
import { ApiError, field } from '../../../api/errors.ts';
import { enT, type T } from '../../../i18n/language.ts';
import type { OcrInputType, StoredBlob, UploadGrant, UploadPurpose } from '../types/realEstateTypes.ts';
import { RE_BASE } from './realEstateApi.ts';

export const UPLOAD_GRANT_PATH = `${RE_BASE}/images/upload-grant`;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PDF_TYPE = 'application/pdf';
export const EXCEL_TYPES = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
export const DEFAULT_ALLOWED_TYPES = IMAGE_TYPES;
export const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

/** Accepted files: documents = images + PDF; OCR = images, PDF and Excel ledgers. */
// The backend's ledger OCR (WLService Gpt4oVisionLedgerExtractor) reads images only — PDF and
// Excel ledger pages are rejected there — so ledger uploads accept photos only.
export const allowedTypesFor = (purpose: UploadPurpose): string[] =>
  (purpose === 'OcrLedger' ? [...IMAGE_TYPES] : [...IMAGE_TYPES, PDF_TYPE]);

const TYPE_NAME: Record<string, string> = {
  'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP', [PDF_TYPE]: 'PDF',
  [EXCEL_TYPES[0]]: 'XLSX', [EXCEL_TYPES[1]]: 'XLS',
};
export const typeNames = (types: string[]) => [...new Set(types.map((t) => TYPE_NAME[t] ?? t.split('/')[1]?.toUpperCase() ?? t))].join(', ');

/** Platform OCR input type for a file. */
export const ocrInputType = (contentType: string): OcrInputType =>
  (contentType === PDF_TYPE ? 'Pdf' : EXCEL_TYPES.includes(contentType) ? 'Excel' : 'ScannedLedgerPage');

export class UploadError extends Error {
  constructor(message: string, readonly retryable = true) { super(message); this.name = 'UploadError'; }
}

/** Human message for a file that must not be uploaded, or null when it is fine. */
export function validateUploadFile(file: File | null | undefined, allowed = DEFAULT_ALLOWED_TYPES, maxBytes = DEFAULT_MAX_BYTES, t: T = enT): string | null {
  if (!file) return t('Choose a file to upload.');
  if (!allowed.includes(file.type)) return t("That file type isn't supported. Use {types}.", { types: typeNames(allowed) });
  if (file.size <= 0) return t('That file is empty.');
  if (file.size > maxBytes) return t('That file is too large (max {mb} MB).', { mb: Math.round(maxBytes / 1024 / 1024) });
  return null;
}

/** POST /realestate/images/upload-grant { fileName, contentType } → scoped upload URL + blob name. */
/** The backend answers like this when its blob storage isn't configured (a server setup problem). */
const STORAGE_NOT_CONFIGURED = /BLOB_CONNECTION_STRING|BlobServiceUri|storage (account )?(is )?not configured/i;
export const STORAGE_NOT_CONFIGURED_MESSAGE = "File uploads aren't set up on the server yet, so retrying won't help. Please ask the administrator to configure file storage.";

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));

/** POST /realestate/images/upload-grant → an upload URL (BlobUri + SasToken) for one blob. */
export async function requestUploadGrant(file: File): Promise<UploadGrant> {
  requireAuth();
  let raw: unknown;
  try {
    raw = await apiPost<unknown>(UPLOAD_GRANT_PATH, { fileName: file.name, contentType: file.type });
  } catch (e) {
    if (e instanceof Error && STORAGE_NOT_CONFIGURED.test(e.message)) {
      // Keep the server's wording for whoever fixes the backend; show people a plain message.
      console.warn('[real-estate] upload grant: backend storage is not configured —', e.message);
      throw new UploadError(STORAGE_NOT_CONFIGURED_MESSAGE, false);
    }
    throw e;
  }
  const blobUri = str(field(raw, 'blobUri') ?? field(raw, 'uri') ?? field(raw, 'url'));
  const sasToken = str(field(raw, 'sasToken') ?? field(raw, 'token')).replace(/^\?/, '');
  const grant: UploadGrant = {
    uploadUrl: blobUri && sasToken && !blobUri.includes('?') ? `${blobUri}?${sasToken}` : blobUri,
    blobName: str(field(raw, 'blobName')),
    container: str(field(raw, 'containerName') ?? field(raw, 'container')),
    expiresOn: str(field(raw, 'expiresOn')),
    maxBytes: null,
    allowedContentTypes: [],
    requiredHeaders: {},
  };
  let url: URL | null = null;
  try { url = new URL(grant.uploadUrl); } catch { /* handled below */ }
  if (!url || url.protocol !== 'https:' || !grant.blobName) {
    throw new ApiError('server', "Upload isn't available right now. Please try again shortly.");
  }
  return grant;
}

/** PUT to the grant URL with progress (0–1). Abortable. */
export function putToBlob(grant: UploadGrant, file: File, onProgress?: (p: number) => void, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', grant.uploadUrl);
    xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
    xhr.setRequestHeader('Content-Type', file.type);
    for (const [k, v] of Object.entries(grant.requiredHeaders)) if (!/^authorization$/i.test(k)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300
      ? (onProgress?.(1), resolve())
      : reject(new UploadError(xhr.status === 403 ? 'The upload link expired. Please try again.' : 'The upload failed. Please try again.')));
    xhr.onerror = () => reject(new UploadError("We couldn't reach file storage. Check your connection and try again."));
    xhr.onabort = () => reject(new UploadError('Upload cancelled.', false));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

export interface UploadOptions {
  purpose: UploadPurpose;
  onProgress?: (p: number) => void;
  signal?: AbortSignal;
}

/** Validates, gets a grant, uploads, and returns only backend-issued metadata. */
export async function uploadRealEstateFile(file: File, { purpose, onProgress, signal }: UploadOptions): Promise<StoredBlob> {
  const allowed = allowedTypesFor(purpose);
  const localError = validateUploadFile(file, allowed);
  if (localError) throw new UploadError(localError, false);
  const grant = await requestUploadGrant(file);
  // The backend may be stricter than the defaults.
  const grantError = validateUploadFile(file, grant.allowedContentTypes.length ? grant.allowedContentTypes : allowed, grant.maxBytes ?? DEFAULT_MAX_BYTES);
  if (grantError) throw new UploadError(grantError, false);
  await putToBlob(grant, file, onProgress, signal);
  return { blobName: grant.blobName, container: grant.container, contentType: file.type, size: file.size, fileName: file.name };
}
