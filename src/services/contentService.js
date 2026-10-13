/** Content — testimonials & reviews, articles & search, heritage, crafts. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toArticle, toCraft, toHeritage, toTestimonial, unwrap, unwrapList } from './adapters.js';

const E = BACKEND_ENDPOINTS.CONTENT;

class ContentService {
  testimonials({ signal } = {}) { return api.get(E.TESTIMONIALS, { signal }).then((r) => mapRes(r, (d) => unwrapList(d, 'testimonials', 'reviews').map(toTestimonial).filter((t) => t.quote))); }
  addReview({ text, rating, name, city, signal }) { return api.post(E.TESTIMONIALS, { text, review: text, comment: text, rating: Number(rating), name, city }, { signal }); }
  articles({ signal, query } = {}) { return api.get(E.ARTICLES, { signal, query }).then((r) => mapRes(r, (d) => unwrapList(d, 'articles').map(toArticle).filter((a) => a.title))); }
  article({ slug, signal }) { return api.get(E.ARTICLE, { arg: slug, signal, auth: false }).then((r) => mapRes(r, (d) => toArticle(unwrap(d)))); }
  search({ q, signal }) { return api.get(E.ARTICLE_SEARCH, { query: { q, query: q }, signal }).then((r) => mapRes(r, (d) => unwrapList(d, 'articles').map(toArticle).filter((a) => a.title))); }
  heritage({ signal } = {}) { return api.get(E.HERITAGE, { signal }).then((r) => mapRes(r, (d) => unwrapList(d, 'projects').map(toHeritage).filter((h) => h.title))); }
  crafts({ signal } = {}) { return api.get(E.CRAFTS, { signal }).then((r) => mapRes(r, (d) => unwrapList(d, 'crafts', 'techniques').map(toCraft).filter((c) => c.title))); }
  craftGallery({ signal } = {}) { return api.get(E.CRAFT_GALLERY, { signal }).then((r) => mapRes(r, (d) => unwrapList(d, 'gallery', 'images').map(toCraft).filter((c) => c.image))); }
}
export const contentService = new ContentService();
export default contentService;
