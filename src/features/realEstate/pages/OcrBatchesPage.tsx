/** Upload a paper ledger photo → create an OCR batch → open its review. */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext.jsx';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateOcrApi } from '../api/realEstateOcrApi.ts';
import BlobUploadField from '../components/BlobUploadField.tsx';
import { EmptyView, ErrorView, InlineError, LoadingState } from '../components/ApiStateView.tsx';
import { SelectInput } from '../components/FormFields.tsx';
import Pager from '../components/Pager.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import RealEstateStatusBadge from '../components/RealEstateStatusBadge.tsx';
import { useRealEstateMutation, useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import { OCR_STATUSES } from '../types/ocrTypes.ts';
import type { StoredBlob } from '../types/realEstateTypes.ts';
import { date } from '../utils/format.ts';

const PAGE_SIZE = 20;

export default function OcrBatchesPage() {
  const t = useT();
  const access = useRealEstateAccess();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const list = useRealEstateQuery((s) => realEstateOcrApi.list({ page, pageSize: PAGE_SIZE, status }, s), [page, status], { enabled: access.has('OCR') });
  const [blob, setBlob] = useState<StoredBlob | null>(null);
  const create = useRealEstateMutation(realEstateOcrApi.create);

  const startBatch = async () => {
    if (!blob) return;
    const batch = await create.run(blob, access.access.partnerId);
    if (batch && batch.id !== '') {
      toast(t('Ledger image received — ready to extract'));
      navigate(`${RE_ROOT}/ocr/${encodeURIComponent(String(batch.id))}`);
    }
  };

  return (
    <RealEstateLayout title={t('Ledger import (OCR)')} feature="OCR" crumbs={[[null, t('OCR import')]]}
      intro={t('Photograph a paper ledger (hisab khata). GPT-4o Vision reads it; you review every row before anything is imported.')}>
      <div className="re-split">
        <section className="re-card" aria-labelledby="re-batches">
          <div className="re-card-head">
            <h2 id="re-batches">{t('Import batches')}</h2>
            <SelectInput label={t('Status')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder={t('All statuses')} options={OCR_STATUSES.map((s) => ({ value: s, label: t(s) }))} />
          </div>
          {list.loading && <LoadingState />}
          {list.error && <ErrorView error={list.error} onRetry={list.reload} />}
          {list.data && list.data.items.length === 0 && !list.loading && <EmptyView title={t('No import batches yet')}>{t('Upload a ledger photo to start.')}</EmptyView>}
          {list.data && list.data.items.length > 0 && (
            <>
              <div className="re-table-wrap" role="region" aria-label={t('Import batches')} tabIndex={0}>
                <table className="re-table">
                  <thead><tr><th scope="col">{t('Uploaded')}</th><th scope="col">{t('File')}</th><th scope="col" className="num">{t('Rows')}</th><th scope="col">{t('Status')}</th></tr></thead>
                  <tbody>
                    {list.data.items.map((b) => (
                      <tr key={String(b.id)}>
                        <td data-label={t('Uploaded')}><Link to={`${RE_ROOT}/ocr/${encodeURIComponent(String(b.id))}`}>{date(b.createdAt)}</Link></td>
                        <td data-label={t('File')}>{b.fileName || t('Batch {id}', { id: String(b.id) })}</td>
                        <td data-label={t('Rows')} className="num">{b.rowCount || '—'}</td>
                        <td data-label={t('Status')}><RealEstateStatusBadge status={String(b.status)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={page} pageSize={PAGE_SIZE} total={list.data.total} count={list.data.items.length} onPage={setPage} />
            </>
          )}
        </section>

        <section className="re-card" aria-labelledby="re-new-batch">
          <h2 id="re-new-batch">{t('New import')}</h2>
          <ol className="re-steps">
            <li>{t('Upload a clear, well-lit photo of one ledger page.')}</li>
            <li>{t('Extract rows, then check and correct every value.')}</li>
            <li>{t('Validate, approve, and import. Nothing is saved to the ledger until you import.')}</li>
          </ol>
          <BlobUploadField label={t('Ledger photo')} purpose="OcrLedger" onUploaded={setBlob} />
          <InlineError error={create.error} />
          <button type="button" className="btn btn-primary" disabled={!blob || create.pending} onClick={() => void startBatch()}>
            {create.pending ? t('Creating…') : t('Create import batch')}
          </button>
        </section>
      </div>
    </RealEstateLayout>
  );
}
