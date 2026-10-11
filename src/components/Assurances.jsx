import SectionHead from './SectionHead.jsx';

const items = [
  ['Absentee-friendly', 'Warranties and maintenance contracts mean the property looks after itself between visits.'],
  ['Ongoing, not one-time', 'Service plans, extensions and DIY content keep us involved well past handover day.'],
  ['A lifestyle, not a fix', 'Waterproof durability is the standard we build to — this is a brand, not a one-off contractor job.'],
  ['Growing on purpose', "We're taking on seven to eight clients this year — deliberately, on skill rather than scale."],
];

export default function Assurances() {
  return (
    <section className="assurances">
      <div className="wrap">
        <SectionHead eyebrow="Built to be left alone" title="Made for owners who aren't always around">
          Most Weekend-Live clients live elsewhere and visit their property on weekends, or less. Everything is built with that in mind.
        </SectionHead>
        <div className="assurance-grid">
          {items.map(([title, text]) => <div className="assurance-card reveal" key={title}><h3>{title}</h3><p>{text}</p></div>)}
        </div>
      </div>
    </section>
  );
}
