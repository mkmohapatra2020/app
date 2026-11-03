/** Language switch: Odia coverage of the Real Estate module, switcher behaviour, fallback. */
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { enT, getLanguage, setLanguage, translate } from '../../../i18n/language.ts';
import LanguageSwitcher, { LanguageRow } from '../../../i18n/LanguageSwitcher.tsx';
import { OR_STRINGS } from '../i18n/or.ts';
import { PAYMENT_MODES, PLOT_STATUSES, BOOKING_STATUSES } from '../types/realEstateTypes.ts';
import { OCR_FIELD_LABELS, OCR_STATUSES } from '../types/ocrTypes.ts';
import RealEstateStatusBadge from '../components/RealEstateStatusBadge.tsx';
import { LedgerSummary } from '../components/LedgerTable.tsx';
import { validateBooking } from '../utils/validation.ts';
import { batchBlockers } from '../utils/ocr.ts';
import { click, render, type Rendered } from './helpers.tsx';

let view: Rendered | null = null;
afterEach(() => { view?.unmount(); view = null; setLanguage('en'); });

// Every literal passed to t('…') in the module's source.
const sources = import.meta.glob(['../**/*.ts', '../**/*.tsx', '!../__tests__/**'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const call = /\bt\(\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)")/g;
const plural = /n\(\w+, '([^']+)', '([^']+)'\)/g;
const literalKeys = new Set<string>();
for (const src of Object.values(sources)) {
  for (const m of src.matchAll(call)) literalKeys.add((m[1] ?? m[2]).replace(/\\'/g, "'"));
  for (const m of src.matchAll(plural)) { literalKeys.add(m[1]); literalKeys.add(m[2]); }
}
// Values translated at runtime (statuses, enums, labels from constants).
const dynamicKeys = [
  ...PLOT_STATUSES, ...BOOKING_STATUSES, ...OCR_STATUSES, ...Object.values(OCR_FIELD_LABELS),
  ...PAYMENT_MODES.filter((m) => m !== 'BankTransfer'), 'Bank transfer',
  'East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West',
  'Sq. ft', 'Sq. yd', 'Sq. m', 'Decimal', 'Acre',
  'Extracted', 'Corrected', 'Edited — not saved', 'Validation error', 'Low confidence',
  'Matched to booking', 'Customer not found', 'Plot not found', 'No matching booking', 'More than one possible booking', 'Not matched yet',
  'Extract rows (GPT-4o Vision)', 'Save corrections', 'Validate rows', 'Approve batch', 'Import approved rows', 'Reject batch',
  'Business name', 'Contact person', 'Phone', 'Partner', 'Project name', 'Location', 'District', 'State', 'Plot number', 'Area', 'Area unit',
  'Name', 'Customer', 'Plot', 'Booking amount', 'Agreed value', 'Transaction date', 'Total received', 'Payment mode',
  'Overview', 'Projects and plots', 'Customers and bookings', 'Ledger transactions', 'Ledger OCR', 'Documents and images',
  'Commission (lower black amount)', 'Property amount (red)', 'From the previous column', 'Lower amount written in black, after Payment Details', 'Amount written in red',
  'Matching hint, not an id', 'Error', 'Warning', 'Agreement', 'Payment receipt', 'Identity proof', 'Site photo', 'Ledger page',
  'Scanned ledger page', 'PDF', 'Excel', 'Active', 'Inactive', 'Extract rows', 'Review and approve', 'Import', 'View',
];
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('Odia translations', () => {
  it('finds the module text (sanity check)', () => {
    expect(literalKeys.size).toBeGreaterThan(150);
    expect(literalKeys.has('Record a payment')).toBe(true);
  });

  it('has an Odia translation for every UI string', () => {
    const missing = [...literalKeys, ...dynamicKeys].filter((k) => !(k in OR_STRINGS));
    expect(missing).toEqual([]);
  });

  it('keeps every {placeholder} in the Odia text', () => {
    const broken = Object.entries(OR_STRINGS).filter(([en, or]) => placeholders(en).join() !== placeholders(or).join()).map(([en]) => en);
    expect(broken).toEqual([]);
  });

  it('falls back to English for unknown text and fills variables', () => {
    expect(translate('or', 'Not in any dictionary')).toBe('Not in any dictionary');
    expect(translate('or', 'Plot {plot} added', { plot: 'A-1' })).toBe('ପ୍ଲଟ୍ A-1 ଯୋଡ଼ାଗଲା');
    expect(enT('Plot {plot} added', { plot: 'A-1' })).toBe('Plot A-1 added');
  });
});

describe('language switcher', () => {
  it('switches language, stores it and sets <html lang>', async () => {
    view = await render(<LanguageSwitcher />);
    const btn = document.querySelector('.lang-btn')!;
    expect(btn.getAttribute('aria-label')).toBe('Language: English. Change language');
    await click(btn);
    await click([...document.querySelectorAll('[role="menuitemradio"]')].find((b) => b.getAttribute('lang') === 'or')!);
    expect(getLanguage()).toBe('or');
    expect(document.documentElement.lang).toBe('or');
    expect(localStorage.getItem('wl-lang')).toBe('or');
    expect(btn.textContent).toContain('ଓଡ଼ିଆ');
  });

  it('phone-menu row works as a radio group', async () => {
    view = await render(<LanguageRow />);
    const [en, or] = document.querySelectorAll('[role="radio"]');
    expect(en.getAttribute('aria-checked')).toBe('true');
    await click(or);
    expect(getLanguage()).toBe('or');
    expect(or.getAttribute('aria-checked')).toBe('true');
  });

  it('re-renders Real Estate text live in Odia', async () => {
    view = await render(<MemoryRouter><RealEstateStatusBadge status="Available" /><LedgerSummary totals={{ agreedValue: 100, totalReceived: 40, totalCommission: 2, totalProperty: 38, outstanding: 60 }} /></MemoryRouter>);
    expect(document.body.textContent).toContain('Available');
    expect(document.body.textContent).toContain('Outstanding');
    await view.rerender(<MemoryRouter><RealEstateStatusBadge status="Available" /><LedgerSummary totals={{ agreedValue: 100, totalReceived: 40, totalCommission: 2, totalProperty: 38, outstanding: 60 }} /></MemoryRouter>);
    setLanguage('or');
    await view.rerender(<MemoryRouter><RealEstateStatusBadge status="Available" /><LedgerSummary totals={{ agreedValue: 100, totalReceived: 40, totalCommission: 2, totalProperty: 38, outstanding: 60 }} /></MemoryRouter>);
    expect(document.body.textContent).toContain('ଉପଲବ୍ଧ');
    expect(document.body.textContent).toContain('ବକେୟା');
    // the status value sent to the API is unchanged
    expect(document.querySelector('.re-badge')?.getAttribute('data-status')).toBe('Available');
  });

  it('translates validation and OCR blocker messages', () => {
    const t = (k: string, v?: Record<string, string | number>) => translate('or', k, v);
    expect(validateBooking({ customerId: '', plotId: '1', bookingAmount: '1', agreedValue: '2' }, null, t).customerId).toBe('ଗ୍ରାହକ ଆବଶ୍ୟକ।');
    const rows = [{ id: 'r', index: 0, rowNumber: 1, cells: {} as never, confidence: 1, issues: [{ code: '', field: null, rowIndex: 0, message: 'x', severity: 'Error' as const }], match: { status: 'Matched' as const, bookingId: 1, label: '' } }];
    expect(batchBlockers({ rows, batchIssues: [] }, {}, t).reasons).toEqual(['1ଟି ଯାଞ୍ଚ ତ୍ରୁଟି']);
  });
});
