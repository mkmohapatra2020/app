import { useState } from 'react';
import { Link } from 'react-router-dom';
import Section, { SampleTag } from '../components/common/Section.jsx';
import { TextArea, TextInput, FormAlert, SubmitButton } from '../components/common/Form.jsx';
import { SHOW_SAMPLE_TAGS } from '../data/site.js';
import { fallbackTestimonials } from '../data/fallbacks.js';
import useResource, { invalidate } from '../hooks/useResource.js';
import useApi from '../hooks/useApi.js';
import useSession from '../hooks/useSession.js';
import { contentService } from '../services/contentService.js';
import { useToast } from '../context/ToastContext.jsx';

// Testimonials from GET /testimonials; signed-in visitors can add a review (POST).
export default function Stories() {
  const t = useResource('testimonials', (a) => contentService.testimonials(a), { fallback: fallbackTestimonials });
  const [writing, setWriting] = useState(false);
  const { isAuthenticated } = useSession();
  return (
    <Section id="stories" eyebrow="Participant stories" title="What families say">
      <div className="story-grid">
        {(t.data || []).slice(0, 6).map((s) => (
          <figure className="story reveal" key={s.id || s.quote}>
            <div className="stars" aria-label={`${s.rating} out of 5 stars`}>{'★'.repeat(s.rating)}{'☆'.repeat(5 - s.rating)}</div>
            <blockquote>“{s.quote}”</blockquote>
            <figcaption>{s.who}{s.city ? `, ${s.city}` : ''} <SampleTag show={SHOW_SAMPLE_TAGS && s.sample} /></figcaption>
          </figure>
        ))}
      </div>
      <div className="center-row">
        {isAuthenticated
          ? <button type="button" className="btn btn-outline" onClick={() => setWriting((w) => !w)} aria-expanded={writing}>{writing ? 'Close' : '✍️ Share your story'}</button>
          : <Link to="/login" state={{ from: '/#stories' }} className="btn btn-outline">Sign in to share your story</Link>}
      </div>
      {writing && <ReviewForm onDone={() => { setWriting(false); invalidate('testimonials'); t.reload(); }} />}
    </Section>
  );
}

function ReviewForm({ onDone }) {
  const { user } = useSession();
  const [v, setV] = useState({ text: '', rating: 5, name: user?.name || '', city: user?.city || '' });
  const add = useApi((a) => contentService.addReview(a));
  const { toast } = useToast();
  const submit = async (e) => {
    e.preventDefault();
    if (v.text.trim().length < 10) return;
    const res = await add.execute(v);
    if (res.success) { toast('Thank you for sharing your story!'); onDone(); }
  };
  return (
    <form className="card form-card review-form" onSubmit={submit} noValidate>
      <div className="stars-input" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={v.rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} className={n <= v.rating ? 'on' : ''} onClick={() => setV({ ...v, rating: n })}>★</button>)}
      </div>
      <TextArea label="Your story" rows={3} maxLength={600} value={v.text} onChange={(e) => setV({ ...v, text: e.target.value })} hint="At least 10 characters" />
      <div className="f-row"><TextInput label="Name shown" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /><TextInput label="City" optional value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} /></div>
      <FormAlert>{add.error}</FormAlert>
      <SubmitButton loading={add.loading} loadingText="Sending…" disabled={v.text.trim().length < 10}>Post review</SubmitButton>
    </form>
  );
}
