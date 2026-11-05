/**
 * Mock of the AI visualization DRAFT WORKFLOW (not deployed yet — every route
 * below returned 404 on APIM on 2026-10-27). Contract: AI_VISUALIZATION_UI_IMPLEMENTATION_PROMPT.md
 * and MOCK-APIS.md. Delete a route here once the backend ships it.
 *
 * Behaviour the real API is expected to have, simulated here:
 *  - customer = signed-in user (never a client-sent id); other users' requests → 403
 *  - site photo required, reference limit, category/budget/group-size validation → 422
 *  - quota checked on submit (402) and consumed only when accepted for generation
 *  - Auto: Queued → Processing → Completed (or Failed when the prompt contains "#fail")
 *  - Manual: PendingReview → admin approve / submit / request-changes / reject / retry
 *  - wrong workflow state / duplicate submit → 409
 * Uploads return a SAS on the fake host mock-blob.local; blobService skips the network for it.
 *
 * Routes the mock does not own (e.g. status of a request created by the live API)
 * return PASS so backendClient calls the real API instead.
 */
import { session } from '../services/session.js';
import { studio } from '../data/flagship.js';

export const PASS = Symbol('pass-through');
const KEY = 'wl-mock-viz';
export const MOCK_BLOB_HOST = 'mock-blob.local';

// ---------- category catalog (ids are environment-specific; the UI must not hardcode them) ----------
const prompt = (id) => studio.categories.find((c) => c.id === id)?.prompt || '';
export const MOCK_CATEGORIES = [
  { visualizationTypeId: 104, code: 'senior', name: 'Senior Home', description: 'Grab rails, ramps, lighting and safe flooring.', icon: '🧓', businessArea: 'SeniorLiving', promptTemplate: prompt('senior') },
  { visualizationTypeId: 105, code: 'heritage', name: 'Heritage Restoration', description: 'Restore a piece to its original character.', icon: '🏛️', businessArea: 'Heritage', promptTemplate: prompt('heritage') },
  { visualizationTypeId: 106, code: 'product', name: 'DIY Product Concept', description: 'Turn a sketch or object into a product render.', icon: '💡', businessArea: 'DIY', promptTemplate: prompt('product') },
  { visualizationTypeId: 107, code: 'kids-diy', name: "Kid's DIY", description: 'Safe, educational projects for children aged 10–15 with adult supervision.', icon: '🧒', businessArea: 'DIY', fieldSet: 'kids', promptTemplate: 'a safe, educational DIY project for children aged 10–15, shown being built with adult supervision' },
  { visualizationTypeId: 108, code: 'family-diy', name: 'Family DIY', description: 'Collaborative DIY projects for groups of 2–10 family members.', icon: '👨‍👩‍👧', businessArea: 'DIY', fieldSet: 'family', promptTemplate: 'a collaborative family DIY project with clear, age-appropriate roles' },
  { visualizationTypeId: 101, code: 'pergola', name: 'Pergola', description: 'Teak or WPC pergola with climbers and lighting.', icon: '🏡', businessArea: 'OutdoorLiving', promptTemplate: prompt('pergola') },
  { visualizationTypeId: 102, code: 'gazebo', name: 'Gazebo', description: 'A shaded gazebo for a garden or farmhouse.', icon: '⛺', businessArea: 'OutdoorLiving', promptTemplate: prompt('gazebo') },
  { visualizationTypeId: 103, code: 'terrace', name: 'Terrace', description: 'Deck, planters, shade and seating for a rooftop.', icon: '🌇', businessArea: 'OutdoorLiving', promptTemplate: prompt('terrace') },
  // New: under-construction house → finished exterior. Backend must add a matching visualization type (id 109 is a placeholder).
  { visualizationTypeId: 109, code: 'elevation', name: 'Building Elevation', description: 'See an under-construction house as a finished exterior — facade, finishes and landscaping.', icon: '🏢', businessArea: 'OutdoorLiving', promptTemplate: prompt('elevation') },
].map((c, i) => ({ ...c, displayOrder: i + 1 }));

// Sample "generated" images (static site images), two per category to exercise imageOrder.
const SAMPLE = { senior: 'senior-hub', heritage: 'heritage-woodcraft', product: 'camp-toolbox', 'kids-diy': 'camp-birdhouse', 'family-diy': 'hero-family', pergola: 'show-sitout', gazebo: 'show-gazebo', terrace: 'show-roofgarden', elevation: 'pillar-outdoor' };

// ---------- state ----------
const me = () => session.user() || {};
const ownerKey = () => String(me().id || me().email || 'guest');
const isAdmin = () => !!me().isAdmin;
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { requests: {}, quota: {} }; } catch { return { requests: {}, quota: {} }; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ } };
const now = () => new Date().toISOString();
const quotaOf = (s, owner) => (s.quota[owner] ?? 5);
const ok = (data, status = 200) => ({ success: true, status, data, mocked: true });
const fail = (status, error) => ({ success: false, status, error, errorDetails: { error }, mocked: true });
const uuid = () => crypto.randomUUID();
const TERMINAL = ['Completed', 'Failed', 'Rejected', 'Cancelled'];
const MAX_SITE = 4;
const maxRefs = () => 5; // the real value comes from AI_MAX_REFERENCE_IMAGES

function push(r, status, by = 'system', note = '') { r.status = status; r.statusHistory.push({ status, at: now(), by, note }); }

// Advance Queued → Processing → Completed over time (what the queue worker would do).
function tick(r) {
  if (!['Queued', 'Processing'].includes(r.status) || !r.queuedAt) return r;
  const age = Date.now() - Date.parse(r.queuedAt);
  if (r.status === 'Queued' && age > 4000) push(r, 'Processing');
  if (r.status === 'Processing' && age > 11000) {
    if (/#fail/i.test(`${r.userPrompt} ${r.additionalDetail}`)) { push(r, 'Failed'); r.errorMessage = 'The image model could not complete this design. Please retry.'; return r; }
    const cat = MOCK_CATEGORIES.find((c) => c.visualizationTypeId === r.visualizationTypeId);
    const a = SAMPLE[cat?.code] || 'show-deck';
    const exp = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    r.images = [a, 'show-deck'].map((n, i) => ({ imageOrder: i + 1, imageUrl: `/images/${n}-1280.webp?sv=mock&se=${encodeURIComponent(exp)}&sig=mock-read`, expiresOn: exp }));
    r.completedDate = now();
    push(r, 'Completed');
  }
  return r;
}

function computedPrompt(r) {
  const cat = MOCK_CATEGORIES.find((c) => c.visualizationTypeId === r.visualizationTypeId);
  const budget = r.maxBudget ? ` Keep scope, materials and complexity within ${r.budgetCurrency} ${r.maxBudget}.` : '';
  return `[${cat?.name || 'Design'}] ${cat?.promptTemplate || ''}. Customer idea: ${r.userPrompt}. ${r.additionalDetail || ''}${budget} Location (from profile): ${r.locationSnapshot}. Use ${r.sitePhotos.length} site photo(s) and ${r.referenceImages.length} reference image(s).`.replace(/\s+/g, ' ').trim();
}

const view = (r, { admin = false } = {}) => {
  const cat = MOCK_CATEGORIES.find((c) => c.visualizationTypeId === r.visualizationTypeId);
  const base = {
    requestId: r.requestId, status: r.status, generationMode: r.generationMode, projectName: r.projectName,
    visualizationTypeId: r.visualizationTypeId, categoryName: cat?.name || '', userPrompt: r.userPrompt, additionalDetail: r.additionalDetail,
    maxBudget: r.maxBudget, budgetCurrency: r.budgetCurrency, details: r.details, reviewNotes: r.reviewNotes,
    sitePhotoCount: r.sitePhotos.length, referenceImageCount: r.referenceImages.length,
    createdDate: r.createdDate, submittedDate: r.submittedDate, completedDate: r.completedDate,
    errorMessage: r.errorMessage, images: r.status === 'Completed' ? r.images : [],
  };
  if (!admin) return base;
  return {
    ...base, customer: r.customer, locationSnapshot: r.locationSnapshot, computedPrompt: computedPrompt(r),
    promptRevisions: r.promptRevisions, statusHistory: r.statusHistory, quota: { remaining: quotaOf(load(), r.owner), consumed: r.quotaConsumed },
    sitePhotos: r.sitePhotos, referenceImages: r.referenceImages, rejectQuotaPolicy: 'Rejected requests are not charged — quota is only used when generation starts.',
  };
};

// Load a request with access checks. Unknown id → PASS (maybe a live request).
function withRequest(id, fn, { admin = false } = {}) {
  if (!session.token()) return fail(401, 'Please sign in to continue.');
  const s = load();
  const r = s.requests[id];
  if (!r) return PASS;
  if (admin ? !isAdmin() : r.owner !== ownerKey()) return fail(403, 'You do not have permission to perform this action.');
  tick(r);
  const out = fn(r, s);
  save(s);
  return out;
}

function startGeneration(r, s, by) {
  const q = quotaOf(s, r.owner);
  if (q <= 0) return fail(402, 'No AI design quota remaining.');
  if (!r.quotaConsumed) { s.quota[r.owner] = q - 1; r.quotaConsumed = true; }
  r.queuedAt = now();
  r.images = []; r.errorMessage = '';
  push(r, 'Queued', by);
  return null;
}

function validateSubmit(r, b) {
  const errs = [];
  const cat = MOCK_CATEGORIES.find((c) => c.visualizationTypeId === Number(b.visualizationTypeId));
  if (!cat) errs.push('Please choose a valid category.');
  if (!r.sitePhotos.some((p) => p.uploaded)) errs.push('Please upload at least one site photo.');
  if (r.referenceImages.length > maxRefs()) errs.push(`A maximum of ${maxRefs()} reference images is allowed.`);
  if (!String(b.userPrompt || '').trim()) errs.push('Please describe your idea.');
  if (b.maxBudget != null && b.maxBudget !== '') {
    if (!(Number(b.maxBudget) > 0)) errs.push('Maximum budget must be greater than zero.');
    if (!/^[A-Z]{3}$/.test(String(b.budgetCurrency || ''))) errs.push('Budget currency must be a three-letter code such as INR.');
  }
  if (cat?.fieldSet === 'family') { const g = Number(b.details?.campaign?.groupSize ?? b.details?.groupSize); if (!(g >= 2 && g <= 10)) errs.push('Family DIY group size must be between 2 and 10.'); }
  if (!['Auto', 'Manual'].includes(b.generationMode || r.generationMode)) errs.push('Generation mode must be Auto or Manual.');
  return errs;
}

function uploadAsset(id, kind, body) {
  return withRequest(id, (r) => {
    if (!['Draft', 'ChangesRequested'].includes(r.status)) return fail(409, 'Photos can only be added while the request is a draft.');
    const list = kind === 'site' ? r.sitePhotos : r.referenceImages;
    const limit = kind === 'site' ? MAX_SITE : maxRefs();
    if (!body?.assetId && list.length >= limit) return fail(422, kind === 'site' ? `You can upload up to ${MAX_SITE} site photos.` : `Your membership allows up to ${limit} reference images.`);
    if (!/^image\/(jpeg|png|webp)$/.test(String(body?.contentType || ''))) return fail(422, 'Please upload a JPG, PNG or WebP image.');
    // Re-issuing for an existing asset (retry with expired SAS) keeps the same record.
    let asset = body?.assetId && list.find((a) => a.assetId === body.assetId);
    if (!asset) { asset = { assetId: uuid(), fileName: String(body.fileName || 'photo.jpg').slice(0, 120), contentType: body.contentType, uploaded: false }; list.push(asset); }
    const container = kind === 'site' ? 'uploaded' : 'reference';
    asset.blobName = `${r.owner}/${r.requestId}/${kind}/${asset.assetId}-${asset.fileName}`;
    asset.uploaded = true; // the real API would confirm via a blob event
    const exp = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    return ok({ assetId: asset.assetId, blobUri: `https://${MOCK_BLOB_HOST}/${container}/${asset.blobName}`, sasToken: 'sv=mock&sp=cw&sig=mock-write', blobName: asset.blobName, expiresOn: exp, maxReferenceImages: maxRefs(), count: list.length });
  });
}

// ---------- routes ----------
const ROUTES = [
  ['POST', /^\/ai-visualization\/drafts$/, () => {
    if (!session.token()) return fail(401, 'Please sign in to continue.');
    const s = load();
    const id = uuid();
    const u = me();
    s.requests[id] = {
      requestId: id, owner: ownerKey(), customer: { id: u.id || null, name: u.name || '', email: u.email || '' },
      locationSnapshot: u.city ? `${u.city}, India` : 'Bhubaneswar, Odisha, India',
      status: 'Draft', generationMode: u.imageGenOpt === 'Manual' ? 'Manual' : 'Auto',
      sitePhotos: [], referenceImages: [], promptRevisions: [], statusHistory: [{ status: 'Draft', at: now(), by: 'customer' }],
      images: [], createdDate: now(), quotaConsumed: false, reviewNotes: '',
    };
    save(s);
    return ok({ requestId: id, status: 'Draft', generationMode: s.requests[id].generationMode, remainingQuota: quotaOf(s, ownerKey()), maxReferenceImages: maxRefs(), maxSitePhotos: MAX_SITE, canChangeGenerationMode: true });
  }],
  ['POST', /^\/ai-visualization\/([0-9a-f-]{36})\/site-photo\/upload$/, (m, { body }) => uploadAsset(m[1], 'site', body)],
  ['POST', /^\/ai-visualization\/([0-9a-f-]{36})\/reference-image\/upload$/, (m, { body }) => uploadAsset(m[1], 'reference', body)],
  ['POST', /^\/ai-visualization\/([0-9a-f-]{36})\/submit$/, (m, { body }) => withRequest(m[1], (r, s) => {
    if (!['Draft', 'ChangesRequested'].includes(r.status)) return fail(409, `This request is already ${r.status}.`);
    const errs = validateSubmit(r, body || {});
    if (errs.length) return fail(422, errs.join(' '));
    const mode = body.generationMode || r.generationMode;
    if (mode === 'Auto' && quotaOf(s, r.owner) <= 0) return fail(402, 'No AI design quota remaining.');
    if (r.userPrompt && r.userPrompt !== body.userPrompt) r.promptRevisions.push({ at: now(), by: 'customer', userPrompt: r.userPrompt, additionalDetail: r.additionalDetail });
    Object.assign(r, {
      visualizationTypeId: Number(body.visualizationTypeId), projectName: String(body.projectName || '').slice(0, 120), userPrompt: body.userPrompt,
      additionalDetail: body.additionalDetail || '', maxBudget: body.maxBudget ?? null, budgetCurrency: body.maxBudget ? body.budgetCurrency : null,
      details: body.details || {}, generationMode: mode, submittedDate: now(), reviewNotes: r.status === 'ChangesRequested' ? r.reviewNotes : '',
    });
    if (mode === 'Manual') push(r, 'PendingReview', 'customer');
    else { push(r, 'Submitted', 'customer'); const e = startGeneration(r, s, 'system'); if (e) return e; }
    return ok({ requestId: r.requestId, status: r.status, generationMode: r.generationMode, remainingQuota: quotaOf(s, r.owner) });
  })],
  ['GET', /^\/ai-visualization\/([0-9a-f-]{36})\/status$/, (m) => withRequest(m[1], (r) => ok({ status: r.status, reviewNotes: r.reviewNotes || '' }))],
  ['GET', /^\/ai-visualization\/([0-9a-f-]{36})$/, (m) => withRequest(m[1], (r) => ok(view(r)))],
  // GET /ai-visualization/my-history is live (customer from the login token) — no mock.
  ['GET', /^\/admin\/ai-visualizations$/, (_m, { query = {} }) => {
    if (!session.token()) return fail(401, 'Please sign in to continue.');
    if (!isAdmin()) return fail(403, 'You do not have permission to perform this action.');
    const s = load();
    let list = Object.values(s.requests).filter((r) => r.status !== 'Draft').map((r) => tick(r));
    save(s);
    const q = (k) => (query[k] ?? '').toString().trim();
    if (q('status')) list = list.filter((r) => r.status === q('status'));
    if (q('failed') === 'true') list = list.filter((r) => r.status === 'Failed');
    if (q('mode')) list = list.filter((r) => r.generationMode === q('mode'));
    if (q('visualizationTypeId')) list = list.filter((r) => String(r.visualizationTypeId) === q('visualizationTypeId'));
    if (q('customer')) { const c = q('customer').toLowerCase(); list = list.filter((r) => `${r.customer.name} ${r.customer.email} ${r.customer.id}`.toLowerCase().includes(c)); }
    if (q('from')) list = list.filter((r) => (r.submittedDate || r.createdDate) >= q('from'));
    if (q('to')) list = list.filter((r) => (r.submittedDate || r.createdDate).slice(0, 10) <= q('to'));
    list.sort((a, b) => String(b.submittedDate || '').localeCompare(String(a.submittedDate || '')));
    const page = Math.max(1, Number(q('page')) || 1);
    const size = Math.min(100, Math.max(1, Number(q('pageSize')) || 25));
    return ok({ total: list.length, page, pageSize: size, items: list.slice((page - 1) * size, page * size).map((r) => ({ ...view(r), customer: r.customer })) });
  }],
  ['GET', /^\/admin\/ai-visualizations\/([0-9a-f-]{36})$/, (m) => withRequest(m[1], (r) => ok(view(r, { admin: true })), { admin: true })],
  ['POST', /^\/admin\/ai-visualizations\/([0-9a-f-]{36})\/(approve|submit|request-changes|reject|retry)$/, (m, { body = {} }) => withRequest(m[1], (r, s) => {
    const action = m[2];
    const need = { approve: ['PendingReview'], submit: ['PendingReview', 'ChangesRequested', 'Failed'], 'request-changes': ['PendingReview'], reject: ['PendingReview', 'ChangesRequested'], retry: ['Failed'] }[action];
    if (!need.includes(r.status)) return fail(409, `Cannot ${action.replace('-', ' ')} a request that is ${r.status}.`);
    if (action === 'request-changes') {
      if (!String(body.reviewNotes || '').trim()) return fail(422, 'Review notes are required so the customer knows what to change.');
      r.reviewNotes = body.reviewNotes.trim();
      push(r, 'ChangesRequested', 'admin', r.reviewNotes);
    } else if (action === 'reject') {
      if (!String(body.reason || '').trim()) return fail(422, 'Please give a reason for rejecting.');
      r.reviewNotes = body.reason.trim();
      push(r, 'Rejected', 'admin', r.reviewNotes);
    } else {
      if (action === 'submit') {
        if (!String(body.userPrompt || '').trim()) return fail(422, 'The prompt cannot be empty.');
        r.promptRevisions.push({ at: now(), by: 'admin', userPrompt: r.userPrompt, additionalDetail: r.additionalDetail });
        r.userPrompt = body.userPrompt; r.additionalDetail = body.additionalDetail ?? r.additionalDetail;
        if (body.generationMode) r.generationMode = body.generationMode;
      }
      const e = startGeneration(r, s, 'admin');
      if (e) return e;
    }
    return ok(view(r, { admin: true }));
  }, { admin: true })],
];

/** Handler for a workflow route, or null. Handlers may return PASS. */
export function workflowMockFor(method, path) {
  const clean = String(path).split('?')[0];
  for (const [m, re, fn] of ROUTES) {
    if (m !== method.toUpperCase()) continue;
    const match = clean.match(re);
    if (match) return (req) => fn(match, req);
  }
  return null;
}

export const WORKFLOW_MOCK_ROUTES = ROUTES.map(([m, re]) => `${m} ${re.source}`);
