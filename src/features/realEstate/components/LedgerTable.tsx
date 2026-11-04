/**
 * Ledger summary and transaction history. Total received, commission and property amount
 * are shown in their own columns/cards and never combined.
 */
import { useT } from '../../../i18n/language.ts';
import type { LedgerTotals, LedgerTransaction } from '../types/realEstateTypes.ts';
import { date, money } from '../utils/format.ts';
import RealEstateStatusBadge from './RealEstateStatusBadge.tsx';

const opt = (n: number | null) => (n === null ? '—' : money(n));

/** `agreedKnown` false: the agreed value isn't available, so agreed / outstanding are not shown. */
export function LedgerSummary({ totals, agreedKnown = true }: { totals: LedgerTotals; agreedKnown?: boolean }) {
  const t = useT();
  const due = totals.outstanding > 0;
  return (
    <dl className="re-stats re-stats-ledger" aria-label={t('Ledger summary')}>
      {agreedKnown && <div className="re-stat"><dt>{t('Total agreed value')}</dt><dd>{money(totals.agreedValue)}</dd></div>}
      <div className="re-stat re-stat-good"><dt>{t('Total received')}</dt><dd>{money(totals.totalReceived)}</dd></div>
      <div className="re-stat re-stat-commission"><dt>{t('Total commission')}</dt><dd>{money(totals.totalCommission)}</dd></div>
      <div className="re-stat re-stat-property"><dt>{t('Total property amount')}</dt><dd>{money(totals.totalProperty)}</dd></div>
      {agreedKnown && (
        <div className={`re-stat ${due ? 're-stat-due' : 're-stat-good'}`}>
          <dt>{totals.outstanding < 0 ? t('Overpaid') : t('Outstanding')}</dt>
          <dd>{money(Math.abs(totals.outstanding))}</dd>
        </div>
      )}
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
          <tr>
            <th scope="col">{t('Date')}</th>
            <th scope="col" className="num">{t('Total received')}</th>
            <th scope="col" className="num re-col-commission">{t('Commission')}</th>
            <th scope="col" className="num re-col-property">{t('Property amount')}</th>
            <th scope="col">{t('Mode')}</th>
            <th scope="col">{t('Reference')}</th>
            <th scope="col">{t('Remarks')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tx) => (
            <tr key={String(tx.id)}>
              <td data-label={t('Date')}>{date(tx.transactionDate)}</td>
              <td data-label={t('Total received')} className="num re-amount-in">{money(tx.amount)}</td>
              <td data-label={t('Commission')} className="num re-col-commission">{opt(tx.commissionAmount)}</td>
              <td data-label={t('Property amount')} className="num re-col-property">{opt(tx.propertyAmount)}</td>
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
