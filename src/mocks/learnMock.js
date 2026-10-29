/**
 * Fallback for the Learning API while APIM does not publish it yet.
 *
 * The endpoints exist on the Function App (/api/api/learn/*) but APIM returns 404.
 * backendClient calls APIM FIRST and only uses these handlers when the live call
 * returns 404 (or, in local dev, when the browser is blocked by CORS). As soon as
 * APIM serves the routes, the live data is used automatically — no code change.
 *
 * Catalog data (categories, paths, certifications, workshops) is a snapshot of the
 * live Function App (learnFixture.json). Registrations, dashboards and concepts
 * are kept per user in localStorage ('wl-mock-learn').
 */
import { session } from '../services/session.js';
import fixture from './learnFixture.json';

const KEY = 'wl-mock-learn';
const ok = (data, status = 200) => ({ success: true, status, data, mocked: true });
const fail = (status, error) => ({ success: false, status, error, errorDetails: { error }, mocked: true });
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { regs: {}, concepts: [] }; } catch { return { regs: {}, concepts: [] }; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ } };
const me = () => String(session.user()?.id || '');
const eq = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
const hours = (d) => { const m = String(d || '').match(/([\d.]+)\s*hour/i); return m ? Number(m[1]) : 0; };

const ROUTES = [
  ['GET', /^\/learn\/categories$/, () => ok(fixture.categories)],
  ['GET', /^\/learn\/paths$/, () => ok(fixture.paths)],
  ['GET', /^\/learn\/certifications$/, () => ok(fixture.certifications)],
  ['GET', /^\/learn\/workshops$/, (_m, { query = {} }) => {
    let list = fixture.workshops;
    if (query.ageGroup) list = list.filter((w) => eq(w.ageGroup, query.ageGroup));
    if (query.skillLevel) list = list.filter((w) => eq(w.skillLevel, query.skillLevel));
    if (query.projectType) list = list.filter((w) => eq(w.projectType, query.projectType));
    if (query.duration) list = list.filter((w) => eq(w.duration, query.duration));
    if (query.toolType) list = list.filter((w) => String(w.toolsUsed || '').toLowerCase().includes(String(query.toolType).toLowerCase()));
    return ok(list);
  }],
  ['GET', /^\/learn\/workshops\/(\d+)$/, (m) => {
    const w = fixture.workshops.find((x) => String(x.id) === m[1]);
    return w ? ok(w) : fail(404, 'Workshop not found.');
  }],
  ['POST', /^\/learn\/workshops\/(\d+)\/register$/, (m) => {
    if (!session.token()) return fail(401, 'Please sign in to register.');
    const w = fixture.workshops.find((x) => String(x.id) === m[1]);
    if (!w) return fail(404, 'Workshop not found.');
    const s = load();
    const mine = (s.regs[me()] ||= []);
    if (mine.includes(w.id)) return ok({ success: false, message: 'You are already registered for this workshop.' });
    mine.push(w.id); save(s);
    return ok({ success: true, message: `You are registered for ${w.title}.`, data: { workshopId: w.id } });
  }],
  ['GET', /^\/learn\/dashboard\/(\d+)$/, (m) => {
    if (!session.token()) return fail(401, 'Please sign in to see your learning.');
    if (m[1] !== me()) return fail(403, 'You can only see your own dashboard.');
    const regs = load().regs[me()] || [];
    const ws = fixture.workshops.filter((w) => regs.includes(w.id));
    return ok({ workshopsCompleted: 0, learningHours: 0, badgesEarned: 0, currentLearningPath: ws[0]?.series || null, upcomingWorkshops: ws.length, aiDesignCredits: 0, plannedHours: ws.reduce((n, w) => n + hours(w.duration), 0) });
  }],
  ['POST', /^\/learn\/incubator\/concepts$/, (_m, { body = {} }) => {
    if (!session.token()) return fail(401, 'Please sign in to submit an idea.');
    if (!String(body.title || '').trim() || !String(body.description || '').trim()) return fail(400, 'Please give your idea a title and a description.');
    const s = load();
    const concept = { conceptId: s.concepts.length + 1, userId: body.userId, title: body.title, description: body.description, createdAt: new Date().toISOString() };
    s.concepts.push(concept); save(s);
    return ok({ success: true, message: 'Thanks — your idea has been submitted to the DIY Incubator.', data: concept }, 201);
  }],
  ['POST', /^\/learn\/media$/, (_m, { query = {} }) => {
    if (!session.token()) return fail(401, 'Please sign in to upload.');
    if (!query.conceptId) return fail(400, 'conceptId is required.');
    return ok({ success: true, message: 'Media received.', data: { conceptId: Number(query.conceptId), fileName: query.fileName || '', youtubeVideoLink: query.youtubeVideoLink || '' } }, 201);
  }],
];

/** Fallback handler for a Learning route, or null. */
export function learnFallbackFor(method, path) {
  const clean = String(path).split('?')[0];
  for (const [m, re, fn] of ROUTES) {
    if (m !== method.toUpperCase()) continue;
    const match = clean.match(re);
    if (match) return (req) => fn(match, req);
  }
  return null;
}
