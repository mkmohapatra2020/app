import SectionHead from './SectionHead.jsx';

const callouts = [
  ['01', '1000L HDPE rooftop tank', 'UV-resistant tank with a level sensor, overflow pipe and a properly rated supply line.'],
  ['02', 'Main tin shed — storage & workshop', 'Anti-skid ceramic tiles, dual-flush WC, compact shower and acoustic wall panels throughout.'],
  ['03', 'Office room, insulated', 'Bamboo ceiling, R-19 insulation, a modular desk and built-in file storage.'],
  ['04', 'Gateway, gazebo & orchard paths', 'A timber pergola gate at the entrance, a hexagonal gazebo, and stone paths through the planted orchard.'],
];

export default function Blueprint() {
  return (
    <section className="blueprint" id="blueprint">
      <div className="wrap">
        <SectionHead eyebrow="One weekend property, mapped out" title="What a finished Weekend-Live build actually looks like">
          Storage shed, office, bathroom, orchard paths, gateway — this is a real property plan from a client build, laid out end to end.
        </SectionHead>
        <div className="blueprint-body">
          <div className="blueprint-frame reveal">
            <img src="/site-plan.jpg" alt="Illustrated site plan of a Weekend-Live farmhouse property, showing the tin shed, office room, bathroom, water tank, gazebo, orchard and pergola gateway" />
            <span className="dim dim-bottom">Plot reference — 50 ft × 10 ft section shown</span>
          </div>
          <div className="callout-list reveal">
            {callouts.map(([tag, title, text]) => (
              <div className="callout" key={tag}>
                <span className="tag">{tag}</span>
                <div><strong>{title}</strong><span>{text}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
