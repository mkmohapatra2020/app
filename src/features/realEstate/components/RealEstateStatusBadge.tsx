/** Status pill for plots, bookings and OCR batches. Text always carries the meaning (not colour alone). */
import { useT } from '../../../i18n/language.ts';

type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted' | 'done';

const TONES: Record<string, Tone> = {
  // plots
  available: 'ok', blocked: 'warn', booked: 'info', sold: 'done',
  // bookings
  pending: 'warn', confirmed: 'ok', cancelled: 'bad', completed: 'done',
  // OCR batches
  uploaded: 'muted', parsed: 'info', validated: 'ok', approved: 'ok', imported: 'done', rejected: 'bad',
};
const LABELS: Record<string, string> = { banktransfer: 'Bank transfer' };

export const statusTone = (status: string): Tone => TONES[String(status).toLowerCase()] ?? 'muted';

export default function RealEstateStatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const t = useT();
  const s = String(status || 'Unknown');
  return <span className={`re-badge re-badge-${statusTone(s)} ${className}`} data-status={s}>{t(LABELS[s.toLowerCase()] ?? s)}</span>;
}
