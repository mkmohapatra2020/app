import { useState } from 'react';
import PageShell, { EmptyState, SkeletonGrid, SourceNote } from '../../components/common/PageShell.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import BookingPanel from '../../components/booking/BookingPanel.jsx';
import useResource from '../../hooks/useResource.js';
import { eventService } from '../../services/eventService.js';
import { fallbackEvents } from '../../data/fallbacks.js';
import { formatDate } from '../../utils/contact.js';

export default function EventsPage() {
  const [view, setView] = useState('upcoming');
  const upcoming = useResource('events:upcoming', (a) => eventService.upcoming(a), { fallback: fallbackEvents });
  const all = useResource(view === 'all' ? 'events:all' : null, (a) => eventService.list(a), { fallback: fallbackEvents });
  const src = view === 'all' ? all : upcoming;
  const [open, setOpen] = useState(null);

  return (
    <PageShell title="Events" eyebrow="Meet the community" crumbs={[[null, 'Events']]} intro="Open days, family build-alongs, craft fairs and talks.">
      <div className="tabs" role="tablist">
        {[['upcoming', 'Upcoming'], ['all', 'All events']].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={view === id} className={`tab${view === id ? ' sel' : ''}`} onClick={() => setView(id)}>{label}</button>)}
      </div>
      <SourceNote fromApi={src.fromApi} />
      {src.loading ? <SkeletonGrid count={4} /> : src.data?.length ? (
        <ul className="event-list">
          {src.data.map((e) => (
            <li key={e.id} className="card event">
              <div className="event-date">{e.date ? <><b>{formatDate(e.date, { day: 'numeric' })}</b><span>{formatDate(e.date, { month: 'short' })}</span></> : <b>TBA</b>}</div>
              <RemoteImage src={e.image} fallback="hero-workshop" alt="" className="event-img" />
              <div className="event-body">
                <h3>{e.title}</h3>
                <p className="muted">{[e.time, e.location, e.age && `Age ${e.age}`].filter(Boolean).join(' · ')}</p>
                {e.text && <p>{e.text}</p>}
                <button type="button" className="btn btn-primary btn-small" aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}>{open === e.id ? 'Close' : 'Book'}</button>
                {open === e.id && <div className="event-book"><BookingPanel kind="event" item={e} /></div>}
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon="📅" title="No events right now">New events are added every month.</EmptyState>}
    </PageShell>
  );
}
