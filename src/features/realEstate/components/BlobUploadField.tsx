/**
 * Drop zone + file picker that uploads to the dedicated Real Estate / OCR container via the
 * upload grant. States: idle → uploading (progress) → done (blob name) | failed (retry).
 * Images get a local preview thumbnail. Calls `onUploaded` with backend metadata only.
 */
import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { isApiError } from '../../../api/errors.ts';
import { useT } from '../../../i18n/language.ts';
import { allowedTypesFor, DEFAULT_MAX_BYTES, IMAGE_TYPES, typeNames, UploadError, uploadRealEstateFile, validateUploadFile } from '../api/realEstateUpload.ts';
import type { StoredBlob, UploadPurpose } from '../types/realEstateTypes.ts';

type Phase = 'idle' | 'uploading' | 'done' | 'failed';

interface Props {
  label: string;
  purpose: UploadPurpose;
  hint?: string;
  disabled?: boolean;
  onUploaded: (blob: StoredBlob) => void;
}

export default function BlobUploadField({ label, purpose, hint, disabled, onUploaded }: Props) {
  const id = useId();
  const t = useT();
  const allowed = allowedTypesFor(purpose);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [retryable, setRetryable] = useState(false);
  const [blobName, setBlobName] = useState('');
  const [over, setOver] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => ctrl.current?.abort(), []);
  // Local thumbnail for images only; revoked when replaced or unmounted.
  useEffect(() => {
    if (!file || !IMAGE_TYPES.includes(file.type) || typeof URL.createObjectURL !== 'function') { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const start = async (f: File) => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setPhase('uploading'); setProgress(0); setError(''); setBlobName('');
    try {
      const blob = await uploadRealEstateFile(f, { purpose, onProgress: setProgress, signal: c.signal });
      if (c.signal.aborted) return;
      setPhase('done');
      setBlobName(blob.blobName);
      onUploaded(blob);
    } catch (e) {
      if (c.signal.aborted) return;
      setPhase('failed');
      setRetryable(e instanceof UploadError ? e.retryable : isApiError(e) ? !['forbidden', 'validation', 'unauthorized'].includes(e.kind) : true);
      setError(t(e instanceof Error ? e.message : 'The upload failed. Please try again.'));
    }
  };

  const choose = (f: File | null) => {
    setFile(f);
    setPhase('idle');
    setBlobName('');
    const problem = f ? validateUploadFile(f, allowed, DEFAULT_MAX_BYTES, t) : null;
    setError(problem || '');
    if (f && !problem) void start(f);
  };
  const busy = disabled || phase === 'uploading';
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); if (!busy) choose(e.dataTransfer.files?.[0] ?? null); };

  const pct = Math.round(progress * 100);
  return (
    <div className={`f-field re-upload ${error ? 'has-error' : ''}`}>
      <span className="f-label" id={`${id}-label`}>{label}</span>
      <div
        className={`re-dropzone${over ? ' is-over' : ''}${busy ? ' is-busy' : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (!busy) setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        {preview ? <img className="re-thumb" src={preview} alt={t('Preview of {name}', { name: file?.name ?? '' })} /> : <span className="re-drop-icon" aria-hidden="true">📄</span>}
        <div className="re-drop-text">
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} aria-describedby={`${id}-status`} onClick={() => input.current?.click()}>
            {file ? t('Choose another file') : t('Choose a file')}
          </button>
          <span className="re-sub">{t('or drop it here')}</span>
          {file && <span className="re-file-name">{file.name}</span>}
        </div>
        <input
          ref={input} id={id} type="file" className="re-file-input" accept={allowed.join(',')} tabIndex={-1}
          aria-labelledby={`${id}-label`} disabled={busy} onChange={(e) => { choose(e.target.files?.[0] ?? null); e.target.value = ''; }}
        />
      </div>
      <div id={`${id}-status`} aria-live="polite">
        {phase === 'idle' && !error && <small className="f-hint">{hint || t('{types}, up to {mb} MB.', { types: typeNames(allowed), mb: DEFAULT_MAX_BYTES / 1024 / 1024 })}</small>}
        {phase === 'uploading' && (
          <div className="re-progress">
            <progress max={100} value={pct} aria-label={t('Uploading {name}', { name: file?.name ?? '' })} />
            <span>{pct}%</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { ctrl.current?.abort(); setPhase('idle'); }}>{t('Cancel')}</button>
          </div>
        )}
        {phase === 'done' && (
          <small className="re-ok">✓ {t('Uploaded {name}', { name: file?.name ?? '' })} · {t('Stored as {blob} in the Real Estate / OCR container', { blob: blobName })}</small>
        )}
        {error && (
          <small className="f-error">
            {error}{' '}
            {phase === 'failed' && retryable && file && <button type="button" className="re-link-btn" onClick={() => void start(file)}>{t('Retry')}</button>}
          </small>
        )}
      </div>
    </div>
  );
}
