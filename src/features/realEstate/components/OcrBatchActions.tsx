/** Workflow buttons for an OCR batch, enabled strictly by utils/ocr.ts rules. */
import { useT } from '../../../i18n/language.ts';
import type { OcrBatch, OcrDraft } from '../types/ocrTypes.ts';
import { batchBlockers, canApprove, canImport, canParse, canReject, canSaveCorrections, canValidate } from '../utils/ocr.ts';

export type OcrAction = 'parse' | 'save' | 'validate' | 'approve' | 'import' | 'reject';

interface Props {
  batch: OcrBatch;
  draft: OcrDraft;
  pending: OcrAction | null;
  onAction: (a: OcrAction) => void;
}

export default function OcrBatchActions({ batch, draft, pending, onAction }: Props) {
  const t = useT();
  const blockers = batchBlockers(batch, draft, t);
  const busy = pending !== null;
  const btn = (a: OcrAction, label: string, enabled: boolean, cls = 'btn-outline') => (
    <button type="button" className={`btn ${cls}`} disabled={busy || !enabled} onClick={() => onAction(a)} data-action={a}>
      {pending === a ? t('Please wait…') : t(label)}
    </button>
  );
  const showBlockers = ['Parsed', 'Validated', 'Approved'].includes(String(batch.status)) && blockers.reasons.length > 0;
  return (
    <div className="re-ocr-actions">
      <div className="re-actions">
        {canParse(batch) && btn('parse', 'Extract rows (GPT-6 Luna)', true, 'btn-primary')}
        {btn('save', 'Save corrections', canSaveCorrections(batch, draft))}
        {btn('validate', 'Validate rows', canValidate(batch, draft))}
        {btn('approve', 'Approve batch', canApprove(batch, draft), 'btn-primary')}
        {btn('import', 'Import approved rows', canImport(batch, draft), 'btn-primary')}
        {btn('reject', 'Reject batch', canReject(batch), 're-btn-danger')}
      </div>
      {showBlockers && (
        <p className="f-alert f-alert-info" role="status" id="ocr-blockers">
          {t('Approval and import are blocked until these are resolved: {reasons}.', { reasons: blockers.reasons.join(', ') })}
        </p>
      )}
    </div>
  );
}
