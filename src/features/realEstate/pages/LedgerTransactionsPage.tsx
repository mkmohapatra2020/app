/** /real-estate/ledger?bookingId= — pick a booking, see its ledger and record payments. */
import { useT } from '../../../i18n/language.ts';
import BookingLedgerView from '../components/BookingLedgerView.tsx';
import BookingSelector, { useSelectedBooking } from '../components/BookingSelector.tsx';
import { EmptyView } from '../components/ApiStateView.tsx';
import RealEstateLayout from '../components/RealEstateLayout.tsx';

export default function LedgerTransactionsPage() {
  const t = useT();
  const [bookingId, setBookingId] = useSelectedBooking();
  return (
    <RealEstateLayout title={t('Ledger transactions')} feature="Ledger" crumbs={[[null, t('Ledger transactions')]]}
      intro={t('Each payment records three separate amounts: total received, commission and property amount.')}>
      <section className="re-card" aria-label={t('Choose a booking')}>
        <BookingSelector value={bookingId} onChange={setBookingId} />
      </section>
      {bookingId ? <BookingLedgerView key={bookingId} bookingId={bookingId} view="ledger" />
        : <EmptyView icon="📒" title={t('Choose a booking')}>{t('Pick a booking to see its payments and record a new one.')}</EmptyView>}
    </RealEstateLayout>
  );
}
