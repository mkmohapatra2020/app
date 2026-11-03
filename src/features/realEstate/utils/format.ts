/** Display helpers: money (INR), dates, masking of identity numbers, ledger totals. */
import { getLanguage, type Lang } from '../../../i18n/language.ts';
import type { LedgerTotals, LedgerTransaction } from '../types/realEstateTypes.ts';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
export const money = (n: number | null | undefined): string => (n === null || n === undefined || !Number.isFinite(n) ? '—' : inr.format(n));

// Most browsers ship no Odia date data (they fall back to "Aug 14, 2026"), so Odia month names are built in.
const OR_MONTHS = ['ଜାନୁଆରୀ', 'ଫେବୃଆରୀ', 'ମାର୍ଚ୍ଚ', 'ଅପ୍ରେଲ', 'ମେ', 'ଜୁନ୍', 'ଜୁଲାଇ', 'ଅଗଷ୍ଟ', 'ସେପ୍ଟେମ୍ବର', 'ଅକ୍ଟୋବର', 'ନଭେମ୍ବର', 'ଡିସେମ୍ବର'];

/** "14 Aug 2026" / "14 ଅଗଷ୍ଟ 2026", following the chosen language. */
export function date(v: string, lang: Lang = getLanguage()): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  if (lang === 'or') return `${String(d.getDate()).padStart(2, '0')} ${OR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Display label for a stored area-unit code (translate the result with t). */
export const AREA_UNIT_LABEL: Record<string, string> = { SqFt: 'Sq. ft', SqYd: 'Sq. yd', SqM: 'Sq. m', Decimal: 'Decimal', Acre: 'Acre' };
export const areaUnit = (code: string) => AREA_UNIT_LABEL[code] ?? code;

/** Aadhaar → "XXXX XXXX 1234". Anything too short to mask safely is fully hidden. */
export function maskAadhaar(v: string): string {
  const digits = String(v ?? '').replace(/\D/g, '');
  if (!digits) return '—';
  if (digits.length < 8) return 'XXXX XXXX XXXX';
  return `XXXX XXXX ${digits.slice(-4)}`;
}

/** PAN → "XXXXXX234F" (last four shown). */
export function maskPan(v: string): string {
  const s = String(v ?? '').replace(/\s/g, '').toUpperCase();
  if (!s) return '—';
  if (s.length < 8) return 'XXXXXXXXXX';
  return `${'X'.repeat(s.length - 4)}${s.slice(-4)}`;
}

/** Sum in paise to avoid floating-point drift on rupee amounts. */
export function ledgerTotals(agreedValue: number, transactions: Pick<LedgerTransaction, 'amount'>[]): LedgerTotals {
  const paise = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100);
  const paid = transactions.reduce((s, t) => s + paise(t.amount), 0);
  const agreed = paise(agreedValue);
  return { agreedValue: agreed / 100, totalPaid: paid / 100, outstanding: (agreed - paid) / 100 };
}
