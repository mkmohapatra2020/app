import { useState } from 'react';
import SectionHead from './SectionHead.jsx';

const productOptions = ['Outdoor living systems', 'Furniture & décor', 'Farmhouse utilities', 'Material innovation'];
const serviceOptions = ['Store visits', 'Customer portal', 'DIY tips', 'Maintenance scheduling', 'Promotions'];

function ChipGroup({ options, selected, onToggle }) {
  return (
    <div className="chip-group">
      {options.map((o) => (
        <span
          key={o} role="button" tabIndex={0} aria-pressed={selected.includes(o)}
          className={`chip${selected.includes(o) ? ' sel' : ''}`}
          onClick={() => onToggle(o)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(o); } }}
        >{o}</span>
      ))}
    </div>
  );
}

export default function Feedback() {
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [circle, setCircle] = useState('');
  const [ideas, setIdeas] = useState('');
  const toggle = (setter) => (v) => setter((list) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]));

  const send = () => {
    const body = `Products that excite me: ${products.join(', ') || '—'}\n\nServices I'd use: ${services.join(', ') || '—'}\n\nWhat my circle would want: ${circle || '—'}\n\nIdeas to refine: ${ideas || '—'}`;
    window.location.href = `mailto:hello@weekend-live.com?subject=${encodeURIComponent('Weekend-Live feedback')}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section className="feedback" id="feedback">
      <div className="wrap">
        <SectionHead eyebrow="Tell us what you'd use" title="We're still shaping Weekend-Live — help us get it right" />
        <div className="feedback-panel reveal">
          <div>
            <div className="fb-question">
              <label>Which products excite you most?</label>
              <ChipGroup options={productOptions} selected={products} onToggle={toggle(setProducts)} />
            </div>
            <div className="fb-question">
              <label>Which services would you actually use?</label>
              <ChipGroup options={serviceOptions} selected={services} onToggle={toggle(setServices)} />
            </div>
          </div>
          <div>
            <div className="fb-question">
              <label htmlFor="fb-circle">If you know someone with a weekend home in Odisha — what would they want from us?</label>
              <textarea id="fb-circle" placeholder="Write a line or two..." value={circle} onChange={(e) => setCircle(e.target.value)} />
            </div>
            <div className="fb-question">
              <label htmlFor="fb-ideas">Any technical or operational ideas we should refine?</label>
              <textarea id="fb-ideas" placeholder="Write a line or two..." value={ideas} onChange={(e) => setIdeas(e.target.value)} />
            </div>
            <button className="btn btn-primary fb-send" type="button" onClick={send}>Send feedback</button>
            <p className="fb-note">Opens your email app with everything filled in — nothing is stored on this page.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
