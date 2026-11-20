/**
 * /real-estate/bookings — "Customer and booking details": every booking with its customer,
 * phone, address, plot and total paid. New bookings are made from Booking and transaction details.
 */
import { useT } from '../../../i18n/language.ts';
import BookingLedgerTable from '../components/BookingLedgerTable.tsx';
import RealEstateLayout from '../components/RealEstateLayout.tsx';

export default function BookingsPage() {
  const t = useT();
  return (
    <RealEstateLayout title={t('Customer and booking details')} feature="Bookings" crumbs={[[null, t('Customer and booking details')]]}
      intro={t('Every booking with its customer and plot.')}>
      <BookingLedgerTable showAction={false} />
    </RealEstateLayout>
  );
}
