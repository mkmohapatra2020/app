/**
 * "New booking" popup. The customer can be chosen from the partner's customers or added on the
 * spot (POST /realestate/customers) before the booking is created (POST /realestate/bookings).
 * The booking amount is then recorded as the first payment and attached documents are saved
 * to the new booking. Data is loaded only while the popup is open.
 */
import { useEffect, useId, useState } from 'react';
import { useToast } from '../../../context/ToastContext.jsx';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateApi } from '../api/realEstateApi.ts';
import { useRealEstateMutation, useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import type { BookingInput, Id } from '../types/realEstateTypes.ts';
import { rememberBooking } from '../utils/recent.ts';
import { ErrorView } from './ApiStateView.tsx';
import BookingForm, { type BookingExtras, type NewCustomer } from './BookingForm.tsx';
import { SelectInput } from './FormFields.tsx';
import { today } from './TransactionForm.tsx';

interface Props {
  onClose: () => void;
  /** Called after the booking (and its first payment / documents) were saved. */
  onCreated: (bookingId: Id) => void;
  /** Pre-selected project and plot (the plot list's "Book" link). */
  initialProjectId?: string;
  initialPlotId?: string;
}

export default function NewBookingDialog({ onClose, onCreated, initialProjectId = '', initialPlotId = '' }: Props) {
  const t = useT();
  const access = useRealEstateAccess();
  const { toast } = useToast();
  const titleId = useId();
  const enabled = access.has('Bookings');
  const [projectId, setProjectId] = useState(initialProjectId);
  const partners = useRealEstateQuery((s) => realEstateApi.partners.list(s), [], { enabled });
  const partnerId = access.access.partnerId ?? partners.data?.[0]?.id ?? null;
  const customers = useRealEstateQuery((s) => realEstateApi.customers.list(partnerId as string | number, s), [partnerId], { enabled: enabled && partnerId !== null && access.has('Customers') });
  const projects = useRealEstateQuery((s) => realEstateApi.projects.list(null, s), [], { enabled });
  const plots = useRealEstateQuery((s) => realEstateApi.plots.list(projectId, s), [projectId], { enabled: enabled && !!projectId });
  const createCustomer = useRealEstateMutation(realEstateApi.customers.create);
  const create = useRealEstateMutation(realEstateApi.bookings.create);
  const pending = create.pending || createCustomer.pending;

  useEffect(() => {
    // Escape closes the popup, unless the confirm dialog on top of it is open (it handles Escape itself).
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !pending && document.querySelectorAll('.re-dialog-backdrop').length === 1) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, pending]);

  const submit = async (input: BookingInput, newCustomer: NewCustomer | undefined, extras: BookingExtras) => {
    let customerId = input.customerId;
    let customerName = customers.data?.find((c) => String(c.id) === String(customerId))?.name;
    if (newCustomer) {
      if (partnerId === null) return false;
      const added = await createCustomer.run({ partnerId, name: newCustomer.name, phone: newCustomer.phone, email: newCustomer.email, address: newCustomer.address, aadhaarNumber: '', panNumber: '' });
      if (!added) return false;
      customers.reload();
      customerId = added.id;
      customerName = added.name || newCustomer.name;
    }
    const created = await create.run({ ...input, customerId });
    plots.reload(); // the plot's status changed (booked, or e.g. 409: taken by someone else)
    if (!created) return false;
    const plot = plots.data?.find((p) => String(p.id) === String(input.plotId));
    const project = projects.data?.find((p) => String(p.id) === projectId);
    rememberBooking(created, {
      customerName, plotNumber: plot?.plotNumber, projectName: project ? [project.name, project.phase].filter(Boolean).join(' ') : '',
      bookingAmount: input.bookingAmount, agreedValue: input.agreedValue,
    });
    // The booking amount is the first payment; documents go to the new booking. A failure here
    // keeps the booking and says what to add from its transaction details page.
    const missing: string[] = [];
    if (access.has('Ledger') && input.bookingAmount > 0) {
      try {
        await realEstateApi.ledger.create(created.id, { transactionDate: today(), amount: input.bookingAmount, commissionAmount: extras.commissionAmount, propertyAmount: null, paymentMode: extras.paymentMode, referenceNumber: '', remarks: t('Booking amount') });
      } catch { missing.push(t('the booking amount payment')); }
    }
    let docsFailed = 0;
    for (const d of extras.documents) {
      try { await realEstateApi.documents.create({ bookingId: created.id, documentType: d.documentType, blob: d.blob }); } catch { docsFailed += 1; }
    }
    if (docsFailed) missing.push(t('{n} document(s)', { n: docsFailed }));
    toast(t('Booking #{id} created', { id: String(created.id) }));
    if (missing.length) toast(t('Not saved: {what}. Add it from the booking’s transaction details.', { what: missing.join(', ') }));
    onCreated(created.id);
    return true;
  };

  return (
    <div className="re-dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !pending) onClose(); }}>
      <div className="re-dialog re-booking-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="re-card-head">
          <h2 id={titleId}>{t('New booking')}</h2>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose} aria-label={t('Close')}>✕</button>
        </div>
        {[customers.error, projects.error, plots.error, partners.error].filter(Boolean).slice(0, 1).map((e) => <ErrorView key="e" error={e!} onRetry={() => { partners.reload(); customers.reload(); projects.reload(); plots.reload(); }} />)}
        {!access.has('Customers') && <p className="f-alert f-alert-info">{t("Your account can't list customers, so bookings can't be created here.")}</p>}
        <BookingForm
          key={`${projectId}:${initialPlotId}`}
          customers={customers.data ?? []}
          plots={plots.data ?? []}
          before={<SelectInput label={t('Project')} value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder={projects.loading ? t('Loading projects…') : t('Choose a project')}
            options={(projects.data ?? []).map((p) => ({ value: String(p.id), label: p.phase ? `${p.name} · ${p.phase}` : p.name }))} />}
          canAddCustomer={partnerId !== null}
          initialPlotId={projectId === initialProjectId ? initialPlotId : ''}
          pending={pending}
          error={createCustomer.error ?? create.error}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
