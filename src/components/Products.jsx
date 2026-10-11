import SectionHead from './SectionHead.jsx';

const icons = {
  outdoor: (
    <svg className="product-icon" viewBox="0 0 52 52" fill="none">
      <path d="M6 18 L26 8 L46 18" stroke="#2F6E73" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="10" y1="18" x2="10" y2="44" stroke="#3E2A18" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="42" y1="18" x2="42" y2="44" stroke="#3E2A18" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="6" y1="20" x2="46" y2="20" stroke="#E1A94C" strokeWidth="2.4" strokeLinecap="round" />
      {[14, 22, 30, 38].map((x) => <line key={x} x1={x} y1="20" x2={x} y2="30" stroke="#E1A94C" strokeWidth="2" strokeLinecap="round" />)}
    </svg>
  ),
  furniture: (
    <svg className="product-icon" viewBox="0 0 52 52" fill="none">
      <path d="M8 44 C8 24 14 10 14 10" stroke="#3A5334" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 44 C20 22 26 8 26 8" stroke="#3A5334" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M32 44 C32 24 38 10 38 10" stroke="#3A5334" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="6" y1="30" x2="42" y2="26" stroke="#E1A94C" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="38" x2="42" y2="35" stroke="#E1A94C" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  farmhouse: (
    <svg className="product-icon" viewBox="0 0 52 52" fill="none">
      <path d="M6 14 Q26 6 46 20 L46 14 Q26 2 6 8 Z" fill="#E1A94C" opacity="0.9" />
      <line x1="6" y1="14" x2="6" y2="42" stroke="#3E2A18" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="46" y1="20" x2="46" y2="42" stroke="#3E2A18" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 14 Q26 6 46 20" stroke="#2F6E73" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  material: (
    <svg className="product-icon" viewBox="0 0 52 52" fill="none">
      <rect x="8" y="10" width="36" height="7" rx="2" fill="#3A5334" />
      <rect x="8" y="21" width="36" height="7" rx="2" fill="#E1A94C" />
      <rect x="8" y="32" width="36" height="7" rx="2" fill="#2F6E73" />
    </svg>
  ),
};

const products = [
  ['outdoor', 'Outdoor living systems', 'Waterproof decks, pergolas and gazebos, framed and roofed for open-air living through every season.'],
  ['furniture', 'Furniture & décor', 'Bamboo décor and waterproof outdoor furniture, made to sit outside all year, not just on dry days.'],
  ['farmhouse', 'Farmhouse utilities', 'Shade sails, waterproof storage and solar patio fittings, for houses that mostly manage themselves.'],
  ['material', 'Material innovation', 'Marine plywood, WPC, epoxy and PU sealants — chosen for the coast, not the catalogue.'],
];

export default function Products() {
  return (
    <section className="products" id="products">
      <div className="wrap">
        <SectionHead eyebrow="Products" title="Built for the weather that actually shows up">
          Every product starts from one question: will it survive a real Odisha rainy season? If not, it doesn't leave the workshop.
        </SectionHead>
        <div className="product-grid">
          {products.map(([icon, title, text]) => (
            <div className="product-card reveal" key={title}>
              {icons[icon]}
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
