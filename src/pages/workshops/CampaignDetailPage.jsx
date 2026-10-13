import { useParams, Link } from 'react-router-dom';
import PageShell, { SourceNote } from '../../components/common/PageShell.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import BookingPanel from '../../components/booking/BookingPanel.jsx';
import useResource from '../../hooks/useResource.js';
import { campaignService } from '../../services/campaignService.js';
import { fallbackCampaigns } from '../../data/fallbacks.js';
import { formatDate } from '../../utils/contact.js';

export default function CampaignDetailPage() {
  const { id } = useParams();
  const local = fallbackCampaigns.find((c) => c.id === id);
  const c = useResource(`campaign:${id}`, (a) => campaignService.get({ id, ...a }), { fallback: local, accept: (d) => !!d?.title });
  const people = useResource(c.fromApi ? `campaign:${id}:participants` : null, (a) => campaignService.participants({ id, ...a }), { fallback: [] });
  const item = c.data;
  if (!item) return <PageShell title={c.loading ? 'Loading…' : 'Campaign not found'} crumbs={[['/workshops', 'Workshops'], [null, 'Campaign']]}>{!c.loading && <p><Link to="/workshops">See all campaigns</Link></p>}</PageShell>;
  return (
    <PageShell title={item.title} eyebrow="DIY campaign" crumbs={[['/workshops', 'Workshops'], [null, item.title]]}>
      <SourceNote fromApi={c.fromApi} />
      <div className="detail-layout">
        <div>
          <RemoteImage src={item.image} fallback="camp-birdhouse" alt={item.title} className="detail-hero" />
          <ul className="item-meta big">
            {item.date && <li>📅 {formatDate(item.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{item.time ? ` · ${item.time}` : ''}</li>}
            {item.location && <li>📍 {item.location}</li>}
            {item.age && <li>👪 Age {item.age}</li>}
            {Number.isFinite(item.seatsLeft) && <li className={item.seatsLeft <= 5 ? 'low' : ''}>🎟️ {item.seatsLeft} seats left</li>}
          </ul>
          {item.text && <p className="lead-text">{item.text}</p>}
          {people.data?.length > 0 && (
            <div className="card">
              <h3>Who's coming ({people.data.length})</h3>
              <ul className="people">{people.data.map((p, i) => <li key={p.id || i}><span className="avatar-sm">{p.name[0]}</span>{p.name}{p.city && <small> · {p.city}</small>}</li>)}</ul>
            </div>
          )}
        </div>
        <aside><BookingPanel kind="campaign" item={item} onBooked={() => { c.reload(); people.reload(); }} /></aside>
      </div>
    </PageShell>
  );
}
