/** /real-estate/ocr/new — upload a ledger file, create a batch, then parse it. */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { useToast } from '../../../context/ToastContext.jsx';
import { realEstateOcrApi } from '../api/realEstateOcrApi.ts';
import { ocrInputType } from '../api/realEstateUpload.ts';
import { InlineError } from '../components/ApiStateView.tsx';
import BlobUploadField from '../components/BlobUploadField.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import RealEstateStatusBadge from '../components/RealEstateStatusBadge.tsx';
import { useRealEstateMutation } from '../hooks/useRealEstateQuery.ts';
import type { OcrBatch } from '../types/ocrTypes.ts';
import type { StoredBlob } from '../types/realEstateTypes.ts';

const INPUT_LABEL: Record<string, string> = { ScannedLedgerPage: 'Scanned ledger page', Pdf: 'PDF', Excel: 'Excel' };

export default function OcrUploadPage() {
  const t = useT();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [blob, setBlob] = useState<StoredBlob | null>(null);
  const [batch, setBatch] = useState<OcrBatch | null>(null);
  const create = useRealEstateMutation(realEstateOcrApi.create);
  const parse = useRealEstateMutation(realEstateOcrApi.parse);
  const batchUrl = batch ? `${RE_ROOT}/ocr/${encodeURIComponent(String(batch.id))}` : '';

  const start = async () => {
    if (!blob) return;
    const created = await create.run(blob);
    if (created && created.id !== '') { setBatch(created); toast(t('Import batch created')); }
  };
  const parseNow = async () => {
    if (!batch) return;
    const parsed = await parse.run(batch.id);
    if (parsed) { toast(t('Rows extracted — please review')); navigate(batchUrl); }
  };

  return (
    <RealEstateLayout title={t('Import a ledger page')} feature="OCR" crumbs={[[`${RE_ROOT}/ocr`, t('Ledger OCR')], [null, t('New import')]]}
      intro={t('Nothing is added to the ledger until you review, approve and import the rows.')}>
      <div className="re-split">
        <section className="re-card" aria-labelledby="re-ocr-up">
          <h2 id="re-ocr-up">{t('1. Upload')}</h2>
          <ol className="re-steps">
            <li>{t('Upload a clear, well-lit photo of one ledger page, a PDF, or an Excel sheet.')}</li>
            <li>{t('Extract rows, then check and correct every value.')}</li>
            <li>{t('Validate, approve, and import. Nothing is saved to the ledger until you import.')}</li>
          </ol>
          <BlobUploadField label={t('Ledger file')} purpose="OcrLedger" disabled={!!batch} onUploaded={setBlob} />
          {blob && !batch && (
            <p className="re-sub">{t('Input type: {type}', { type: t(INPUT_LABEL[ocrInputType(blob.contentType)]) })}</p>
          )}
          <InlineError error={create.error} />
          {!batch && (
            <button type="button" className="btn btn-primary" disabled={!blob || create.pending} onClick={() => void start()}>
              {create.pending ? t('Creating…') : t('Create import batch')}
            </button>
          )}
        </section>

        <section className="re-card" aria-labelledby="re-ocr-res" aria-live="polite">
          <h2 id="re-ocr-res">{t('2. Batch')}</h2>
          {!batch ? <p className="re-sub">{t('The batch appears here once the file is uploaded and the batch is created.')}</p> : (
            <>
              <dl className="re-facts">
                <div><dt>{t('Batch ID')}</dt><dd>{String(batch.id)}</dd></div>
                <div><dt>{t('File')}</dt><dd>{batch.fileName || blob?.fileName}</dd></div>
                <div><dt>{t('Status')}</dt><dd><RealEstateStatusBadge status={String(batch.status)} /></dd></div>
              </dl>
              <InlineError error={parse.error} />
              <div className="re-actions">
                <button type="button" className="btn btn-primary" disabled={parse.pending} onClick={() => void parseNow()}>
                  {parse.pending ? t('Please wait…') : t('Extract rows (GPT-4o Vision)')}
                </button>
                <Link className="btn btn-outline" to={batchUrl}>{t('Open batch')}</Link>
              </div>
            </>
          )}
        </section>
      </div>
    </RealEstateLayout>
  );
}
