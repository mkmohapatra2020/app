/**
 * /real-estate/ocr/new — upload a ledger page, have Azure Vision analyse it (on the backend),
 * check the extracted key → value pairs in a popup next to the screenshot, then submit:
 * the edits go to the backend as corrections and the batch is validated. Approval and
 * import stay separate, explicit steps on the review page.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isApiError, toApiError } from '../../../api/errors.ts';
import { useT } from '../../../i18n/language.ts';
import { useToast } from '../../../context/ToastContext.jsx';
import { realEstateOcrApi } from '../api/realEstateOcrApi.ts';
import { ocrInputType } from '../api/realEstateUpload.ts';
import BlobUploadField from '../components/BlobUploadField.tsx';
import OcrAnalysisDialog from '../components/OcrAnalysisDialog.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import RealEstateStatusBadge from '../components/RealEstateStatusBadge.tsx';
import type { OcrBatch, OcrDraft, OcrField } from '../types/ocrTypes.ts';
import type { StoredBlob } from '../types/realEstateTypes.ts';
import { buildCorrections, isEditable } from '../utils/ocr.ts';
import { rememberBatch } from '../utils/recent.ts';

const INPUT_LABEL: Record<string, string> = { ScannedLedgerPage: 'Scanned ledger page', Pdf: 'PDF', Excel: 'Excel' };
type Busy = 'analyse' | 'submit' | null;

export default function OcrUploadPage() {
  const t = useT();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [blob, setBlob] = useState<StoredBlob | null>(null);
  const [batch, setBatch] = useState<OcrBatch | null>(null);
  const [draft, setDraft] = useState<OcrDraft>({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState('');
  const batchUrl = batch ? `${RE_ROOT}/ocr/${encodeURIComponent(String(batch.id))}` : '';
  const message = (e: unknown, fallback: string) => {
    const err = isApiError(e) ? e : toApiError(e);
    return t(err.kind === 'server' || err.kind === 'unknown' ? fallback : err.message);
  };

  // Local copy of the uploaded file for the popup; revoked when replaced or on leaving.
  useEffect(() => {
    if (!file || typeof URL.createObjectURL !== 'function') { setPreviewUrl(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const keep = (b: OcrBatch) => { rememberBatch({ ...b, fileName: b.fileName || blob?.fileName || '' }); setBatch(b); };

  /** Create the batch (once), then ask the backend to analyse it with Azure Vision. */
  const analyse = async () => {
    if (!blob) return;
    setBusy('analyse'); setError('');
    try {
      let b = batch;
      if (!b) {
        b = await realEstateOcrApi.create(blob);
        if (b.id === '') throw new Error('The import batch could not be created. Please try again.');
        keep(b);
      }
      if (b.status === 'Uploaded') {
        let parsed = await realEstateOcrApi.parse(b.id);
        if (parsed.id === '' || parsed.rows.length === 0) parsed = await realEstateOcrApi.get(b.id);
        b = parsed;
        keep(b);
      }
      setDraft({});
      setOpen(true);
    } catch (e) {
      setError(message(e, "We couldn't read this ledger image. Try a clearer, well-lit photo of a single page, or try again."));
    } finally {
      setBusy(null);
    }
  };

  /** Send the edited values as corrections, validate, then continue on the review page. */
  const submit = async () => {
    if (!batch) return;
    setBusy('submit'); setError('');
    try {
      const corrections = buildCorrections(batch.rows, draft);
      let b = batch;
      if (corrections.length) b = await realEstateOcrApi.submitCorrections(batch.id, corrections);
      b = await realEstateOcrApi.validate(batch.id);
      if (b.id === '' || b.rows.length === 0) b = await realEstateOcrApi.get(batch.id);
      keep(b);
      setDraft({});
      setOpen(false);
      toast(t('Ledger data submitted'));
      navigate(`${RE_ROOT}/ocr/${encodeURIComponent(String(b.id || batch.id))}`);
    } catch (e) {
      setError(message(e, 'The data could not be submitted. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  const edit = (key: string, field: OcrField, value: string) => setDraft((d) => ({ ...d, [key]: { ...d[key], [field]: value } }));
  const analysed = !!batch && batch.status !== 'Uploaded';

  return (
    <RealEstateLayout title={t('Import a ledger page')} feature="OCR" crumbs={[[`${RE_ROOT}/ocr`, t('Ledger OCR')], [null, t('New import')]]}
      intro={t('Nothing is added to the ledger until you review, approve and import the rows.')}>
      <div className="re-split">
        <section className="re-card" aria-labelledby="re-ocr-up">
          <h2 id="re-ocr-up">{t('1. Upload')}</h2>
          <ol className="re-steps">
            <li>{t('Upload a clear, well-lit photo of one ledger page, a PDF, or an Excel sheet.')}</li>
            <li>{t('Azure Vision analyses it and shows every value next to the screenshot. Correct anything that is wrong and submit.')}</li>
            <li>{t('Validate, approve, and import. Nothing is saved to the ledger until you import.')}</li>
          </ol>
          <BlobUploadField label={t('Ledger file')} purpose="OcrLedger" disabled={!!batch || busy !== null} onFile={setFile} onUploaded={setBlob} />
          {blob && !batch && (
            <p className="re-sub">{t('Input type: {type}', { type: t(INPUT_LABEL[ocrInputType(blob.contentType)]) })}</p>
          )}
          {error && !open && <p className="f-alert f-alert-error" role="alert">{error}</p>}
          {!analysed && (
            <button type="button" className="btn btn-primary" disabled={!blob || busy !== null} onClick={() => void analyse()}>
              {busy === 'analyse' ? t('Analysing with Azure Vision…') : t('Analyse with Azure Vision')}
            </button>
          )}
        </section>

        <section className="re-card" aria-labelledby="re-ocr-res" aria-live="polite">
          <h2 id="re-ocr-res">{t('2. Analysis')}</h2>
          {!batch ? <p className="re-sub">{t('After the upload, choose “Analyse with Azure Vision”. The result opens in a popup.')}</p> : (
            <>
              <dl className="re-facts">
                <div><dt>{t('Batch ID')}</dt><dd>{String(batch.id)}</dd></div>
                <div><dt>{t('File')}</dt><dd>{batch.fileName || blob?.fileName}</dd></div>
                <div><dt>{t('Status')}</dt><dd><RealEstateStatusBadge status={String(batch.status)} /></dd></div>
                {analysed && <div><dt>{t('Rows found')}</dt><dd>{batch.rows.length}</dd></div>}
              </dl>
              <div className="re-actions">
                {analysed && <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>{t('Show analysis')}</button>}
                <Link className="btn btn-outline" to={batchUrl}>{t('Open batch')}</Link>
              </div>
            </>
          )}
        </section>
      </div>

      {open && batch && (
        <OcrAnalysisDialog
          batch={batch} previewUrl={previewUrl} previewType={file?.type || blob?.contentType || ''} fileName={file?.name || batch.fileName || blob?.fileName || ''}
          draft={draft} editable={isEditable(batch)} pending={busy === 'submit'} error={error}
          onEdit={edit} onSubmit={() => void submit()} onClose={() => { setOpen(false); setError(''); }}
        />
      )}
    </RealEstateLayout>
  );
}
