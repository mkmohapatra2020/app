/**
 * Editable review of extracted ledger rows. Each cell shows the current value plus a
 * marker: extracted, corrected (saved), edited (unsaved), validation error, low confidence;
 * and per-field confidence when the backend reports it. Every amount column says where it
 * is read from. Customer name / plot number are matching hints, never ids.
 */
import { Link } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { OCR_AMOUNT_FIELDS, OCR_FIELDS, OCR_FIELD_HELP, OCR_FIELD_LABELS, type OcrDraft, type OcrField, type OcrRow } from '../types/ocrTypes.ts';
import { cellInputId, cellState, cellValue, rowKey, type CellState } from '../utils/ocr.ts';
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
const TONE: Partial<Record<OcrField, string>> = { totalAmountReceived: 'total', commissionAmount: 'commission', propertyAmount: 'property' };

interface Props {
  rows: OcrRow[];
  draft: OcrDraft;
  editable: boolean;
  onEdit: (rowKey: string, field: OcrField, value: string) => void;
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
            {OCR_FIELDS.map((f) => (
              <th scope="col" key={f} className={TONE[f] ? `re-col-${TONE[f]}` : undefined}>
                {t(OCR_FIELD_LABELS[f])}
                {OCR_FIELD_HELP[f] && <small className="re-th-help">{t(OCR_FIELD_HELP[f] as string)}</small>}
              </th>
            ))}
            <th scope="col" className="num">{t('Confidence')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const rowIssues = row.issues.filter((i) => !i.field);
            return (
              <tr key={key} className={row.issues.some((i) => i.severity === 'Error') ? 're-row-error' : undefined}>
                <th scope="row">{row.rowNumber}</th>
                <td data-label={t('Match')}>
                  <span className={`re-badge re-badge-${row.match.status === 'Matched' ? 'ok' : row.match.status === 'Pending' ? 'muted' : 'bad'}`}>{t(MATCH_TEXT[row.match.status])}</span>
                  {row.match.status === 'Matched' && row.match.bookingId !== null && (
                    <Link className="re-match-link" to={`${RE_ROOT}/bookings/${encodeURIComponent(String(row.match.bookingId))}`}>{row.match.label || t('View booking')}</Link>
                  )}
                  {rowIssues.map((i) => <small key={`${i.code}${i.message}`} className={i.severity === 'Error' ? 'f-error' : 're-warn'}>{t(i.message)}</small>)}
                </td>
                {OCR_FIELDS.map((f) => {
                  const cell = row.cells[f];
                  const d = draft[key]?.[f];
                  const state = cellState(row, f, d);
                  const issue = row.issues.find((i) => i.field === f);
                  const value = cellValue(cell, d);
                  const isAmount = OCR_AMOUNT_FIELDS.includes(f);
                  const label = t('Row {n} {field}', { n: row.rowNumber, field: t(OCR_FIELD_LABELS[f]) });
                  const id = cellInputId(row.index, f);
                  return (
                    <td key={f} data-label={t(OCR_FIELD_LABELS[f])} className={`re-cell re-cell-${state}${TONE[f] ? ` re-col-${TONE[f]}` : ''}`} data-state={state}>
                      {editable ? (
                        // Always text: a number/date input would blank out a misread value (e.g. "1O000").
                        <input
                          id={id} className="f-input" type="text" value={value} aria-label={label}
                          aria-invalid={state === 'error'} aria-describedby={issue ? `${id}-err` : undefined}
                          inputMode={isAmount ? 'decimal' : undefined} placeholder={f === 'transactionDate' ? 'YYYY-MM-DD' : isAmount ? '—' : undefined}
                          onChange={(e) => onEdit(key, f, e.target.value)}
                        />
                      ) : <span id={id} tabIndex={-1}>{value || '—'}</span>}
                      <small className="re-cell-meta">
                        <span className={`re-cell-dot re-cell-${state}`} aria-hidden="true" />{t(STATE_TEXT[state])}
                        {cell.confidence !== null && <> · {pct(cell.confidence)}</>}
                        {(state === 'corrected' || state === 'edited') && cell.extracted !== value && <> · {t('read as “{value}”', { value: cell.extracted || t('blank') })}</>}
                      </small>
                      {issue && <small id={`${id}-err`} className={issue.severity === 'Error' ? 'f-error' : 're-warn'}>{issue.code && <b>{issue.code}: </b>}{t(issue.message)}</small>}
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
