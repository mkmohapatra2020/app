import { useState } from 'react';
import Section from '../components/common/Section.jsx';
import { Link } from 'react-router-dom';
import RemoteImage from '../components/common/RemoteImage.jsx';
import useResource from '../hooks/useResource.js';
import { campaignService } from '../services/campaignService.js';
import { eventService } from '../services/eventService.js';
import { fallbackCampaigns } from '../data/fallbacks.js';
import { formatDate } from '../utils/contact.js';
import { bookWorkshop, useEnquiry } from '../features/enquiry/enquiry.js';

export default function Campaigns() {
  const enquiry = useEnquiry();
  const [showCal, setShowCal] = useState(false);
  const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const live = useResource('campaigns', (a) => campaignService.list(a), { fallback: fallbackCampaigns });
  const events = useResource(showCal ? 'events:upcoming' : null, (a) => eventService.upcoming(a), { fallback: [] });
  const isUpcoming = (c) => !c.date || new Date(c.date) >= today;
  const upcoming = (live.data || []).filter(isUpcoming).sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
  // Calendar = campaigns + upcoming events (from the API when available).
  const calendarItems = [...upcoming.map((c) => ({ ...c, kind: 'campaign' })), ...(events.fromApi ? events.data.filter(isUpcoming).map((e) => ({ ...e, kind: 'event' })) : [])]
    .filter((c) => c.date).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Section id="diy" tone="warm" eyebrow="DIY campaign calendar" title="Upcoming DIY campaigns"
      intro="Weekend workshops for families, kids and first-time builders. Seats are limited so everyone gets hands-on time.">
      {upcoming.length === 0 && <p className="empty-note">New workshop dates are coming soon — tap “Book Workshop” to be notified.</p>}
      <div className="camp-grid">
        {upcoming.map((c) => (
          <article className="camp reveal" key={c.id}>
            <Link to={`/campaigns/${encodeURIComponent(c.id)}`} className="camp-img" tabIndex={-1} aria-hidden="true"><RemoteImage src={c.image} fallback="camp-birdhouse" alt="" sizes="(max-width: 760px) 100vw, 50vw" /></Link>
            <div className="camp-body">
              <h3><Link to={`/campaigns/${encodeURIComponent(c.id)}`}>{c.title}</Link></h3>
              <dl className="camp-meta">
                <div><dt>Date</dt><dd>{formatDate(c.date, { weekday: 'short', day: 'numeric', month: 'short' })}</dd></div>
                <div><dt>Age</dt><dd>{c.age}</dd></div>
                {Number.isFinite(c.seatsLeft) && <div><dt>Seats remaining</dt><dd className={c.seatsLeft <= 5 ? 'low' : ''}>{c.seatsLeft}</dd></div>}
              </dl>
              <p>{c.text}</p>
              <button type="button" className="btn btn-primary" onClick={() => bookWorkshop(enquiry, c.id)}>{c.cta || (Number.isFinite(c.seatsLeft) && c.seatsLeft < 6 ? 'Book Seat' : 'Register')}</button>
            </div>
          </article>
        ))}
      </div>
      <div className="center-row">
        <button type="button" className="btn btn-outline" aria-expanded={showCal} aria-controls="workshop-calendar" onClick={() => setShowCal((s) => !s)}>
          {showCal ? 'Hide' : 'View'} Workshop Calendar
        </button>
      </div>
      {showCal && (
        <div className="calendar reveal in" id="workshop-calendar">
          {Object.entries(calendarItems.reduce((acc, c) => { const m = formatDate(c.date, { month: 'long', year: 'numeric' }); (acc[m] ||= []).push(c); return acc; }, {})).map(([month, list]) => (
            <div className="cal-month" key={month}>
              <h3>{month}</h3>
              <ul>
                {list.map((c) => (
                  <li key={`${c.kind}-${c.id}`}>
                    <span className="cal-day">{formatDate(c.date, { day: 'numeric' })}<small>{formatDate(c.date, { weekday: 'short' })}</small></span>
                    <span className="cal-title">{c.title}<small>{[c.kind === 'event' ? 'Event' : null, c.age && `Age ${c.age}`, Number.isFinite(c.seatsLeft) && `${c.seatsLeft} seats left`].filter(Boolean).join(' · ')}</small></span>
                    {c.kind === 'event'
                      ? <Link className="btn btn-small" to="/events">Details</Link>
                      : <Link className="btn btn-small" to={`/campaigns/${encodeURIComponent(c.id)}`}>{c.cta || 'Book'}</Link>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="cal-more"><Link to="/workshops">See all workshops</Link> · <Link to="/events">All events</Link> · More dates are announced every month. <button type="button" className="link-btn" onClick={() => bookWorkshop(enquiry)}>Get notified on WhatsApp</button></p>
        </div>
      )}
    </Section>
  );
}
