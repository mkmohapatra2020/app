/**
 * Editable review of GPT-4o Vision extraction. Each cell shows the current value plus a
 * marker for: extracted, corrected (saved), edited (unsaved), validation error, low
 * confidence. Each row shows whether the backend matched it to an existing booking.
 * Customer name / plot number are matching hints, never ids.
 */
import { Link } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { OCR_FIELDS, OCR_FIELD_LABELS, type OcrDraft, type OcrField, type OcrRow } from '../types/ocrTypes.ts';
import { cellState, cellValue, type CellState } from '../utils/ocr.ts';
import { RE_ROOT } from './RealEstateLayout.tsx';

const STATE_TEXT: Record<CellState, string> = {
  extracted: 'Extracted',
  corrected: 'Corrected',
  edited: 'Edited — not saved',
  error: 'Validation error',
  lowConfidence: 'Low confidence',
};

const MATCH_TEXT: Record<OcrRow['match']['status'], string> = {
  Matched: 'Matched to booking',
  UnmatchedCustomer: 'Customer not found',
  UnmatchedPlot: 'Plot not found',
  Unmatched: 'No matching booking',
  Ambiguous: 'More than one possible booking',
  Pending: 'Not matched yet',
};

const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`);
// Always text: a date/number input would blank out a misread value (e.g. "1O000") and hide it from the reviewer.
const inputMode = (f: OcrField) => (f === 'amount' ? 'decimal' as const : undefined);
const placeholder = (f: OcrField) => (f === 'transactionDate' ? 'YYYY-MM-DD' : undefined);

interface Props {
  rows: OcrRow[];
  draft: OcrDraft;
  editable: boolean;
  onEdit: (rowId: string, field: OcrField, value: string) => void;
}

export function OcrLegend() {
  const t = useT();
  return (
    <ul className="re-legend" aria-label={t('Legend')}>
      {(Object.keys(STATE_TEXT) as CellState[]).map((s) => <li key={s}><span className={`re-cell-dot re-cell-${s}`} aria-hidden="true" />{t(STATE_TEXT[s])}</li>)}
    </ul>
  );
}

export default function OcrReviewTable({ rows, draft, editable, onEdit }: Props) {
  const t = useT();
  return (
    <div className="re-table-wrap" role="region" aria-label={t('Extracted ledger rows')} tabIndex={0}>
      <table className="re-table re-ocr-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">{t('Match')}</th>
            {OCR_FIELDS.map((f) => <th scope="col" key={f}>{t(OCR_FIELD_LABELS[f])}{(f === 'customerName' || f === 'plotNumber') && <sup title={t('Matching hint, not an id')}> *</sup>}</th>)}
            <th scope="col" className="num">{t('Confidence')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowKey = String(row.id);
            const rowIssues = row.issues.filter((i) => !i.field);
            return (
              <tr key={rowKey} className={row.issues.length ? 're-row-error' : undefined}>
                <th scope="row">{row.rowNumber}</th>
                <td data-label={t('Match')}>
                  <span className={`re-badge re-badge-${row.match.status === 'Matched' ? 'ok' : row.match.status === 'Pending' ? 'muted' : 'bad'}`}>{t(MATCH_TEXT[row.match.status])}</span>
                  {row.match.status === 'Matched' && row.match.bookingId !== null && (
                    <Link className="re-match-link" to={`${RE_ROOT}/bookings/${encodeURIComponent(String(row.match.bookingId))}`}>{row.match.label || t('View booking')}</Link>
                  )}
                  {rowIssues.map((i) => <small key={i.message} className="f-error">{t(i.message)}</small>)}
                </td>
                {OCR_FIELDS.map((f) => {
                  const cell = row.cells[f];
                  const d = draft[rowKey]?.[f];
                  const state = cellState(row, f, d);
                  const issue = row.issues.find((i) => i.field === f);
                  const value = cellValue(cell, d);
                  const label = t('Row {n} {field}', { n: row.rowNumber, field: t(OCR_FIELD_LABELS[f]) });
                  return (
                    <td key={f} data-label={t(OCR_FIELD_LABELS[f])} className={`re-cell re-cell-${state}`} data-state={state}>
                      {editable ? (
                        <input
                          className="f-input" type="text" value={value} aria-label={label}
                          aria-invalid={state === 'error'} inputMode={inputMode(f)} placeholder={placeholder(f)}
                          onChange={(e) => onEdit(rowKey, f, e.target.value)}
                        />
                      ) : <span>{value || '—'}</span>}
                      <small className="re-cell-meta">
                        <span className={`re-cell-dot re-cell-${state}`} aria-hidden="true" />{t(STATE_TEXT[state])}
                        {(state === 'corrected' || state === 'edited') && cell.extracted !== value && <> · {t('read as “{value}”', { value: cell.extracted || t('blank') })}</>}
                      </small>
                      {issue && <small className="f-error">{t(issue.message)}</small>}
                    </td>
                  );
                })}
                <td data-label={t('Confidence')} className={`num ${row.confidence !== null && row.confidence < 0.8 ? 're-low' : ''}`}>{pct(row.confidence)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
