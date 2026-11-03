import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext.jsx';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateApi } from '../api/realEstateApi.ts';
import { EmptyView, ErrorView, InlineError, LoadingState, serverFieldErrors } from '../components/ApiStateView.tsx';
import { bind, Input, SelectInput } from '../components/FormFields.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import { useRealEstateMutation, useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import { hasErrors, validateProject, type Errors, type ProjectForm } from '../utils/validation.ts';

const KEYS: (keyof ProjectForm)[] = ['partnerId', 'name', 'phase', 'location', 'district', 'state'];

export default function ProjectsPage() {
  const t = useT();
  const access = useRealEstateAccess();
  const { toast } = useToast();
  const enabled = access.has('Projects');
  // Partner filter in the URL (?partnerId=) — deep-linkable from the partners list.
  const [params, setParams] = useSearchParams();
  const filter = params.get('partnerId') ?? '';
  const setFilter = (v: string) => setParams((cur) => { const n = new URLSearchParams(cur); if (v) n.set('partnerId', v); else n.delete('partnerId'); return n; }, { replace: true });
  const projects = useRealEstateQuery((s) => realEstateApi.projects.list(filter || null, s), [filter], { enabled });
  // Only partners the API returns for this user can be chosen.
  const partners = useRealEstateQuery((s) => realEstateApi.partners.list(s), [], { enabled });
  const initial: ProjectForm = { partnerId: filter || (access.access.partnerId !== null ? String(access.access.partnerId) : ''), name: '', phase: '', location: '', district: '', state: 'Odisha' };
  const [form, setForm] = useState<ProjectForm>(initial);
  const [errors, setErrors] = useState<Errors<keyof ProjectForm>>({});
  const create = useRealEstateMutation(realEstateApi.projects.create);
  const f = bind(form, setForm);
  const partnerOptions = (partners.data ?? []).map((p) => ({ value: String(p.id), label: p.businessName }));
  const partnerId = partnerOptions.find((o) => o.value === form.partnerId)?.value ?? '';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validateProject({ ...form, partnerId }, t);
    setErrors(v);
    if (hasErrors(v)) return;
    const partner = partners.data?.find((p) => String(p.id) === partnerId);
    if (!partner) return;
    const created = await create.run({ ...form, partnerId: partner.id });
    if (created) {
      toast(t('Project “{name}” created', { name: created.name || form.name }));
      setForm({ ...initial, partnerId });
      projects.setData((l) => [...(l ?? []), created]);
    }
  };
  const fieldErr = { ...serverFieldErrors(create.error, KEYS), ...errors };

  return (
    <RealEstateLayout title={t('Projects and plots')} feature="Projects" crumbs={[[null, t('Projects')]]} intro={t('Layouts and phases. Open a project to manage its plots.')}>
      <div className="re-split">
        <section className="re-card" aria-labelledby="re-projects">
          <div className="re-card-head">
            <h2 id="re-projects">{t('Projects')}</h2>
            {partnerOptions.length > 1 && (
              <SelectInput label={t('Partner')} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('All partners')} options={partnerOptions} />
            )}
          </div>
          {projects.loading && <LoadingState />}
          {projects.error && <ErrorView error={projects.error} onRetry={projects.reload} />}
          {projects.data && projects.data.length === 0 && <EmptyView title={t('No projects yet')}>{t('Create your first project with the form.')}</EmptyView>}
          {projects.data && projects.data.length > 0 && (
            <ul className="re-cards">
              {projects.data.map((p) => (
                <li key={String(p.id)} className="re-mini">
                  <h3>{p.name}{p.phase && <span className="pill">{p.phase}</span>}{p.status && <span className={`re-badge re-badge-${p.status.toLowerCase() === 'active' ? 'ok' : 'muted'}`}>{t(p.status)}</span>}</h3>
                  <p className="re-sub">{[p.location, p.district, p.state].filter(Boolean).join(', ') || '—'}</p>
                  {p.partnerName && <p className="re-sub">{t('Partner: {name}', { name: p.partnerName })}</p>}
                  {access.has('Plots') && <Link className="btn btn-outline" to={`${RE_ROOT}/projects/${encodeURIComponent(String(p.id))}/plots`}>{t('View plots')} →</Link>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="re-card" aria-labelledby="re-new-project">
          <h2 id="re-new-project">{t('New project')}</h2>
          {partners.error && <ErrorView error={partners.error} onRetry={partners.reload} />}
          <form className="re-form" onSubmit={submit} noValidate>
            <SelectInput label={t('Partner')} required value={partnerId} onChange={(e) => setForm((v) => ({ ...v, partnerId: e.target.value }))}
              placeholder={partners.loading ? t('Loading partners…') : t('Choose a partner')} options={partnerOptions} error={fieldErr.partnerId} />
            <Input label={t('Project name')} required {...f('name')} error={fieldErr.name} placeholder={t('e.g. Green City')} />
            <Input label={t('Phase')} optional {...f('phase')} error={fieldErr.phase} placeholder={t('e.g. Phase-2')} />
            <Input label={t('Location')} required {...f('location')} error={fieldErr.location} />
            <Input label={t('District')} required {...f('district')} error={fieldErr.district} />
            <Input label={t('State')} required {...f('state')} error={fieldErr.state} />
            <InlineError error={create.error} conflictText={t('A project with this name already exists for the partner.')} />
            <button type="submit" className="btn btn-primary" disabled={create.pending || !partnerOptions.length}>{create.pending ? t('Saving…') : t('Create project')}</button>
          </form>
        </section>
      </div>
    </RealEstateLayout>
  );
}
