// Starter catalogue shown when the products API is unavailable.
export const fallbackProducts = [
  { id: 'kit-birdhouse', name: 'Birdhouse DIY kit', price: 799, image: 'camp-birdhouse', category: 'Kids kits', text: 'Pre-cut pine pieces, nails, sandpaper and non-toxic paints for a family build.' },
  { id: 'kit-toolbox', name: 'First toolbox kit', price: 1199, image: 'camp-toolbox', category: 'Kids kits', text: 'Everything to build a sturdy wooden toolbox — great first project for ages 8+.' },
  { id: 'teak-oil', name: 'Teak care oil (500 ml)', price: 649, image: 'learn-furniturecare', category: 'Care', text: 'Protects outdoor timber through Odisha summers and monsoons.' },
  { id: 'bamboo-lamp', name: 'Bamboo lamp kit', price: 899, image: 'heritage-bamboo', category: 'Heritage', text: 'Weave a lamp from treated bamboo strips with an LED bulb kit.' },
  { id: 'safety-set', name: 'Workshop safety set', price: 999, image: 'learn-toolsafety', category: 'Tools', text: 'Safety glasses, ear defenders and gloves in one pack.' },
  { id: 'planter-box', name: 'Balcony planter box kit', price: 1499, image: 'learn-sustainable', category: 'Garden', text: 'Weatherproof planter in treated wood with exterior screws.' },
].map((p) => ({ ...p, mrp: undefined, images: [], stock: undefined, rating: undefined, local: true }));
