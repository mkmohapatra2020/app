// Local content shaped like the API adapters' output, used when the backend
// is unavailable or returns nothing — so every screen still works.
import { campaigns as localCampaigns, articles as localArticles, stories, heritage, showcase, communityPlaces } from './site.js';
import { galleryItems, safetyAreas } from './features.js';

export const fallbackCampaigns = localCampaigns.map((c) => ({
  id: c.id, title: c.title, date: c.date, time: '10:00 AM', age: c.age, seatsLeft: c.seatsLeft, capacity: 16,
  price: undefined, location: 'Weekend-Live workshop, Lingipur, Bhubaneswar', text: c.text, image: c.image, category: 'Family', status: 'open', isRegistered: false, local: true,
}));
export const fallbackWorkshops = fallbackCampaigns;
export const fallbackEvents = fallbackCampaigns;

export const fallbackArticles = localArticles.map((a) => ({ id: a.id, slug: a.id, title: a.title, summary: a.summary, image: a.image, minutes: a.minutes, category: 'Guide', author: 'Weekend-Live crew', date: '', body: a.body, isHtml: false, html: '' }));

export const fallbackTestimonials = stories.map((s, i) => ({ id: String(i), quote: s.quote, who: s.who, city: '', rating: 5, sample: true }));

export const fallbackHeritage = heritage.map((h, i) => ({ id: String(i), title: h.title, text: h.text, image: h.image, region: 'Odisha', category: '' }));

export const fallbackProjects = [
  ...showcase.map((s) => ({ id: s.id, title: s.title, image: s.image, before: s.before || '', tags: ['outdoor'], cost: undefined, location: 'Odisha', text: s.text, duration: '', materials: [] })),
  ...galleryItems.filter((g) => !showcase.some((s) => s.image === g.image)).map((g, i) => ({ id: `g${i}`, title: g.title, image: g.image, before: '', tags: g.tags, cost: g.cost, location: 'Odisha', text: '', duration: '', materials: [] })),
];

export const fallbackLocations = communityPlaces.map((p) => ({ id: p.id, name: p.name, projects: p.projects, participants: p.participants, story: p.story, sample: p.sample }));

export const fallbackSafety = safetyAreas;
