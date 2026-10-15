import { useState } from 'react';
import PageShell, { EmptyState } from '../../components/common/PageShell.jsx';
import { TextInput, TextArea, Select, FormAlert, SubmitButton } from '../../components/common/Form.jsx';
import useResource from '../../hooks/useResource.js';
import useApi from '../../hooks/useApi.js';
import { adminService } from '../../services/adminService.js';
import { notificationService } from '../../services/notificationService.js';
import { useToast } from '../../context/ToastContext.jsx';

const fmt = (v, money) => (money ? `₹${Math.round(v).toLocaleString('en-IN')}` : Number.isInteger(v) ? v.toLocaleString('en-IN') : v.toFixed(1));
const isMoney = (label) => /revenue|amount|sales|income|₹/i.test(label);

export default function AdminPage() {
  const dash = useResource('admin:dashboard', (a) => adminService.dashboard(a), { fallback: [] });
  const stats = useResource('admin:stats', (a) => adminService.statistics(a), { fallback: [] });
  const revenue = useResource('admin:revenue', (a) => adminService.revenue(a), { fallback: { series: [], kpis: [] }, accept: (d) => d?.series?.length || d?.kpis?.length });
  const occ = useResource('admin:occupancy', (a) => adminService.occupancy(a), { fallback: [] });
  const kpis = [...(dash.data || []), ...(stats.data || [])].filter((k, i, all) => all.findIndex((x) => x.key === k.key) === i).slice(0, 12);
  const heritage = useResource('admin:heritage', (a) => adminService.heritageStats(a), { fallback: [] });
  const incubator = useResource('admin:incubator', (a) => adminService.incubatorStats(a), { fallback: [] });
  const elderly = useResource('admin:elderly', (a) => adminService.elderlyDiyStats(a), { fallback: [] });
  const aiCost = useResource('admin:ai-cost', (a) => adminService.aiCostStats(a), { fallback: [] });
  const flagship = [['Heritage restoration', heritage], ['DIY incubator', incubator], ['Elderly DIY', elderly], ['AI design cost', aiCost, true]];
  const anyError = [dash, stats, revenue, occ].find((r) => r.error)?.error;

  return (
    <PageShell title="Admin dashboard" eyebrow="Weekend-Live admin" crumbs={[[null, 'Admin']]}
      actions={<button type="button" className="btn btn-outline btn-small" onClick={() => [dash, stats, revenue, occ, heritage, incubator, elderly, aiCost].forEach((r) => r.reload())}>↻ Refresh</button>}>
      {anyError && <p className="f-alert f-alert-error">{anyError}</p>}
      <section aria-label="Key figures">
        {dash.loading || stats.loading ? <div className="kpi-grid">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton kpi" />)}</div>
          : kpis.length ? <div className="kpi-grid">{kpis.map((k) => <div key={k.key} className="kpi card"><span className="kpi-label">{k.label}</span><b className="kpi-value">{fmt(k.value, isMoney(k.label))}</b></div>)}</div>
            : <EmptyState icon="📊" title="No dashboard data yet" />}
      </section>
      <section className="admin-flagship" aria-labelledby="admin-flagship-h">
        <h2 id="admin-flagship-h">Flagship programmes</h2>
        <div className="admin-flagship-grid">
          {flagship.map(([title, r, money]) => (
            <div key={title} className="card admin-flag-card">
              <h3>{title}</h3>
              {r.loading ? <div className="skeleton kpi" /> : r.data?.length ? (
                <dl>{r.data.slice(0, 6).map((k) => <div key={k.key}><dt>{k.label}</dt><dd>{fmt(k.value, money || isMoney(k.label) || /cost/i.test(k.label))}</dd></div>)}</dl>
              ) : <p className="muted">No data yet.</p>}
            </div>
          ))}
        </div>
      </section>
      <div className="admin-charts">
        <BarChart title="Revenue" subtitle="By period" data={revenue.data?.series || []} money loading={revenue.loading} />
        <BarChart title="Campaign occupancy" subtitle="Share of seats booked" data={(occ.data || []).map((r) => ({ ...r, value: r.value <= 1 && r.value > 0 ? r.value * 100 : r.value }))} percent horizontal loading={occ.loading} />
      </div>
      <NotificationTool />
    </PageShell>
  );
}

// Single-series bar chart: one amber hue (validated), 4px rounded data ends,
// hairline grid, hover/focus tooltip, and a table view.
function BarChart({ title, subtitle, data, money = false, percent = false, horizontal = false, loading }) {
  const [hover, setHover] = useState(null);
  const [table, setTable] = useState(false);
  const show = (v) => (percent ? `${Math.round(v)}%` : fmt(v, money));
  const max = Math.max(percent ? 100 : 0, ...data.map((d) => d.value), 1);
  const peak = data.reduce((m, d, i) => (d.value > (data[m]?.value ?? -1) ? i : m), 0);

  return (
    <figure className="card chart">
      <figcaption className="chart-head">
        <div><h3>{title}</h3><span className="muted">{subtitle}</span></div>
        {data.length > 0 && <button type="button" className="link-btn" onClick={() => setTable((t) => !t)} aria-pressed={table}>{table ? 'Show chart' : 'Show table'}</button>}
      </figcaption>
      {loading ? <div className="skeleton chart-skel" /> : !data.length ? <p className="muted">No data yet.</p> : table ? (
        <table className="data-table"><thead><tr><th>{horizontal ? 'Campaign' : 'Period'}</th><th>{percent ? 'Occupancy' : 'Value'}</th>{horizontal && <th>Booked / seats</th>}</tr></thead>
          <tbody>{data.map((d) => <tr key={d.label}><td>{d.label}</td><td>{show(d.value)}</td>{horizontal && <td>{Number.isFinite(d.booked) ? `${d.booked} / ${d.capacity ?? '—'}` : '—'}</td>}</tr>)}</tbody></table>
      ) : horizontal ? (
        <ul className="hbars" onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => (
            <li key={d.label} className="hbar" tabIndex={0} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} aria-label={`${d.label}: ${show(d.value)}`}>
              <span className="hbar-label">{d.label}</span>
              <span className="hbar-track"><span className="hbar-fill" style={{ width: `${(d.value / max) * 100}%` }} /></span>
              <span className={`hbar-value${i === peak || hover === i ? '' : ' faint'}`}>{show(d.value)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="vbars" role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${show(d.value)}`).join(', ')}`} onMouseLeave={() => setHover(null)}>
          <div className="vbars-grid" aria-hidden="true">{[1, 0.5, 0].map((t) => <span key={t} style={{ bottom: `${t * 100}%` }}><em>{show(max * t)}</em></span>)}</div>
          <div className="vbars-plot">
            {data.map((d, i) => (
              <button type="button" key={d.label} className="vbar-col" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} aria-label={`${d.label}: ${show(d.value)}`}>
                <span className="vbar" style={{ height: `${(d.value / max) * 100}%` }} />
                <span className="vbar-label">{d.label}</span>
                {(hover === i) && <span className="chart-tip" role="tooltip"><b>{show(d.value)}</b><small>{d.label}</small></span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </figure>
  );
}

function NotificationTool() {
  const [v, setV] = useState({ channel: 'whatsapp', to: '', subject: '', title: '', message: '', audience: 'all' });
  const send = useApi((a) => notificationService.send(a));
  const { toast } = useToast();
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (!v.message.trim() || (v.channel !== 'push' && !v.to.trim())) return;
    const res = await send.execute(v);
    if (res.success) { toast(`${v.channel === 'push' ? 'Push notification' : v.channel.toUpperCase()} sent`); setV({ ...v, message: '', subject: '', title: '' }); }
  };
  return (
    <form className="card form-card notify" onSubmit={submit} noValidate>
      <h2>Send a notification</h2>
      <p className="muted">Reminders, booking updates or announcements. Messages are sent from the Weekend-Live backend.</p>
      <div className="f-row">
        <Select label="Channel" options={[['whatsapp', 'WhatsApp'], ['sms', 'SMS'], ['email', 'Email'], ['push', 'Push (app users)']]} value={v.channel} onChange={set('channel')} />
        {v.channel === 'push'
          ? <Select label="Audience" options={[['all', 'All users'], ['members', 'Members'], ['upcoming', 'Booked for upcoming workshops']]} value={v.audience} onChange={set('audience')} />
          : <TextInput label={v.channel === 'email' ? 'To (email)' : 'To (phone)'} type={v.channel === 'email' ? 'email' : 'tel'} value={v.to} onChange={set('to')} />}
      </div>
      {v.channel === 'email' && <TextInput label="Subject" value={v.subject} onChange={set('subject')} />}
      {v.channel === 'push' && <TextInput label="Title" value={v.title} onChange={set('title')} />}
      <TextArea label="Message" rows={3} maxLength={v.channel === 'sms' ? 320 : 2000} value={v.message} onChange={set('message')} hint={v.channel === 'sms' ? `${v.message.length}/320` : undefined} />
      <FormAlert>{send.error}</FormAlert>
      <SubmitButton loading={send.loading} loadingText="Sending…" disabled={!v.message.trim() || (v.channel !== 'push' && !v.to.trim())}>Send</SubmitButton>
    </form>
  );
}
