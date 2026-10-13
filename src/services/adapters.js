/**
 * Response adapters.
 * The swagger file has no schemas, so each adapter accepts the common naming
 * styles (camelCase, PascalCase, snake_case, nested `data`) and returns the
 * shape the UI uses. When the real API shape is known, adjust ONLY this file.
 */

// First non-empty value among candidate keys (supports "a.b" paths).
export function pick(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    const v = k.split('.').reduce((o, p) => (o == null ? undefined : o[p] ?? o[p.charAt(0).toUpperCase() + p.slice(1)]), obj);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

// Unwraps { data: {...} } / { result } / { value } envelopes.
export function unwrap(payload) {
  let p = payload;
  for (let i = 0; i < 3 && p && typeof p === 'object' && !Array.isArray(p); i += 1) {
    const inner = p.data ?? p.Data ?? p.result ?? p.Result ?? p.value ?? p.payload;
    if (inner === undefined || inner === null) break;
    p = inner;
  }
  return p;
}

// Finds the array in a list response.
export function unwrapList(payload, ...extraKeys) {
  const p = unwrap(payload);
  if (Array.isArray(p)) return p;
  if (!p || typeof p !== 'object') return [];
  for (const k of [...extraKeys, 'items', 'Items', 'results', 'records', 'list', 'rows', 'data', 'value']) {
    if (Array.isArray(p[k])) return p[k];
  }
  const firstArray = Object.values(p).find(Array.isArray);
  return firstArray || [];
}

const num = (v, d = undefined) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const str = (v, d = '') => (v === undefined || v === null ? d : String(v));
const list = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(/[,|]/).map((x) => x.trim()).filter(Boolean) : []);
const isoDate = (v) => { if (!v) return ''; const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10); };

export const toImage = (v) => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return str(pick(v, 'url', 'imageUrl', 'src', 'path', 'uri'));
};

// ---------- auth & users ----------
export function toAuth(payload) {
  const p = unwrap(payload) || {};
  const token = pick(p, 'token', 'accessToken', 'access_token', 'jwt', 'idToken', 'authToken') || pick(payload, 'token', 'accessToken');
  const rawUser = pick(p, 'user', 'profile', 'account') || p;
  return { token: token ? str(token) : '', refreshToken: str(pick(p, 'refreshToken', 'refresh_token')), user: toUser(rawUser) };
}

export function toUser(u = {}) {
  const first = pick(u, 'firstName', 'first_name');
  const last = pick(u, 'lastName', 'last_name');
  const name = str(pick(u, 'name', 'fullName', 'full_name', 'displayName', 'userName', 'username') || [first, last].filter(Boolean).join(' '));
  const role = str(pick(u, 'role', 'userRole', 'roles.0', 'type'), 'user').toLowerCase();
  return {
    id: pick(u, 'id', 'userId', 'user_id', '_id'),
    name,
    email: str(pick(u, 'email', 'emailAddress')),
    phone: str(pick(u, 'phone', 'phoneNumber', 'mobile', 'mobileNumber')),
    city: str(pick(u, 'city', 'location', 'address.city')),
    photo: toImage(pick(u, 'profilePhoto', 'profilePhotoUrl', 'photoUrl', 'photo', 'avatar', 'avatarUrl', 'picture')),
    role,
    isAdmin: role.includes('admin') || pick(u, 'isAdmin') === true,
    membership: str(pick(u, 'membership', 'membershipTier', 'tier', 'plan')),
  };
}

export function toMembership(payload) {
  const p = unwrap(payload) || {};
  const plans = unwrapList(p, 'plans', 'tiers').map((t) => ({
    id: pick(t, 'id', 'planId', 'tier', 'name'),
    tier: str(pick(t, 'tier', 'name', 'title', 'plan')),
    price: num(pick(t, 'price', 'amount', 'monthlyPrice')),
    perks: list(pick(t, 'perks', 'benefits', 'features')),
  })).filter((t) => t.tier);
  return {
    current: str(pick(p, 'tier', 'currentTier', 'plan', 'membership', 'membershipTier', 'current.tier')),
    status: str(pick(p, 'status', 'state')),
    validUntil: isoDate(pick(p, 'validUntil', 'expiresAt', 'expiryDate', 'endDate')),
    plans,
  };
}

// ---------- campaigns / workshops / events ----------
export function toCampaign(c = {}) {
  const capacity = num(pick(c, 'capacity', 'totalSeats', 'maxParticipants', 'seats'));
  const booked = num(pick(c, 'registeredCount', 'bookedSeats', 'participantsCount', 'registrations'));
  const seatsLeft = num(pick(c, 'seatsRemaining', 'seatsLeft', 'availableSeats', 'remainingSeats'), capacity !== undefined && booked !== undefined ? Math.max(0, capacity - booked) : undefined);
  return {
    id: str(pick(c, 'id', 'campaignId', 'workshopId', 'eventId', 'slug')),
    title: str(pick(c, 'title', 'name', 'campaignName', 'workshopName', 'eventName')),
    date: isoDate(pick(c, 'date', 'startDate', 'eventDate', 'scheduledAt', 'start', 'dateTime')),
    time: str(pick(c, 'time', 'startTime', 'timing')),
    age: str(pick(c, 'age', 'ageGroup', 'minAge', 'ageLimit')),
    seatsLeft,
    capacity,
    price: num(pick(c, 'price', 'fee', 'amount', 'cost')),
    location: str(pick(c, 'location', 'venue', 'city', 'address', 'location.name')),
    text: str(pick(c, 'description', 'summary', 'shortDescription', 'details', 'text')),
    image: toImage(pick(c, 'imageUrl', 'image', 'thumbnail', 'coverImage', 'banner', 'images.0')),
    category: str(pick(c, 'category', 'type', 'skillLevel')),
    status: str(pick(c, 'status')),
    isRegistered: !!pick(c, 'isRegistered', 'registered', 'isBooked'),
  };
}

export function toParticipant(p = {}) {
  return { id: pick(p, 'id', 'userId'), name: str(pick(p, 'name', 'fullName', 'userName', 'user.name'), 'Participant'), city: str(pick(p, 'city', 'location')), seats: num(pick(p, 'seats', 'count'), 1) };
}

// ---------- content ----------
export function toArticle(a = {}) {
  const body = pick(a, 'body', 'content', 'html', 'text', 'paragraphs');
  return {
    id: str(pick(a, 'id', 'articleId', 'slug')),
    slug: str(pick(a, 'slug', 'urlSlug', 'id')),
    title: str(pick(a, 'title', 'name', 'heading')),
    summary: str(pick(a, 'summary', 'excerpt', 'description', 'subtitle')),
    image: toImage(pick(a, 'imageUrl', 'image', 'coverImage', 'thumbnail', 'heroImage')),
    minutes: num(pick(a, 'readTime', 'readingTime', 'minutes', 'readMinutes')),
    category: str(pick(a, 'category', 'tag', 'tags.0')),
    author: str(pick(a, 'author', 'authorName', 'author.name')),
    date: isoDate(pick(a, 'publishedAt', 'publishedDate', 'createdAt', 'date')),
    body: Array.isArray(body) ? body.map(String) : str(body).split(/\n{2,}/).map((x) => x.trim()).filter(Boolean),
    isHtml: typeof body === 'string' && /<\/?[a-z][\s\S]*>/i.test(body),
    html: typeof body === 'string' ? body : '',
  };
}

export function toTestimonial(t = {}) {
  return {
    id: str(pick(t, 'id', 'reviewId', 'testimonialId')),
    quote: str(pick(t, 'quote', 'text', 'review', 'comment', 'content', 'message')),
    who: str(pick(t, 'who', 'name', 'author', 'customerName', 'userName', 'user.name'), 'Weekend-Live family'),
    city: str(pick(t, 'city', 'location')),
    rating: Math.max(1, Math.min(5, num(pick(t, 'rating', 'stars', 'score'), 5))),
  };
}

export function toHeritage(h = {}) {
  return {
    id: str(pick(h, 'id', 'projectId', 'slug')),
    title: str(pick(h, 'title', 'name')),
    text: str(pick(h, 'description', 'summary', 'text', 'details')),
    image: toImage(pick(h, 'imageUrl', 'image', 'thumbnail', 'images.0')),
    region: str(pick(h, 'region', 'location', 'village', 'district')),
    category: str(pick(h, 'category', 'craft', 'type')),
  };
}

export function toCraft(c = {}) {
  return {
    id: str(pick(c, 'id', 'craftId', 'slug', 'name')),
    title: str(pick(c, 'title', 'name', 'technique')),
    text: str(pick(c, 'description', 'summary', 'details', 'text')),
    image: toImage(pick(c, 'imageUrl', 'image', 'thumbnail', 'url')),
    level: str(pick(c, 'difficulty', 'level', 'skillLevel')),
    materials: list(pick(c, 'materials', 'tools')),
  };
}

// ---------- community ----------
export function toComment(c = {}) {
  return { id: str(pick(c, 'id', 'commentId')), author: str(pick(c, 'author', 'userName', 'name', 'user.name'), 'Member'), text: str(pick(c, 'text', 'comment', 'content', 'message')), date: isoDate(pick(c, 'createdAt', 'date')) };
}

export function toPost(p = {}) {
  return {
    id: str(pick(p, 'id', 'postId')),
    author: str(pick(p, 'author', 'authorName', 'userName', 'user.name', 'name'), 'Member'),
    authorPhoto: toImage(pick(p, 'authorPhoto', 'user.photo', 'avatar')),
    text: str(pick(p, 'text', 'content', 'body', 'message', 'caption')),
    title: str(pick(p, 'title')),
    image: toImage(pick(p, 'imageUrl', 'image', 'photo', 'images.0', 'media.0')),
    likes: num(pick(p, 'likes', 'likeCount', 'likesCount'), 0),
    liked: !!pick(p, 'liked', 'isLiked', 'likedByMe'),
    comments: unwrapList(pick(p, 'comments') || []).map(toComment),
    commentCount: num(pick(p, 'commentCount', 'commentsCount'), undefined),
    date: isoDate(pick(p, 'createdAt', 'postedAt', 'date')),
  };
}

// ---------- shop ----------
export function toProduct(p = {}) {
  return {
    id: str(pick(p, 'id', 'productId', 'sku', 'slug')),
    name: str(pick(p, 'name', 'title', 'productName')),
    price: num(pick(p, 'price', 'salePrice', 'amount', 'mrp'), 0),
    mrp: num(pick(p, 'mrp', 'listPrice', 'originalPrice')),
    image: toImage(pick(p, 'imageUrl', 'image', 'thumbnail', 'images.0')),
    images: unwrapList(pick(p, 'images') || []).map(toImage).filter(Boolean),
    category: str(pick(p, 'category', 'categoryName', 'type')),
    text: str(pick(p, 'description', 'summary', 'details', 'shortDescription')),
    stock: num(pick(p, 'stock', 'quantity', 'inventory', 'availableQuantity')),
    rating: num(pick(p, 'rating', 'averageRating')),
  };
}

export function toOrder(payload) {
  const o = unwrap(payload) || {};
  return {
    id: str(pick(o, 'orderId', 'id', 'orderNumber', 'referenceId')),
    total: num(pick(o, 'total', 'totalAmount', 'amount', 'grandTotal')),
    status: str(pick(o, 'status', 'orderStatus'), 'created'),
    paymentRequired: pick(o, 'paymentRequired') !== false,
  };
}

// ---------- assessment ----------
export function toQuestions(payload) {
  const raw = unwrapList(payload, 'questions', 'sections', 'areas');
  // Either a flat list (with `area`/`category`) or grouped sections with nested questions.
  const grouped = raw.some((x) => Array.isArray(pick(x, 'questions')));
  const areas = new Map();
  const add = (areaName, q) => {
    const key = str(areaName, 'General');
    if (!areas.has(key)) areas.set(key, { id: key.toLowerCase().replace(/\W+/g, '-'), title: key, questions: [] });
    areas.get(key).questions.push([
      str(pick(q, 'id', 'questionId', 'code', 'key'), `${key}-${areas.get(key).questions.length}`),
      str(pick(q, 'question', 'text', 'title', 'label')),
      str(pick(q, 'recommendation', 'fix', 'improvement', 'advice', 'tip'), 'Ask us about a simple fix for this.'),
    ]);
  };
  if (grouped) raw.forEach((s) => unwrapList(pick(s, 'questions')).forEach((q) => add(pick(s, 'title', 'name', 'area', 'category'), q)));
  else raw.forEach((q) => add(pick(q, 'area', 'category', 'section', 'group'), q));
  return [...areas.values()].filter((a) => a.questions.length && a.questions.every(([, t]) => t));
}

export function toAssessmentResult(payload) {
  const p = unwrap(payload) || {};
  return {
    id: str(pick(p, 'id', 'assessmentId', 'referenceId')),
    score: num(pick(p, 'score', 'safetyScore', 'totalScore')),
    level: str(pick(p, 'level', 'riskLevel', 'rating', 'category')),
    recommendations: list(pick(p, 'recommendations', 'improvements', 'suggestions')).map((r) => (typeof r === 'string' ? r : str(pick(r, 'text', 'title', 'description')))),
  };
}

// ---------- locations / projects ----------
export function toLocation(l = {}) {
  return {
    id: str(pick(l, 'id', 'locationId', 'slug', 'name', 'city')).toLowerCase(),
    name: str(pick(l, 'name', 'city', 'title', 'locationName')),
    lat: num(pick(l, 'latitude', 'lat', 'coordinates.lat', 'geo.lat')),
    lng: num(pick(l, 'longitude', 'lng', 'lon', 'coordinates.lng', 'geo.lng')),
    projects: list(pick(l, 'projects', 'projectNames', 'highlights')).map((x) => (typeof x === 'string' ? x : str(pick(x, 'title', 'name')))),
    participants: str(pick(l, 'participants', 'participantsSummary', 'participantCount')),
    story: str(pick(l, 'story', 'featuredStory', 'description')),
    address: str(pick(l, 'address', 'venue')),
    distanceKm: num(pick(l, 'distanceKm', 'distance')),
  };
}

export function toProjectCategory(c = {}) {
  return { id: str(pick(c, 'id', 'slug', 'key', 'name')).toLowerCase(), label: str(pick(c, 'name', 'label', 'title', 'category')) };
}

export function toProject(p = {}) {
  return {
    id: str(pick(p, 'id', 'projectId', 'slug')),
    title: str(pick(p, 'title', 'name', 'projectName')),
    image: toImage(pick(p, 'afterImage', 'imageUrl', 'image', 'thumbnail', 'coverImage', 'images.0')),
    before: toImage(pick(p, 'beforeImage', 'before', 'beforeImageUrl')),
    tags: list(pick(p, 'tags', 'categories', 'category')).map((t) => String(typeof t === 'string' ? t : pick(t, 'name', 'slug')).toLowerCase()),
    cost: num(pick(p, 'cost', 'budget', 'price', 'estimatedCost')),
    location: str(pick(p, 'location', 'city')),
    text: str(pick(p, 'description', 'summary', 'details')),
    duration: str(pick(p, 'duration', 'timeline', 'buildTime')),
    materials: list(pick(p, 'materials')),
  };
}

export function toComparison(payload) {
  const p = unwrap(payload) || {};
  return { before: toImage(pick(p, 'before', 'beforeImage', 'beforeImageUrl', 'images.before')), after: toImage(pick(p, 'after', 'afterImage', 'afterImageUrl', 'images.after')), notes: str(pick(p, 'notes', 'description', 'summary')) };
}

// ---------- passport ----------
export function toBadge(b = {}) {
  return { id: str(pick(b, 'id', 'badgeId', 'code', 'key')), name: str(pick(b, 'name', 'title', 'badgeName')), icon: str(pick(b, 'icon', 'emoji'), '🏅'), earnedAt: isoDate(pick(b, 'earnedAt', 'awardedAt', 'createdAt', 'date')) };
}

export function toProgress(payload) {
  const p = unwrap(payload) || {};
  return { earned: num(pick(p, 'earned', 'earnedCount', 'badgesEarned', 'completed'), 0), total: num(pick(p, 'total', 'totalBadges', 'available'), 0), level: str(pick(p, 'level', 'rank', 'title')), nextBadge: str(pick(p, 'nextBadge', 'next', 'nextBadge.name')) };
}

// ---------- AI ----------
export function toRecommendations(payload) {
  return unwrapList(payload, 'recommendations', 'projects', 'workshops', 'suggestions').map((r) => ({
    id: str(pick(r, 'id', 'projectId', 'workshopId', 'slug', 'name')),
    name: str(pick(r, 'name', 'title', 'projectName', 'workshopName')),
    reason: str(pick(r, 'reason', 'why', 'explanation', 'description')),
    tools: list(pick(r, 'tools', 'requiredTools', 'materials')),
    cost: num(pick(r, 'cost', 'estimatedCost', 'budget')),
    hours: num(pick(r, 'hours', 'duration', 'estimatedHours', 'timeRequired')),
    skill: str(pick(r, 'skill', 'skillLevel', 'level', 'difficulty')),
    workshopId: str(pick(r, 'workshopId', 'campaignId', 'workshop.id')),
    workshopTitle: str(pick(r, 'workshopTitle', 'workshopName', 'workshop.title', 'workshop.name')),
  })).filter((r) => r.name);
}

export function toSkill(payload) {
  const p = unwrap(payload) || {};
  return { level: str(pick(p, 'level', 'skillLevel', 'result', 'assessment')).toLowerCase(), summary: str(pick(p, 'summary', 'feedback', 'description', 'message')), score: num(pick(p, 'score')) };
}

export function toVisualization(payload) {
  const p = unwrap(payload) || {};
  const status = str(pick(p, 'status', 'state'), '').toLowerCase();
  return {
    id: str(pick(p, 'requestId', 'id', 'visualizationId')),
    status: /complete|done|success|ready|finished/.test(status) ? 'done' : /fail|error|reject/.test(status) ? 'error' : status ? 'pending' : '',
    image: toImage(pick(p, 'resultImageUrl', 'outputImageUrl', 'generatedImageUrl', 'imageUrl', 'resultUrl', 'result.imageUrl', 'images.0')),
    b64: str(pick(p, 'b64_json', 'imageBase64', 'resultBase64')),
    original: toImage(pick(p, 'originalImageUrl', 'referenceImageUrl', 'inputImageUrl', 'sourceImageUrl')),
    error: str(pick(p, 'error', 'errorMessage', 'message')),
    createdAt: isoDate(pick(p, 'createdAt', 'submittedAt', 'date')),
    prompt: str(pick(p, 'prompt', 'description', 'style')),
    suggestions: list(pick(p, 'suggestions', 'recommendations', 'tips')).map((s) => (typeof s === 'string' ? s : str(pick(s, 'text', 'title', 'description')))),
  };
}

export function toUploadRef(payload) {
  const p = unwrap(payload) || {};
  return { id: str(pick(p, 'id', 'uploadId', 'fileId', 'referenceId', 'blobName', 'imageId')), url: toImage(pick(p, 'url', 'imageUrl', 'fileUrl', 'blobUrl', 'uri')) };
}

// ---------- admin ----------
// Flattens any object of numbers into KPI tiles: [{ key, label, value }]
export function toKpis(payload) {
  const p = unwrap(payload) || {};
  const out = [];
  const walk = (obj, prefix = '') => Object.entries(obj || {}).forEach(([k, v]) => {
    if (typeof v === 'number') out.push({ key: prefix + k, label: (prefix + k).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), value: v });
    else if (v && typeof v === 'object' && !Array.isArray(v) && prefix.split('.').length < 2) walk(v, `${prefix}${k}.`);
  });
  walk(p);
  return out;
}

export function toSeries(payload, labelKeys = ['label', 'month', 'date', 'period', 'name', 'title', 'campaign', 'campaignName'], valueKeys = ['value', 'revenue', 'amount', 'total', 'occupancy', 'occupancyRate', 'percentage', 'count']) {
  return unwrapList(payload, 'series', 'points', 'months', 'campaigns').map((r) => ({
    label: str(pick(r, ...labelKeys)),
    value: num(pick(r, ...valueKeys), 0),
    capacity: num(pick(r, 'capacity', 'totalSeats')),
    booked: num(pick(r, 'booked', 'bookedSeats', 'registered', 'registrations')),
  })).filter((r) => r.label);
}
