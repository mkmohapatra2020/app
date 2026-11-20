/**
 * Popup shown after an uploaded ledger page has been read: every extracted
 * transaction as one editable table row, with a Documents column and an "Attach document"
 * strip under the row (receipt, agreement, …). "Submit" hands the edits and attachments to the page, which sends
 * them to the backend. Nothing is imported into the ledger from here.
 * Every field is checked here (validateLedgerValues); Submit is refused while a row has errors.
 */
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { useT } from '../../../i18n/language.ts';
import { OCR_AMOUNT_FIELDS, OCR_FIELDS, OCR_FIELD_LABELS, type OcrBatch, type OcrDraft, type OcrField } from '../types/ocrTypes.ts';
import { DOCUMENT_TYPES, type StoredBlob } from '../types/realEstateTypes.ts';
import { allIssues, buildCorrections, cellInputId, cellState, cellValue, ledgerErrors, rowKey } from '../utils/ocr.ts';
import BlobUploadField from './BlobUploadField.tsx';
import { DOCUMENT_TYPE_LABEL } from './DocumentsPanel.tsx';
import { SelectInput } from './FormFields.tsx';
import RealEstateStatusBadge from './RealEstateStatusBadge.tsx';

const TONE: Partial<Record<OcrField, string>> = { totalAmountReceived: 'total', commissionAmount: 'commission', propertyAmount: 'property' };
/** Columns shown in the popup (Remarks is left out). */
export const DIALOG_FIELDS: OcrField[] = OCR_FIELDS.filter((f) => f !== 'remarks');
const pct = (n: number | null) => (n === null ? null : `${Math.round(n * 100)}%`);

/** A document uploaded for one transaction; stored with the batch and saved to the row's booking at Import. */
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
  /** Static mode: attached files stay on this device (no upload). */
  localFiles?: boolean;
}

/** Upload strip under a transaction row: pick a document type, then upload. */
function AttachForm({ rowId, label, localOnly, onAttach }: { rowId: string; label: string; localOnly: boolean; onAttach: (a: RowAttachment) => void }) {
  const t = useT();
  const [type, setType] = useState<string>('PaymentReceipt');
  const [uploadKey, setUploadKey] = useState(0);
  return (
    <div className="re-ocr-attach" role="group" aria-label={t('Attach document to {row}', { row: label })}>
      <h4>📎 {t('Attach document')} · {label}</h4>
      <div className="re-ocr-attach-form">
        <SelectInput label={t('Document type')} id={`${rowId}-doctype`} value={type} onChange={(e) => setType(e.target.value)}
          options={DOCUMENT_TYPES.map((d) => ({ value: d, label: t(DOCUMENT_TYPE_LABEL[d] ?? d) }))} />
        <BlobUploadField key={uploadKey} label={t('Document or image')} purpose="Document" localOnly={localOnly}
          onUploaded={(blob) => { onAttach({ blob, documentType: type }); setUploadKey((k) => k + 1); }} />
      </div>
    </div>
  );
}

export default function OcrAnalysisDialog({ batch, fileName, draft, attachments, editable, pending, error, onEdit, onAttach, onRemoveAttachment, onSubmit, onClose, localFiles = false }: Props) {
  const id = useId();
  const t = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const edits = buildCorrections(batch.rows, draft).length;
  const docCount = Object.values(attachments).reduce((n, l) => n + l.length, 0);
  const issues = allIssues(batch).filter((i) => i.rowIndex === null);
  // Checked live on the values being edited; these replace the server's older row issues.
  const errors = ledgerErrors(batch.rows, draft, DIALOG_FIELDS, t);
  const errorCount = Object.values(errors).reduce((n, e) => n + Object.keys(e).length, 0);
  const [tried, setTried] = useState(false);
  const [attachOpen, setAttachOpen] = useState<string | null>(null);
  const locked = !editable || pending;
  // "One by one": one customer (ledger row) at a time with Previous / Next; "All rows": the table.
  const [view, setView] = useState<'one' | 'all'>('one');
  const [step, setStep] = useState(0);
  const total = batch.rows.length;
  const current = total ? batch.rows[Math.min(step, total - 1)] : null;
  const go = (n: number) => { setStep(Math.max(0, Math.min(total - 1, n))); setAttachOpen(null); };
  const rowFlags = (row: OcrBatch['rows'][number]) => {
    const key = rowKey(row);
    const hasError = !!errors[key];
    const edited = Object.keys(draft[key] ?? {}).length > 0;
    return { key, hasError, edited, docs: (attachments[key] ?? []).length };
  };
  const customerOf = (row: OcrBatch['rows'][number]) => cellValue(row.cells.customerName, draft[rowKey(row)]?.customerName).trim();

  // Focus moves in, Tab stays inside, Escape closes, focus returns on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = boxRef.current?.querySelector<HTMLElement>('.re-ocr-dlg-table input:not([disabled])');
    (first ?? closeRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      // Ignore Escape while a dialog is open on top (e.g. the submit confirmation).
      if (e.key === 'Escape' && !pending && document.querySelectorAll('.re-dialog-backdrop').length === 1) { e.preventDefault(); onClose(); }
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

  /** Submit only when every row passes; otherwise show the first row with an error and focus its field. */
  const trySubmit = () => {
    setTried(true);
    const firstRow = batch.rows.findIndex((r) => errors[rowKey(r)]);
    if (firstRow < 0) { onSubmit(); return; }
    const row = batch.rows[firstRow];
    const field = DIALOG_FIELDS.find((f) => errors[rowKey(row)]?.[f]);
    if (view === 'one') go(firstRow);
    if (field) {
      const id = view === 'one' ? `step-${cellInputId(row.index, field)}` : `dlg-${cellInputId(row.index, field)}`;
      setTimeout(() => document.getElementById(id)?.focus(), 0);
    }
  };

  const changes = [
    edits ? t(edits === 1 ? '{n} value changed' : '{n} values changed', { n: edits }) : '',
    docCount ? t(docCount === 1 ? '{n} document attached' : '{n} documents attached', { n: docCount }) : '',
  ].filter(Boolean).join(' · ') || t('No changes');

  return (
    <div className="re-dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !pending) onClose(); }}>
      <div className="re-dialog re-ocr-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} ref={boxRef}>
        <div className="re-ocr-dialog-head">
          <div>
            <h2 id={`${id}-t`}>{t('Ledger analysis')}</h2>
            <p className="re-sub">{t('Check each value, correct anything that is wrong, attach any documents, then submit.')}</p>
            <p className="re-ocr-dialog-meta">
              <span className="re-file-name">{fileName}</span>
              <RealEstateStatusBadge status={String(batch.status)} />
              <span className="re-sub">{t('{n} transactions', { n: batch.rows.length })}</span>
              {pct(batch.confidence) && <span className="re-sub">{t('Confidence {n}', { n: pct(batch.confidence)! })}</span>}
            </p>
            {total > 0 && (
              <div className="re-ocr-view" role="group" aria-label={t('View')}>
                <button type="button" className={view === 'one' ? 'is-on' : ''} aria-pressed={view === 'one'} onClick={() => setView('one')}>{t('One by one')}</button>
                <button type="button" className={view === 'all' ? 'is-on' : ''} aria-pressed={view === 'all'} onClick={() => setView('all')}>{t('All rows')}</button>
              </div>
            )}
          </div>
          <button type="button" className="re-dialog-x" ref={closeRef} onClick={onClose} disabled={pending} aria-label={t('Close')}>×</button>
        </div>

        <div className="re-ocr-kv-list" role="region" aria-label={t('Extracted values')} tabIndex={-1}>
          {batch.error && <p className="f-alert f-alert-error" role="alert">{t('Extraction problem: {error}', { error: batch.error })}</p>}
          {issues.map((i, n) => <p key={n} className={`f-alert ${i.severity === 'Error' ? 'f-alert-error' : 'f-alert-info'}`}>{i.message}</p>)}
          {batch.rows.length === 0 && !batch.error && <p className="re-sub">{t('No ledger rows were found on this page. Try a clearer, well-lit photo of a single page.')}</p>}
          {view === 'one' && current && (() => {
            const { key, hasError } = rowFlags(current);
            const docs = attachments[key] ?? [];
            const label = t('Row {n}', { n: current.rowNumber || current.index + 1 });
            const name = customerOf(current);
            const isOpen = attachOpen === key && !locked;
            return (
              <section className="re-ocr-step" aria-label={t('Customer {i} of {n}', { i: step + 1, n: total })}>
                <div className="re-ocr-step-nav">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => go(step - 1)} disabled={step === 0}>← {t('Previous')}</button>
                  <p aria-live="polite"><strong>{t('Customer {i} of {n}', { i: step + 1, n: total })}</strong></p>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => go(step + 1)} disabled={step >= total - 1}>{t('Next')} →</button>
                </div>
                <ol className="re-ocr-step-chips" aria-label={t('Jump to a customer')}>
                  {batch.rows.map((r, n) => {
                    const f = rowFlags(r);
                    return (
                      <li key={f.key}>
                        <button type="button" className={`${n === step ? 'is-on' : ''}${f.hasError ? ' has-error' : f.edited ? ' is-edited' : ''}`} aria-current={n === step ? 'step' : undefined}
                          title={customerOf(r) || t('Row {n}', { n: r.rowNumber || r.index + 1 })} onClick={() => go(n)}>{n + 1}</button>
                      </li>
                    );
                  })}
                </ol>
                <div className={`re-ocr-step-card${hasError ? ' has-error' : ''}`}>
                  <h3>
                    {name || label}
                    <small className="re-sub">{label}{pct(current.confidence) ? ` · ${t('Confidence {n}', { n: pct(current.confidence)! })}` : ''}</small>
                  </h3>
                  <div className="re-ocr-step-grid">
                    {DIALOG_FIELDS.map((f) => {
                      const fieldError = errors[key]?.[f];
                      const state = fieldError ? 'error' : cellState({ ...current, issues: [] }, f, draft[key]?.[f]);
                      const inputId = `step-${cellInputId(current.index, f)}`;
                      return (
                        <div key={f} className={`re-ocr-step-field re-cell-${state}${TONE[f] ? ` re-col-${TONE[f]}` : ''}`}>
                          <label htmlFor={inputId}>{t(OCR_FIELD_LABELS[f])}</label>
                          <input
                            id={inputId} className="f-input" disabled={locked}
                            inputMode={OCR_AMOUNT_FIELDS.includes(f) ? 'decimal' : undefined}
                            placeholder={f === 'transactionDate' ? 'YYYY-MM-DD' : undefined}
                            value={cellValue(current.cells[f], draft[key]?.[f])}
                            aria-invalid={!!fieldError || undefined}
                            aria-describedby={fieldError ? `${inputId}-err` : undefined}
                            onChange={(e) => onEdit(key, f, e.target.value)}
                          />
                          {fieldError && <small className="f-error" id={`${inputId}-err`}>{fieldError}</small>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="re-ocr-step-docs">
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
                      <button type="button" className="btn btn-outline btn-sm" aria-expanded={isOpen} onClick={() => setAttachOpen(isOpen ? null : key)}>
                        {isOpen ? t('Done') : `📎 ${t('Attach document')}`}
                      </button>
                    )}
                    {isOpen && <AttachForm rowId={`${id}-s${key}`} label={label} localOnly={localFiles} onAttach={(a) => onAttach(key, a)} />}
                  </div>
                </div>
                <div className="re-ocr-step-nav re-ocr-step-nav-bottom">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => go(step - 1)} disabled={step === 0}>← {t('Previous')}</button>
                  {step < total - 1
                    ? <button type="button" className="btn btn-primary btn-sm" onClick={() => go(step + 1)}>{t('Next customer')} →</button>
                    : <span className="re-sub">{t('Last customer — check the values, then Submit.')}</span>}
                </div>
              </section>
            );
          })()}
          {view === 'all' && batch.rows.length > 0 && (
            <div className="re-table-wrap re-ocr-dlg-wrap" role="region" aria-label={t('Extracted ledger rows')} tabIndex={0}>
              <table className="re-table re-ocr-dlg-table">
                <thead>
                  <tr>
                    <th scope="col" className="re-ocr-dlg-num">#</th>
                    {DIALOG_FIELDS.map((f) => (
                      <th scope="col" key={f} className={TONE[f] ? `re-col-${TONE[f]}` : undefined}>
                        {t(OCR_FIELD_LABELS[f])}
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
                          <th scope="row" className="re-ocr-dlg-num" data-row={t('Row {n}', { n: row.rowNumber || row.index + 1 })}>
                            <span className="re-ocr-dlg-n">{row.rowNumber || row.index + 1}</span>
                            {pct(row.confidence) && <small title={t('Confidence {n}', { n: pct(row.confidence)! })}>{pct(row.confidence)}</small>}
                          </th>
                          {DIALOG_FIELDS.map((f) => {
                            const fieldError = errors[key]?.[f];
                            const state = fieldError ? 'error' : cellState({ ...row, issues: [] }, f, draft[key]?.[f]);
                            return (
                              <td key={f} data-label={t(OCR_FIELD_LABELS[f])} className={`re-cell-${state}${TONE[f] ? ` re-col-${TONE[f]}` : ''}`}>
                                <input
                                  id={`dlg-${cellInputId(row.index, f)}`} className="f-input" disabled={locked}
                                  aria-label={`${t(OCR_FIELD_LABELS[f])}, ${label}`}
                                  inputMode={OCR_AMOUNT_FIELDS.includes(f) ? 'decimal' : undefined}
                                  placeholder={f === 'transactionDate' ? 'YYYY-MM-DD' : undefined}
                                  value={cellValue(row.cells[f], draft[key]?.[f])}
                                  aria-invalid={!!fieldError || undefined}
                                  title={fieldError}
                                  onChange={(e) => onEdit(key, f, e.target.value)}
                                />
                                {fieldError && <small className="f-error">{fieldError}</small>}
                              </td>
                            );
                          })}
                          <td className="re-ocr-dlg-docs" data-label={t('Documents')}>
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
                              <AttachForm rowId={`${id}-r${key}`} label={label} localOnly={localFiles} onAttach={(a) => onAttach(key, a)} />
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
          {errorCount > 0 && (
            <p className={`f-alert ${tried ? 'f-alert-error' : 'f-alert-info'}`} role={tried ? 'alert' : undefined}>
              {t(errorCount === 1 ? 'Fix 1 field before submitting.' : 'Fix {n} fields before submitting.', { n: errorCount })}
            </p>
          )}
          <span className="re-sub" aria-live="polite">{changes}</span>
          <div className="re-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={pending}>{t('Close')}</button>
            <button type="button" className="btn btn-primary" onClick={trySubmit} disabled={pending || !editable || batch.rows.length === 0}>
              {pending ? t('Submitting…') : t('Submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
