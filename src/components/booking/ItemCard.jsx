import { Link } from 'react-router-dom';
import RemoteImage from '../common/RemoteImage.jsx';
import { formatDate } from '../../utils/contact.js';

// Card for a workshop / campaign / event.
export default function ItemCard({ item, to, cta = 'View & book', badge }) {
  return (
    <article className="item-card reveal">
      <Link to={to} className="item-card-img" tabIndex={-1} aria-hidden="true"><RemoteImage src={item.image} fallback="hero-workshop" alt="" /></Link>
      <div className="item-card-body">
        {badge && <span className="pill">{badge}</span>}
        <h3><Link to={to}>{item.title}</Link></h3>
        <ul className="item-meta">
          {item.date && <li>📅 {formatDate(item.date, { weekday: 'short', day: 'numeric', month: 'short' })}{item.time ? ` · ${item.time}` : ''}</li>}
          {item.location && <li>📍 {item.location}</li>}
          {item.age && <li>👪 Age {item.age}</li>}
          {Number.isFinite(item.seatsLeft) && <li className={item.seatsLeft <= 5 ? 'low' : ''}>🎟️ {item.seatsLeft} seats left</li>}
          {Number.isFinite(item.distanceKm) && <li>🧭 {item.distanceKm.toFixed(1)} km away</li>}
        </ul>
        {item.text && <p>{item.text}</p>}
        <div className="item-card-foot">
          {Number.isFinite(item.price) && <b className="price">{item.price ? `₹${item.price.toLocaleString('en-IN')}` : 'Free'}</b>}
          <Link to={to} className="btn btn-primary btn-small">{cta}</Link>
        </div>
      </div>
    </article>
  );
}
