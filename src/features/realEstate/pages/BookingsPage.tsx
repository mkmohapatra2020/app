import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext.jsx';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateApi } from '../api/realEstateApi.ts';
import { EmptyView, ErrorView, LoadingState } from '../components/ApiStateView.tsx';
import BookingForm from '../components/BookingForm.tsx';
import { SelectInput } from '../components/FormFields.tsx';
import Pager from '../components/Pager.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import RealEstateStatusBadge from '../components/RealEstateStatusBadge.tsx';
import { useRealEstateMutation, useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import { BOOKING_STATUSES, type BookingInput } from '../types/realEstateTypes.ts';
import { date, money } from '../utils/format.ts';

const PAGE_SIZE = 20;

export default function BookingsPage() {
  const t = useT();
  const access = useRealEstateAccess();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const enabled = access.has('Bookings');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const list = useRealEstateQuery((s) => realEstateApi.bookings.list({ page, pageSize: PAGE_SIZE, status }, s), [page, status], { enabled });

  // Booking form data: the user's partner's customers, projects → plots.
  const [projectId, setProjectId] = useState(params.get('projectId') ?? '');
  const partners = useRealEstateQuery((s) => realEstateApi.partners.list(s), [], { enabled });
  const partnerId = access.access.partnerId ?? partners.data?.[0]?.id ?? null;
  const customers = useRealEstateQuery((s) => realEstateApi.customers.list(partnerId as string | number, { page: 1, pageSize: 200 }, s), [partnerId], { enabled: enabled && partnerId !== null && access.has('Customers') });
  const projects = useRealEstateQuery((s) => realEstateApi.projects.list(s), [], { enabled });
  const plots = useRealEstateQuery((s) => realEstateApi.plots.list(projectId, s), [projectId], { enabled: enabled && !!projectId });
  const create = useRealEstateMutation(realEstateApi.bookings.create);

  const submit = async (input: BookingInput) => {
    const created = await create.run(input);
    if (!created) {
      plots.reload(); // e.g. 409: the plot's status changed — show the current one
      return false;
    }
    toast(t('Booking created'));
    plots.reload();
    setPage(1);
    list.reload();
    return true;
  };

  return (
    <RealEstateLayout title={t('Bookings')} feature="Bookings" crumbs={[[null, t('Bookings')]]} intro={t('Plot bookings and their payment ledgers.')}>
      <div className="re-split">
        <section className="re-card" aria-labelledby="re-bookings">
          <div className="re-card-head">
            <h2 id="re-bookings">{t('Bookings')}</h2>
            <SelectInput label={t('Status')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder={t('All statuses')} options={BOOKING_STATUSES.map((s) => ({ value: s, label: t(s) }))} />
          </div>
          {list.loading && <LoadingState />}
          {list.error && <ErrorView error={list.error} onRetry={list.reload} />}
          {list.data && list.data.items.length === 0 && !list.loading && <EmptyView title={t('No bookings yet')}>{t('Create a booking from an available plot.')}</EmptyView>}
          {list.data && list.data.items.length > 0 && (
            <>
              <div className="re-table-wrap" role="region" aria-label={t('Bookings')} tabIndex={0}>
                <table className="re-table">
                  <thead><tr><th scope="col">{t('Booking date')}</th><th scope="col">{t('Customer')}</th><th scope="col">{t('Plot')}</th><th scope="col" className="num">{t('Booking amount')}</th><th scope="col" className="num">{t('Agreed value')}</th><th scope="col">{t('Status')}</th></tr></thead>
                  <tbody>
                    {list.data.items.map((b) => (
                      <tr key={String(b.id)}>
                        <td data-label={t('Booking date')}><Link to={`${RE_ROOT}/bookings/${encodeURIComponent(String(b.id))}`}>{date(b.bookingDate)}</Link></td>
                        <td data-label={t('Customer')}>{b.customerName || '—'}</td>
                        <td data-label={t('Plot')}>{b.plotNumber || '—'}{b.projectName && <small className="re-sub">{b.projectName}</small>}</td>
                        <td data-label={t('Booking amount')} className="num">{money(b.bookingAmount)}</td>
                        <td data-label={t('Agreed value')} className="num">{money(b.agreedValue)}</td>
                        <td data-label={t('Status')}><RealEstateStatusBadge status={String(b.status)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={page} pageSize={PAGE_SIZE} total={list.data.total} count={list.data.items.length} onPage={setPage} />
            </>
          )}
        </section>

        <section className="re-card" aria-labelledby="re-new-booking">
          <h2 id="re-new-booking">{t('New booking')}</h2>
          <SelectInput label={t('Project')} value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder={projects.loading ? t('Loading projects…') : t('Choose a project')}
            options={(projects.data ?? []).map((p) => ({ value: String(p.id), label: p.phase ? `${p.name} · ${p.phase}` : p.name }))} />
          {[customers.error, projects.error, plots.error].filter(Boolean).slice(0, 1).map((e) => <ErrorView key="e" error={e!} onRetry={() => { customers.reload(); projects.reload(); plots.reload(); }} />)}
          {!access.has('Customers') && <p className="f-alert f-alert-info">{t("Your account can't list customers, so bookings can't be created here.")}</p>}
          <BookingForm
            key={`${projectId}:${params.get('plotId') ?? ''}`}
            customers={customers.data?.items ?? []}
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
