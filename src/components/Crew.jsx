import SectionHead from './SectionHead.jsx';

const crew = [
  ['Half-time, year one', 'Carpenter', 'Shapes every deck, beam and pergola frame on site.'],
  ['10% time, year one', 'Plumber', 'Handles tanks, supply lines and bathroom fittings.'],
  ['Per product', 'Welder', 'Brought in for tin sheds and structural steelwork.'],
  ['Per service contract', 'Electrician', 'Handles wiring and fittings on maintenance visits.'],
];

export default function Crew() {
  return (
    <section className="crew" id="crew">
      <div className="wrap">
        <SectionHead eyebrow="The people network" title="The hands behind every build">
          A small, trusted crew — chosen for skill, not paperwork.
        </SectionHead>
        <div className="crew-grid">
          {crew.map(([time, role, text]) => (
            <div className="crew-card reveal" key={role}><span className="time">{time}</span><div className="role">{role}</div><p>{text}</p></div>
          ))}
        </div>
      </div>
    </section>
  );
}
