// All homepage content lives here, so text, dates and contacts can be edited
// without touching the components.

// While this is true, sections with placeholder data (community map, stories)
// show a small "Sample" tag. Set to false once real content is in place.
export const SHOW_SAMPLE_TAGS = true;

export const contact = {
  phone: '+91 89172 50407',
  phoneHref: 'tel:+918917250407',
  whatsapp: '918917250407', // assumed to be the same number as the phone
  email: 'hello@weekend-live.com',
  address: ['Lingipur, Sisupalgarh', 'Bhubaneswar, Odisha'],
  // Add your profile links here; empty ones are hidden.
  social: {
    Facebook: '',
    Instagram: '',
    YouTube: '',
  },
};

export const tagline = 'Building Skills, Creating Spaces, Connecting Generations.';

// Header links. Paths starting with "/#" scroll to a home-page section.
export const nav = [
  ['/workshops', 'Workshops'],
  ['/#outdoor', 'Outdoor'],
  ['/#seniors', 'Seniors'],
  ['/community', 'Community'],
  ['/learn', 'Learn'],
  ['/shop', 'Shop'],
];
export const moreNav = [
  ['/#about', 'About us'],
  ['/events', 'Events'],
  ['/heritage', 'Heritage & crafts'],
  ['/contact', 'Contact & quotes'],
];

export const hero = {
  eyebrow: tagline,
  title: ['Live Better.', 'Build Together.', 'Learn Forever.'],
  lede: 'Weekend-Live helps families create meaningful outdoor spaces, learn DIY skills and improve homes for all generations.',
  slides: [
    { src: 'hero-family', alt: 'Three generations of a family building a wooden birdhouse together under a pergola' },
    { src: 'hero-workshop', alt: 'Adults of all ages at workbenches during a weekend woodworking workshop' },
    { src: 'pillar-senior', alt: 'An elderly man walking up a gentle ramp holding a grab rail' },
    { src: 'pillar-diy', alt: 'Two pairs of hands sanding a small wooden stool together' },
  ],
};

export const pillars = [
  {
    id: 'diy', title: 'DIY Learning', image: 'pillar-diy', href: '#diy',
    text: 'Hands-on weekend workshops where kids, parents and grandparents learn real skills together.',
    points: ['Workshops', 'Woodworking', 'Crafts'],
  },
  {
    id: 'outdoor', title: 'Outdoor Life', image: 'pillar-outdoor', href: '#outdoor',
    text: "Decks, pergolas and gazebos built for Odisha's sun, salt air and monsoon.",
    points: ['Decks', 'Pergolas', 'Gazebos'],
  },
  {
    id: 'seniors', title: 'Senior Care', image: 'pillar-senior', href: '#seniors',
    text: 'Thoughtful home improvements that help parents and grandparents live safely and independently.',
    points: ['Accessibility', 'Safety', 'Renovations'],
  },
];

// Upcoming DIY campaigns. Dates are ISO (YYYY-MM-DD).
export const campaigns = [
  {
    id: 'birdhouse', title: 'October Family Bird House Workshop', date: '2026-10-24', age: '6+',
    seatsLeft: 5, cta: 'Book Seat', image: 'camp-birdhouse',
    text: 'Build, paint and take home a birdhouse for your balcony or garden. Tools and materials included.',
  },
  {
    id: 'toolbox', title: 'Kids Build Their First Toolbox', date: '2026-11-07', age: '8+',
    seatsLeft: 8, cta: 'Register', image: 'camp-toolbox',
    text: 'A first real woodworking project: measure, cut, nail and finish a toolbox to keep.',
  },
];

// Community map: projects per place. Placeholder content — replace with real
// projects, participant numbers and stories.
export const communityPlaces = [
  {
    id: 'bhubaneswar', name: 'Bhubaneswar', sample: true,
    projects: ['Family birdhouse workshops', 'Rooftop terrace garden', 'Senior-friendly bathroom upgrade'],
    participants: 'Families from across the city',
    story: 'Neighbours who met at a weekend workshop now build planters for their colony park together.',
  },
  {
    id: 'cuttack', name: 'Cuttack', sample: true,
    projects: ['Kids toolbox workshop', 'Waterproof balcony deck'],
    participants: 'Parents and children, first-time builders',
    story: 'A grandfather and grandson built their first bookshelf side by side.',
  },
  {
    id: 'puri', name: 'Puri', sample: true,
    projects: ['Rain-proof sit-out near the coast', 'Salt-air resistant pergola'],
    participants: 'Weekend-home owners',
    story: 'A seaside sit-out that stays dry through the monsoon, built with marine plywood and WPC.',
  },
  {
    id: 'khordha', name: 'Khordha', sample: true,
    projects: ['Farmhouse gazebo', 'Bamboo living space', 'Orchard paths'],
    participants: 'Farmhouse owners and their families',
    story: 'A mango orchard clearing turned into a gazebo where three generations gather on Sundays.',
  },
];

// Outdoor showcase. Items with a `before` image get the before → after slider.
export const showcase = [
  { id: 'deck', title: 'Waterproof Deck', image: 'show-deck', before: 'before-backyard', text: 'An unused backyard turned into a deck that shrugs off monsoon rain.' },
  { id: 'gazebo', title: 'Farmhouse Gazebo', image: 'show-gazebo', before: 'before-orchard', text: 'A hexagonal gazebo in the orchard, with a stone path to the house.' },
  { id: 'roof', title: 'Weekend Roof Garden', image: 'show-roofgarden', before: 'before-terrace', text: 'A bare terrace becomes a pergola-shaded garden for evenings.' },
  { id: 'bamboo', title: 'Bamboo Living Space', image: 'show-bamboo', text: 'Treated bamboo and cane for a cool, eco-friendly sit-out.' },
  { id: 'kitchen', title: 'Outdoor Kitchen', image: 'show-kitchen', text: 'Stone and timber counters with a roof canopy for farmhouse cooking.' },
  { id: 'sitout', title: 'Rain-Proof Sitout', image: 'show-sitout', text: 'A clear polycarbonate roof keeps tea time dry in heavy rain.' },
];

export const seniorFeatures = [
  ['Grab Rails', 'Sturdy rails at entrances, stairs, toilets and showers.'],
  ['Wheelchair Movement', 'Ramps, wider doorways and step-free thresholds.'],
  ['Anti-Slip Flooring', 'Textured tiles and coatings for wet areas and walkways.'],
  ['Smart Lighting', 'Motion-sensor night lights and switches where you need them.'],
  ['Bathroom Improvements', 'Shower seats, raised toilets and easy-reach fittings.'],
  ['Garden Seating', 'Comfortable benches with armrests along garden paths.'],
];

// Knowledge center articles. `body` is shown when "Read more" is opened.
export const articles = [
  {
    id: 'woodworking', title: 'Woodworking Basics', image: 'pillar-diy', minutes: 4,
    summary: 'The five tools and three habits every beginner needs.',
    body: [
      'Start with a small kit: a tape measure, a try square, a fine-tooth hand saw, a hammer and a set of sandpaper (80, 120 and 220 grit). These cover most first projects.',
      'Measure twice and mark with a sharp pencil. Cut on the waste side of the line so the piece keeps its size.',
      'Sand in the direction of the grain, moving from coarse to fine grit. Wipe off the dust before applying any finish.',
      'Choose soft, easy woods like pine or rubberwood for first projects; save teak and sheesham for when your cuts are confident.',
    ],
  },
  {
    id: 'toolsafety', title: 'Power Tool Safety', image: 'learn-toolsafety', minutes: 3,
    summary: 'Simple rules that prevent most workshop injuries.',
    body: [
      'Always wear safety glasses. Add ear protection for saws and sanders, and a dust mask when sanding.',
      'Clamp the workpiece instead of holding it by hand, and keep both hands behind the blade or bit.',
      'Unplug or remove the battery before changing blades, bits or sanding discs.',
      'Tie back long hair, remove loose clothing and jewellery, and keep the floor free of off-cuts and cables.',
      'Children should use hand tools only, under direct adult supervision.',
    ],
  },
  {
    id: 'furniturecare', title: 'Outdoor Furniture Care', image: 'learn-furniturecare', minutes: 3,
    summary: "Keep timber and cane looking good through Odisha's seasons.",
    body: [
      'Wash wooden furniture with mild soap and water every few months, then let it dry fully in the shade.',
      'Re-oil teak and other hardwoods before the monsoon and again after it, using a lint-free cloth.',
      'Lift legs off wet floors with small rubber or plastic feet so water does not soak into the end grain.',
      'Cover or move cushions indoors during heavy rain, and store cane pieces away from direct sun to stop cracking.',
    ],
  },
  {
    id: 'seniorhomes', title: 'Senior Friendly Homes', image: 'senior-hub', minutes: 4,
    summary: 'Small changes that make a big difference for parents and grandparents.',
    body: [
      'Start with the bathroom: grab rails beside the toilet and shower, an anti-slip floor and a shower seat.',
      'Light the route from bedroom to bathroom with motion-sensor night lights.',
      'Remove loose rugs or fix them with anti-slip underlay, and keep walkways free of wires and clutter.',
      'Fit handrails on both sides of stairs and at any entrance step, and mark step edges with contrasting tape.',
    ],
  },
  {
    id: 'kidsdiy', title: 'Kids DIY Activities', image: 'camp-toolbox', minutes: 3,
    summary: 'Age-appropriate projects that build confidence.',
    body: [
      'Ages 6–8: painting and assembling pre-cut kits, sanding, gluing and simple nailing with a light hammer.',
      'Ages 9–12: measuring and marking, hand-sawing soft wood with a clamp, and screwing with a hand screwdriver.',
      'Teens: supervised use of a cordless drill, with safety glasses on every time.',
      'Keep sessions short, celebrate the finished piece, and let children choose the colours.',
    ],
  },
  {
    id: 'sustainable', title: 'Sustainable Living', image: 'learn-sustainable', minutes: 4,
    summary: 'Eco-friendly building choices for homes and farmhouses.',
    body: [
      'Reuse reclaimed timber for planters, shelves and raised beds; check it for nails before cutting.',
      'Harvest rainwater from the roof into covered barrels for the garden.',
      'Choose bamboo and locally sourced wood, and finish them with low-VOC oils and paints.',
      'Use solar garden lights and compost kitchen waste to feed your plants.',
    ],
  },
];

export const journey = [
  ['Register', 'Pick a workshop and book your seats on WhatsApp.'],
  ['Attend Workshop', 'Meet the crew and your fellow builders on the weekend.'],
  ['Build Project', 'Measure, cut and assemble with expert guidance.'],
  ['Take Home Creation', 'Your finished piece goes home with you the same day.'],
  ['Join Community', 'Share your build, earn badges and join the next project.'],
];

export const heritage = [
  { title: 'Traditional Wood Crafts', image: 'heritage-woodcraft', text: 'Carving and joinery skills passed down by Odisha craftspeople.' },
  { title: 'Village Living Ideas', image: 'heritage-village', text: 'Courtyards, verandas and natural cooling from village homes.' },
  { title: 'Eco-Friendly Construction', image: 'learn-sustainable', text: 'Local materials and low-waste methods that respect the land.' },
  { title: 'Bamboo Projects', image: 'heritage-bamboo', text: 'Woven bamboo screens, lamps and furniture.' },
  { title: 'Handmade Utilities', image: 'camp-toolbox', text: 'Toolboxes, racks and storage made to last.' },
];

// Sample quotes from the brief. Replace with real participant stories
// (with their permission) before removing the "Sample" tags.
export const stories = [
  { quote: 'My son built his first wooden stool.', who: 'Parent, Bhubaneswar', sample: true },
  { quote: 'We transformed our terrace into a weekend retreat.', who: 'Homeowner, Cuttack', sample: true },
  { quote: 'Weekend-Live made our home safe for our parents.', who: 'Family, Khordha', sample: true },
];

export const membership = [
  { tier: 'Bronze', perks: ['Monthly DIY Tips'] },
  { tier: 'Silver', perks: ['Monthly DIY Tips', 'Workshop Discounts'] },
  { tier: 'Gold', perks: ['Monthly DIY Tips', 'Workshop Discounts', 'Priority Booking', 'Special Events'], featured: true },
];

export const footerLinks = [
  ['/workshops', 'DIY Workshops'],
  ['/#outdoor', 'Outdoor Living'],
  ['/#seniors', 'Senior Home Improvements'],
  ['/heritage', 'Heritage Projects'],
  ['/community', 'Community'],
  ['/learn', 'DIY Knowledge Center'],
  ['/shop', 'Shop'],
  ['/contact', 'Request a quote'],
];
