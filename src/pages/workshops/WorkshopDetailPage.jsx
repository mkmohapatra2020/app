import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageShell, { SourceNote } from '../../components/common/PageShell.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import BookingPanel from '../../components/booking/BookingPanel.jsx';
import { TextInput, FormAlert, SubmitButton } from '../../components/common/Form.jsx';
import useResource from '../../hooks/useResource.js';
import useApi from '../../hooks/useApi.js';
import useSession from '../../hooks/useSession.js';
import { workshopService } from '../../services/workshopService.js';
import { fallbackWorkshops } from '../../data/fallbacks.js';
import { formatDate } from '../../utils/contact.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function WorkshopDetailPage() {
  const { id } = useParams();
  const local = fallbackWorkshops.find((w) => w.id === id);
  const w = useResource(`workshop:${id}`, (a) => workshopService.get({ id, ...a }), { fallback: local, accept: (d) => !!d?.title });
  const item = w.data;
  if (!item) return <PageShell title={w.loading ? 'Loading…' : 'Workshop not found'} crumbs={[['/workshops', 'Workshops'], [null, 'Details']]}>{!w.loading && <p>This workshop may have ended. <Link to="/workshops">See all workshops</Link>.</p>}</PageShell>;
  return (
    <PageShell title={item.title} eyebrow="Workshop" crumbs={[['/workshops', 'Workshops'], [null, item.title]]}>
      <SourceNote fromApi={w.fromApi} />
      <div className="detail-layout">
        <div>
          <RemoteImage src={item.image} fallback="hero-workshop" alt={item.title} className="detail-hero" />
          <ul className="item-meta big">
            {item.date && <li>📅 {formatDate(item.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{item.time ? ` · ${item.time}` : ''}</li>}
            {item.location && <li>📍 {item.location}</li>}
            {item.age && <li>👪 Age {item.age}</li>}
            {Number.isFinite(item.seatsLeft) && <li>🎟️ {item.seatsLeft} seats left{Number.isFinite(item.capacity) ? ` of ${item.capacity}` : ''}</li>}
            {Number.isFinite(item.price) && <li>💳 {item.price ? `₹${item.price.toLocaleString('en-IN')} per seat` : 'Free'}</li>}
          </ul>
          {item.text && <p className="lead-text">{item.text}</p>}
          <AfterWorkshop workshop={item} />
        </div>
        <aside><BookingPanel kind="workshop" item={item} onBooked={() => w.reload()} /></aside>
      </div>
    </PageShell>
  );
}

// Attendance check-in (code shown at the workshop) and certificate download.
function AfterWorkshop({ workshop }) {
  const { isAuthenticated } = useSession();
  const [code, setCode] = useState('');
  const attend = useApi((a) => workshopService.markAttendance(a));
  const cert = useApi((a) => workshopService.certificate(a));
  const { toast } = useToast();
  if (!isAuthenticated) return null;

  const checkIn = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    const res = await attend.execute({ workshopId: workshop.id, code: code.trim() });
    if (res.success) { toast('Attendance recorded — great work!'); setCode(''); }
  };
  const download = async () => {
    const res = await cert.execute({ workshopId: workshop.id });
    if (!res.success) { toast(res.error, 'error'); return; }
    if (res.data.blob) {
      const url = URL.createObjectURL(res.data.blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: `certificate-${workshop.id}.pdf` });
      a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    } else if (res.data.url) window.open(res.data.url, '_blank', 'noopener');
    else toast('Your certificate is being prepared — we will email it to you.');
  };

  return (
    <div className="card after-ws">
      <h3>Attended this workshop?</h3>
      <form className="inline-form" onSubmit={checkIn}>
        <TextInput label="Attendance code from the session" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. WL-2410" />
        <SubmitButton loading={attend.loading} loadingText="Checking in…">Check in</SubmitButton>
      </form>
      <FormAlert>{attend.error}</FormAlert>
      <button type="button" className="btn btn-outline btn-small" onClick={download} disabled={cert.loading}>🎓 {cert.loading ? 'Preparing…' : 'Download certificate'}</button>
    </div>
  );
}
