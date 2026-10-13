import { useState } from 'react';
import Section from '../components/common/Section.jsx';
import Img from '../components/common/Img.jsx';
import { campaigns } from '../data/site.js';
import { formatDate } from '../utils/contact.js';
import { bookWorkshop, useEnquiry } from '../features/enquiry/enquiry.js';

export default function Campaigns() {
  const enquiry = useEnquiry();
  const [showCal, setShowCal] = useState(false);
  const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const upcoming = campaigns.filter((c) => new Date(c.date) >= today).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Section id="diy" tone="warm" eyebrow="DIY campaign calendar" title="Upcoming DIY campaigns"
      intro="Weekend workshops for families, kids and first-time builders. Seats are limited so everyone gets hands-on time.">
      {upcoming.length === 0 && <p className="empty-note">New workshop dates are coming soon — tap “Book Workshop” to be notified.</p>}
      <div className="camp-grid">
        {upcoming.map((c) => (
          <article className="camp reveal" key={c.id}>
            <div className="camp-img"><Img name={c.image} alt="" sizes="(max-width: 760px) 100vw, 50vw" /></div>
            <div className="camp-body">
              <h3>{c.title}</h3>
              <dl className="camp-meta">
                <div><dt>Date</dt><dd>{formatDate(c.date, { weekday: 'short', day: 'numeric', month: 'short' })}</dd></div>
                <div><dt>Age</dt><dd>{c.age}</dd></div>
                <div><dt>Seats remaining</dt><dd className={c.seatsLeft <= 5 ? 'low' : ''}>{c.seatsLeft}</dd></div>
              </dl>
              <p>{c.text}</p>
              <button type="button" className="btn btn-primary" onClick={() => bookWorkshop(enquiry, c.id)}>{c.cta}</button>
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
          {Object.entries(upcoming.reduce((acc, c) => { const m = formatDate(c.date, { month: 'long', year: 'numeric' }); (acc[m] ||= []).push(c); return acc; }, {})).map(([month, list]) => (
            <div className="cal-month" key={month}>
              <h3>{month}</h3>
              <ul>
                {list.map((c) => (
                  <li key={c.id}>
                    <span className="cal-day">{formatDate(c.date, { day: 'numeric' })}<small>{formatDate(c.date, { weekday: 'short' })}</small></span>
                    <span className="cal-title">{c.title}<small>Age {c.age} · {c.seatsLeft} seats left</small></span>
                    <button type="button" className="btn btn-small" onClick={() => bookWorkshop(enquiry, c.id)}>{c.cta}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="cal-more">More dates are announced every month. <button type="button" className="link-btn" onClick={() => bookWorkshop(enquiry)}>Get notified on WhatsApp</button></p>
        </div>
      )}
    </Section>
  );
}
