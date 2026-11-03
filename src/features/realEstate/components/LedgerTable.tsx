/** Ledger summary (agreed / paid / outstanding) and the transaction history table. */
import { useT } from '../../../i18n/language.ts';
import type { LedgerTotals, LedgerTransaction } from '../types/realEstateTypes.ts';
import { date, money } from '../utils/format.ts';
import RealEstateStatusBadge from './RealEstateStatusBadge.tsx';

export function LedgerSummary({ totals }: { totals: LedgerTotals }) {
  const t = useT();
  const due = totals.outstanding > 0;
  return (
    <dl className="re-stats re-stats-3" aria-label={t('Ledger summary')}>
      <div className="re-stat"><dt>{t('Total agreed value')}</dt><dd>{money(totals.agreedValue)}</dd></div>
      <div className="re-stat re-stat-good"><dt>{t('Total paid')}</dt><dd>{money(totals.totalPaid)}</dd></div>
      <div className={`re-stat ${due ? 're-stat-due' : 're-stat-good'}`}>
        <dt>{totals.outstanding < 0 ? t('Overpaid') : t('Outstanding')}</dt>
        <dd>{money(Math.abs(totals.outstanding))}</dd>
      </div>
    </dl>
  );
}

export default function LedgerTable({ transactions }: { transactions: LedgerTransaction[] }) {
  const t = useT();
  const rows = [...transactions].sort((a, b) => String(a.transactionDate).localeCompare(String(b.transactionDate)));
  return (
    <div className="re-table-wrap" role="region" aria-label={t('Transaction history')} tabIndex={0}>
      <table className="re-table">
        <thead>
          <tr><th scope="col">{t('Date')}</th><th scope="col" className="num">{t('Amount')}</th><th scope="col">{t('Mode')}</th><th scope="col">{t('Reference')}</th><th scope="col">{t('Remarks')}</th></tr>
        </thead>
        <tbody>
          {rows.map((tx) => (
            <tr key={String(tx.id)}>
              <td data-label={t('Date')}>{date(tx.transactionDate)}</td>
              <td data-label={t('Amount')} className="num re-amount-in">{money(tx.amount)}</td>
              <td data-label={t('Mode')}><RealEstateStatusBadge status={tx.paymentMode || '—'} /></td>
              <td data-label={t('Reference')}>{tx.referenceNumber || '—'}</td>
              <td data-label={t('Remarks')}>{tx.remarks || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
