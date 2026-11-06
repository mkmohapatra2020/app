/**
 * Popup shown after Azure Vision has analysed an uploaded ledger page: the screenshot on one
 * side, every extracted row as editable key → value pairs on the other. "Submit" hands the
 * edits to the page, which sends them to the backend (corrections + validation). Nothing is
 * imported into the ledger from here.
 */
import { useEffect, useId, useRef } from 'react';
import { useT } from '../../../i18n/language.ts';
import { OCR_AMOUNT_FIELDS, OCR_FIELDS, OCR_FIELD_HELP, OCR_FIELD_LABELS, type OcrBatch, type OcrDraft, type OcrField } from '../types/ocrTypes.ts';
import { allIssues, buildCorrections, cellInputId, cellState, cellValue, rowKey } from '../utils/ocr.ts';
import RealEstateStatusBadge from './RealEstateStatusBadge.tsx';

const TONE: Partial<Record<OcrField, string>> = { totalAmountReceived: 'total', commissionAmount: 'commission', propertyAmount: 'property' };
const pct = (n: number | null) => (n === null ? null : `${Math.round(n * 100)}%`);

interface Props {
  batch: OcrBatch;
  /** Local object URL of the uploaded file ('' when there is nothing to show). */
  previewUrl: string;
  /** MIME type of the uploaded file, to pick an image or PDF preview. */
  previewType: string;
  fileName: string;
  draft: OcrDraft;
  editable: boolean;
  pending: boolean;
  error: string;
  onEdit: (rowKey: string, field: OcrField, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function OcrAnalysisDialog({ batch, previewUrl, previewType, fileName, draft, editable, pending, error, onEdit, onSubmit, onClose }: Props) {
  const id = useId();
  const t = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const edits = buildCorrections(batch.rows, draft).length;
  const issues = allIssues(batch).filter((i) => i.rowIndex === null);

  // Focus moves in, Tab stays inside, Escape closes, focus returns on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = boxRef.current?.querySelector<HTMLElement>('input:not([disabled])');
    (first ?? closeRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) { e.preventDefault(); onClose(); }
      if (e.key === 'Tab' && boxRef.current) {
        const items = [...boxRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]')];
        if (!items.length) return;
        const a = items[0];
        const z = items[items.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; previous?.focus?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isImage = previewType.startsWith('image/');
  const isPdf = previewType === 'application/pdf';

  return (
    <div className="re-dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !pending) onClose(); }}>
      <div className="re-dialog re-ocr-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} ref={boxRef}>
        <div className="re-ocr-dialog-head">
          <div>
            <h2 id={`${id}-t`}>{t('Ledger analysis (Azure Vision)')}</h2>
            <p className="re-sub">{t('Check each value against the screenshot, correct anything that is wrong, then submit.')}</p>
          </div>
          <button type="button" className="re-dialog-x" ref={closeRef} onClick={onClose} disabled={pending} aria-label={t('Close')}>×</button>
        </div>

        <div className="re-ocr-dialog-body">
          <figure className="re-ocr-shot">
            {previewUrl && isImage && <img src={previewUrl} alt={t('Uploaded ledger screenshot {name}', { name: fileName })} />}
            {previewUrl && isPdf && <object data={previewUrl} type="application/pdf" aria-label={fileName}><p className="re-sub">{fileName}</p></object>}
            {(!previewUrl || (!isImage && !isPdf)) && <div className="re-ocr-shot-none"><span aria-hidden="true">📄</span><span>{fileName || t('No preview for this file')}</span></div>}
            <figcaption>
              <span className="re-file-name">{fileName}</span>
              <RealEstateStatusBadge status={String(batch.status)} />
              {pct(batch.confidence) && <span className="re-sub">{t('Confidence {n}', { n: pct(batch.confidence)! })}</span>}
            </figcaption>
          </figure>

          <div className="re-ocr-kv-list" role="region" aria-label={t('Extracted values')} tabIndex={-1}>
            {batch.error && <p className="f-alert f-alert-error" role="alert">{t('Extraction problem: {error}', { error: batch.error })}</p>}
            {issues.map((i, n) => <p key={n} className={`f-alert ${i.severity === 'Error' ? 'f-alert-error' : 'f-alert-info'}`}>{i.message}</p>)}
            {batch.rows.length === 0 && !batch.error && <p className="re-sub">{t('Azure Vision found no ledger rows on this page. Try a clearer, well-lit photo of a single page.')}</p>}
            {batch.rows.map((row) => (
              <fieldset key={rowKey(row)} className="re-ocr-kv">
                <legend>
                  {t('Row {n}', { n: row.rowNumber || row.index + 1 })}
                  {pct(row.confidence) && <span className="re-sub"> · {t('Confidence {n}', { n: pct(row.confidence)! })}</span>}
                </legend>
                <dl>
                  {OCR_FIELDS.map((f) => {
                    const state = cellState(row, f, draft[rowKey(row)]?.[f]);
                    const inputId = `dlg-${cellInputId(row.index, f)}`;
                    const help = OCR_FIELD_HELP[f];
                    const rowIssue = row.issues.find((i) => i.field === f);
                    return (
                      <div key={f} className={`re-ocr-kv-item re-cell-${state}${TONE[f] ? ` re-col-${TONE[f]}` : ''}`}>
                        <dt><label htmlFor={inputId}>{t(OCR_FIELD_LABELS[f])}</label>{help && <small>{t(help)}</small>}</dt>
                        <dd>
                          <input
                            id={inputId} className="f-input" disabled={!editable || pending}
                            inputMode={OCR_AMOUNT_FIELDS.includes(f) ? 'decimal' : undefined}
                            value={cellValue(row.cells[f], draft[rowKey(row)]?.[f])}
                            aria-invalid={state === 'error' || undefined}
                            onChange={(e) => onEdit(rowKey(row), f, e.target.value)}
                          />
                          {rowIssue && <small className={rowIssue.severity === 'Error' ? 'f-error' : 'f-hint'}>{rowIssue.message}</small>}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </fieldset>
            ))}
          </div>
        </div>

        <div className="re-ocr-dialog-foot">
          {error && <p className="f-alert f-alert-error" role="alert">{error}</p>}
          <span className="re-sub" aria-live="polite">
            {edits ? t(edits === 1 ? '{n} value changed' : '{n} values changed', { n: edits }) : t('No changes')}
          </span>
          <div className="re-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={pending}>{t('Close')}</button>
            <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={pending || !editable || batch.rows.length === 0}>
              {pending ? t('Submitting…') : t('Submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
