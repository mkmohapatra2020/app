import Section, { SampleTag } from './Section.jsx';
import { stories, SHOW_SAMPLE_TAGS } from '../data/site.js';

export default function Stories() {
  return (
    <Section id="stories" eyebrow="Participant stories" title="What families say">
      <div className="story-grid">
        {stories.map((s) => (
          <figure className="story reveal" key={s.quote}>
            <div className="stars" aria-label="5 out of 5 stars">★★★★★</div>
            <blockquote>“{s.quote}”</blockquote>
            <figcaption>{s.who} <SampleTag show={SHOW_SAMPLE_TAGS && s.sample} /></figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
