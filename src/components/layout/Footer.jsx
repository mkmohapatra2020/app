import { contact, footerLinks, tagline } from '../../data/site.js';
import { whatsappUrl } from '../../utils/contact.js';

export default function Footer() {
  const socials = Object.entries(contact.social).filter(([, url]) => url);
  return (
    <footer id="contact">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <div className="footer-logo">Weekend-Live</div>
            <div className="footer-tag">Build • Learn • Live</div>
            <p className="footer-mission">{tagline}</p>
          </div>
          <nav aria-label="Footer">
            <h3>Explore</h3>
            <ul>{footerLinks.map(([href, label]) => <li key={href}><a href={href}>{label}</a></li>)}</ul>
          </nav>
          <div>
            <h3>Location</h3>
            <address>{contact.address.map((l) => <span key={l}>{l}<br /></span>)}</address>
          </div>
          <div>
            <h3>Contact</h3>
            <ul className="footer-contact">
              <li><a href={contact.phoneHref}>📞 {contact.phone}</a></li>
              <li><a href={`mailto:${contact.email}`}>✉️ {contact.email}</a></li>
              <li><a href={whatsappUrl('Hello Weekend-Live!')} target="_blank" rel="noopener">💬 WhatsApp</a></li>
              {socials.map(([name, url]) => <li key={name}><a href={url} target="_blank" rel="noopener">{name}</a></li>)}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Weekend-Live · Bhubaneswar, Odisha</span>
          <span>Map data: <a href="https://github.com/datameet/maps" target="_blank" rel="noopener">DataMeet</a> (CC BY 4.0)</span>
        </div>
      </div>
    </footer>
  );
}
