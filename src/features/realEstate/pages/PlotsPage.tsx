import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext.jsx';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import { realEstateApi } from '../api/realEstateApi.ts';
import { EmptyView, ErrorView, InlineError, LoadingState, serverFieldErrors } from '../components/ApiStateView.tsx';
import { bind, Input, SelectInput } from '../components/FormFields.tsx';
import RealEstateLayout, { RE_ROOT } from '../components/RealEstateLayout.tsx';
import RealEstateStatusBadge from '../components/RealEstateStatusBadge.tsx';
import { useRealEstateMutation, useRealEstateQuery } from '../hooks/useRealEstateQuery.ts';
import { PLOT_STATUSES } from '../types/realEstateTypes.ts';
import { areaUnit } from '../utils/format.ts';
import { hasErrors, toAmount, validatePlot, type Errors, type PlotForm } from '../utils/validation.ts';

const EMPTY: PlotForm = { plotNumber: '', area: '', areaUnit: 'SqFt', facing: '', roadWidth: '' };
const KEYS = Object.keys(EMPTY) as (keyof PlotForm)[];
const UNITS = [['SqFt', 'Sq. ft'], ['SqYd', 'Sq. yd'], ['SqM', 'Sq. m'], ['Decimal', 'Decimal'], ['Acre', 'Acre']].map(([value, label]) => ({ value, label }));
const FACINGS = ['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'].map((v) => ({ value: v, label: v }));

export default function PlotsPage() {
  const t = useT();
  const { projectId = '' } = useParams();
  const access = useRealEstateAccess();
  const { toast } = useToast();
  const enabled = access.has('Plots') && !!projectId;
  const plots = useRealEstateQuery((s) => realEstateApi.plots.list(projectId, s), [projectId], { enabled });
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState<PlotForm>(EMPTY);
  const [errors, setErrors] = useState<Errors<keyof PlotForm>>({});
  const create = useRealEstateMutation(realEstateApi.plots.create);
  const f = bind(form, setForm);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validatePlot(form, t);
    setErrors(v);
    if (hasErrors(v)) return;
    const created = await create.run({
      projectId, plotNumber: form.plotNumber, area: toAmount(form.area), areaUnit: form.areaUnit, facing: form.facing,
      roadWidth: form.roadWidth.trim() ? toAmount(form.roadWidth) : null,
    });
    if (created) {
      toast(t('Plot {plot} added', { plot: created.plotNumber || form.plotNumber }));
      setForm(EMPTY);
      plots.setData((l) => [...(l ?? []), created]);
    }
  };
  const fieldErr = { ...serverFieldErrors(create.error, KEYS), ...errors };
  const rows = (plots.data ?? []).filter((p) => !filter || p.status === filter);
  const counts = PLOT_STATUSES.map((s) => [s, (plots.data ?? []).filter((p) => p.status === s).length] as const);
  const canBook = access.has('Bookings');

  return (
    <RealEstateLayout title={t('Plots')} feature="Plots" crumbs={[[`${RE_ROOT}/projects`, t('Projects')], [null, t('Plots')]]} intro={t('Plot inventory for this project. Only available plots can be booked.')}>
      <div className="re-split">
        <section className="re-card" aria-labelledby="re-plots">
          <div className="re-card-head">
            <h2 id="re-plots">{t('Plots')}</h2>
            <SelectInput label={t('Status')} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('All statuses')}
              options={counts.map(([s, n]) => ({ value: s, label: `${t(s)} (${n})` }))} />
          </div>
          {plots.loading && <LoadingState />}
          {plots.error && <ErrorView error={plots.error} onRetry={plots.reload} />}
          {plots.data && rows.length === 0 && <EmptyView title={filter ? t('No {status} plots', { status: t(filter).toLowerCase() }) : t('No plots yet')}>{filter ? t('Try another status.') : t('Add plots with the form.')}</EmptyView>}
          {rows.length > 0 && (
            <div className="re-table-wrap" role="region" aria-label={t('Plots')} tabIndex={0}>
              <table className="re-table">
                <thead><tr><th scope="col">{t('Plot')}</th><th scope="col" className="num">{t('Area')}</th><th scope="col">{t('Facing')}</th><th scope="col" className="num">{t('Road width')}</th><th scope="col">{t('Status')}</th><th scope="col"><span className="sr-only">{t('Actions')}</span></th></tr></thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={String(p.id)}>
                      <td data-label={t('Plot')}><strong>{p.plotNumber}</strong></td>
                      <td data-label={t('Area')} className="num">{p.area ?? '—'} {t(areaUnit(p.areaUnit))}</td>
                      <td data-label={t('Facing')}>{p.facing ? t(p.facing) : '—'}</td>
                      <td data-label={t('Road width')} className="num">{p.roadWidth !== null ? t('{n} ft', { n: p.roadWidth }) : '—'}</td>
                      <td data-label={t('Status')}><RealEstateStatusBadge status={String(p.status)} /></td>
                      <td>
                        {canBook && p.status === 'Available'
                          ? <Link className="btn btn-outline btn-sm" to={`${RE_ROOT}/bookings?projectId=${encodeURIComponent(projectId)}&plotId=${encodeURIComponent(String(p.id))}`}>{t('Book')}</Link>
                          : <span className="re-sub" aria-label={t('Not bookable')}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="re-card" aria-labelledby="re-new-plot">
          <h2 id="re-new-plot">{t('Add a plot')}</h2>
          <form className="re-form" onSubmit={submit} noValidate>
            <Input label={t('Plot number')} required {...f('plotNumber')} error={fieldErr.plotNumber} />
            <div className="re-row">
              <Input label={t('Area')} required type="number" min="0" step="0.01" inputMode="decimal" {...f('area')} error={fieldErr.area} />
              <SelectInput label={t('Area unit')} required {...f('areaUnit')} options={UNITS.map((u) => ({ ...u, label: t(u.label) }))} error={fieldErr.areaUnit} />
            </div>
            <SelectInput label={t('Facing')} optional {...f('facing')} placeholder={t('Not specified')} options={FACINGS.map((o) => ({ ...o, label: t(o.label) }))} error={fieldErr.facing} />
            <Input label={t('Road width (ft)')} optional type="number" min="0" step="0.5" inputMode="decimal" {...f('roadWidth')} error={fieldErr.roadWidth} />
            <InlineError error={create.error} conflictText={t('A plot with this number already exists in the project.')} />
            <button type="submit" className="btn btn-primary" disabled={create.pending}>{create.pending ? t('Saving…') : t('Add plot')}</button>
          </form>
        </section>
      </div>
    </RealEstateLayout>
  );
}
