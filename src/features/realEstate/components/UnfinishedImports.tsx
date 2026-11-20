/**
 * Ledger OCR batches that were read but not imported yet (e.g. the page was refreshed before OK).
 * Continue reopens the Ledger analysis popup for it (to fix and import); Reject drops it (a reason is required).
 * Imported and rejected batches are not listed: their data lives under Booking and transaction details.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isApiError, toApiError } from '../../../api/errors.ts';
import { useToast } from '../../../context/ToastContext.jsx';
import { useT } from '../../../i18n/language.ts';
import { realEstateOcrApi } from '../api/realEstateOcrApi.ts';
import type { OcrBatch } from '../types/ocrTypes.ts';
import ConfirmDialog from './ConfirmDialog.tsx';
import Pager from './Pager.tsx';
import { RE_ROOT } from './RealEstateLayout.tsx';
import RealEstateStatusBadge from './RealEstateStatusBadge.tsx';

const PAGE_SIZE = 10;
const FINISHED = ['Imported', 'Rejected'];

interface Props {
  batches: OcrBatch[];
  /** The batch being worked on in this page's popup is left out. */
  currentId?: OcrBatch['id'] | null;
  onChanged: () => void;
  /** Reopen the batch in the analysis popup. Without it, Continue links to the batch page. */
  onContinue?: (batch: OcrBatch) => void;
  /** Batch currently being opened (its Continue shows a wait label). */
  opening?: OcrBatch['id'] | null;
}

export default function UnfinishedImports({ batches, currentId = null, onChanged, onContinue, opening = null }: Props) {
  const t = useT();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<OcrBatch | null>(null);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const open = batches.filter((b) => !FINISHED.includes(String(b.status)) && (currentId === null || currentId === '' || String(b.id) !== String(currentId)));
  if (open.length === 0) return null;
  const last = Math.max(1, Math.ceil(open.length / PAGE_SIZE));
  const current = Math.min(page, last);
  const shown = open.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const reject = async () => {
    if (!rejecting || !reason.trim()) return;
    setPending(true); setError('');
    try {
      await realEstateOcrApi.reject(rejecting.id, reason);
      toast(t('Batch rejected'));
      setRejecting(null); setReason('');
      onChanged();
    } catch (e) {
      setError((isApiError(e) ? e : toApiError(e)).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="re-card" aria-labelledby="re-unfinished">
      <h2 id="re-unfinished">{t('Unfinished imports')}</h2>
      <p className="re-sub">{t('These ledger pages were read but not imported yet. Continue to check and import one, or reject it.')}</p>
      <div className="re-table-wrap" role="region" aria-label={t('Unfinished imports')} tabIndex={0}>
        <table className="re-table">
          <thead>
            <tr><th scope="col">{t('Batch ID')}</th><th scope="col">{t('File')}</th><th scope="col">{t('Status')}</th><th scope="col">{t('Action')}</th></tr>
          </thead>
          <tbody>
            {shown.map((b) => (
              <tr key={String(b.id)}>
                <td data-label={t('Batch ID')}>{String(b.id)}</td>
                <td data-label={t('File')}>{b.fileName || 'N/A'}</td>
                <td data-label={t('Status')}><RealEstateStatusBadge status={String(b.status)} /></td>
                <td data-label={t('Action')}>
                  <div className="re-row-actions">
                    {onContinue
                      ? <button type="button" className="btn btn-outline btn-sm" disabled={opening !== null} onClick={() => onContinue(b)}>{opening !== null && String(opening) === String(b.id) ? t('Opening…') : `${t('Continue')} →`}</button>
                      : <Link className="btn btn-outline btn-sm" to={`${RE_ROOT}/ocr/${encodeURIComponent(String(b.id))}`}>{t('Continue')} →</Link>}
                    <button type="button" className="btn btn-sm re-btn-danger" onClick={() => { setRejecting(b); setReason(''); setError(''); }}>{t('Reject')}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={current} pageSize={PAGE_SIZE} total={open.length} count={shown.length} onPage={setPage} />

      <ConfirmDialog
        open={!!rejecting} title={t('Reject this batch?')} confirmLabel={t('Reject batch')} tone="danger"
        pending={pending} confirmDisabled={!reason.trim()} onConfirm={() => void reject()} onCancel={() => { setRejecting(null); setReason(''); }}
      >
        <p>{t('Nothing from this batch will be imported.')}</p>
        <label className="f-field">
          <span className="f-label">{t('Reason')}</span>
          <textarea className="f-input" rows={3} value={reason} required aria-required="true" maxLength={500} onChange={(e) => setReason(e.target.value)} />
          <small className="f-hint">{t('A reason is required to reject a batch.')}</small>
        </label>
        {error && <p className="f-alert f-alert-error" role="alert">{error}</p>}
      </ConfirmDialog>
    </section>
  );
}
