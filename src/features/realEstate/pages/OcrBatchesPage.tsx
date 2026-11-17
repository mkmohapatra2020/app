/**
 * /real-estate/ocr — the user's OCR import batches (GET /realestate/ocr/batches), plus any
 * created or opened in this session that the list does not have yet. A batch can also be
 * opened by its ID.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { realEstateOcrApi } from '../api/realEstateOcrApi.ts';
import { EmptyView, LoadingState } from '../components/ApiStateView.tsx';
import { useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import { Input } from '../components/FormFields.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import RealEstateStatusBadge from '../components/RealEstateStatusBadge.tsx';
import { date } from '../utils/format.ts';
import { recentBatches, type RecentBatch } from '../utils/recent.ts';

const ACTION: Record<string, string> = { Uploaded: 'Extract rows', Parsed: 'Review', Validated: 'Review and approve', Approved: 'Import', Imported: 'View', Rejected: 'View' };

export default function OcrBatchesPage() {
  const t = useT();
  const navigate = useNavigate();
  const [batchId, setBatchId] = useState('');
  const session = recentBatches();
  // Saved batches from the backend; if that fails (e.g. not deployed yet) the session list still shows.
  const saved = useRealEstateQuery((s) => realEstateOcrApi.list(s), []);
  const recent: RecentBatch[] = useMemo(() => {
    const fromApi: RecentBatch[] = (saved.data ?? []).map((b) => ({ id: b.id, fileName: b.fileName, status: String(b.status), createdAt: b.updatedAt || b.createdAt }));
    const seen = new Set(fromApi.map((b) => String(b.id)));
    return [...fromApi, ...session.filter((b) => !seen.has(String(b.id)))];
  }, [saved.data, session]);
  const open = (e: FormEvent) => { e.preventDefault(); if (batchId.trim()) navigate(`${RE_ROOT}/ocr/${encodeURIComponent(batchId.trim())}`); };
  const url = (b: RecentBatch) => `${RE_ROOT}/ocr/${encodeURIComponent(String(b.id))}`;

  return (
    <RealEstateLayout title={t('Ledger OCR')} feature="OCR" crumbs={[[null, t('Ledger OCR')]]}
      intro={t('Photograph a paper ledger (hisab khata). It is read automatically; you review every row before anything is imported.')}
      actions={<Link className="btn btn-primary" to={`${RE_ROOT}/ocr/new`}>{t('New import')}</Link>}>
      <section className="re-card" aria-labelledby="re-batches">
        <h2 id="re-batches">{t('Your import batches')}</h2>
        {saved.loading && recent.length === 0 ? <LoadingState text={t('Loading batches…')} /> : recent.length === 0 ? (
          <EmptyView title={t('No import batches yet')}><Link to={`${RE_ROOT}/ocr/new`}>{t('Upload a ledger photo to start.')}</Link></EmptyView>
        ) : (
          <div className="re-table-wrap" role="region" aria-label={t('Import batches')} tabIndex={0}>
            <table className="re-table">
              <thead>
                <tr><th scope="col">{t('Batch ID')}</th><th scope="col">{t('File')}</th><th scope="col">{t('Status')}</th><th scope="col">{t('Updated')}</th><th scope="col"><span className="sr-only">{t('Actions')}</span></th></tr>
              </thead>
              <tbody>
                {recent.map((b) => (
                  <tr key={String(b.id)}>
                    <td data-label={t('Batch ID')}><Link to={url(b)}>{String(b.id)}</Link></td>
                    <td data-label={t('File')}>{b.fileName || '—'}</td>
                    <td data-label={t('Status')}><RealEstateStatusBadge status={b.status} /></td>
                    <td data-label={t('Updated')}>{date(b.createdAt)}</td>
                    <td><Link className="btn btn-outline btn-sm" to={url(b)}>{t(ACTION[b.status] ?? 'View')}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <h3 className="re-subhead">{t('Open a batch')}</h3>
        <form className="re-search" onSubmit={open} aria-label={t('Open a batch')}>
          <Input label={t('Batch ID')} inputMode="numeric" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
          <button type="submit" className="btn btn-outline" disabled={!batchId.trim()}>{t('Open')}</button>
        </form>
      </section>
    </RealEstateLayout>
  );
}
