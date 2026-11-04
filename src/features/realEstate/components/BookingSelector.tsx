/**
 * Pick a booking. The API has no bookings list, so this offers the bookings created in this
 * tab (utils/recent.ts) and always lets you type a booking ID. The choice lives in the URL
 * (?bookingId=) so deep links and refresh keep it.
 */
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { date, money } from '../utils/format.ts';
import { recentBookings } from '../utils/recent.ts';
import { Input, SelectInput } from './FormFields.tsx';

export function useSelectedBooking(): [string, (id: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get('bookingId') ?? '';
  const set = (id: string) => setParams((p) => { const n = new URLSearchParams(p); if (id) n.set('bookingId', id); else n.delete('bookingId'); return n; }, { replace: true });
  return [value, set];
}

export default function BookingSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const t = useT();
  const [manual, setManual] = useState(value);
  const recent = recentBookings();
  const submit = (e: FormEvent) => { e.preventDefault(); onChange(manual.trim()); };
  const options = recent.map((b) => ({
    value: String(b.id),
    label: [b.customerName || t('Booking {id}', { id: String(b.id) }), b.plotNumber && t('Plot {plot}', { plot: b.plotNumber }), date(b.bookingDate), b.agreedValue ? money(b.agreedValue) : ''].filter(Boolean).join(' · '),
  }));
  return (
    <div className="re-booking-pick">
      {options.length > 0 && (
        <SelectInput label={t('Bookings created in this session')} value={options.some((o) => o.value === value) ? value : ''}
          onChange={(e) => { setManual(e.target.value); onChange(e.target.value); }} placeholder={t('Choose a booking')} options={options} />
      )}
      <form className="re-search" onSubmit={submit} aria-label={t('Open a booking')}>
        <Input label={t('Booking ID')} inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value)} />
        <button type="submit" className="btn btn-outline" disabled={!manual.trim()}>{t('Open')}</button>
      </form>
    </div>
  );
}
