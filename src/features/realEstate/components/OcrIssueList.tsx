/**
 * Validation issues with error code, message and the related row/field. Choosing an issue
 * moves focus to the affected field in the review table.
 */
import { useT } from '../../../i18n/language.ts';
import { OCR_FIELD_LABELS, type OcrRow, type OcrValidationIssue } from '../types/ocrTypes.ts';
import { cellInputId } from '../utils/ocr.ts';

export function focusIssue(issue: OcrValidationIssue) {
  if (issue.rowIndex === null || !issue.field) return;
  const el = document.getElementById(cellInputId(issue.rowIndex, issue.field));
  el?.scrollIntoView?.({ block: 'center', inline: 'center' });
  el?.focus();
}

export default function OcrIssueList({ issues, rows }: { issues: OcrValidationIssue[]; rows: OcrRow[] }) {
  const t = useT();
  if (!issues.length) return null;
  const rowNumber = (index: number | null) => rows.find((r) => r.index === index)?.rowNumber ?? (index !== null ? index + 1 : null);
  return (
    <section className="re-issues" aria-labelledby="re-issues-h">
      <h3 id="re-issues-h">{t('Validation issues ({n})', { n: issues.length })}</h3>
      <ul>
        {issues.map((i, n) => {
          const row = rowNumber(i.rowIndex);
          const where = [row !== null ? t('Row {n}', { n: row }) : '', i.field ? t(OCR_FIELD_LABELS[i.field]) : ''].filter(Boolean).join(' · ');
          const canFocus = i.rowIndex !== null && !!i.field;
          return (
            <li key={`${i.code}-${i.rowIndex}-${i.field}-${n}`} className={i.severity === 'Error' ? 're-issue-error' : 're-issue-warning'}>
              <span className={`re-badge re-badge-${i.severity === 'Error' ? 'bad' : 'warn'}`}>{t(i.severity)}</span>
              {i.code && <code className="re-issue-code">{i.code}</code>}
              <span className="re-issue-msg">{t(i.message)}</span>
              {where && (canFocus
                ? <button type="button" className="re-link-btn" onClick={() => focusIssue(i)}>{t('Go to {where}', { where })}</button>
                : <span className="re-sub">{where}</span>)}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
