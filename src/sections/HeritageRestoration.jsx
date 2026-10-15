import { useState } from 'react';
import Img from '../components/common/Img.jsx';
import RemoteImage from '../components/common/RemoteImage.jsx';
import useResource from '../hooks/useResource.js';
import { heritageRestorationService } from '../services/heritageRestorationService.js';
import BeforeAfter from '../components/common/BeforeAfter.jsx';
import { SampleTag } from '../components/common/Section.jsx';
import { restoration as R } from '../data/flagship.js';
import { SHOW_SAMPLE_TAGS } from '../data/site.js';
import { bookHeritageAssessment, useEnquiry } from '../features/enquiry/enquiry.js';

const STAGES = [['before', 'Before'], ['during', 'During'], ['after', 'After']];

// Premium heritage-restoration block: before/after hero, service cards,
// process, Before / During / After gallery and the assessment CTA.
export default function HeritageRestoration({ id = 'restoration' }) {
  const enquiry = useEnquiry();
  const book = (preset) => bookHeritageAssessment(enquiry, R.assessment.types, preset);
  return (
    <section id={id} className="sec sec-heritage" aria-labelledby={`${id}-title`}>
      <div className="wrap">
        <div className="hr-hero">
          <div className="hr-hero-text reveal">
            <span className="eyebrow">{R.eyebrow}</span>
            <h2 id={`${id}-title`}>{R.title.split(', ').map((t, i) => <span key={t} className={i ? 'accent' : ''}>{t}{i ? '' : ','}</span>)}</h2>
            <p className="hr-lede">{R.lede}</p>
            <ul className="hr-objectives">{R.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
            <div className="row-btns">
              <button type="button" className="btn btn-primary" onClick={() => book()}>Book Heritage Assessment</button>
              <a className="btn btn-ghost" href={`#${id}-gallery`}>See restorations</a>
            </div>
          </div>
          <div className="hr-hero-media reveal">
            <div className="ba-aged">
              <BeforeAfter before={R.hero.image} after={R.hero.image} alt={R.hero.alt} auto aspect="4 / 5" sizes="(max-width: 980px) 100vw, 50vw" />
            </div>
            <p className="hr-caption">Drag to compare<SampleTag show={SHOW_SAMPLE_TAGS} /></p>
          </div>
        </div>

        <ul className="hr-cards">
          {R.services.map((s) => (
            <li key={s.id} className="hr-card reveal">
              <Img name={s.image} alt="" sizes="(max-width: 760px) 100vw, 20vw" />
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <button type="button" className="link-btn" onClick={() => book(R.assessment.types.find((t) => t.toLowerCase().startsWith(s.title.toLowerCase().split(' ')[0])) || undefined)}>Assess my {s.title.toLowerCase()} →</button>
              </div>
            </li>
          ))}
        </ul>

        <ol className="hr-process reveal" aria-label="How a restoration works">
          {R.process.map(([t, d], i) => <li key={t}><span>{String(i + 1).padStart(2, '0')}</span><strong>{t}</strong><p>{d}</p></li>)}
        </ol>

        <RestorationGallery id={`${id}-gallery`} />

        <div className="hr-cta reveal">
          <div>
            <h3>Have a piece with a story?</h3>
            <p>Grandfather’s chair, a carved door, the family home in the village — our specialists will assess it and explain what can be saved.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => book()}>Book Heritage Assessment</button>
        </div>
      </div>
    </section>
  );
}

function RestorationGallery({ id }) {
  const [stage, setStage] = useState('after');
  const idx = STAGES.findIndex(([s]) => s === stage);
  // Live projects with at least an "after" photo replace the sample gallery.
  const live = useResource('heritage-restoration', (a) => heritageRestorationService.list(a), { fallback: [], accept: (d) => d?.some((p) => p.after) });
  const real = (live.data || []).filter((p) => p.after).slice(0, 6).map((p) => ({
    id: p.id, title: p.title, place: p.place, photos: { before: p.before, during: p.during, after: p.after },
    notes: [p.condition || p.text, p.work || p.text, p.text || p.work],
  }));
  const items = real.length ? real : R.gallery;
  return (
    <div className="hr-gallery" id={id}>
      <div className="hr-gallery-head">
        <h3>Restoration gallery<SampleTag show={SHOW_SAMPLE_TAGS && !real.length} /></h3>
        <div className="hr-stage-tabs" role="tablist" aria-label="Restoration stage">
          {STAGES.map(([s, label]) => (
            <button key={s} type="button" role="tab" aria-selected={stage === s} className={stage === s ? 'sel' : ''} onClick={() => setStage(s)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="hr-gallery-grid">
        {items.map((g) => (
          <figure key={g.id} className="hr-shot reveal">
            {/* Real photos are shown as-is; sample photos get the styled stage treatment. */}
            <div className={`hr-shot-img is-${stage}${g.photos && g.photos[stage] ? '' : ` stage-${stage}`}`}>
              {g.photos ? <RemoteImage src={g.photos[stage] || g.photos.after} fallback="heritage-woodcraft" alt={`${g.title} — ${stage}`} /> : <Img name={g.image} alt={`${g.title} — ${stage}`} sizes="(max-width: 760px) 100vw, 33vw" />}
              <span className="hr-stage-badge">{STAGES[idx][1]}</span>
            </div>
            <figcaption>
              <strong>{g.title}</strong>{g.place && <small>{g.place}</small>}
              {g.notes[idx] && <p>{g.notes[idx]}</p>}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
