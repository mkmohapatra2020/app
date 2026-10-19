// Local content shaped like the API adapters' output. Only used when
// USE_SAMPLE_DATA is true (offline demos); otherwise every list is empty and
// screens show real API data only.
import { USE_SAMPLE_DATA } from './site.js';
import { campaigns as localCampaigns, articles as localArticles, stories, heritage, showcase, communityPlaces } from './site.js';
import { galleryItems, safetyAreas } from './features.js';

const fallbackCampaigns = localCampaigns.map((c) => ({
  id: c.id, title: c.title, date: c.date, time: '10:00 AM', age: c.age, seatsLeft: c.seatsLeft, capacity: 16,
  price: undefined, location: 'Weekend-Live workshop, Lingipur, Bhubaneswar', text: c.text, image: c.image, category: 'Family', status: 'open', isRegistered: false, local: true,
}));
const fallbackWorkshops = fallbackCampaigns;
const fallbackEvents = fallbackCampaigns;

const fallbackArticles = localArticles.map((a) => ({ id: a.id, slug: a.id, title: a.title, summary: a.summary, image: a.image, minutes: a.minutes, category: 'Guide', author: 'Weekend-Live crew', date: '', body: a.body, isHtml: false, html: '' }));

const fallbackTestimonials = stories.map((s, i) => ({ id: String(i), quote: s.quote, who: s.who, city: '', rating: 5, sample: true }));

const fallbackHeritage = heritage.map((h, i) => ({ id: String(i), title: h.title, text: h.text, image: h.image, region: 'Odisha', category: '' }));

const fallbackProjects = [
  ...showcase.map((s) => ({ id: s.id, title: s.title, image: s.image, before: s.before || '', tags: ['outdoor'], cost: undefined, location: 'Odisha', text: s.text, duration: '', materials: [] })),
  ...galleryItems.filter((g) => !showcase.some((s) => s.image === g.image)).map((g, i) => ({ id: `g${i}`, title: g.title, image: g.image, before: '', tags: g.tags, cost: g.cost, location: 'Odisha', text: '', duration: '', materials: [] })),
];

const fallbackLocations = communityPlaces.map((p) => ({ id: p.id, name: p.name, projects: p.projects, participants: p.participants, story: p.story, sample: p.sample }));

const fallbackSafety = safetyAreas;

// Real-data mode: no sample content anywhere.
const S = (x) => (USE_SAMPLE_DATA ? x : []);
const fallbackCampaignsOut = S(fallbackCampaigns);
const fallbackWorkshopsOut = S(fallbackWorkshops);
const fallbackEventsOut = S(fallbackEvents);
const fallbackArticlesOut = S(fallbackArticles);
const fallbackTestimonialsOut = S(fallbackTestimonials);
const fallbackHeritageOut = S(fallbackHeritage);
const fallbackProjectsOut = S(fallbackProjects);
const fallbackLocationsOut = S(fallbackLocations);
const fallbackSafetyOut = S(fallbackSafety);
export { fallbackCampaignsOut as fallbackCampaigns, fallbackWorkshopsOut as fallbackWorkshops, fallbackEventsOut as fallbackEvents, fallbackArticlesOut as fallbackArticles, fallbackTestimonialsOut as fallbackTestimonials, fallbackHeritageOut as fallbackHeritage, fallbackProjectsOut as fallbackProjects, fallbackLocationsOut as fallbackLocations, fallbackSafetyOut as fallbackSafety };
