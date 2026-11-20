/**
 * /real-estate/bookings/:bookingId (and …/ledger) — transaction details of one booking:
 * booking, customer and plot, payment history, record a payment, documents and images.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { useT } from '../../../i18n/language.ts';
import BookingLedgerView from '../components/BookingLedgerView.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';

export default function BookingLedgerPage() {
  const t = useT();
  const { bookingId = '' } = useParams();
  const access = useRealEstateAccess();
  const [recording, setRecording] = useState(false);
  return (
    <RealEstateLayout title={t('Transaction details')} feature="Ledger" back={`${RE_ROOT}/ledger`}
      toolbar={access.has('Ledger') ? <button type="button" className="btn btn-primary btn-sm" onClick={() => setRecording(true)}>+ {t('Record a payment')}</button> : undefined}
      crumbs={[[`${RE_ROOT}/ledger`, t('Booking and transaction details')], [null, t('Booking {id}', { id: bookingId })]]}>
      <BookingLedgerView key={bookingId} bookingId={bookingId} recording={recording} onRecordingChange={setRecording} />
    </RealEstateLayout>
  );
}
