import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageShell, { EmptyState, SkeletonGrid } from '../../components/common/PageShell.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import { FormAlert, SubmitButton } from '../../components/common/Form.jsx';
import useResource from '../../hooks/useResource.js';
import useApi from '../../hooks/useApi.js';
import useSession from '../../hooks/useSession.js';
import { communityService } from '../../services/communityService.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function CommunityPage() {
  const feed = useResource('community:posts', (a) => communityService.posts(a), { fallback: [] });
  const { isAuthenticated } = useSession();
  const location = useLocation();
  return (
    <PageShell title="Community" eyebrow="Share what you built" crumbs={[[null, 'Community']]}
      intro="Projects, tips and weekend wins from families across Odisha.">
      <div className="feed-layout">
        <div className="feed">
          {isAuthenticated ? <Composer onPosted={(p) => feed.setData((l) => [p, ...(l || [])])} /> : (
            <div className="card composer-guest"><p>Sign in to share your build, like posts and comment.</p><Link className="btn btn-primary btn-small" to="/login" state={{ from: location.pathname }}>Sign in</Link></div>
          )}
          {feed.loading ? <SkeletonGrid count={3} /> : feed.data?.length ? feed.data.map((p) => <Post key={p.id} post={p} canInteract={isAuthenticated} />) : (
            <EmptyState icon="🪵" title="No posts yet">{feed.error ? 'The community feed is unavailable right now.' : 'Be the first to share a project!'}</EmptyState>
          )}
        </div>
        <aside className="feed-side card">
          <h3>Community guidelines</h3>
          <ul className="ticks"><li>Share your own builds and photos</li><li>Be kind and helpful</li><li>Safety first — show protective gear</li><li>No selling in posts</li></ul>
          <Link to="/workshops" className="btn btn-outline btn-small">Find a workshop</Link>
        </aside>
      </div>
    </PageShell>
  );
}

function Composer({ onPosted }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const create = useApi((a) => communityService.create(a));
  const { toast } = useToast();
  const submit = async (e) => {
    e.preventDefault();
    if (text.trim().length < 3) return;
    const res = await create.execute({ text: text.trim(), image: file });
    if (res.success) {
      onPosted({ ...res.data, id: res.data.id || `new-${Date.now()}`, text: res.data.text || text.trim(), author: res.data.author || 'You', image: res.data.image || (file ? URL.createObjectURL(file) : ''), likes: res.data.likes || 0, comments: res.data.comments || [] });
      setText(''); setFile(null); toast('Posted!');
    }
  };
  return (
    <form className="card composer" onSubmit={submit}>
      <textarea className="f-input" rows={3} maxLength={1000} placeholder="What did you build this weekend?" value={text} onChange={(e) => setText(e.target.value)} aria-label="Write a post" />
      {file && <div className="composer-file"><img src={URL.createObjectURL(file)} alt="" /><button type="button" className="link-btn" onClick={() => setFile(null)}>Remove photo</button></div>}
      <FormAlert>{create.error}</FormAlert>
      <div className="composer-actions">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size <= 8 * 1024 * 1024) setFile(f); else if (f) toast('Please choose a photo under 8 MB', 'error'); }} />
        <button type="button" className="btn btn-quiet btn-small" onClick={() => fileRef.current?.click()}>📷 Photo</button>
        <SubmitButton loading={create.loading} loadingText="Posting…" disabled={text.trim().length < 3}>Post</SubmitButton>
      </div>
    </form>
  );
}

function Post({ post, canInteract }) {
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(post.liked);
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [text, setText] = useState('');
  const like = useApi((a) => communityService.like(a));
  const comment = useApi((a) => communityService.comment(a));
  const { toast } = useToast();

  const toggleLike = async () => {
    if (!canInteract || like.loading) return;
    const prev = [likes, liked];
    setLiked(!liked); setLikes(likes + (liked ? -1 : 1)); // optimistic
    const res = await like.execute({ id: post.id });
    if (!res.success) { [setLikes, setLiked].forEach((f, i) => f(prev[i])); toast(res.error, 'error'); }
  };
  const addComment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const res = await comment.execute({ id: post.id, text: text.trim() });
    if (res.success) { setComments((c) => [...c, { ...res.data, text: res.data.text || text.trim(), author: res.data.author === 'Member' ? 'You' : res.data.author }]); setText(''); }
    else toast(res.error, 'error');
  };

  return (
    <article className="card post">
      <header className="post-head">
        <span className="avatar-sm">{post.authorPhoto ? <img src={post.authorPhoto} alt="" /> : post.author[0]}</span>
        <div><b>{post.author}</b>{post.date && <small className="muted"> · {new Date(post.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</small>}</div>
      </header>
      {post.title && <h3>{post.title}</h3>}
      {post.text && <p className="post-text">{post.text}</p>}
      {post.image && <RemoteImage src={post.image} fallback="hero-workshop" alt="" className="post-img" />}
      <div className="post-actions">
        <button type="button" className={`post-btn${liked ? ' liked' : ''}`} onClick={toggleLike} disabled={!canInteract} aria-pressed={liked}>{liked ? '❤️' : '🤍'} {likes}</button>
        <button type="button" className="post-btn" onClick={() => setShowComments((s) => !s)} aria-expanded={showComments}>💬 {post.commentCount ?? comments.length}</button>
      </div>
      {showComments && (
        <div className="comments">
          {comments.map((c, i) => <p key={c.id || i} className="comment"><b>{c.author}</b> {c.text}</p>)}
          {canInteract && (
            <form className="comment-form" onSubmit={addComment}>
              <input className="f-input" placeholder="Write a comment…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Write a comment" maxLength={500} />
              <SubmitButton loading={comment.loading} loadingText="…" className="btn-small">Reply</SubmitButton>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
