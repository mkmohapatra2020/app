/**
 * /real-estate/ledger — every payment; View opens the booking's transaction and document details.
 * "New booking" (header) opens the booking popup; ?new=1 or ?projectId=&plotId= open it straight away.
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import BookingSelector from '../components/BookingSelector.tsx';
import NewBookingDialog from '../components/NewBookingDialog.tsx';
import PaymentsTable from '../components/PaymentsTable.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';

export default function LedgerTransactionsPage() {
  const t = useT();
  const navigate = useNavigate();
  const access = useRealEstateAccess();
  const [params, setParams] = useSearchParams();
  const [booking, setBooking] = useState(params.get('new') === '1' || !!params.get('plotId'));
  const [reloadKey, setReloadKey] = useState(0);
  const close = () => {
    setBooking(false);
    // Drop ?new / ?projectId / ?plotId so a reload doesn't reopen the popup.
    if (params.has('new') || params.has('plotId') || params.has('projectId')) setParams({}, { replace: true });
  };
  return (
    <RealEstateLayout title={t('Booking and transaction details')} feature="Ledger" crumbs={[[null, t('Booking and transaction details')]]}
      intro={t('Each payment records three separate amounts: total received, commission and property amount.')}
      actions={access.has('Bookings') ? <button type="button" className="btn btn-primary" onClick={() => setBooking(true)}>+ {t('New booking')}</button> : undefined}>
      <section className="re-card" aria-label={t('Open a booking')}>
        <BookingSelector value="" onChange={(id) => { if (id) navigate(`${RE_ROOT}/bookings/${encodeURIComponent(id)}`); }} />
      </section>
      <PaymentsTable reloadKey={reloadKey} />
      {booking && (
        <NewBookingDialog
          initialProjectId={params.get('projectId') ?? ''}
          initialPlotId={params.get('plotId') ?? ''}
          onClose={close}
          onCreated={() => { close(); setReloadKey((k) => k + 1); }}
        />
      )}
    </RealEstateLayout>
  );
}
