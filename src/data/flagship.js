// Content for the flagship programmes: Heritage Restoration, Elderly DIY,
// DIY Incubator, AI Design Studio and Intergenerational programmes.
// Edit text, images and options here without touching the components.
// Images are /public/images/<name>-{640,1280}.webp names.

// Homepage band introducing the three new flagship areas.
export const flagships = [
  {
    id: 'restoration', to: '/heritage#restoration', image: 'learn-furniturecare', tag: 'Heritage Restoration',
    title: 'Restore the past', text: 'Antique furniture, carved doors and heritage homes brought back with traditional Odisha craft.',
  },
  {
    id: 'elder', to: '/elderly-diy', image: 'hero-family', tag: 'Elderly DIY Programs',
    title: 'Active ageing through making', text: 'Gentle, seated, well-supported projects designed for hands of every age.',
  },
  {
    id: 'incubator', to: '/incubator', image: 'hero-workshop', tag: 'DIY Incubator',
    title: 'From idea to prototype', text: 'Workshop space, mentors and challenges for students, makers, retirees and startups.',
  },
];

/* ------------------------------------------------------------------ */
/* 1. Heritage Restoration                                            */
/* ------------------------------------------------------------------ */
// Until real project photos exist, "before" and "during" are shown by
// treating the finished photo (weathered/partly restored look). Replace with
// real before/during/after photos and set `sample: false`.
export const restoration = {
  eyebrow: 'Heritage restoration',
  title: 'Restore The Past, Preserve The Future',
  lede: 'We repair, conserve and revive antique furniture, carved doors and heritage homes using the joinery, lacquer and wood-finishing traditions of Odisha — so they can be used and loved for another hundred years.',
  hero: { image: 'learn-furniturecare', alt: 'A teak armchair being restored with natural oil' },
  objectives: [
    'Antique furniture restoration',
    'Heritage home restoration',
    'Traditional woodwork preservation',
    'Traditional Odisha craftsmanship',
    'Before & after documentation',
    'Restoration consultation',
  ],
  services: [
    { id: 'furniture', title: 'Antique Furniture', image: 'learn-furniturecare', text: 'Teak and sheesham chairs, chests and almirahs — re-glued, re-caned and hand-finished.' },
    { id: 'doors', title: 'Vintage Doors', image: 'heritage-woodcraft', text: 'Carved panels, brass fittings and frames repaired without losing the original patina.' },
    { id: 'houses', title: 'Heritage Houses', image: 'heritage-village', text: 'Lime plaster, clay tile roofs and timber beams restored with compatible materials.' },
    { id: 'verandah', title: 'Verandah Restoration', image: 'show-sitout', text: 'Pillars, railings and sloped roofs brought back to make the verandah livable again.' },
    { id: 'joinery', title: 'Traditional Joinery', image: 'pillar-diy', text: 'Mortise-and-tenon, dovetail and pegged joints — cut by hand, no nails or metal brackets.' },
  ],
  process: [
    ['Assess', 'We visit, photograph and record the condition of each piece.'],
    ['Conserve', 'Clean, stabilise and treat for termites and moisture.'],
    ['Repair', 'Replace missing parts in matching wood with traditional joints.'],
    ['Finish', 'Natural oils, shellac or lacquer — matched to the original.'],
  ],
  gallery: [
    { id: 'chair', title: 'Teak planter’s chair', place: 'Cuttack', image: 'learn-furniturecare', sample: true,
      notes: ['Joints loose, finish lost to sun and rain', 'Re-glued joints, new pegs, hand-sanded', 'Three coats of natural teak oil'] },
    { id: 'panel', title: 'Carved temple-style door panel', place: 'Puri', image: 'heritage-woodcraft', sample: true,
      notes: ['Layers of paint hiding the carving', 'Paint lifted by hand, cracks filled with matching wood', 'Wax finish brings out the floral detail'] },
    { id: 'house', title: 'Village courtyard home', place: 'Khordha', image: 'heritage-village', sample: true,
      notes: ['Cracked plaster, sagging thatch, faded floor art', 'Lime plaster and new bamboo battens', 'Fresh thatch, restored verandah and jhoti art'] },
  ],
  assessment: {
    types: ['Antique furniture', 'Vintage door / window', 'Heritage house', 'Verandah', 'Traditional joinery repair', 'Not sure — need advice'],
  },
};

/* ------------------------------------------------------------------ */
/* 2. Elderly DIY Programs  (/elderly-diy)                             */
/* ------------------------------------------------------------------ */
// difficulty: 1 (very easy) – 3 (moderate). assistance: what help is on hand.
export const elderDiy = {
  eyebrow: 'Elderly DIY programs',
  title: 'Active Ageing Through Making',
  lede: 'Small, satisfying building projects for people aged 60 and over — at a comfortable pace, seated where possible, with a helper always beside you.',
  promises: [
    ['🪑', 'Seated workbenches', 'Every bench works from a chair, with arm rests and back support.'],
    ['🤝', 'A helper for every table', 'Trained volunteers do the heavy lifting and any power-tool work.'],
    ['🔍', 'Large-print guides', 'Step cards with big text and pictures, and magnifiers on every table.'],
    ['☕', 'Unhurried pace', 'Tea breaks built in. Unfinished projects can be completed next week.'],
  ],
  activities: [
    { id: 'raised-beds', title: 'Raised Garden Beds', image: 'learn-sustainable', difficulty: 2, duration: '2 sessions × 2 hrs', assistance: 'Helper cuts timber; you assemble and plant',
      text: 'Waist-high beds you can tend without bending — grow tulsi, chillies and leafy greens.' },
    { id: 'bird-feeders', title: 'Bird Feeders', image: 'camp-birdhouse', difficulty: 1, duration: '1.5 hrs', assistance: 'Pre-cut kit; light help with nailing',
      text: 'Assemble and paint a feeder for your balcony and welcome sparrows and mynas back.' },
    { id: 'memory-boards', title: 'Memory Boards', image: 'hero-family', difficulty: 1, duration: '2 hrs', assistance: 'None needed — guidance only',
      text: 'A wooden frame board for family photos, letters and keepsakes. A lovely grandchild project.' },
    { id: 'planter-boxes', title: 'Planter Boxes', image: 'show-roofgarden', difficulty: 2, duration: '2 hrs', assistance: 'Helper drills holes; you screw and finish',
      text: 'Sturdy timber planters with drainage, sized for windowsills and terrace railings.' },
    { id: 'home-utility', title: 'Home Utility Projects', image: 'camp-toolbox', difficulty: 2, duration: '2 hrs', assistance: 'Helper on hand throughout',
      text: 'Key holders, spectacle stands, shoe racks and grab-friendly shelves for daily life.' },
    { id: 'terrace-garden', title: 'Terrace Gardening', image: 'learn-sustainable', difficulty: 3, duration: '4 weekly sessions', assistance: 'Team handles soil and heavy pots',
      text: 'Plan, plant and care for a small terrace garden — seasonal vegetables, herbs and flowers.' },
  ],
  difficultyLabels: ['', 'Very easy', 'Easy', 'Moderate'],
  join: {
    times: ['Weekday mornings', 'Weekday afternoons', 'Saturday morning', 'Sunday morning'],
    mobility: ['Walks without help', 'Uses a walking stick', 'Uses a walker', 'Uses a wheelchair'],
  },
};

/* ------------------------------------------------------------------ */
/* 3. DIY Incubator  (/incubator)                                     */
/* ------------------------------------------------------------------ */
export const incubator = {
  eyebrow: 'Weekend-Live DIY incubator',
  title: 'From Idea To Prototype',
  lede: 'A maker space, a mentor network and real workshop tools for anyone with an idea worth building — from a school project to a product you want to sell.',
  audiences: [
    ['🎓', 'Students', 'School and college projects that go beyond the model kit.'],
    ['🛠️', 'Makers', 'Hobbyists who want proper tools and people to build with.'],
    ['🌿', 'Retirees', 'A lifetime of skill, put into a new invention or small business.'],
    ['💡', 'DIY Innovators', 'Clever fixes for home, farm and community problems.'],
    ['🚀', 'Startup Builders', 'Prototype, test and get ready for your first customers.'],
  ],
  workflow: [
    ['💡', 'Idea', 'Share your idea in one page — sketches welcome.'],
    ['🔧', 'Prototype', 'Build a first version in our workshop with our tools.'],
    ['🧪', 'Testing', 'Try it with real users and fix what breaks.'],
    ['🧭', 'Mentorship', 'Craftspeople, engineers and founders review your work.'],
    ['🚀', 'Launch', 'Showcase, sell or scale — we help you take the next step.'],
  ],
  features: [
    { id: 'submit', icon: '📝', title: 'Project Submission', text: 'One simple form to share your idea. We reply within a week.' },
    { id: 'mentors', icon: '🧑‍🏫', title: 'Mentor Network', text: 'Carpenters, engineers, designers and founders who give their time.' },
    { id: 'showcase', icon: '🏆', title: 'Prototype Showcase', text: 'A monthly open day where builders demo work to the community.' },
    { id: 'challenges', icon: '⚡', title: 'Innovation Challenges', text: 'Themed build challenges with prizes and workshop credits.' },
    { id: 'gallery', icon: '🖼️', title: 'Innovation Gallery', text: 'Every finished prototype, documented and celebrated.' },
  ],
  mentors: [
    { name: 'Master carpenter', field: 'Joinery & woodcraft', sample: true },
    { name: 'Mechanical engineer', field: 'Mechanisms & testing', sample: true },
    { name: 'Product designer', field: 'Form, ergonomics, materials', sample: true },
    { name: 'Startup founder', field: 'Pricing, selling, scaling', sample: true },
  ],
  challenges: [
    { id: 'monsoon', title: 'Monsoon-Proof Living', deadline: '2026-11-30', prize: '₹25,000 + workshop credits', text: 'Design something that keeps a home or balcony usable through heavy rain.', sample: true },
    { id: 'senior', title: 'Ageing at Home', deadline: '2026-12-20', prize: '₹20,000 + mentorship', text: 'A low-cost aid that helps an elder live more independently.', sample: true },
    { id: 'zero-waste', title: 'Zero-Waste Wood', deadline: '2027-01-31', prize: '₹15,000', text: 'Turn workshop off-cuts into something useful and beautiful.', sample: true },
  ],
  gallery: [
    { id: 'g1', title: 'Fold-flat balcony desk', who: 'Student, KIIT', image: 'pillar-diy', stage: 'Testing', sample: true },
    { id: 'g2', title: 'Bamboo solar lamp', who: 'Maker, Bhubaneswar', image: 'heritage-bamboo', stage: 'Launch', sample: true },
    { id: 'g3', title: 'One-hand jar opener board', who: 'Retired teacher, Cuttack', image: 'camp-toolbox', stage: 'Prototype', sample: true },
    { id: 'g4', title: 'Modular bird-house kit', who: 'Startup team', image: 'camp-birdhouse', stage: 'Mentorship', sample: true },
    { id: 'g5', title: 'Rainwater planter system', who: 'DIY innovator, Khordha', image: 'learn-sustainable', stage: 'Testing', sample: true },
    { id: 'g6', title: 'Shaded terrace kit', who: 'Startup team', image: 'show-roofgarden', stage: 'Launch', sample: true },
  ],
  stages: ['Just an idea', 'Sketches / drawings', 'Rough prototype', 'Working prototype', 'Ready to launch'],
};

/* ------------------------------------------------------------------ */
/* 4. AI Design Studio  (/design-studio)                               */
/* ------------------------------------------------------------------ */
export const studio = {
  categories: [
    { id: 'pergola', label: 'Pergola', icon: '🏡', hint: 'Teak or WPC pergola with climbers and lighting.',
      prompt: 'a teak-wood pergola with climbing plants, outdoor seating and warm string lights' },
    { id: 'gazebo', label: 'Gazebo', icon: '⛺', hint: 'A shaded gazebo for a garden or farmhouse.',
      prompt: 'a hexagonal timber gazebo with a clay-tile roof, built-in bench seating and a stone path' },
    { id: 'terrace', label: 'Terrace', icon: '🌇', hint: 'Deck, planters, shade and seating for a rooftop.',
      prompt: 'a terrace makeover with a weatherproof timber deck, raised planters, shade sail and lounge seating' },
    { id: 'senior', label: 'Senior Home', icon: '🧓', hint: 'Grab rails, ramps, lighting and safe flooring.',
      prompt: 'senior-friendly upgrades: grab rails, a gentle ramp with handrails, anti-slip flooring, good lighting and seating with armrests' },
    { id: 'heritage', label: 'Heritage Restoration', icon: '🏛️', hint: 'See the space or piece restored to its original character.',
      prompt: 'a careful heritage restoration: repaired carved woodwork, lime plaster, original timber restored with natural oil finish, traditional Odisha details preserved' },
    { id: 'product', label: 'DIY Product Concept', icon: '💡', hint: 'Turn a sketch or object into a product render.',
      prompt: 'a clean product concept render of a handcrafted wooden DIY product, shown on a workbench in soft daylight' },
  ],
  timeline: [
    ['submitted', 'Submitted', 'We have your photos and brief.'],
    ['queued', 'Queued', 'Uploading and waiting for a free designer slot.'],
    ['generating', 'Generating', 'The AI is creating your concept — usually 40–90 s.'],
    ['completed', 'Completed', 'Your design is ready to view and download.'],
  ],
};

/* ------------------------------------------------------------------ */
/* 5. Intergenerational programmes (homepage "Build Together")         */
/* ------------------------------------------------------------------ */
export const together = {
  eyebrow: 'Intergenerational programs',
  title: 'Build Together',
  lede: 'The best workshops have three generations at the bench. Grandparents bring the skill and the stories; children bring the questions and the energy.',
  programs: [
    { id: 'gp-child', title: 'Grandparent + Child Workshops', image: 'hero-family', meta: 'Ages 6+ with a grandparent', text: 'Pairs build one project together — one measures, one hammers, both take it home.' },
    { id: 'family-days', title: 'Family Build Days', image: 'hero-workshop', meta: 'Whole family · Saturdays', text: 'A bench per family and a bigger build: a bench, a planter wall, a play-house.' },
    { id: 'craft', title: 'Traditional Craft Learning', image: 'heritage-bamboo', meta: 'Taught by master artisans', text: 'Bamboo weaving, wood carving and lacquer work from Odisha’s craft families.' },
    { id: 'stories', title: 'Heritage Storytelling', image: 'heritage-village', meta: 'Evening circles', text: 'Elders share how homes, tools and festivals were made — recorded for the family.' },
  ],
  timeline: [
    ['📖', 'Learn', 'Elders and artisans teach the skill and the story behind it.'],
    ['🔨', 'Build', 'Generations work side by side on one shared project.'],
    ['🤲', 'Share', 'Show it at home, gift it, or display it at the community day.'],
    ['🌳', 'Preserve', 'Skills and stories pass to the next generation — and are recorded.'],
  ],
};

/* ------------------------------------------------------------------ */
/* Live data helper                                                    */
/* ------------------------------------------------------------------ */
// Live API items replace the local sample list when the API returns any.
// Only the photo is borrowed from the local items (by position) when the API
// has none — details like duration are never invented. The API id becomes
// `programId` so registrations can be sent to the backend.
const words = (t) => String(t || '').toLowerCase().match(/[a-z]{4,}/g) || [];
// Local photo whose title shares the most words with the API title (else by position).
function matchImage(title, localItems, i) {
  const w = new Set(words(title).map((x) => x.replace(/s$/, '')));
  let best = null; let score = 0;
  localItems.forEach((l) => { const s = words(l.title).filter((x) => w.has(x.replace(/s$/, ''))).length; if (s > score) { score = s; best = l; } });
  return (best || localItems[i % localItems.length] || {}).image;
}

export function withLocalDefaults(apiItems, localItems) {
  if (!apiItems?.length) return localItems;
  return apiItems.map((a, i) => ({
    ...a,
    id: `api-${a.id ?? i}`,
    programId: a.id,
    image: matchImage(a.title, localItems, i),
    remoteImage: a.image || '',
    sample: false,
  }));
}
