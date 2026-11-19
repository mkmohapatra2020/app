/**
 * /real-estate/ocr — the user's OCR import batches (GET /realestate/ocr/batches), plus any
 * created or opened in this session that the list does not have yet. 10 per page.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { realEstateOcrApi } from '../api/realEstateOcrApi.ts';
import { EmptyView, LoadingState } from '../components/ApiStateView.tsx';
import { useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import Pager from '../components/Pager.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import RealEstateStatusBadge from '../components/RealEstateStatusBadge.tsx';
import { recentBatches, type RecentBatch } from '../utils/recent.ts';

const PAGE_SIZE = 10;
const ACTION: Record<string, string> = { Uploaded: 'Extract rows', Parsed: 'Review', Validated: 'Review and approve', Approved: 'Import', Imported: 'View', Rejected: 'View' };

export default function OcrBatchesPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const session = recentBatches();
  // Saved batches from the backend; if that fails (e.g. not deployed yet) the session list still shows.
  const saved = useRealEstateQuery((s) => realEstateOcrApi.list(s), []);
  const recent: RecentBatch[] = useMemo(() => {
    const fromApi: RecentBatch[] = (saved.data ?? []).map((b) => ({ id: b.id, fileName: b.fileName, status: String(b.status), createdAt: b.updatedAt || b.createdAt }));
    const seen = new Set(fromApi.map((b) => String(b.id)));
    return [...fromApi, ...session.filter((b) => !seen.has(String(b.id)))];
  }, [saved.data, session]);
  const lastPage = Math.max(1, Math.ceil(recent.length / PAGE_SIZE));
  const current = Math.min(page, lastPage);
  const shown = recent.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
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
          <>
          <div className="re-table-wrap" role="region" aria-label={t('Import batches')} tabIndex={0}>
            <table className="re-table">
              <thead>
                <tr><th scope="col">{t('Batch ID')}</th><th scope="col">{t('File')}</th><th scope="col">{t('Status')}</th><th scope="col">{t('Action')}</th></tr>
              </thead>
              <tbody>
                {shown.map((b) => (
                  <tr key={String(b.id)}>
                    <td data-label={t('Batch ID')}><Link to={url(b)}>{String(b.id)}</Link></td>
                    <td data-label={t('File')}>{b.fileName || 'N/A'}</td>
                    <td data-label={t('Status')}><RealEstateStatusBadge status={b.status} /></td>
                    <td data-label={t('Action')}><Link className="btn btn-outline btn-sm" to={url(b)}>{t(ACTION[b.status] ?? 'View')}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={current} pageSize={PAGE_SIZE} total={recent.length} count={shown.length} onPage={setPage} />
          </>
        )}
      </section>
    </RealEstateLayout>
  );
}
