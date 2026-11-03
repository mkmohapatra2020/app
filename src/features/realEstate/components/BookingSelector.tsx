/**
 * Pick a booking. Uses the bookings list when the API has one; otherwise (404) falls back
 * to typing a booking ID. The choice lives in the URL (?bookingId=) so deep links and
 * refresh keep it.
 */
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { realEstateApi } from '../api/realEstateApi.ts';
import { useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import { date, money } from '../utils/format.ts';
import { Input, SelectInput } from './FormFields.tsx';

export function useSelectedBooking(): [string, (id: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get('bookingId') ?? '';
  const set = (id: string) => setParams((p) => { const n = new URLSearchParams(p); if (id) n.set('bookingId', id); else n.delete('bookingId'); return n; }, { replace: true });
  return [value, set];
}

export default function BookingSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const t = useT();
  const list = useRealEstateQuery((s) => realEstateApi.bookings.list({ page: 1, pageSize: 200 }, s), []);
  const [manual, setManual] = useState(value);
  const noList = !!list.error;

  if (noList) {
    const submit = (e: FormEvent) => { e.preventDefault(); onChange(manual.trim()); };
    return (
      <form className="re-search" onSubmit={submit} aria-label={t('Open a booking')}>
        <Input label={t('Booking ID')} value={manual} onChange={(e) => setManual(e.target.value)} hint={t('The booking list isn’t available yet — enter the booking ID.')} />
        <button type="submit" className="btn btn-outline" disabled={!manual.trim()}>{t('Open')}</button>
      </form>
    );
  }
  const options = (list.data?.items ?? []).map((b) => ({
    value: String(b.id),
    label: [b.customerName || t('Booking {id}', { id: String(b.id) }), b.plotNumber && t('Plot {plot}', { plot: b.plotNumber }), date(b.bookingDate), money(b.agreedValue)].filter(Boolean).join(' · '),
  }));
  return (
    <SelectInput
      label={t('Booking')} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={list.loading ? t('Loading bookings…') : options.length ? t('Choose a booking') : t('No bookings yet')}
      options={options}
    />
  );
}
