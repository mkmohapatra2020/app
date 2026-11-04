/**
 * Bookings: create a booking (POST /realestate/bookings) and see the bookings created in this
 * session. The API has no bookings list, so other bookings are opened by ID.
 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext.jsx';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateApi } from '../api/realEstateApi.ts';
import { EmptyView, ErrorView } from '../components/ApiStateView.tsx';
import BookingForm from '../components/BookingForm.tsx';
import BookingSelector from '../components/BookingSelector.tsx';
import { SelectInput } from '../components/FormFields.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import RealEstateStatusBadge from '../components/RealEstateStatusBadge.tsx';
import { useRealEstateMutation, useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import type { BookingInput } from '../types/realEstateTypes.ts';
import { date, money } from '../utils/format.ts';
import { recentBookings, rememberBooking } from '../utils/recent.ts';

export default function BookingsPage() {
  const t = useT();
  const access = useRealEstateAccess();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const enabled = access.has('Bookings');
  const [recent, setRecent] = useState(recentBookings);

  // Booking form data: the user's partner's customers, projects → plots.
  const [projectId, setProjectId] = useState(params.get('projectId') ?? '');
  const partners = useRealEstateQuery((s) => realEstateApi.partners.list(s), [], { enabled });
  const partnerId = access.access.partnerId ?? partners.data?.[0]?.id ?? null;
  const customers = useRealEstateQuery((s) => realEstateApi.customers.list(partnerId as string | number, s), [partnerId], { enabled: enabled && partnerId !== null && access.has('Customers') });
  const projects = useRealEstateQuery((s) => realEstateApi.projects.list(null, s), [], { enabled });
  const plots = useRealEstateQuery((s) => realEstateApi.plots.list(projectId, s), [projectId], { enabled: enabled && !!projectId });
  const create = useRealEstateMutation(realEstateApi.bookings.create);

  const submit = async (input: BookingInput) => {
    const created = await create.run(input);
    plots.reload(); // the plot's status changed (booked, or e.g. 409: taken by someone else)
    if (!created) return false;
    // The API has no booking detail/list: keep what we know for this session.
    const customer = customers.data?.find((c) => String(c.id) === String(input.customerId));
    const plot = plots.data?.find((p) => String(p.id) === String(input.plotId));
    const project = projects.data?.find((p) => String(p.id) === projectId);
    rememberBooking(created, {
      customerName: customer?.name, plotNumber: plot?.plotNumber, projectName: project ? [project.name, project.phase].filter(Boolean).join(' ') : '',
      bookingAmount: input.bookingAmount, agreedValue: input.agreedValue,
    });
    setRecent(recentBookings());
    toast(t('Booking created'));
    return true;
  };

  return (
    <RealEstateLayout title={t('Bookings')} feature="Bookings" crumbs={[[null, t('Bookings')]]} intro={t('Plot bookings and their payment ledgers.')}>
      <div className="re-split">
        <section className="re-card" aria-labelledby="re-bookings">
          <h2 id="re-bookings">{t('Bookings created in this session')}</h2>
          {recent.length === 0 ? (
            <EmptyView title={t('No bookings in this session')}>{t('Create a booking with the form, or open an existing booking by its ID below.')}</EmptyView>
          ) : (
            <div className="re-table-wrap" role="region" aria-label={t('Bookings')} tabIndex={0}>
              <table className="re-table">
                <thead><tr><th scope="col">{t('Booking ID')}</th><th scope="col">{t('Customer')}</th><th scope="col">{t('Plot')}</th><th scope="col" className="num">{t('Booking amount')}</th><th scope="col" className="num">{t('Agreed value')}</th><th scope="col">{t('Status')}</th></tr></thead>
                <tbody>
                  {recent.map((b) => (
                    <tr key={String(b.id)}>
                      <td data-label={t('Booking ID')}><Link to={`${RE_ROOT}/bookings/${encodeURIComponent(String(b.id))}`}>{String(b.id)}</Link><small className="re-sub">{date(b.bookingDate)}</small></td>
                      <td data-label={t('Customer')}>{b.customerName || '—'}</td>
                      <td data-label={t('Plot')}>{b.plotNumber || '—'}{b.projectName && <small className="re-sub">{b.projectName}</small>}</td>
                      <td data-label={t('Booking amount')} className="num">{money(b.bookingAmount)}</td>
                      <td data-label={t('Agreed value')} className="num">{money(b.agreedValue)}</td>
                      <td data-label={t('Status')}><RealEstateStatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h3 className="re-subhead">{t('Open a booking')}</h3>
          <BookingSelector value="" onChange={(id) => { if (id) navigate(`${RE_ROOT}/bookings/${encodeURIComponent(id)}`); }} />
        </section>

        <section className="re-card" aria-labelledby="re-new-booking">
          <h2 id="re-new-booking">{t('New booking')}</h2>
          <SelectInput label={t('Project')} value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder={projects.loading ? t('Loading projects…') : t('Choose a project')}
            options={(projects.data ?? []).map((p) => ({ value: String(p.id), label: p.phase ? `${p.name} · ${p.phase}` : p.name }))} />
          {[customers.error, projects.error, plots.error].filter(Boolean).slice(0, 1).map((e) => <ErrorView key="e" error={e!} onRetry={() => { customers.reload(); projects.reload(); plots.reload(); }} />)}
          {!access.has('Customers') && <p className="f-alert f-alert-info">{t("Your account can't list customers, so bookings can't be created here.")}</p>}
          <BookingForm
            key={`${projectId}:${params.get('plotId') ?? ''}`}
            customers={customers.data ?? []}
            plots={plots.data ?? []}
            initialPlotId={params.get('projectId') === projectId ? params.get('plotId') ?? '' : ''}
            pending={create.pending}
            error={create.error}
            onSubmit={submit}
          />
        </section>
      </div>
    </RealEstateLayout>
  );
}
