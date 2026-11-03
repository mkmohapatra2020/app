/**
 * /real-estate/ocr — OCR import batches. Uses the batch list when the API has one;
 * otherwise (404) a batch can be opened by its ID. Status filter lives in the URL.
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateOcrApi } from '../api/realEstateOcrApi.ts';
import { EmptyView, ErrorView, LoadingState } from '../components/ApiStateView.tsx';
import { Input, SelectInput } from '../components/FormFields.tsx';
import Pager from '../components/Pager.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import RealEstateStatusBadge from '../components/RealEstateStatusBadge.tsx';
import { useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import { OCR_STATUSES, type OcrBatch } from '../types/ocrTypes.ts';
import { date } from '../utils/format.ts';

const PAGE_SIZE = 20;
const ACTION: Record<string, string> = { Uploaded: 'Extract rows', Parsed: 'Review', Validated: 'Review and approve', Approved: 'Import', Imported: 'View', Rejected: 'View' };
const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`);

export default function OcrBatchesPage() {
  const t = useT();
  const access = useRealEstateAccess();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const setStatus = (v: string) => setParams((cur) => { const n = new URLSearchParams(cur); if (v) n.set('status', v); else n.delete('status'); return n; }, { replace: true });
  const [page, setPage] = useState(1);
  const list = useRealEstateQuery((s) => realEstateOcrApi.list({ page, pageSize: PAGE_SIZE, status }, s), [page, status], { enabled: access.has('OCR') });
  const [batchId, setBatchId] = useState('');
  const noList = list.error?.kind === 'notFound';
  const open = (e: FormEvent) => { e.preventDefault(); if (batchId.trim()) navigate(`${RE_ROOT}/ocr/${encodeURIComponent(batchId.trim())}`); };
  const url = (b: OcrBatch) => `${RE_ROOT}/ocr/${encodeURIComponent(String(b.id))}`;

  return (
    <RealEstateLayout title={t('Ledger OCR')} feature="OCR" crumbs={[[null, t('Ledger OCR')]]}
      intro={t('Photograph a paper ledger (hisab khata). GPT-4o Vision reads it; you review every row before anything is imported.')}
      actions={<Link className="btn btn-primary" to={`${RE_ROOT}/ocr/new`}>{t('New import')}</Link>}>
      <section className="re-card" aria-labelledby="re-batches">
        <div className="re-card-head">
          <h2 id="re-batches">{t('Import batches')}</h2>
          {!noList && <SelectInput label={t('Status')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder={t('All statuses')} options={OCR_STATUSES.map((s) => ({ value: s, label: t(s) }))} />}
        </div>
        {list.loading && <LoadingState />}
        {list.error && !noList && <ErrorView error={list.error} onRetry={list.reload} />}
        {noList && (
          <form className="re-search" onSubmit={open} aria-label={t('Open a batch')}>
            <Input label={t('Batch ID')} value={batchId} onChange={(e) => setBatchId(e.target.value)} hint={t('The batch list isn’t available yet — enter the batch ID to open it.')} />
            <button type="submit" className="btn btn-outline" disabled={!batchId.trim()}>{t('Open')}</button>
          </form>
        )}
        {list.data && list.data.items.length === 0 && !list.loading && (
          <EmptyView title={t('No import batches yet')}><Link to={`${RE_ROOT}/ocr/new`}>{t('Upload a ledger photo to start.')}</Link></EmptyView>
        )}
        {list.data && list.data.items.length > 0 && (
          <>
            <div className="re-table-wrap" role="region" aria-label={t('Import batches')} tabIndex={0}>
              <table className="re-table">
                <thead>
                  <tr>
                    <th scope="col">{t('Batch ID')}</th><th scope="col">{t('File')}</th><th scope="col">{t('Status')}</th>
                    <th scope="col" className="num">{t('Confidence')}</th><th scope="col" className="num">{t('Rows')}</th><th scope="col" className="num">{t('Issues')}</th>
                    <th scope="col">{t('Updated')}</th><th scope="col"><span className="sr-only">{t('Actions')}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((b) => (
                    <tr key={String(b.id)}>
                      <td data-label={t('Batch ID')}><Link to={url(b)}>{String(b.id)}</Link></td>
                      <td data-label={t('File')}>{b.fileName || '—'}</td>
                      <td data-label={t('Status')}><RealEstateStatusBadge status={String(b.status)} /></td>
                      <td data-label={t('Confidence')} className="num">{pct(b.confidence)}</td>
                      <td data-label={t('Rows')} className="num">{b.rowCount || '—'}</td>
                      <td data-label={t('Issues')} className={`num ${b.issueCount ? 're-low' : ''}`}>{b.issueCount}</td>
                      <td data-label={t('Updated')}>{date(b.updatedAt || b.createdAt)}</td>
                      <td><Link className="btn btn-outline btn-sm" to={url(b)}>{t(ACTION[String(b.status)] ?? 'View')}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pageSize={PAGE_SIZE} total={list.data.total} count={list.data.items.length} onPage={setPage} />
          </>
        )}
      </section>
    </RealEstateLayout>
  );
}
