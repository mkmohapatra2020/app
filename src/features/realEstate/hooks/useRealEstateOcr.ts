/**
 * State for one OCR batch: the server copy, local (unsaved) corrections, and the
 * workflow actions. Every action replaces the batch with the server's answer.
 */
import { useCallback, useState } from 'react';
import { isApiError, toApiError, type ApiError } from '../../../api/errors.ts';
import { realEstateOcrApi } from '../api/realEstateOcrApi.ts';
import type { OcrAction } from '../components/OcrBatchActions.tsx';
import type { OcrBatch, OcrDraft, OcrField } from '../types/ocrTypes.ts';
import { buildCorrections } from '../utils/ocr.ts';
import { useRealEstateQuery } from './useRealEstateQuery.ts';

export function useRealEstateOcr(batchId: string, enabled: boolean) {
  const q = useRealEstateQuery((s) => realEstateOcrApi.get(batchId, s), [batchId], { enabled: enabled && !!batchId });
  const [draft, setDraft] = useState<OcrDraft>({});
  const [pending, setPending] = useState<OcrAction | null>(null);
  const [actionError, setActionError] = useState<{ action: OcrAction; error: ApiError } | null>(null);

  const edit = useCallback((rowId: string, field: OcrField, value: string) => {
    setDraft((d) => ({ ...d, [rowId]: { ...d[rowId], [field]: value } }));
  }, []);
  const discard = useCallback(() => setDraft({}), []);

  const run = useCallback(async (action: OcrAction, reason = ''): Promise<OcrBatch | null> => {
    const batch = q.data;
    if (!batch) return null;
    setPending(action);
    setActionError(null);
    try {
      let next: OcrBatch;
      switch (action) {
        case 'parse': next = await realEstateOcrApi.parse(batch.id); break;
        case 'save': {
          const corrections = buildCorrections(batch.rows, draft);
          if (!corrections.length) return batch;
          next = await realEstateOcrApi.submitCorrections(batch.id, corrections);
          setDraft({});
          break;
        }
        case 'validate': next = await realEstateOcrApi.validate(batch.id); break;
        case 'approve': next = await realEstateOcrApi.approve(batch.id); break;
        case 'import': next = await realEstateOcrApi.import(batch.id); break;
        case 'reject': next = await realEstateOcrApi.reject(batch.id, reason); break;
        default: return batch;
      }
      // Some actions may answer with a status only: re-read the full batch then.
      if (next.id === '' || (next.rows.length === 0 && batch.rows.length > 0)) next = await realEstateOcrApi.get(batch.id);
      q.setData(() => next);
      return next;
    } catch (e) {
      setActionError({ action, error: isApiError(e) ? e : toApiError(e) });
      return null;
    } finally {
      setPending(null);
    }
  }, [q, draft]);

  return { ...q, batch: q.data, draft, edit, discard, run, pending, actionError };
}
