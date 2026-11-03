/**
 * /real-estate/bookings/:bookingId          → booking details, transactions and documents
 * /real-estate/bookings/:bookingId/ledger   → ledger + record a payment
 */
import { useParams } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import BookingLedgerView from '../components/BookingLedgerView.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';

export default function BookingLedgerPage({ view = 'ledger' }: { view?: 'detail' | 'ledger' }) {
  const t = useT();
  const { bookingId = '' } = useParams();
  const base = `${RE_ROOT}/bookings/${encodeURIComponent(bookingId)}`;
  const crumbs: [string | null, string][] = view === 'ledger'
    ? [[`${RE_ROOT}/bookings`, t('Bookings')], [base, t('Booking')], [null, t('Ledger')]]
    : [[`${RE_ROOT}/bookings`, t('Bookings')], [null, t('Booking')]];
  return (
    <RealEstateLayout title={view === 'ledger' ? t('Booking ledger') : t('Booking')} feature="Bookings" crumbs={crumbs}>
      <BookingLedgerView bookingId={bookingId} view={view} />
    </RealEstateLayout>
  );
}
