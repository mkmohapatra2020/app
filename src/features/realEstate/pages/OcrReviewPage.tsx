/**
 * Review an OCR batch: extract → correct → validate → approve → import.
 * Rows are imported by the backend from its own validated copy; the UI never writes
 * ledger rows itself and never turns a name / plot number into an id.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext.jsx';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { EmptyView, ErrorView, LoadingState } from '../components/ApiStateView.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';
import OcrBatchActions, { type OcrAction } from '../components/OcrBatchActions.tsx';
import OcrReviewTable, { OcrLegend } from '../components/OcrReviewTable.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import RealEstateStatusBadge from '../components/RealEstateStatusBadge.tsx';
import { useRealEstateOcr } from '../hooks/useRealEstateOcr.ts';
import { batchBlockers, isEditable } from '../utils/ocr.ts';

const OCR_STEPS = ['Uploaded', 'Parsed', 'Validated', 'Approved', 'Imported'];

const CONFIRM: Partial<Record<OcrAction, { title: string; label: string; tone: 'primary' | 'danger'; text: string }>> = {
  approve: { title: 'Approve this batch?', label: 'Approve', tone: 'primary', text: 'Approved rows can then be imported into the matched bookings’ ledgers.' },
  import: { title: 'Import approved rows?', label: 'Import', tone: 'primary', text: 'Each approved row becomes a payment in the matched booking’s ledger. This cannot be undone from here.' },
  reject: { title: 'Reject this batch?', label: 'Reject batch', tone: 'danger', text: 'Nothing from this batch will be imported.' },
};

const FAIL: Partial<Record<OcrAction, string>> = {
  parse: "We couldn't read this ledger image. Try a clearer, well-lit photo of a single page, or try again.",
  validate: 'Validation could not be completed. Please try again.',
};

export default function OcrReviewPage() {
  const t = useT();
  const { batchId = '' } = useParams();
  const access = useRealEstateAccess();
  const { toast } = useToast();
  const ocr = useRealEstateOcr(batchId, access.has('OCR'));
  const [confirm, setConfirm] = useState<OcrAction | null>(null);
  const [reason, setReason] = useState('');
  const batch = ocr.batch;

  const act = async (a: OcrAction) => {
    if (CONFIRM[a] && confirm !== a) { setConfirm(a); return; }
    const next = await ocr.run(a, reason);
    setConfirm(null);
    if (!next) return;
    setReason('');
    const msg: Partial<Record<OcrAction, string>> = { parse: 'Rows extracted — please review', save: 'Corrections saved', validate: 'Validation finished', approve: 'Batch approved', import: 'Rows imported into the ledger', reject: 'Batch rejected' };
    if (msg[a]) toast(t(msg[a] as string));
  };

  const blockers = batch ? batchBlockers(batch, ocr.draft, t) : null;
  const err = ocr.actionError;
  const stepIndex = batch ? OCR_STEPS.indexOf(String(batch.status)) : -1;

  return (
    <RealEstateLayout title={t('Review ledger import')} feature="OCR" crumbs={[[`${RE_ROOT}/ocr`, t('OCR import')], [null, t('Review')]]}>
      {ocr.loading && <LoadingState text={t('Loading batch…')} />}
      {ocr.error && <ErrorView error={ocr.error} onRetry={ocr.reload} />}
      {batch && (
        <>
          <section className="re-card" aria-label={t('Batch status')}>
            <div className="re-card-head">
              <h2>{batch.fileName || t('Batch {id}', { id: String(batch.id) })}</h2>
              <RealEstateStatusBadge status={String(batch.status)} />
            </div>
            {batch.status !== 'Rejected' && (
              <ol className="re-progress-steps" aria-label={t('Import progress')}>
                {OCR_STEPS.map((s, i) => <li key={s} className={i < stepIndex ? 'done' : i === stepIndex ? 'current' : ''} aria-current={i === stepIndex ? 'step' : undefined}>{t(s)}</li>)}
              </ol>
            )}
            <p className="f-alert f-alert-info">
              {t('Customer name and plot number are matching hints read from the paper ledger — they are not database ids.')}{' '}
              {t('The server matches each row to an existing booking; rows it cannot match must be corrected before import.')}
            </p>
            {batch.error && <p className="f-alert f-alert-error" role="alert">{t('Extraction problem: {error}', { error: batch.error })}</p>}
            {err && <p className="f-alert f-alert-error" role="alert">{t(err.error.kind === 'server' || err.error.kind === 'unknown' ? FAIL[err.action] ?? err.error.message : err.error.message)}</p>}
            <OcrBatchActions batch={batch} draft={ocr.draft} pending={ocr.pending} onAction={(a) => void act(a)} />
          </section>

          {batch.status === 'Uploaded' && batch.rows.length === 0 && (
            <EmptyView icon="🧾" title={t('Not extracted yet')}>{t('Choose “Extract rows” to read this ledger page with GPT-4o Vision.')}</EmptyView>
          )}
          {batch.rows.length > 0 && (
            <section className="re-card" aria-labelledby="re-rows">
              <div className="re-card-head">
                <h2 id="re-rows">{t('Extracted rows ({n})', { n: batch.rows.length })}</h2>
                {blockers && blockers.unsavedEdits > 0 && <button type="button" className="btn btn-outline btn-sm" onClick={ocr.discard}>{t('Discard edits')}</button>}
              </div>
              <OcrLegend />
              <OcrReviewTable rows={batch.rows} draft={ocr.draft} editable={isEditable(batch) && ocr.pending === null} onEdit={ocr.edit} />
            </section>
          )}
        </>
      )}

      {confirm && CONFIRM[confirm] && (
        <ConfirmDialog
          open title={t(CONFIRM[confirm]!.title)} confirmLabel={t(CONFIRM[confirm]!.label)} tone={CONFIRM[confirm]!.tone}
          pending={ocr.pending === confirm} onConfirm={() => void act(confirm)} onCancel={() => { setConfirm(null); setReason(''); }}
        >
          <p>{t(CONFIRM[confirm]!.text)}</p>
          {confirm === 'import' && batch && <p>{t(batch.rows.length === 1 ? '{n} row will be imported.' : '{n} rows will be imported.', { n: batch.rows.length })}</p>}
          {confirm === 'reject' && (
            <label className="f-field">
              <span className="f-label">{t('Reason (optional)')}</span>
              <textarea className="f-input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
            </label>
          )}
        </ConfirmDialog>
      )}
    </RealEstateLayout>
  );
}
