/**
 * Popup shown after GPT-6 Luna has analysed an uploaded ledger page: every extracted
 * transaction as one editable table row, with a Documents column and an "Attach document"
 * strip under the row (receipt, agreement, …). "Submit" hands the edits and attachments to the page, which sends
 * them to the backend. Nothing is imported into the ledger from here.
 */
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { useT } from '../../../i18n/language.ts';
import { OCR_AMOUNT_FIELDS, OCR_FIELDS, OCR_FIELD_HELP, OCR_FIELD_LABELS, type OcrBatch, type OcrDraft, type OcrField } from '../types/ocrTypes.ts';
import { DOCUMENT_TYPES, type StoredBlob } from '../types/realEstateTypes.ts';
import { allIssues, buildCorrections, cellInputId, cellState, cellValue, rowKey } from '../utils/ocr.ts';
import BlobUploadField from './BlobUploadField.tsx';
import { DOCUMENT_TYPE_LABEL } from './DocumentsPanel.tsx';
import { SelectInput } from './FormFields.tsx';
import RealEstateStatusBadge from './RealEstateStatusBadge.tsx';

const TONE: Partial<Record<OcrField, string>> = { totalAmountReceived: 'total', commissionAmount: 'commission', propertyAmount: 'property' };
/** Columns shown in the popup (Remarks is left out). */
export const DIALOG_FIELDS: OcrField[] = OCR_FIELDS.filter((f) => f !== 'remarks');
const pct = (n: number | null) => (n === null ? null : `${Math.round(n * 100)}%`);

/** A document uploaded for one transaction; saved to its booking on submit. */
export interface RowAttachment {
  blob: StoredBlob;
  documentType: string;
}
export type RowAttachments = Record<string, RowAttachment[]>;

interface Props {
  batch: OcrBatch;
  fileName: string;
  draft: OcrDraft;
  attachments: RowAttachments;
  editable: boolean;
  pending: boolean;
  error: string;
  onEdit: (rowKey: string, field: OcrField, value: string) => void;
  onAttach: (rowKey: string, attachment: RowAttachment) => void;
  onRemoveAttachment: (rowKey: string, index: number) => void;
  onSubmit: () => void;
  onClose: () => void;
}

/** Upload strip under a transaction row: pick a document type, then upload. */
function AttachForm({ rowId, label, onAttach }: { rowId: string; label: string; onAttach: (a: RowAttachment) => void }) {
  const t = useT();
  const [type, setType] = useState<string>('PaymentReceipt');
  const [uploadKey, setUploadKey] = useState(0);
  return (
    <div className="re-ocr-attach" role="group" aria-label={t('Attach document to {row}', { row: label })}>
      <h4>📎 {t('Attach document')} · {label}</h4>
      <div className="re-ocr-attach-form">
        <SelectInput label={t('Document type')} id={`${rowId}-doctype`} value={type} onChange={(e) => setType(e.target.value)}
          options={DOCUMENT_TYPES.map((d) => ({ value: d, label: t(DOCUMENT_TYPE_LABEL[d] ?? d) }))} />
        <BlobUploadField key={uploadKey} label={t('Document or image')} purpose="Document"
          onUploaded={(blob) => { onAttach({ blob, documentType: type }); setUploadKey((k) => k + 1); }} />
      </div>
    </div>
  );
}

export default function OcrAnalysisDialog({ batch, fileName, draft, attachments, editable, pending, error, onEdit, onAttach, onRemoveAttachment, onSubmit, onClose }: Props) {
  const id = useId();
  const t = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const edits = buildCorrections(batch.rows, draft).length;
  const docCount = Object.values(attachments).reduce((n, l) => n + l.length, 0);
  const issues = allIssues(batch).filter((i) => i.rowIndex === null);
  const [attachOpen, setAttachOpen] = useState<string | null>(null);
  const locked = !editable || pending;

  // Focus moves in, Tab stays inside, Escape closes, focus returns on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = boxRef.current?.querySelector<HTMLElement>('.re-ocr-dlg-table input:not([disabled])');
    (first ?? closeRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) { e.preventDefault(); onClose(); }
      if (e.key === 'Tab' && boxRef.current) {
        const items = [...boxRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]):not([type="file"]), select:not([disabled]), a[href]')];
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

  const changes = [
    edits ? t(edits === 1 ? '{n} value changed' : '{n} values changed', { n: edits }) : '',
    docCount ? t(docCount === 1 ? '{n} document attached' : '{n} documents attached', { n: docCount }) : '',
  ].filter(Boolean).join(' · ') || t('No changes');

  return (
    <div className="re-dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !pending) onClose(); }}>
      <div className="re-dialog re-ocr-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} ref={boxRef}>
        <div className="re-ocr-dialog-head">
          <div>
            <h2 id={`${id}-t`}>{t('Ledger analysis (GPT-6 Luna)')}</h2>
            <p className="re-sub">{t('Check each value, correct anything that is wrong, attach any documents, then submit.')}</p>
            <p className="re-ocr-dialog-meta">
              <span className="re-file-name">{fileName}</span>
              <RealEstateStatusBadge status={String(batch.status)} />
              <span className="re-sub">{t('{n} transactions', { n: batch.rows.length })}</span>
              {pct(batch.confidence) && <span className="re-sub">{t('Confidence {n}', { n: pct(batch.confidence)! })}</span>}
            </p>
          </div>
          <button type="button" className="re-dialog-x" ref={closeRef} onClick={onClose} disabled={pending} aria-label={t('Close')}>×</button>
        </div>

        <div className="re-ocr-kv-list" role="region" aria-label={t('Extracted values')} tabIndex={-1}>
          {batch.error && <p className="f-alert f-alert-error" role="alert">{t('Extraction problem: {error}', { error: batch.error })}</p>}
          {issues.map((i, n) => <p key={n} className={`f-alert ${i.severity === 'Error' ? 'f-alert-error' : 'f-alert-info'}`}>{i.message}</p>)}
          {batch.rows.length === 0 && !batch.error && <p className="re-sub">{t('GPT-6 Luna found no ledger rows on this page. Try a clearer, well-lit photo of a single page.')}</p>}
          {batch.rows.length > 0 && (
            <div className="re-table-wrap re-ocr-dlg-wrap" role="region" aria-label={t('Extracted ledger rows')} tabIndex={0}>
              <table className="re-table re-ocr-dlg-table">
                <thead>
                  <tr>
                    <th scope="col" className="re-ocr-dlg-num">#</th>
                    {DIALOG_FIELDS.map((f) => (
                      <th scope="col" key={f} className={TONE[f] ? `re-col-${TONE[f]}` : undefined}>
                        {t(OCR_FIELD_LABELS[f])}
                        {OCR_FIELD_HELP[f] && <small>{t(OCR_FIELD_HELP[f] as string)}</small>}
                      </th>
                    ))}
                    <th scope="col">{t('Documents')}</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.rows.map((row) => {
                    const key = rowKey(row);
                    const label = t('Row {n}', { n: row.rowNumber || row.index + 1 });
                    const docs = attachments[key] ?? [];
                    const isOpen = attachOpen === key && !locked;
                    return (
                      <Fragment key={key}>
                        <tr className={isOpen ? 'is-open' : undefined}>
                          <th scope="row" className="re-ocr-dlg-num">
                            {row.rowNumber || row.index + 1}
                            {pct(row.confidence) && <small title={t('Confidence {n}', { n: pct(row.confidence)! })}>{pct(row.confidence)}</small>}
                          </th>
                          {DIALOG_FIELDS.map((f) => {
                            const state = cellState(row, f, draft[key]?.[f]);
                            const rowIssue = row.issues.find((i) => i.field === f);
                            return (
                              <td key={f} className={`re-cell-${state}${TONE[f] ? ` re-col-${TONE[f]}` : ''}`}>
                                <input
                                  id={`dlg-${cellInputId(row.index, f)}`} className="f-input" disabled={locked}
                                  aria-label={`${t(OCR_FIELD_LABELS[f])}, ${label}`}
                                  inputMode={OCR_AMOUNT_FIELDS.includes(f) ? 'decimal' : undefined}
                                  value={cellValue(row.cells[f], draft[key]?.[f])}
                                  aria-invalid={state === 'error' || undefined}
                                  title={rowIssue?.message}
                                  onChange={(e) => onEdit(key, f, e.target.value)}
                                />
                                {rowIssue && <small className={rowIssue.severity === 'Error' ? 'f-error' : 'f-hint'}>{rowIssue.message}</small>}
                              </td>
                            );
                          })}
                          <td className="re-ocr-dlg-docs">
                            {docs.length > 0 && (
                              <ul className="re-doc-list">
                                {docs.map((a, i) => (
                                  <li key={`${a.blob.blobName}-${i}`}>
                                    <span className="re-badge re-badge-info">{t(DOCUMENT_TYPE_LABEL[a.documentType] ?? a.documentType)}</span>
                                    <span className="re-file-name" title={a.blob.fileName}>{a.blob.fileName}</span>
                                    {!locked && <button type="button" className="re-link-btn" onClick={() => onRemoveAttachment(key, i)} aria-label={t('Remove {name}', { name: a.blob.fileName })}>×</button>}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {!locked && (
                              <button type="button" className="btn btn-outline btn-sm" aria-expanded={isOpen}
                                onClick={() => setAttachOpen(isOpen ? null : key)}>
                                {isOpen ? t('Done') : `📎 ${t('Attach')}`}
                              </button>
                            )}
                            {locked && docs.length === 0 && <span className="re-sub">—</span>}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="re-ocr-attach-row">
                            <td colSpan={DIALOG_FIELDS.length + 2}>
                              <AttachForm rowId={`${id}-r${key}`} label={label} onAttach={(a) => onAttach(key, a)} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="re-ocr-dialog-foot">
          {error && <p className="f-alert f-alert-error" role="alert">{error}</p>}
          <span className="re-sub" aria-live="polite">{changes}</span>
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
