import { useState } from 'react';
import PageShell from '../../components/common/PageShell.jsx';
import { TextInput, TextArea, Select, FormAlert, SubmitButton, isPhone, isEmail } from '../../components/common/Form.jsx';
import useApi from '../../hooks/useApi.js';
import useSession from '../../hooks/useSession.js';
import { leadService } from '../../services/leadService.js';
import { contact } from '../../data/site.js';
import { whatsappUrl } from '../../utils/contact.js';
import { useToast } from '../../context/ToastContext.jsx';

const FORMS = {
  quotation: { title: 'Get a quotation', call: (v) => leadService.quotation({ values: v }), cta: 'Request quotation' },
  'site-visit': { title: 'Book a site visit', call: (v) => leadService.siteVisit({ values: v }), cta: 'Book site visit' },
  callback: { title: 'Request a callback', call: (v) => leadService.callback({ values: v }), cta: 'Call me back' },
};
const PROJECT_TYPES = ['Pergola', 'Gazebo', 'Timber deck', 'Roof garden', 'Rain-proof sit-out', 'Outdoor kitchen', 'Senior-friendly upgrade', 'Other'];

export default function ContactPage() {
  const [kind, setKind] = useState('quotation');
  const { user } = useSession();
  const blank = { name: user?.name || '', phone: user?.phone || '', email: user?.email || '', area: user?.city || '', message: '', projectType: PROJECT_TYPES[0], budget: '', dimensions: '', date: '', time: 'Morning (9–12)' };
  const [v, setV] = useState(blank);
  const [err, setErr] = useState({});
  const [done, setDone] = useState('');
  const api = useApi(({ values }) => FORMS[kind].call(values));
  const { toast } = useToast();
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!v.name.trim()) errs.name = 'Enter your name.';
    if (!isPhone(v.phone)) errs.phone = 'Enter a valid phone number.';
    if (v.email && !isEmail(v.email)) errs.email = 'Enter a valid email.';
    if (kind !== 'callback' && !v.area.trim()) errs.area = 'Enter your area or locality.';
    setErr(errs);
    if (Object.keys(errs).length) return;
    const res = await api.execute({ values: v });
    if (res.success) { setDone(kind); toast('Thanks — we will be in touch shortly.'); }
  };

  return (
    <PageShell title="Contact & quotes" eyebrow="Let's plan your space" crumbs={[[null, 'Contact']]} intro="Tell us what you have in mind. We usually reply within one working day.">
      <div className="detail-layout">
        <div>
          <div className="tabs" role="tablist">{Object.entries(FORMS).map(([id, f]) => <button key={id} type="button" role="tab" aria-selected={kind === id} className={`tab${kind === id ? ' sel' : ''}`} onClick={() => { setKind(id); setDone(''); api.reset(); }}>{f.title}</button>)}</div>
          {done === kind ? (
            <div className="card booking-done"><span aria-hidden="true">✅</span><h2>Request received</h2><p>We'll contact you on {v.phone}. For anything urgent, call {contact.phone}.</p><button type="button" className="btn btn-outline btn-small" onClick={() => { setDone(''); setV(blank); }}>Send another request</button></div>
          ) : (
            <form className="card form-card" onSubmit={submit} noValidate>
              <h2>{FORMS[kind].title}</h2>
              <div className="f-row"><TextInput label="Name" value={v.name} onChange={set('name')} error={err.name} autoComplete="name" /><TextInput label="Phone / WhatsApp" type="tel" value={v.phone} onChange={set('phone')} error={err.phone} autoComplete="tel" /></div>
              <div className="f-row"><TextInput label="Email" type="email" optional value={v.email} onChange={set('email')} error={err.email} autoComplete="email" /><TextInput label="Area / locality" value={v.area} onChange={set('area')} error={err.area} optional={kind === 'callback'} /></div>
              {kind === 'quotation' && (
                <div className="f-row"><Select label="Project" options={PROJECT_TYPES} value={v.projectType} onChange={set('projectType')} /><TextInput label="Approx. size (ft)" optional placeholder="e.g. 12 × 10 × 9" value={v.dimensions} onChange={set('dimensions')} /></div>
              )}
              {kind === 'quotation' && <Select label="Budget" options={['Not sure yet', 'Under ₹50,000', '₹50,000–1.5 lakh', '₹1.5–3 lakh', 'Above ₹3 lakh']} value={v.budget || 'Not sure yet'} onChange={set('budget')} />}
              {kind === 'site-visit' && <TextInput label="Preferred date" type="date" min={new Date().toISOString().slice(0, 10)} value={v.date} onChange={set('date')} optional />}
              {kind === 'callback' && <Select label="Best time to call" options={['Morning (9–12)', 'Afternoon (12–4)', 'Evening (4–8)']} value={v.time} onChange={set('time')} />}
              <TextArea label="Message" optional rows={3} value={v.message} onChange={set('message')} />
              <FormAlert>{api.error && <>{api.error} <a href={whatsappUrl(`${FORMS[kind].title}: ${v.name}, ${v.phone}. ${v.message}`)} target="_blank" rel="noopener">Send on WhatsApp instead</a></>}</FormAlert>
              <SubmitButton loading={api.loading} loadingText="Sending…">{FORMS[kind].cta}</SubmitButton>
            </form>
          )}
        </div>
        <aside className="card contact-card">
          <h3>Visit or call</h3>
          <address>{contact.address.map((l) => <span key={l}>{l}<br /></span>)}</address>
          <p><a href={contact.phoneHref}>📞 {contact.phone}</a><br /><a href={`mailto:${contact.email}`}>✉️ {contact.email}</a><br /><a href={whatsappUrl('Hello Weekend-Live!')} target="_blank" rel="noopener">💬 WhatsApp us</a></p>
        </aside>
      </div>
    </PageShell>
  );
}
