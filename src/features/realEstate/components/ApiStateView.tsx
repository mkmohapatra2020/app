/**
 * Loading / empty / error states shared by every Real Estate screen.
 * Messages come from ApiError (already stripped of server internals); nothing raw is shown.
 */
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { ApiError } from '../../../api/errors.ts';
import LoadingSpinner from '../../../components/common/LoadingSpinner.jsx';
import { useT } from '../../../i18n/language.ts';
import { EmptyState } from '../../../components/common/PageShell.jsx';

export function LoadingState({ text }: { text?: string }) {
  const t = useT();
  return <div className="re-state"><LoadingSpinner size="md" text={text ?? t('Loading…')} /></div>;
}

export function EmptyView({ icon = '📭', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return <EmptyState icon={icon} title={title}>{children}</EmptyState>;
}

const COPY: Partial<Record<ApiError['kind'], { icon: string; title: string; text?: string }>> = {
  unauthorized: { icon: '🔑', title: 'Your session has expired', text: 'Please sign in again to continue.' },
  forbidden: { icon: '🔒', title: "You don't have access to this", text: 'Ask your administrator to grant Real Estate access for this partner.' },
  notFound: { icon: '🔍', title: "We couldn't find that", text: 'It may have been removed, or it belongs to a partner you cannot see.' },
  network: { icon: '📡', title: "You're offline", text: "We couldn't reach the server. Check your connection and try again." },
  timeout: { icon: '⏱️', title: 'The server is taking too long' },
  server: { icon: '⚠️', title: 'Something went wrong on our side' },
};

export function ErrorView({ error, onRetry, title }: { error: ApiError; onRetry?: () => void; title?: string }) {
  const location = useLocation();
  const t = useT();
  const c = COPY[error.kind] ?? { icon: '⚠️', title: title || 'Something went wrong' };
  const retryable = ['network', 'timeout', 'server', 'unknown'].includes(error.kind);
  return (
    <div className="empty re-error" role="alert">
      <span aria-hidden="true">{c.icon}</span>
      <h3>{t(c.title)}</h3>
      <p>{t(c.text || error.message)}</p>
      <div className="re-actions re-actions-center">
        {error.kind === 'unauthorized' && <Link className="btn btn-primary" to="/login" state={{ from: location.pathname, expired: true }}>{t('Sign in')}</Link>}
        {retryable && onRetry && <button type="button" className="btn btn-outline" onClick={onRetry}>{t('Try again')}</button>}
      </div>
    </div>
  );
}

/** Inline (form-level) error, with the conflict case spelled out for plots. */
export function InlineError({ error, conflictText }: { error: ApiError | null; conflictText?: string }) {
  const t = useT();
  if (!error) return null;
  // conflictText is already translated by the caller; API messages are translated when known.
  const text = error.kind === 'conflict' && conflictText ? conflictText
    : error.kind === 'unauthorized' ? t('Your session has expired. Please sign in again.')
      : t(error.message);
  return <p className="f-alert f-alert-error" role="alert">{text}</p>;
}

/** ASP.NET-style field errors (e.g. "PlotNumber") → form keys (e.g. "plotNumber"). */
export function serverFieldErrors<K extends string>(error: ApiError | null, keys: readonly K[]): Partial<Record<K, string>> {
  if (!error) return {};
  const out: Partial<Record<K, string>> = {};
  for (const [k, msgs] of Object.entries(error.fieldErrors)) {
    const key = keys.find((f) => f.toLowerCase() === k.replace(/^.*\./, '').toLowerCase());
    if (key && msgs[0]) out[key] = msgs[0];
  }
  return out;
}
