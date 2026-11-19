/**
 * /real-estate/bookings/:bookingId (and …/ledger) — transaction details of one booking:
 * booking, customer and plot, payment history, record a payment, documents and images.
 */
import { useParams } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import BookingLedgerView from '../components/BookingLedgerView.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';

export default function BookingLedgerPage() {
  const t = useT();
  const { bookingId = '' } = useParams();
  return (
    <RealEstateLayout title={t('Transaction details')} feature="Ledger" back={`${RE_ROOT}/ledger`} crumbs={[[`${RE_ROOT}/ledger`, t('Transaction and documents details')], [null, t('Booking {id}', { id: bookingId })]]}>
      <BookingLedgerView key={bookingId} bookingId={bookingId} />
    </RealEstateLayout>
  );
}
