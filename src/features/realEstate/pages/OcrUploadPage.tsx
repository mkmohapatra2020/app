/**
 * /real-estate/ocr — upload a ledger page, have it read, check every value in a popup, then
 * Submit → "Are you sure?" → OK sends the corrections and imports the page in ONE call
 * (POST …/import with the corrections: the server saves, validates, approves and imports).
 *
 * LEDGER_OCR_MODE 'static' (default, no backend yet): the file stays on this device, the site's own
 *   /api/ledger-ocr reads it, and Submit saves the reviewed rows on this device (+ JSON download).
 * LEDGER_OCR_MODE 'direct': the site's own /api/ledger-ocr reads the page; Submit
 *   creates the batch from the uploaded file and sends every reviewed value as a correction.
 * LEDGER_OCR_MODE 'backend': create batch → backend parse → corrections for edits only.
 */
import { useState } from 'react';
import { isApiError, toApiError } from '../../../api/errors.ts';
import { useT } from '../../../i18n/language.ts';
import { useToast } from '../../../context/ToastContext.jsx';
import { analyseLedgerFile, LedgerAnalysisError, LEDGER_OCR_MODE } from '../api/ledgerVisionApi.ts';
import { realEstateApi } from '../api/realEstateApi.ts';
import { realEstateOcrApi } from '../api/realEstateOcrApi.ts';
import { ocrInputType } from '../api/realEstateUpload.ts';
import BlobUploadField from '../components/BlobUploadField.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';
import UnfinishedImports from '../components/UnfinishedImports.tsx';
import { SelectInput } from '../components/FormFields.tsx';
import { useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import { localBlob } from '../components/BlobUploadField.tsx';
import OcrAnalysisDialog, { DIALOG_FIELDS, type RowAttachment, type RowAttachments } from '../components/OcrAnalysisDialog.tsx';
import RealEstateLayout from '../components/RealEstateLayout.tsx';
import RealEstateStatusBadge from '../components/RealEstateStatusBadge.tsx';
import type { OcrBatch, OcrDraft, OcrField } from '../types/ocrTypes.ts';
import type { StoredBlob } from '../types/realEstateTypes.ts';
import { allValuesAsCorrections, buildCorrections, documentCorrections, isEditable, ledgerErrors, rowKey } from '../utils/ocr.ts';
import { buildLocalImport, downloadLocalImport, saveLocalImport, type LocalImport } from '../utils/localImports.ts';
import { rememberBatch } from '../utils/recent.ts';

const INPUT_LABEL: Record<string, string> = { ScannedLedgerPage: 'Scanned ledger page', Pdf: 'PDF', Excel: 'Excel' };
type Busy = 'analyse' | 'submit' | 'continue' | null;
const STATIC = LEDGER_OCR_MODE === 'static';
/** The page reads the file itself via /api/ledger-ocr (static and direct modes). */
const DIRECT = LEDGER_OCR_MODE !== 'backend';

export default function OcrUploadPage() {
  const t = useT();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  // A ledger page is imported once: the user's imported batches, to stop the same file being used again.
  const myBatches = useRealEstateQuery((s) => realEstateOcrApi.list(s), [], { enabled: !STATIC });
  const [blob, setBlob] = useState<StoredBlob | null>(null);
  const [batch, setBatch] = useState<OcrBatch | null>(null);
  const [draft, setDraft] = useState<OcrDraft>({});
  const [attachments, setAttachments] = useState<RowAttachments>({});
  const [localSaved, setLocalSaved] = useState<LocalImport | null>(null);
  const [fieldKey, setFieldKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState('');
  // "Are you sure?" before Submit; OK imports. New customers / plots / bookings go into this project.
  const [confirming, setConfirming] = useState(false);
  const [projectId, setProjectId] = useState('');
  const projects = useRealEstateQuery((s) => realEstateApi.projects.list(null, s), [], { enabled: !STATIC && open });
  const projectOptions = (projects.data ?? []).map((p) => ({ value: String(p.id), label: p.phase ? `${p.name} · ${p.phase}` : p.name }));
  const chosenProject = projectId || (projectOptions.length === 1 ? projectOptions[0].value : '');
  const saved = !!batch && batch.id !== '';
  const chosenName = (file?.name || blob?.fileName || '').trim();
  const alreadyImported = chosenName ? (myBatches.data ?? []).find((b) => String(b.status) === 'Imported' && b.fileName.trim() === chosenName) ?? null : null;
  const message = (e: unknown, fallback: string) => {
    if (e instanceof LedgerAnalysisError) return t(e.message);
    const err = isApiError(e) ? e : toApiError(e);
    return t(err.kind === 'server' || err.kind === 'unknown' ? fallback : err.message);
  };

  const finish = (result: OcrBatch, fallbackId: OcrBatch['id'], documents: number) => {
    keep(result);
    setDraft({});
    setAttachments({});
    setOpen(false);
    if (String(result.status) === 'Imported') {
      toast(t('Ledger imported: {n} transactions', { n: result.rows.length }));
      if (documents) toast(t(documents === 1 ? '1 document saved to its booking.' : '{n} documents saved to their bookings.', { n: documents }));
    } else {
      toast(t('Ledger data submitted'));
    }
    // Stay on Ledger OCR, ready for the next page; the unfinished list drops this batch.
    void fallbackId;
    startOver();
    myBatches.reload();
  };

  /**
   * After corrections/validation: approve and import straight away. If the server still finds a
   * problem, stop and show it in the popup (the batch keeps whatever step it reached).
   */
  const importNow = async (validated: OcrBatch, id: OcrBatch['id']): Promise<OcrBatch> => {
    let b = validated;
    if (String(b.status) !== 'Validated' || b.issueCount > 0) {
      keep(b);
      throw new LedgerAnalysisError(b.issueCount > 0 ? 'The server found problems in some rows. Fix them and submit again.' : 'The ledger could not be validated. Please try again.');
    }
    b = await realEstateOcrApi.approve(id);
    keep(b.id === '' ? { ...validated, status: 'Approved' } : b);
    b = await realEstateOcrApi.import(id, chosenProject || null);
    if (b.id === '' || b.rows.length === 0) b = await realEstateOcrApi.get(id);
    return b;
  };

  const keep = (b: OcrBatch) => { rememberBatch({ ...b, fileName: b.fileName || blob?.fileName || '' }); setBatch(b); };

  /** A new file starts over (nothing has been sent to the backend for the old one yet). */
  const chooseFile = (f: File) => { setFile(f); setBlob(STATIC ? localBlob(f) : null); setLocalSaved(null); if (!saved) { setBatch(null); setDraft({}); setAttachments({}); } };
  /** Static mode: clear everything for the next page. */
  const startOver = () => { setFile(null); setBlob(null); setBatch(null); setDraft({}); setAttachments({}); setLocalSaved(null); setError(''); setFieldKey((k) => k + 1); };

  /** Direct: read the local file with the model. Backend: create the batch (once), then parse. */
  const [opening, setOpening] = useState<OcrBatch['id'] | null>(null);
  /**
   * "Continue" on an unfinished batch: load it (read the page first if it was never read) and reopen
   * the analysis popup. Documents already saved on its rows are shown again as attachments.
   */
  const continueBatch = async (b: OcrBatch) => {
    setBusy('continue'); setOpening(b.id); setError('');
    try {
      let full = await realEstateOcrApi.get(b.id);
      if (String(full.status) === 'Uploaded') {
        setBusy('analyse');
        full = await realEstateOcrApi.parse(b.id);
        if (full.id === '' || full.rows.length === 0) full = await realEstateOcrApi.get(b.id);
      }
      setFile(null);
      setBlob(null);
      setLocalSaved(null);
      keep(full);
      setDraft({});
      setAttachments(Object.fromEntries(full.rows.filter((r) => (r.documents ?? []).length > 0).map((r) => [
        rowKey(r),
        (r.documents ?? []).map((d) => ({ documentType: d.documentType || 'PaymentReceipt', blob: { blobName: d.blobName, fileName: d.fileName || d.blobName.split('/').pop() || '', container: '', contentType: '', size: 0 } })),
      ])));
      setOpen(true);
    } catch (e) {
      setError(message(e, 'This batch could not be opened. Please try again.'));
    } finally {
      setBusy(null); setOpening(null);
    }
  };

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
    if (Object.keys(ledgerErrors(batch.rows, draft, DIALOG_FIELDS, t)).length) { setError(t('Some fields need fixing before the data can be submitted.')); return; }
    setBusy('submit'); setError('');
    const docCount = Object.values(attachments).reduce((n, l) => n + l.length, 0);
    try {
      if (STATIC) {
        const rec = buildLocalImport(batch, draft, attachments, DIALOG_FIELDS, file?.name || batch.fileName);
        if (!saveLocalImport(rec)) throw new LedgerAnalysisError('This browser could not save the data. Use “Download JSON” to keep a copy.');
        setLocalSaved(rec);
        setOpen(false);
        toast(t('Saved on this device'));
        return;
      }
      if (DIRECT && batch.id === '') {
        if (!blob) throw new LedgerAnalysisError('The ledger file has not finished uploading (or the upload failed). It must be uploaded before the data can be sent.');
        const created = await realEstateOcrApi.create(blob);
        if (created.id === '') throw new Error('The import batch could not be created. Please try again.');
        rememberBatch({ ...created, fileName: created.fileName || blob.fileName });
        const docs = documentCorrections(attachments);
        const all = [...allValuesAsCorrections(batch.rows, draft, DIALOG_FIELDS), ...docs];
        // WLService validates while saving corrections (→ Validated); /validate only accepts Parsed.
        let v = all.length ? await realEstateOcrApi.submitCorrections(created.id, all) : await realEstateOcrApi.validate(created.id);
        if (v.id === '' || v.rows.length === 0) v = await realEstateOcrApi.get(created.id);
        setBatch((cur) => (cur ? { ...cur, id: created.id } : cur));
        finish(await importNow(v, created.id), created.id, docCount);
        return;
      }
      // One call: corrections (+ attached files, saved to bookings) → validate → approve → import.
      const corrections = [...buildCorrections(batch.rows, draft), ...documentCorrections(attachments)];
      let b = await realEstateOcrApi.import(batch.id, chosenProject || null, corrections);
      if (b.id === '' || b.rows.length === 0) b = await realEstateOcrApi.get(batch.id);
      finish(b, batch.id, docCount);
    } catch (e) {
      setError(message(e, 'The data could not be submitted. Please try again.'));
    } finally {
      setBusy(null);
      setConfirming(false);
    }
  };

  const edit = (key: string, field: OcrField, value: string) => setDraft((d) => ({ ...d, [key]: { ...d[key], [field]: value } }));
  const attach = (key: string, a: RowAttachment) => setAttachments((m) => ({ ...m, [key]: [...(m[key] ?? []), a] }));
  const unattach = (key: string, i: number) => setAttachments((m) => ({ ...m, [key]: (m[key] ?? []).filter((_, j) => j !== i) }));
  const analysed = !!batch && batch.status !== 'Uploaded';

  return (
    <RealEstateLayout title={t('Ledger OCR')} feature="OCR" crumbs={[[null, t('Ledger OCR')]]}
      intro={t('Upload a photo of a ledger page, check every row, then import it. Nothing is added until you press OK.')}>
      <div className="re-split">
        <section className="re-card" aria-labelledby="re-ocr-up">
          <h2 id="re-ocr-up">{t('1. Upload')}</h2>
          <ol className="re-steps">
            <li>{t('Upload a clear, well-lit photo of one ledger page (JPG, PNG or WebP).')}</li>
            <li>{t('It is read automatically and every transaction is shown, one customer at a time. Correct anything that is wrong, attach documents, and submit.')}</li>
            <li>{t('Press Submit, choose the project and press OK: the rows are imported in one step.')}</li>
          </ol>
          <BlobUploadField key={fieldKey} label={t('Ledger file')} purpose="OcrLedger" localOnly={STATIC} disabled={saved || busy !== null} onFile={chooseFile} onUploaded={setBlob} />
          {blob && !saved && !STATIC && (
            <p className="re-sub">{t('Input type: {type}', { type: t(INPUT_LABEL[ocrInputType(blob.contentType)]) })}</p>
          )}
          {alreadyImported && !saved && (
            <p className="f-alert f-alert-error" role="alert">
              {t('This file was already imported (batch {id}). The same ledger page can be imported only once.', { id: String(alreadyImported.id) })}
            </p>
          )}
          {error && !open && <p className="f-alert f-alert-error" role="alert">{error}</p>}
          {!analysed && !localSaved && (
            <button type="button" className="btn btn-primary" disabled={(DIRECT ? !file : !blob) || busy !== null || (!!alreadyImported && !saved)} onClick={() => void analyse()}>
              {busy === 'analyse' ? t('Analysing the ledger…') : t('Analyse ledger')}
            </button>
          )}
          {busy === 'analyse' && <p className="re-sub" aria-live="polite">{t('Reading the ledger page can take up to a minute or two. Please keep this page open.')}</p>}
        </section>

        <section className="re-card" aria-labelledby="re-ocr-res" aria-live="polite">
          <h2 id="re-ocr-res">{t('2. Analysis')}</h2>
          {localSaved ? (
            <div className="re-local-saved">
              <p className="f-alert f-alert-info">
                {t('Saved on this device. There is no backend yet, so nothing was sent. Download the JSON to keep a copy or to send it later.')}
              </p>
              <dl className="re-facts">
                <div><dt>{t('File')}</dt><dd>{localSaved.fileName}</dd></div>
                <div><dt>{t('Rows found')}</dt><dd>{localSaved.rows.length}</dd></div>
                <div><dt>{t('Documents')}</dt><dd>{localSaved.rows.reduce((n, r) => n + r.documents.length, 0)}</dd></div>
              </dl>
              <div className="re-actions">
                <button type="button" className="btn btn-primary" onClick={() => downloadLocalImport(localSaved)}>⬇ {t('Download JSON')}</button>
                <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>{t('Show analysis')}</button>
                <button type="button" className="btn btn-outline" onClick={startOver}>{t('New import')}</button>
              </div>
            </div>
          ) : !batch ? <p className="re-sub">{t('After the upload, choose “Analyse ledger”. The result opens in a popup.')}</p> : (
            <>
              <dl className="re-facts">
                {saved && <div><dt>{t('Batch ID')}</dt><dd>{String(batch.id)}</dd></div>}
                <div><dt>{t('File')}</dt><dd>{batch.fileName || blob?.fileName}</dd></div>
                <div><dt>{t('Status')}</dt><dd><RealEstateStatusBadge status={String(batch.status)} /></dd></div>
                {analysed && <div><dt>{t('Rows found')}</dt><dd>{batch.rows.length}</dd></div>}
              </dl>
              <div className="re-actions">
                {analysed && <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>{t('Show analysis')}</button>}
              </div>
            </>
          )}
        </section>
      </div>

      {!STATIC && (
        <UnfinishedImports batches={myBatches.data ?? []} currentId={open ? batch?.id ?? null : null} onChanged={myBatches.reload}
          onContinue={(b) => void continueBatch(b)} opening={opening} />
      )}

      {open && batch && (
        <OcrAnalysisDialog
          batch={batch} fileName={file?.name || batch.fileName || blob?.fileName || ''}
          draft={draft} attachments={attachments} editable={isEditable(batch)} pending={busy === 'submit'} error={error}
          onEdit={edit} onAttach={attach} onRemoveAttachment={unattach}
          onSubmit={() => { setError(''); if (STATIC) void submit(); else setConfirming(true); }} onClose={() => { setOpen(false); setError(''); }} localFiles={STATIC}
        />
      )}
      <ConfirmDialog
        open={confirming && !!batch}
        title={t('Submit and import?')}
        confirmLabel={t('OK')}
        pending={busy === 'submit'}
        confirmDisabled={!chosenProject}
        onConfirm={() => void submit()}
        onCancel={() => setConfirming(false)}
      >
        <p>{t('Are you sure you want to submit? All {n} transactions will be imported: customers, plots and bookings are found or created, and the payments are recorded.', { n: batch?.rows.length ?? 0 })}</p>
        <SelectInput label={t('Project')} required value={chosenProject} onChange={(e) => setProjectId(e.target.value)}
          placeholder={projects.loading ? t('Loading projects…') : t('Choose a project')} options={projectOptions}
          hint={t('New customers, plots and bookings from this page are added to this project.')} />
        {projects.error && <p className="f-alert f-alert-error">{t('Projects could not be loaded. Close this and try again.')}</p>}
        {projects.data && projectOptions.length === 0 && <p className="f-alert f-alert-info">{t('Add a project under Projects and plots first.')}</p>}
        {busy === 'submit' && <p className="re-sub" aria-live="polite">{t('Importing… please keep this page open.')}</p>}
      </ConfirmDialog>
    </RealEstateLayout>
  );
}
