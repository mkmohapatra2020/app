/** Accessible confirmation dialog: focus moves in, Escape cancels, focus returns on close. */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useT } from '../../../i18n/language.ts';

interface Props {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, children, confirmLabel, tone = 'primary', pending = false, onConfirm, onCancel }: Props) {
  const id = useId();
  const t = useT();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) { e.preventDefault(); onCancel(); }
      if (e.key === 'Tab' && boxRef.current) {
        const items = [...boxRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, input, select')];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, [open, pending, onCancel]);

  if (!open) return null;
  return (
    <div className="re-dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !pending) onCancel(); }}>
      <div className="re-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} aria-describedby={`${id}-b`} ref={boxRef}>
        <h2 id={`${id}-t`}>{title}</h2>
        <div id={`${id}-b`} className="re-dialog-body">{children}</div>
        <div className="re-actions">
          <button type="button" className="btn btn-outline" ref={cancelRef} onClick={onCancel} disabled={pending}>{t('Cancel')}</button>
          <button type="button" className={`btn ${tone === 'danger' ? 're-btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={pending}>
            {pending ? t('Please wait…') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
