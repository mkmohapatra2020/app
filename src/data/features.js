// Data for the interactive features. Edit freely — the components read from here.

// ---------- 1. DIY Project Configurator ----------
export const projectTypes = [
  ['woodwork', 'Woodworking'],
  ['kids', 'Kids & family craft'],
  ['outdoor', 'Outdoor living'],
  ['senior', 'Senior-friendly home'],
  ['heritage', 'Bamboo & heritage'],
];
export const skillLevels = [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']];
export const budgets = [[2000, 'Under ₹2,000'], [5000, '₹2,000–5,000'], [15000, '₹5,000–15,000'], [Infinity, '₹15,000+']];
export const times = [[3, '2–3 hours'], [5, 'Half a day'], [16, 'A weekend'], [40, 'Several weekends']];
const SKILL = { beginner: 1, intermediate: 2, advanced: 3 };

// cost = typical material cost in ₹, hours = build time.
export const diyProjects = [
  { id: 'birdhouse', name: 'Painted birdhouse', types: ['kids', 'woodwork'], skill: 'beginner', cost: 800, hours: 3, tools: ['Pre-cut pine kit', 'Light hammer', 'Wood glue', 'Sandpaper', 'Acrylic paints'], workshop: 'birdhouse' },
  { id: 'toolbox', name: 'First wooden toolbox', types: ['kids', 'woodwork'], skill: 'beginner', cost: 1200, hours: 4, tools: ['Tape measure', 'Try square', 'Hand saw', 'Hammer & nails', 'Sandpaper'], workshop: 'toolbox' },
  { id: 'planter', name: 'Balcony planter box', types: ['woodwork', 'outdoor', 'kids'], skill: 'beginner', cost: 1500, hours: 4, tools: ['Hand saw', 'Cordless drill', 'Exterior screws', 'Weatherproof oil'] },
  { id: 'stool', name: 'Step stool', types: ['woodwork', 'kids'], skill: 'beginner', cost: 1800, hours: 5, tools: ['Hand saw', 'Clamps', 'Wood glue', 'Screwdriver', 'Sandpaper'] },
  { id: 'bamboo-lamp', name: 'Woven bamboo lamp', types: ['heritage', 'kids'], skill: 'beginner', cost: 900, hours: 3, tools: ['Bamboo strips', 'Craft knife (adult use)', 'Binding thread', 'LED bulb kit'] },
  { id: 'wall-shelf', name: 'Floating wall shelf', types: ['woodwork'], skill: 'intermediate', cost: 2500, hours: 5, tools: ['Spirit level', 'Cordless drill', 'Wall plugs', 'Hidden brackets'] },
  { id: 'shoe-rack', name: 'Slatted shoe rack', types: ['woodwork'], skill: 'intermediate', cost: 3500, hours: 8, tools: ['Mitre saw or guide', 'Clamps', 'Drill', 'Wood finish'] },
  { id: 'raised-bed', name: 'Raised garden bed', types: ['outdoor', 'heritage'], skill: 'intermediate', cost: 4500, hours: 8, tools: ['Reclaimed timber', 'Drill', 'Exterior screws', 'Landscape fabric'] },
  { id: 'grab-rail', name: 'Bathroom grab rails', types: ['senior'], skill: 'intermediate', cost: 3000, hours: 3, tools: ['Stud/pipe detector', 'Hammer drill', 'Tile bit', 'Stainless rails & anchors'] },
  { id: 'night-lights', name: 'Motion-sensor night lighting', types: ['senior'], skill: 'beginner', cost: 2500, hours: 2, tools: ['Rechargeable sensor lights', 'Adhesive mounts', 'Screwdriver'] },
  { id: 'garden-bench', name: 'Garden bench with armrests', types: ['outdoor', 'senior', 'woodwork'], skill: 'intermediate', cost: 9000, hours: 16, tools: ['Circular saw', 'Drill', 'Clamps', 'Exterior oil'] },
  { id: 'ramp', name: 'Entrance ramp with handrail', types: ['senior', 'outdoor'], skill: 'advanced', cost: 18000, hours: 16, tools: ['Spirit level', 'Circular saw', 'Anti-slip strips', 'Galvanised handrail'] },
  { id: 'deck-tiles', name: 'Terrace deck tiles & seating', types: ['outdoor'], skill: 'intermediate', cost: 14000, hours: 16, tools: ['WPC deck tiles', 'Rubber mallet', 'Spirit level', 'Planters'] },
  { id: 'bamboo-screen', name: 'Bamboo privacy screen', types: ['heritage', 'outdoor'], skill: 'intermediate', cost: 6000, hours: 10, tools: ['Treated bamboo', 'Saw', 'Binding wire', 'Posts & brackets'] },
  { id: 'pergola-kit', name: 'Mini pergola for a balcony', types: ['outdoor', 'woodwork'], skill: 'advanced', cost: 25000, hours: 32, tools: ['Circular saw', 'Drill/driver', 'Post anchors', 'Ladder', 'Exterior stain'] },
];

export function recommendProjects({ type, skill, budget, hours }) {
  const s = SKILL[skill] || 1;
  return diyProjects
    .map((p) => {
      let score = 0;
      if (type && p.types.includes(type)) score += 4;
      if (SKILL[p.skill] <= s) score += 2; else score -= 3;
      if (p.cost <= budget) score += 2; else score -= 2;
      if (p.hours <= hours) score += 2; else score -= 2;
      if (SKILL[p.skill] === s) score += 1;
      return { ...p, score };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// ---------- 3. Senior Safety Score ----------
// The standard home-safety checklist (always shown). Questions returned by
// GET /elderly-assessment/questions are added after these (see SafetyScore.jsx).
// [id, question (a "yes" is the safe answer), fix shown when the answer is "no"]
export const safetyAreas = [
  {
    id: 'entrance', title: 'Entrance Safety', questions: [
      ['entry-step', 'The main entrance is step-free or has a ramp', 'Add a gentle ramp or a half-step at the main entrance.'],
      ['entry-rail', 'There is a handrail at every entrance step', 'Fit a sturdy handrail beside entrance steps.'],
      ['entry-light', 'The entrance is well lit at night', 'Install a motion-sensor light at the entrance.'],
      ['entry-door', 'The front door is easy to open and lock (lever handle, no stiff latch)', 'Swap knobs for lever handles and ease stiff locks.'],
    ],
  },
  {
    id: 'stairs', title: 'Stairs', questions: [
      ['stairs-rails', 'Stairs have sturdy handrails on both sides', 'Fit full-length handrails on both sides of every staircase.'],
      ['stairs-edges', 'Step edges are clearly visible and non-slip', 'Add contrasting anti-slip strips to every step edge.'],
      ['stairs-avoid', 'They can live on one floor without climbing stairs every day', 'Plan a ground-floor bedroom and bathroom, or consider a stair lift.'],
    ],
  },
  {
    id: 'bathroom', title: 'Bathroom Safety', questions: [
      ['bath-rails', 'Grab rails beside the toilet and shower', 'Install grab rails beside the toilet and in the shower.'],
      ['bath-floor', 'The bathroom floor is anti-slip', 'Apply an anti-slip coating or lay textured tiles.'],
      ['bath-seat', 'There is a shower seat or bench', 'Add a fold-down shower seat.'],
      ['bath-toilet', 'The toilet is at a comfortable height', 'Fit a raised toilet seat or a comfort-height WC.'],
      ['bath-door', 'The bathroom door opens outwards or can be unlocked from outside', 'Re-hang the door to open outwards and fit an emergency-release lock.'],
    ],
  },
  {
    id: 'bedroom', title: 'Bedroom', questions: [
      ['bed-height', 'The bed is a comfortable height to sit on and get up from', 'Raise or lower the bed so their knees are level with the hips when seated.'],
      ['bed-light', 'A light switch or lamp is reachable from the bed', 'Add a bedside lamp or a switch within reach of the bed.'],
    ],
  },
  {
    id: 'kitchen', title: 'Kitchen', questions: [
      ['kit-reach', 'Everyday items are within easy reach (no step stool needed)', 'Move daily items to shelves between waist and shoulder height.'],
      ['kit-gas', 'The gas stove has auto shut-off or a gas leak detector', 'Install a gas leak detector or a stove with flame-failure safety.'],
    ],
  },
  {
    id: 'lighting', title: 'Lighting', questions: [
      ['light-night', 'Night lights from bedroom to bathroom', 'Add motion-sensor night lights along the bedroom–bathroom route.'],
      ['light-switch', 'Light switches are reachable at room entrances', 'Move or add switches beside doorways.'],
    ],
  },
  {
    id: 'walkway', title: 'Walkways & Outdoors', questions: [
      ['walk-clear', 'Walkways are free of clutter and loose wires', 'Clear walkways and route cables along walls.'],
      ['walk-rugs', 'Rugs are removed or fixed with anti-slip underlay', 'Remove loose rugs or add anti-slip underlay.'],
      ['walk-even', 'Garden and outdoor paths are even, with seating', 'Level outdoor paths and add benches with armrests.'],
    ],
  },
  {
    id: 'emergency', title: 'Emergency & Mobility', questions: [
      ['em-phone', 'An emergency contact or alarm button is easy to reach at all times', 'Set up a wearable alarm button or keep a phone with speed-dial at hand.'],
      ['em-smoke', 'There are working smoke detectors', 'Fit smoke detectors in the kitchen and hallway and test them monthly.'],
    ],
  },
];

// ---------- 4. Kids DIY Passport ----------
// Each workshop gives children a stamp code at the end of the session.
export const passportStamps = [
  { id: 'birdhouse', name: 'Birdhouse Builder', icon: '🐦', code: 'BIRD24', challenge: 'Hang your birdhouse and spot your first visitor.', unlocks: 'First Toolbox' },
  { id: 'toolbox', name: 'Toolbox Maker', icon: '🧰', code: 'TOOL07', challenge: 'Fill your toolbox and fix one thing at home.', unlocks: 'Planter Box' },
  { id: 'planter', name: 'Green Thumb', icon: '🌱', code: 'GROW21', challenge: 'Grow a herb in your planter for two weeks.', unlocks: 'Bamboo Lamp' },
  { id: 'bamboo', name: 'Bamboo Weaver', icon: '🎋', code: 'WEAVE5', challenge: 'Teach one family member a weaving pattern.', unlocks: 'Step Stool' },
  { id: 'stool', name: 'Master Builder', icon: '🏆', code: 'STOOL9', challenge: 'Build something new with your own design.', unlocks: 'Weekend-Live Junior Crew' },
];

// ---------- 5. Project Gallery ----------
export const galleryFilters = [
  ['all', 'All'],
  ['kids', 'Kids Projects'],
  ['family', 'Family Projects'],
  ['outdoor', 'Outdoor Living'],
  ['farmhouse', 'Farmhouse'],
  ['senior', 'Senior Friendly'],
  ['budget', 'Budget Under ₹5,000'],
];

export const galleryItems = [
  { title: 'Painted birdhouses', image: 'camp-birdhouse', tags: ['kids', 'family'], cost: 800 },
  { title: 'First toolbox', image: 'camp-toolbox', tags: ['kids'], cost: 1200 },
  { title: 'Family birdhouse build', image: 'hero-family', tags: ['family'], cost: 800 },
  { title: 'Weekend group workshop', image: 'hero-workshop', tags: ['family'], cost: 1500 },
  { title: 'Waterproof deck', image: 'show-deck', tags: ['outdoor'], cost: 120000 },
  { title: 'Roof garden', image: 'show-roofgarden', tags: ['outdoor'], cost: 85000 },
  { title: 'Rain-proof sitout', image: 'show-sitout', tags: ['outdoor'], cost: 60000 },
  { title: 'Orchard gazebo', image: 'show-gazebo', tags: ['farmhouse', 'outdoor'], cost: 150000 },
  { title: 'Outdoor kitchen', image: 'show-kitchen', tags: ['farmhouse'], cost: 180000 },
  { title: 'Bamboo living space', image: 'show-bamboo', tags: ['farmhouse', 'outdoor'], cost: 90000 },
  { title: 'Safe senior bathroom', image: 'senior-hub', tags: ['senior'], cost: 25000 },
  { title: 'Entrance ramp & rail', image: 'pillar-senior', tags: ['senior'], cost: 18000 },
  { title: 'Bamboo baskets', image: 'heritage-bamboo', tags: ['family', 'kids'], cost: 600 },
  { title: 'Furniture care day', image: 'learn-furniturecare', tags: ['family'], cost: 1000 },
];
