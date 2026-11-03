/** Previous / next pager. Uses the server total when it is known. */
import { useT } from '../../../i18n/language.ts';

export default function Pager({ page, pageSize, total, count, onPage }: { page: number; pageSize: number; total: number | null; count: number; onPage: (p: number) => void }) {
  const t = useT();
  const last = total !== null ? Math.max(1, Math.ceil(total / pageSize)) : null;
  const hasNext = last !== null ? page < last : count >= pageSize;
  if (page <= 1 && !hasNext) return null;
  return (
    <nav className="re-pager" aria-label={t('Pagination')}>
      <button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>← {t('Previous')}</button>
      <span aria-live="polite">{last !== null ? t('Page {page} of {last}', { page, last }) : t('Page {page}', { page })}</span>
      <button type="button" className="btn btn-outline" disabled={!hasNext} onClick={() => onPage(page + 1)}>{t('Next')} →</button>
    </nav>
  );
}
