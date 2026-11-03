/**
 * File picker + upload to the dedicated Real Estate container (via upload grant).
 * States: idle → uploading (progress) → done | failed (retry). Calls `onUploaded` with
 * backend metadata only.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { isApiError } from '../../../api/errors.ts';
import { useT } from '../../../i18n/language.ts';
import { DEFAULT_ALLOWED_TYPES, DEFAULT_MAX_BYTES, UploadError, uploadRealEstateFile, validateUploadFile } from '../api/realEstateUpload.ts';
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
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [retryable, setRetryable] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => () => ctrl.current?.abort(), []);

  const start = async (f: File) => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setPhase('uploading'); setProgress(0); setError('');
    try {
      const blob = await uploadRealEstateFile(f, { purpose, onProgress: setProgress, signal: c.signal });
      if (c.signal.aborted) return;
      setPhase('done');
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
    const problem = f ? validateUploadFile(f, undefined, undefined, t) : null;
    setError(problem || '');
    if (f && !problem) void start(f);
  };

  const pct = Math.round(progress * 100);
  return (
    <div className={`f-field re-upload ${error ? 'has-error' : ''}`}>
      <label className="f-label" htmlFor={id}>{label}</label>
      <input
        id={id} type="file" className="f-input" accept={DEFAULT_ALLOWED_TYPES.join(',')}
        disabled={disabled || phase === 'uploading'} aria-describedby={`${id}-status`}
        onChange={(e) => choose(e.target.files?.[0] ?? null)}
      />
      <div id={`${id}-status`} aria-live="polite">
        {phase === 'idle' && !error && <small className="f-hint">{hint || t('JPG, PNG or WebP, up to {mb} MB.', { mb: DEFAULT_MAX_BYTES / 1024 / 1024 })}</small>}
        {phase === 'uploading' && (
          <div className="re-progress">
            <progress max={100} value={pct} aria-label={t('Uploading {name}', { name: file?.name ?? '' })} />
            <span>{pct}%</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { ctrl.current?.abort(); setPhase('idle'); }}>{t('Cancel')}</button>
          </div>
        )}
        {phase === 'done' && <small className="re-ok">✓ {t('Uploaded {name}', { name: file?.name ?? '' })}</small>}
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
