/** /real-estate/documents?bookingId= — booking documents and images (dedicated container). */
import { useT } from '../../../i18n/language.ts';
import { realEstateApi } from '../api/realEstateApi.ts';
import { EmptyView } from '../components/ApiStateView.tsx';
import BookingSelector, { useSelectedBooking } from '../components/BookingSelector.tsx';
import DocumentsPanel from '../components/DocumentsPanel.tsx';
import RealEstateLayout from '../components/RealEstateLayout.tsx';
import { useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';

export default function DocumentsPage() {
  const t = useT();
  const [bookingId, setBookingId] = useSelectedBooking();
  // Existing documents come with the booking, when the API includes them.
  const booking = useRealEstateQuery((s) => realEstateApi.bookings.get(bookingId, s), [bookingId], { enabled: !!bookingId });
  return (
    <RealEstateLayout title={t('Documents and images')} feature="Bookings" crumbs={[[null, t('Documents and images')]]}
      intro={t('Agreements, receipts and photos are stored in the dedicated Real Estate / OCR storage, not with ordinary site images.')}>
      <section className="re-card" aria-label={t('Choose a booking')}>
        <BookingSelector value={bookingId} onChange={setBookingId} />
      </section>
      {bookingId ? <DocumentsPanel key={bookingId} bookingId={bookingId} initial={booking.data?.documents ?? []} />
        : <EmptyView icon="🗂️" title={t('Choose a booking')}>{t('Documents are kept with a booking. Pick one to view or add documents.')}</EmptyView>}
    </RealEstateLayout>
  );
}
