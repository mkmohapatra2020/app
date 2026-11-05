/**
 * Projects: full-width grid of project cards, with the "New project" form as a panel that
 * opens from the page header (open by default when there are no projects yet).
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
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
  const partnerOptions = (partners.data ?? []).map((p) => ({ value: String(p.id), label: p.businessName }));
  const defaultPartner = filter || (access.access.partnerId !== null ? String(access.access.partnerId) : '') || (partnerOptions.length === 1 ? partnerOptions[0].value : '');
  const initial: ProjectForm = { partnerId: defaultPartner, name: '', phase: '', location: '', district: '', state: 'Odisha' };
  const [form, setForm] = useState<ProjectForm>(initial);
  const [errors, setErrors] = useState<Errors<keyof ProjectForm>>({});
  const create = useRealEstateMutation(realEstateApi.projects.create);
  const f = bind(form, setForm);
  const partnerId = partnerOptions.find((o) => o.value === (form.partnerId || defaultPartner))?.value ?? '';
  const partnerName = (id: unknown) => partners.data?.find((p) => String(p.id) === String(id))?.businessName ?? '';

  // Form panel: open when asked, and by default when there are no projects yet.
  const [formOpen, setFormOpen] = useState(false);
  const noProjects = projects.data?.length === 0;
  const showForm = formOpen || noProjects;
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { if (formOpen) panel.current?.querySelector<HTMLElement>('select, input')?.focus(); }, [formOpen]);

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
      setErrors({});
      setFormOpen(false);
      projects.setData((l) => [...(l ?? []), created]);
    }
  };
  const fieldErr = { ...serverFieldErrors(create.error, KEYS), ...errors };

  return (
    <RealEstateLayout
      title={t('Projects and plots')} feature="Projects" crumbs={[[null, t('Projects')]]}
      intro={t('Layouts and phases. Open a project to manage its plots.')}
      actions={!noProjects ? (
        <button type="button" className="btn btn-primary" aria-expanded={showForm} aria-controls="re-new-project-panel" onClick={() => setFormOpen((o) => !o)}>
          {showForm ? t('Close') : `+ ${t('New project')}`}
        </button>
      ) : undefined}
    >
      {showForm && (
        <section className="re-card re-form-panel" id="re-new-project-panel" aria-labelledby="re-new-project" ref={panel}>
          <h2 id="re-new-project">{t('New project')}</h2>
          {partners.error && <ErrorView error={partners.error} onRetry={partners.reload} />}
          <form className="re-form-grid" onSubmit={submit} noValidate>
            <SelectInput label={t('Partner')} required value={partnerId} onChange={(e) => setForm((v) => ({ ...v, partnerId: e.target.value }))}
              placeholder={partners.loading ? t('Loading partners…') : t('Choose a partner')} options={partnerOptions} error={fieldErr.partnerId} />
            <Input label={t('Project name')} required {...f('name')} error={fieldErr.name} placeholder={t('e.g. Green City')} />
            <Input label={t('Phase')} optional {...f('phase')} error={fieldErr.phase} placeholder={t('e.g. Phase-2')} />
            <Input label={t('Location')} required {...f('location')} error={fieldErr.location} />
            <Input label={t('District')} required {...f('district')} error={fieldErr.district} />
            <Input label={t('State')} required {...f('state')} error={fieldErr.state} />
            <div className="re-form-actions">
              <InlineError error={create.error} conflictText={t('A project with this name already exists for the partner.')} />
              {!noProjects && <button type="button" className="btn btn-outline" onClick={() => { setFormOpen(false); setErrors({}); }}>{t('Cancel')}</button>}
              <button type="submit" className="btn btn-primary" disabled={create.pending || !partnerOptions.length}>{create.pending ? t('Saving…') : t('Create project')}</button>
            </div>
          </form>
        </section>
      )}

      <section className="re-card" aria-labelledby="re-projects">
        <div className="re-card-head">
          <h2 id="re-projects">{t('Projects')}{projects.data && projects.data.length > 0 && <span className="re-count">{projects.data.length}</span>}</h2>
          {partnerOptions.length > 1 && (
            <SelectInput label={t('Partner')} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('All partners')} options={partnerOptions} />
          )}
        </div>
        {projects.loading && <LoadingState />}
        {projects.error && <ErrorView error={projects.error} onRetry={projects.reload} />}
        {noProjects && <EmptyView icon="🏗️" title={t('No projects yet')}>{t('Create your first project with the form.')}</EmptyView>}
        {projects.data && projects.data.length > 0 && (
          <ul className="re-project-grid">
            {projects.data.map((p) => {
              const partner = p.partnerName || partnerName(p.partnerId);
              const active = !p.status || p.status.toLowerCase() === 'active';
              return (
                <li key={String(p.id)} className="re-project-card">
                  <h3>{p.name}</h3>
                  <div className="re-project-tags">
                    {p.phase && <span className="pill">{p.phase}</span>}
                    {p.status && <span className={`re-badge re-badge-${active ? 'ok' : 'muted'}`}>{t(p.status)}</span>}
                  </div>
                  <p className="re-project-place"><span aria-hidden="true">📍</span>{[p.location, p.district, p.state].filter(Boolean).join(', ') || '—'}</p>
                  {partner && partnerOptions.length > 1 && <p className="re-sub">{t('Partner: {name}', { name: partner })}</p>}
                  {access.has('Plots') && (
                    <Link className="btn btn-outline re-project-open" to={`${RE_ROOT}/projects/${encodeURIComponent(String(p.id))}/plots`}>
                      {t('View plots')} <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </RealEstateLayout>
  );
}
