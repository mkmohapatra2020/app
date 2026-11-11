/**
 * Static mode (no backend yet): reviewed ledger imports are kept on this device
 * (localStorage) and can be downloaded as JSON, to send to the backend once it exists.
 * Attached documents are recorded by name and type only — the files themselves are not stored.
 */
import type { RowAttachments } from '../components/OcrAnalysisDialog.tsx';
import type { OcrBatch, OcrDraft, OcrField } from '../types/ocrTypes.ts';
import { cellValue, rowKey } from './ocr.ts';

export interface LocalImportRow {
  rowNumber: number;
  values: Partial<Record<OcrField, string>>;
  documents: { documentType: string; fileName: string }[];
}
export interface LocalImport {
  id: string;
  savedAt: string;
  fileName: string;
  model: string;
  rows: LocalImportRow[];
}

const KEY = 're:ocr:local-imports';
const MAX = 50;

export function buildLocalImport(batch: OcrBatch, draft: OcrDraft, attachments: RowAttachments, fields: readonly OcrField[], fileName: string, now = new Date()): LocalImport {
  return {
    id: `local-${now.getTime().toString(36)}`,
    savedAt: now.toISOString(),
    fileName,
    model: 'gpt-6-luna',
    rows: batch.rows.map((row) => {
      const key = rowKey(row);
      const values: Partial<Record<OcrField, string>> = {};
      for (const f of fields) {
        const v = cellValue(row.cells[f], draft[key]?.[f]).trim();
        if (v) values[f] = v;
      }
      return {
        rowNumber: row.rowNumber || row.index + 1,
        values,
        documents: (attachments[key] ?? []).map((a) => ({ documentType: a.documentType, fileName: a.blob.fileName })),
      };
    }),
  };
}

export function listLocalImports(): LocalImport[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Saves (newest first, last 50 kept). Returns false when this browser can't store it. */
export function saveLocalImport(rec: LocalImport): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify([rec, ...listLocalImports().filter((r) => r.id !== rec.id)].slice(0, MAX)));
    return true;
  } catch {
    return false;
  }
}

/** Starts a browser download of the import as pretty-printed JSON. */
export function downloadLocalImport(rec: LocalImport): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(rec, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `ledger-import-${rec.savedAt.slice(0, 10)}-${rec.id}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
