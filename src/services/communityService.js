/** Community — posts feed, create post, like, comment. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toComment, toPost, unwrap, unwrapList } from './adapters.js';

const E = BACKEND_ENDPOINTS.COMMUNITY;

class CommunityService {
  posts({ signal, query } = {}) { return api.get(E.POSTS, { signal, query }).then((r) => mapRes(r, (d) => unwrapList(d, 'posts').map(toPost))); }
  create({ text, title, image, signal }) {
    const body = image ? (() => { const f = new FormData(); f.append('text', text); f.append('content', text); if (title) f.append('title', title); f.append('image', image, image.name || 'photo.jpg'); return f; })() : { text, content: text, title };
    return api.post(E.POSTS, body, { signal }).then((r) => mapRes(r, (d) => toPost(unwrap(d) || {})));
  }
  like({ id, signal }) { return api.post(E.LIKE, {}, { arg: id, signal }); }
  comment({ id, text, signal }) { return api.post(E.COMMENT, { text, comment: text, content: text }, { arg: id, signal }).then((r) => mapRes(r, (d) => toComment(unwrap(d) || { text }))); }
}
export const communityService = new CommunityService();
export default communityService;
