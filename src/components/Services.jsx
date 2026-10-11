import SectionHead from './SectionHead.jsx';

const services = [
  ['i', 'Store facility visits', 'Walk into the showroom and see demo installations before you commit.'],
  ['ii', 'Customer portal', 'Track purchases, warranties and extension plans in one place.'],
  ['iii', 'DIY tips', 'Simple fixes and guides for the maintenance you can do yourself.'],
  ['iv', 'Maintenance scheduling', 'Book a technician visit or service appointment in a couple of taps.'],
  ['v', 'Promotions & offers', 'Seasonal discounts and bundle deals for returning clients.'],
];
const reach = [
  'Website — catalogue, promotions & login',
  'Customer portal — warranties & extensions',
  'Mobile app — DIY tips & scheduling',
];

export default function Services() {
  return (
    <section className="services" id="services">
      <div className="wrap">
        <SectionHead eyebrow="Services" title="What happens after the build">
          A property is never really finished — it's maintained. Here's how we stay involved.
        </SectionHead>
        <div className="services-grid">
          {services.map(([num, title, text]) => (
            <div className="service-chip reveal" key={num}><span className="num">{num}</span><h3>{title}</h3><p>{text}</p></div>
          ))}
        </div>
        <div className="reach-row reveal">
          {reach.map((r) => <span className="reach-pill" key={r}><span className="dot"></span>{r}</span>)}
        </div>
      </div>
    </section>
  );
}
