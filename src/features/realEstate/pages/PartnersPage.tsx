import { useState, type FormEvent } from 'react';
import { useToast } from '../../../context/ToastContext.jsx';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateApi } from '../api/realEstateApi.ts';
import { EmptyView, ErrorView, InlineError, LoadingState, serverFieldErrors } from '../components/ApiStateView.tsx';
import { bind, Input } from '../components/FormFields.tsx';
import RealEstateLayout from '../components/RealEstateLayout.tsx';
import { useRealEstateMutation, useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import { hasErrors, validatePartner, type Errors, type PartnerForm } from '../utils/validation.ts';

const EMPTY: PartnerForm = { businessName: '', contactPerson: '', phone: '', email: '', address: '', gstNumber: '' };
const KEYS = Object.keys(EMPTY) as (keyof PartnerForm)[];

export default function PartnersPage() {
  const t = useT();
  const access = useRealEstateAccess();
  const { toast } = useToast();
  const list = useRealEstateQuery((s) => realEstateApi.partners.list(s), [], { enabled: access.has('Partners') });
  // Only shown when the backend grants it; the API still enforces it.
  const canCreate = access.can('Partners.Create');
  const [form, setForm] = useState<PartnerForm>(EMPTY);
  const [errors, setErrors] = useState<Errors<keyof PartnerForm>>({});
  const create = useRealEstateMutation(realEstateApi.partners.create);
  const f = bind(form, setForm);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validatePartner(form, t);
    setErrors(v);
    if (hasErrors(v)) return;
    const created = await create.run(form);
    if (created) {
      toast(t('Partner “{name}” added', { name: created.businessName || form.businessName }));
      setForm(EMPTY);
      list.setData((p) => [...(p ?? []), created]);
    }
  };
  const fieldErr = { ...serverFieldErrors(create.error, KEYS), ...errors };

  return (
    <RealEstateLayout title={t('Partners')} feature="Partners" crumbs={[[null, t('Partners')]]} intro={t('Developers and plot sellers you work with.')}>
      <div className={canCreate ? 're-split' : ''}>
        <section className="re-card" aria-labelledby="re-partners">
          <h2 id="re-partners">{t('Your partners')}</h2>
          {list.loading && <LoadingState />}
          {list.error && <ErrorView error={list.error} onRetry={list.reload} />}
          {list.data && list.data.length === 0 && <EmptyView title={t('No partners yet')}>{canCreate ? t('Add the first partner with the form.') : t('No partners have been shared with your account.')}</EmptyView>}
          {list.data && list.data.length > 0 && (
            <div className="re-table-wrap" role="region" aria-label={t('Partners')} tabIndex={0}>
              <table className="re-table">
                <thead><tr><th scope="col">{t('Business')}</th><th scope="col">{t('Contact')}</th><th scope="col">{t('Phone')}</th><th scope="col">{t('Email')}</th><th scope="col">{t('GST')}</th></tr></thead>
                <tbody>
                  {list.data.map((p) => (
                    <tr key={String(p.id)}>
                      <td data-label={t('Business')}><strong>{p.businessName}</strong>{p.address && <small className="re-sub">{p.address}</small>}</td>
                      <td data-label={t('Contact')}>{p.contactPerson || '—'}</td>
                      <td data-label={t('Phone')}>{p.phone || '—'}</td>
                      <td data-label={t('Email')}>{p.email || '—'}</td>
                      <td data-label={t('GST')}>{p.gstNumber || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {canCreate && (
          <section className="re-card" aria-labelledby="re-new-partner">
            <h2 id="re-new-partner">{t('Add a partner')}</h2>
            <form className="re-form" onSubmit={submit} noValidate>
              <Input label={t('Business name')} required {...f('businessName')} error={fieldErr.businessName} autoComplete="organization" />
              <Input label={t('Contact person')} required {...f('contactPerson')} error={fieldErr.contactPerson} autoComplete="name" />
              <Input label={t('Phone')} required type="tel" inputMode="tel" {...f('phone')} error={fieldErr.phone} autoComplete="tel" />
              <Input label={t('Email')} optional type="email" {...f('email')} error={fieldErr.email} autoComplete="email" />
              <Input label={t('Address')} optional {...f('address')} error={fieldErr.address} autoComplete="street-address" />
              <Input label={t('GST number')} optional {...f('gstNumber')} error={fieldErr.gstNumber} hint={t('15-character GSTIN')} />
              <InlineError error={create.error} conflictText={t('A partner with these details already exists.')} />
              <button type="submit" className="btn btn-primary" disabled={create.pending}>{create.pending ? t('Saving…') : t('Add partner')}</button>
            </form>
          </section>
        )}
      </div>
    </RealEstateLayout>
  );
}
