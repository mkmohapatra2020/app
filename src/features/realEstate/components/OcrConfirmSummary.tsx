/** Summary shown before approving or importing: rows, the three totals (separately), issues. */
import { useT } from '../../../i18n/language.ts';
import type { OcrBatch, OcrDraft } from '../types/ocrTypes.ts';
import { money } from '../utils/format.ts';
import { batchBlockers, batchTotals } from '../utils/ocr.ts';

export default function OcrConfirmSummary({ batch, draft }: { batch: OcrBatch; draft: OcrDraft }) {
  const t = useT();
  const totals = batchTotals(batch, draft);
  const b = batchBlockers(batch, draft, t);
  return (
    <dl className="re-confirm-summary" data-testid="ocr-confirm-summary">
      <div><dt>{t('Rows')}</dt><dd>{totals.rows}</dd></div>
      <div className="re-amount-total"><dt>{t('Total received')}</dt><dd>{money(totals.totalReceived)}</dd></div>
      <div className="re-amount-commission"><dt>{t('Total commission')}</dt><dd>{money(totals.totalCommission)}</dd></div>
      <div className="re-amount-property"><dt>{t('Total property amount')}</dt><dd>{money(totals.totalProperty)}</dd></div>
      <div><dt>{t('Validation issues')}</dt><dd>{b.validationErrors}{b.warnings ? ` (+${t('{n} warnings', { n: b.warnings })})` : ''}</dd></div>
      <div><dt>{t('Unmatched rows')}</dt><dd>{b.unmatched}</dd></div>
    </dl>
  );
}
