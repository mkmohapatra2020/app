/** /real-estate/ledger — every payment; View opens the booking's transaction and document details. */
import { useNavigate } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import PaymentsTable from '../components/PaymentsTable.tsx';
import BookingSelector from '../components/BookingSelector.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';

export default function LedgerTransactionsPage() {
  const t = useT();
  const navigate = useNavigate();
  return (
    <RealEstateLayout title={t('Transaction and documents details')} feature="Ledger" crumbs={[[null, t('Transaction and documents details')]]}
      intro={t('Each payment records three separate amounts: total received, commission and property amount.')}>
      <section className="re-card" aria-label={t('Open a booking')}>
        <BookingSelector value="" onChange={(id) => { if (id) navigate(`${RE_ROOT}/bookings/${encodeURIComponent(id)}`); }} />
      </section>
      <PaymentsTable />
    </RealEstateLayout>
  );
}
