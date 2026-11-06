/**
 * /real-estate/ocr/new — upload a ledger page, have GPT-6 Luna analyse it, check the extracted
 * key → value pairs in a popup next to the screenshot, then submit to the backend (batch +
 * corrections + validation). Approval and import stay separate steps on the review page.
 *
 * LEDGER_OCR_MODE 'direct' (interim): the site's own /api/ledger-ocr reads the page; Submit
 *   creates the batch from the uploaded file and sends every reviewed value as a correction.
 * LEDGER_OCR_MODE 'backend': create batch → backend parse → corrections for edits only.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isApiError, toApiError } from '../../../api/errors.ts';
import { useT } from '../../../i18n/language.ts';
import { useToast } from '../../../context/ToastContext.jsx';
import { analyseLedgerFile, LedgerAnalysisError, LEDGER_OCR_MODE } from '../api/ledgerVisionApi.ts';
import { realEstateApi } from '../api/realEstateApi.ts';
import { realEstateOcrApi } from '../api/realEstateOcrApi.ts';
import { ocrInputType } from '../api/realEstateUpload.ts';
import BlobUploadField from '../components/BlobUploadField.tsx';
import OcrAnalysisDialog, { DIALOG_FIELDS, type RowAttachment, type RowAttachments } from '../components/OcrAnalysisDialog.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import RealEstateStatusBadge from '../components/RealEstateStatusBadge.tsx';
import type { OcrBatch, OcrDraft, OcrField } from '../types/ocrTypes.ts';
import type { StoredBlob } from '../types/realEstateTypes.ts';
import { allValuesAsCorrections, buildCorrections, isEditable } from '../utils/ocr.ts';
import { rememberBatch } from '../utils/recent.ts';

const INPUT_LABEL: Record<string, string> = { ScannedLedgerPage: 'Scanned ledger page', Pdf: 'PDF', Excel: 'Excel' };
type Busy = 'analyse' | 'submit' | null;
const DIRECT = LEDGER_OCR_MODE === 'direct';

export default function OcrUploadPage() {
  const t = useT();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [blob, setBlob] = useState<StoredBlob | null>(null);
  const [batch, setBatch] = useState<OcrBatch | null>(null);
  const [draft, setDraft] = useState<OcrDraft>({});
  const [attachments, setAttachments] = useState<RowAttachments>({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState('');
  const saved = !!batch && batch.id !== '';
  const batchUrl = saved ? `${RE_ROOT}/ocr/${encodeURIComponent(String(batch!.id))}` : '';
  const message = (e: unknown, fallback: string) => {
    if (e instanceof LedgerAnalysisError) return t(e.message);
    const err = isApiError(e) ? e : toApiError(e);
    return t(err.kind === 'server' || err.kind === 'unknown' ? fallback : err.message);
  };

  /**
   * Save each transaction's attached documents to the booking the backend matched that row to.
   * Returns how many could not be saved (row not matched to a booking, or the save failed).
   */
  const saveAttachments = async (result: OcrBatch): Promise<number> => {
    let missed = 0;
    for (const [key, list] of Object.entries(attachments)) {
      const bookingId = result.rows.find((r) => String(r.index) === key)?.match.bookingId;
      for (const a of list) {
        if (bookingId === null || bookingId === undefined || bookingId === '') { missed += 1; continue; }
        try { await realEstateApi.documents.create({ bookingId, documentType: a.documentType, blob: a.blob }); } catch { missed += 1; }
      }
    }
    return missed;
  };
  const finish = async (result: OcrBatch, fallbackId: OcrBatch['id']) => {
    const missed = await saveAttachments(result);
    keep(result);
    setDraft({});
    setAttachments({});
    setOpen(false);
    toast(t('Ledger data submitted'));
    if (missed) toast(t(missed === 1 ? '{n} document was not saved: its row is not matched to a booking yet.' : '{n} documents were not saved: their rows are not matched to a booking yet.', { n: missed }));
    navigate(`${RE_ROOT}/ocr/${encodeURIComponent(String(result.id || fallbackId))}`);
  };

  const keep = (b: OcrBatch) => { rememberBatch({ ...b, fileName: b.fileName || blob?.fileName || '' }); setBatch(b); };

  /** A new file starts over (nothing has been sent to the backend for the old one yet). */
  const chooseFile = (f: File) => { setFile(f); setBlob(null); if (!saved) { setBatch(null); setDraft({}); setAttachments({}); } };

  /** Direct: read the local file with the model. Backend: create the batch (once), then parse. */
  const analyse = async () => {
    if (DIRECT ? !file : !blob) return;
    setBusy('analyse'); setError('');
    try {
      if (DIRECT) {
        setBatch(await analyseLedgerFile(file!));
        setDraft({});
        setOpen(true);
        return;
      }
      if (!blob) return;
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
      if (DIRECT && batch.id === '') {
        if (!blob) throw new LedgerAnalysisError('The ledger file has not finished uploading (or the upload failed). It must be uploaded before the data can be sent.');
        const created = await realEstateOcrApi.create(blob);
        if (created.id === '') throw new Error('The import batch could not be created. Please try again.');
        rememberBatch({ ...created, fileName: created.fileName || blob.fileName });
        const all = allValuesAsCorrections(batch.rows, draft, DIALOG_FIELDS);
        if (all.length) await realEstateOcrApi.submitCorrections(created.id, all);
        let v = await realEstateOcrApi.validate(created.id);
        if (v.id === '' || v.rows.length === 0) v = await realEstateOcrApi.get(created.id);
        await finish(v, created.id);
        return;
      }
      const corrections = buildCorrections(batch.rows, draft);
      let b = batch;
      if (corrections.length) b = await realEstateOcrApi.submitCorrections(batch.id, corrections);
      b = await realEstateOcrApi.validate(batch.id);
      if (b.id === '' || b.rows.length === 0) b = await realEstateOcrApi.get(batch.id);
      await finish(b, batch.id);
    } catch (e) {
      setError(message(e, 'The data could not be submitted. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  const edit = (key: string, field: OcrField, value: string) => setDraft((d) => ({ ...d, [key]: { ...d[key], [field]: value } }));
  const attach = (key: string, a: RowAttachment) => setAttachments((m) => ({ ...m, [key]: [...(m[key] ?? []), a] }));
  const unattach = (key: string, i: number) => setAttachments((m) => ({ ...m, [key]: (m[key] ?? []).filter((_, j) => j !== i) }));
  const analysed = !!batch && batch.status !== 'Uploaded';

  return (
    <RealEstateLayout title={t('Import a ledger page')} feature="OCR" crumbs={[[`${RE_ROOT}/ocr`, t('Ledger OCR')], [null, t('New import')]]}
      intro={t('Nothing is added to the ledger until you review, approve and import the rows.')}>
      <div className="re-split">
        <section className="re-card" aria-labelledby="re-ocr-up">
          <h2 id="re-ocr-up">{t('1. Upload')}</h2>
          <ol className="re-steps">
            <li>{t('Upload a clear, well-lit photo of one ledger page, a PDF, or an Excel sheet.')}</li>
            <li>{t('GPT-6 Luna analyses it and shows every value next to the screenshot. Correct anything that is wrong and submit.')}</li>
            <li>{t('Validate, approve, and import. Nothing is saved to the ledger until you import.')}</li>
          </ol>
          <BlobUploadField label={t('Ledger file')} purpose="OcrLedger" disabled={saved || busy !== null} onFile={chooseFile} onUploaded={setBlob} />
          {blob && !saved && (
            <p className="re-sub">{t('Input type: {type}', { type: t(INPUT_LABEL[ocrInputType(blob.contentType)]) })}</p>
          )}
          {error && !open && <p className="f-alert f-alert-error" role="alert">{error}</p>}
          {!analysed && (
            <button type="button" className="btn btn-primary" disabled={(DIRECT ? !file : !blob) || busy !== null} onClick={() => void analyse()}>
              {busy === 'analyse' ? t('Analysing with GPT-6 Luna…') : t('Analyse with GPT-6 Luna')}
            </button>
          )}
        </section>

        <section className="re-card" aria-labelledby="re-ocr-res" aria-live="polite">
          <h2 id="re-ocr-res">{t('2. Analysis')}</h2>
          {!batch ? <p className="re-sub">{t('After the upload, choose “Analyse with GPT-6 Luna”. The result opens in a popup.')}</p> : (
            <>
              <dl className="re-facts">
                {saved && <div><dt>{t('Batch ID')}</dt><dd>{String(batch.id)}</dd></div>}
                <div><dt>{t('File')}</dt><dd>{batch.fileName || blob?.fileName}</dd></div>
                <div><dt>{t('Status')}</dt><dd><RealEstateStatusBadge status={String(batch.status)} /></dd></div>
                {analysed && <div><dt>{t('Rows found')}</dt><dd>{batch.rows.length}</dd></div>}
              </dl>
              <div className="re-actions">
                {analysed && <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>{t('Show analysis')}</button>}
                {saved && <Link className="btn btn-outline" to={batchUrl}>{t('Open batch')}</Link>}
              </div>
            </>
          )}
        </section>
      </div>

      {open && batch && (
        <OcrAnalysisDialog
          batch={batch} fileName={file?.name || batch.fileName || blob?.fileName || ''}
          draft={draft} attachments={attachments} editable={isEditable(batch)} pending={busy === 'submit'} error={error}
          onEdit={edit} onAttach={attach} onRemoveAttachment={unattach}
          onSubmit={() => void submit()} onClose={() => { setOpen(false); setError(''); }}
        />
      )}
    </RealEstateLayout>
  );
}
