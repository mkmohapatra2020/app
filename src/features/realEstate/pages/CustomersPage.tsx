/**
 * Customers of a partner. Aadhaar / PAN are always masked in the list, are sent only on
 * create, and are never logged or kept after the form is cleared.
 */
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext.jsx';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateApi } from '../api/realEstateApi.ts';
import { EmptyView, ErrorView, InlineError, LoadingState, serverFieldErrors } from '../components/ApiStateView.tsx';
import { bind, Input, SelectInput } from '../components/FormFields.tsx';
import Pager from '../components/Pager.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import { useRealEstateMutation, useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import type { Customer } from '../types/realEstateTypes.ts';
import { maskAadhaar, maskPan } from '../utils/format.ts';
import { hasErrors, validateCustomer, type CustomerForm, type Errors } from '../utils/validation.ts';

const PAGE_SIZE = 20;
const KEYS: (keyof CustomerForm)[] = ['partnerId', 'name', 'phone', 'email', 'address', 'aadhaarNumber', 'panNumber'];

export function CustomerRow({ c }: { c: Customer }) {
  const t = useT();
  return (
    <tr>
      <td data-label={t('Name')}><strong>{c.name}</strong>{c.address && <small className="re-sub">{c.address}</small>}</td>
      <td data-label={t('Phone')}>{c.phone || '—'}</td>
      <td data-label={t('Email')}>{c.email || '—'}</td>
      <td data-label={t('Aadhaar')} className="re-mono">{maskAadhaar(c.aadhaarNumber)}</td>
      <td data-label={t('PAN')} className="re-mono">{maskPan(c.panNumber)}</td>
    </tr>
  );
}

export default function CustomersPage() {
  const t = useT();
  const access = useRealEstateAccess();
  const { toast } = useToast();
  const enabled = access.has('Customers');
  const partners = useRealEstateQuery((s) => realEstateApi.partners.list(s), [], { enabled });
  const defaultPartner = access.access.partnerId !== null ? String(access.access.partnerId) : '';
  // Partner filter in the URL (?partnerId=) — deep-linkable from the partners list.
  const [params, setParams] = useSearchParams();
  const partnerId = params.get('partnerId') ?? defaultPartner;
  const setPartnerId = (v: string) => setParams((cur) => { const n = new URLSearchParams(cur); n.set('partnerId', v); return n; }, { replace: true });
  const partnerOptions = (partners.data ?? []).map((p) => ({ value: String(p.id), label: p.businessName }));
  // Use the access partner, else the first visible partner.
  const selected = partnerOptions.find((o) => o.value === partnerId)?.value ?? partnerOptions[0]?.value ?? '';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const list = useRealEstateQuery((s) => realEstateApi.customers.list(selected, { page, pageSize: PAGE_SIZE, search: query }, s), [selected, page, query], { enabled: enabled && !!selected });

  const empty: CustomerForm = { partnerId: selected, name: '', phone: '', email: '', address: '', aadhaarNumber: '', panNumber: '' };
  const [form, setForm] = useState<CustomerForm>(empty);
  const [errors, setErrors] = useState<Errors<keyof CustomerForm>>({});
  const create = useRealEstateMutation(realEstateApi.customers.create);
  const f = bind(form, setForm);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validateCustomer({ ...form, partnerId: selected }, t);
    setErrors(v);
    if (hasErrors(v)) return;
    const partner = partners.data?.find((p) => String(p.id) === selected);
    if (!partner) return;
    const created = await create.run({ ...form, partnerId: partner.id });
    if (created) {
      toast(t('Customer {name} added', { name: created.name || form.name }));
      setForm(empty); // clears Aadhaar / PAN from memory
      list.reload();
    }
  };
  const fieldErr = { ...serverFieldErrors(create.error, KEYS), ...errors };

  return (
    <RealEstateLayout title={t('Customers and bookings')} feature="Customers" crumbs={[[null, t('Customers')]]} intro={t('Land buyers registered under a partner, and their plot bookings.')}
      actions={access.has('Bookings') ? <Link className="btn btn-primary" to={`${RE_ROOT}/bookings`}>{t('Bookings')} →</Link> : undefined}>
      <div className="re-split">
        <section className="re-card" aria-labelledby="re-customers">
          <div className="re-card-head">
            <h2 id="re-customers">{t('Customers')}</h2>
            {partnerOptions.length > 1 && (
              <SelectInput label={t('Partner')} value={selected} onChange={(e) => { setPartnerId(e.target.value); setPage(1); }} options={partnerOptions} />
            )}
          </div>
          <form className="re-search" role="search" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search.trim()); }}>
            <Input label={t('Search by name or phone')} type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="submit" className="btn btn-outline">{t('Search')}</button>
          </form>
          {partners.error && <ErrorView error={partners.error} onRetry={partners.reload} />}
          {partners.data && !partnerOptions.length && <EmptyView title={t('No partners available')}>{t('Customers belong to a partner. Ask an administrator to share one with you.')}</EmptyView>}
          {list.loading && <LoadingState />}
          {list.error && <ErrorView error={list.error} onRetry={list.reload} />}
          {list.data && list.data.items.length === 0 && !list.loading && <EmptyView title={query ? t('No matching customers') : t('No customers yet')} />}
          {list.data && list.data.items.length > 0 && (
            <>
              <div className="re-table-wrap" role="region" aria-label={t('Customers')} tabIndex={0}>
                <table className="re-table">
                  <thead><tr><th scope="col">{t('Name')}</th><th scope="col">{t('Phone')}</th><th scope="col">{t('Email')}</th><th scope="col">{t('Aadhaar')}</th><th scope="col">{t('PAN')}</th></tr></thead>
                  <tbody>{list.data.items.map((c) => <CustomerRow key={String(c.id)} c={c} />)}</tbody>
                </table>
              </div>
              <Pager page={page} pageSize={PAGE_SIZE} total={list.data.total} count={list.data.items.length} onPage={setPage} />
            </>
          )}
        </section>

        <section className="re-card" aria-labelledby="re-new-customer">
          <h2 id="re-new-customer">{t('Add a customer')}</h2>
          <form className="re-form" onSubmit={submit} noValidate autoComplete="off">
            <Input label={t('Full name')} required {...f('name')} error={fieldErr.name} />
            <Input label={t('Mobile number')} required type="tel" inputMode="tel" {...f('phone')} error={fieldErr.phone} hint={t('Used for WhatsApp receipts')} />
            <Input label={t('Email')} optional type="email" {...f('email')} error={fieldErr.email} />
            <Input label={t('Address')} optional {...f('address')} error={fieldErr.address} />
            <Input label={t('Aadhaar number')} optional inputMode="numeric" maxLength={14} {...f('aadhaarNumber')} error={fieldErr.aadhaarNumber} hint={t('Stored securely; shown masked')} />
            <Input label={t('PAN number')} optional maxLength={10} {...f('panNumber')} error={fieldErr.panNumber} style={{ textTransform: 'uppercase' }} />
            <InlineError error={create.error} conflictText={t('A customer with this phone number already exists for the partner.')} />
            <button type="submit" className="btn btn-primary" disabled={create.pending || !selected}>{create.pending ? t('Saving…') : t('Add customer')}</button>
          </form>
        </section>
      </div>
    </RealEstateLayout>
  );
}
