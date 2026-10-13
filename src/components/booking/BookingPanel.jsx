import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TextInput, FormAlert, SubmitButton, isPhone } from '../common/Form.jsx';
import useApi from '../../hooks/useApi.js';
import useSession from '../../hooks/useSession.js';
import { campaignService } from '../../services/campaignService.js';
import { workshopService } from '../../services/workshopService.js';
import { eventService } from '../../services/eventService.js';
import { invalidate } from '../../hooks/useResource.js';
import { openWhatsApp, formatDate } from '../../utils/contact.js';
import { useToast } from '../../context/ToastContext.jsx';

const book = {
  workshop: (item, v) => workshopService.book({ workshopId: item.id, ...v }),
  campaign: (item, v) => campaignService.register({ id: item.id, ...v }),
  event: (item, v) => eventService.book({ eventId: item.id, ...v }),
};

/**
 * Book a workshop / register for a campaign / book an event.
 * Signed in → API. Guests → sign-in prompt, or WhatsApp as a fallback.
 * Campaigns also support cancelling a registration.
 */
export default function BookingPanel({ kind, item, onBooked }) {
  const { user, isAuthenticated } = useSession();
  const location = useLocation();
  const { toast } = useToast();
  const [v, setV] = useState({ seats: '1', name: user?.name || '', phone: user?.phone || '', childrenAges: '' });
  const [err, setErr] = useState({});
  const [booked, setBooked] = useState(item.isRegistered);
  const api = useApi(({ values }) => book[kind](item, values));
  const cancel = useApi(() => campaignService.cancel({ id: item.id }));
  const full = Number.isFinite(item.seatsLeft) && item.seatsLeft <= 0;
  const label = kind === 'campaign' ? 'Register' : 'Book';
  const waText = `Hello Weekend-Live! I'd like to ${label.toLowerCase()}: ${item.title}${item.date ? ` (${formatDate(item.date)})` : ''}\nSeats: ${v.seats}${v.name ? `\nName: ${v.name}` : ''}${v.phone ? `\nPhone: ${v.phone}` : ''}`;

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    const seats = Number(v.seats);
    if (!Number.isInteger(seats) || seats < 1 || seats > 10) errs.seats = 'Choose 1–10 seats.';
    if (Number.isFinite(item.seatsLeft) && seats > item.seatsLeft) errs.seats = `Only ${item.seatsLeft} seats left.`;
    if (!v.name.trim()) errs.name = 'Enter a name for the booking.';
    if (!isPhone(v.phone)) errs.phone = 'Enter a valid phone number.';
    setErr(errs);
    if (Object.keys(errs).length) return;
    const res = await api.execute({ values: v });
    if (res.success) { setBooked(true); invalidate(kind); toast(`${kind === 'campaign' ? 'Registered' : 'Booked'} — see you there!`); onBooked?.(res.data); }
  };
  const doCancel = async () => {
    const res = await cancel.execute();
    if (res.success) { setBooked(false); invalidate('campaign'); toast('Registration cancelled'); onBooked?.(null); } else toast(res.error, 'error');
  };

  if (booked) {
    return (
      <div className="card booking booking-done">
        <span aria-hidden="true">🎉</span>
        <h3>You're {kind === 'campaign' ? 'registered' : 'booked'}!</h3>
        <p className="muted">We'll confirm the details on WhatsApp{user?.email ? ` and by email (${user.email})` : ''}.</p>
        {kind === 'campaign' && <button type="button" className="btn btn-quiet btn-small" onClick={doCancel} disabled={cancel.loading}>{cancel.loading ? 'Cancelling…' : 'Cancel registration'}</button>}
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="card booking">
        <h3>{label} your seat</h3>
        <p className="muted">Sign in to book online, manage your booking and earn passport badges.</p>
        <Link to="/login" state={{ from: location.pathname }} className="btn btn-primary btn-block">Sign in to {label.toLowerCase()}</Link>
        <Link to="/register" state={{ from: location.pathname }} className="btn btn-outline btn-block">Create a free account</Link>
        <button type="button" className="link-btn" onClick={() => openWhatsApp(waText)}>or {label.toLowerCase()} on WhatsApp</button>
      </div>
    );
  }
  return (
    <form className="card booking" onSubmit={submit} noValidate>
      <h3>{label} your seat</h3>
      {full ? <p className="f-alert f-alert-error">This one is full. <button type="button" className="link-btn" onClick={() => openWhatsApp(`Please add me to the waiting list for ${item.title}`)}>Join the waiting list</button></p> : (
        <>
          <div className="f-row">
            <TextInput label="Seats" type="number" min="1" max="10" inputMode="numeric" value={v.seats} onChange={(e) => setV({ ...v, seats: e.target.value })} error={err.seats} />
            <TextInput label="Children's ages" optional value={v.childrenAges} onChange={(e) => setV({ ...v, childrenAges: e.target.value })} placeholder="e.g. 7, 10" />
          </div>
          <TextInput label="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} error={err.name} autoComplete="name" />
          <TextInput label="Phone / WhatsApp" type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} error={err.phone} autoComplete="tel" />
          <FormAlert>{api.error && <>{api.error} <button type="button" className="link-btn" onClick={() => openWhatsApp(waText)}>Book on WhatsApp instead</button></>}</FormAlert>
          <SubmitButton loading={api.loading} loadingText="Booking…" className="btn-block">{label} {v.seats > 1 ? `${v.seats} seats` : 'my seat'}</SubmitButton>
        </>
      )}
    </form>
  );
}
