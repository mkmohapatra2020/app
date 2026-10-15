import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Img from '../../components/common/Img.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import useResource from '../../hooks/useResource.js';
import { incubatorService } from '../../services/incubatorService.js';
import { SampleTag } from '../../components/common/Section.jsx';
import { incubator as I, withLocalDefaults } from '../../data/flagship.js';
import { SHOW_SAMPLE_TAGS } from '../../data/site.js';
import { formatDate } from '../../utils/contact.js';
import { generalEnquiry, submitIdea, useEnquiry } from '../../features/enquiry/enquiry.js';


// /incubator — "From Idea To Prototype".
export default function IncubatorPage() {
  const enquiry = useEnquiry();
  const [stage, setStage] = useState('All');
  const [step, setStep] = useState(0);
  useEffect(() => { document.title = 'DIY Incubator · Weekend-Live'; }, []);
  const submit = (challenge) => submitIdea(enquiry, I, challenge);
  const live = useResource('incubator:list', (a) => incubatorService.list(a), { fallback: [] });
  const gallery = withLocalDefaults(live.data, I.gallery);
  const fromApi = gallery !== I.gallery;
  const stageFilters = ['All', ...new Set([...I.workflow.map(([, t]) => t), ...gallery.map((g) => g.stage).filter(Boolean)])];
  const shown = stage === 'All' ? gallery : gallery.filter((g) => (g.stage || '').toLowerCase() === stage.toLowerCase());

  return (
    <div className="page inc">
      <header className="inc-hero">
        <Img name="hero-workshop" alt="" className="inc-hero-bg" eager sizes="100vw" />
        <div className="wrap">
          <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link> / DIY Incubator</nav>
          <span className="eyebrow">{I.eyebrow}</span>
          <h1>From Idea <em>To Prototype</em></h1>
          <p className="inc-lede">{I.lede}</p>
          <div className="row-btns">
            <button type="button" className="btn btn-primary" onClick={() => submit()}>Submit Your Idea</button>
            <a className="btn btn-ghost" href="#inc-gallery">See prototypes</a>
          </div>
        </div>
      </header>

      <div className="wrap page-body">
        <section aria-labelledby="inc-who" className="inc-block">
          <h2 id="inc-who" className="inc-h2">Who it’s for</h2>
          <ul className="inc-audience">
            {I.audiences.map(([icon, t, d]) => <li key={t}><span aria-hidden="true">{icon}</span><strong>{t}</strong><p>{d}</p></li>)}
          </ul>
        </section>

        <section aria-labelledby="inc-flow" className="inc-block inc-flow-wrap">
          <h2 id="inc-flow" className="inc-h2">How an idea becomes a prototype</h2>
          <ol className="inc-flow">
            {I.workflow.map(([icon, t, d], i) => (
              <li key={t} className={i <= step ? 'on' : ''}>
                <button type="button" aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)} onMouseEnter={() => setStep(i)}>
                  <span className="inc-flow-icon" aria-hidden="true">{icon}</span>
                  <strong>{t}</strong>
                </button>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="inc-feat" className="inc-block">
          <h2 id="inc-feat" className="inc-h2">What you get</h2>
          <div className="inc-features">
            {I.features.map((f) => (
              <a key={f.id} href={`#inc-${f.id}`} className="inc-feature" onClick={f.id === 'submit' ? (e) => { e.preventDefault(); submit(); } : undefined}>
                <span aria-hidden="true">{f.icon}</span><strong>{f.title}</strong><p>{f.text}</p>
              </a>
            ))}
          </div>
        </section>

        <div className="inc-split">
          <section id="inc-mentors" aria-labelledby="inc-mentors-h" className="inc-panel">
            <h2 id="inc-mentors-h" className="inc-h2">Mentor network<SampleTag show={SHOW_SAMPLE_TAGS} /></h2>
            <ul className="inc-mentors">
              {I.mentors.map((m) => <li key={m.name}><span className="inc-avatar" aria-hidden="true">{m.name[0]}</span><div><strong>{m.name}</strong><small>{m.field}</small></div></li>)}
            </ul>
            <button type="button" className="link-btn" onClick={() => generalEnquiry(enquiry, "I'd like to become a mentor at the Weekend-Live DIY Incubator.")}>Want to mentor? Get in touch →</button>
          </section>
          <section id="inc-challenges" aria-labelledby="inc-ch-h" className="inc-panel inc-panel-dark">
            <h2 id="inc-ch-h" className="inc-h2">Innovation challenges<SampleTag show={SHOW_SAMPLE_TAGS} /></h2>
            <ul className="inc-challenges">
              {I.challenges.map((c) => (
                <li key={c.id}>
                  <div><strong>{c.title}</strong><p>{c.text}</p><small>Closes {formatDate(c.deadline)} · {c.prize}</small></div>
                  <button type="button" className="btn btn-primary btn-small" onClick={() => submit(c.title)}>Enter</button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section id="inc-gallery" aria-labelledby="inc-gal-h" className="inc-block">
          <div className="row-between inc-gal-head">
            <h2 id="inc-gal-h" className="inc-h2">Innovation gallery &amp; prototype showcase<SampleTag show={SHOW_SAMPLE_TAGS && !fromApi} /></h2>
          </div>
          <div className="filter-row" role="group" aria-label="Filter by stage">
            {stageFilters.map((s) => <button key={s} type="button" className={`chip${stage === s ? ' sel' : ''}`} aria-pressed={stage === s} onClick={() => setStage(s)}>{s}</button>)}
          </div>
          {shown.length ? (
            <div className="inc-gallery">
              {shown.map((g) => (
                <figure key={g.id} className="inc-shot">
                  {g.remoteImage ? <RemoteImage src={g.remoteImage} fallback={g.image} alt={g.title} /> : <Img name={g.image} alt={g.title} sizes="(max-width: 760px) 50vw, 33vw" />}
                  <figcaption>{g.stage && <span className="inc-stage">{g.stage}</span>}<strong>{g.title}</strong>{(g.who || g.category) && <small>{g.who || g.category}</small>}</figcaption>
                </figure>
              ))}
            </div>
          ) : <p className="muted">No prototypes at this stage yet — yours could be the first.</p>}
        </section>

        <section id="inc-submit" className="inc-cta" aria-labelledby="inc-cta-h">
          <div>
            <h2 id="inc-cta-h">Got an idea? Start with one page.</h2>
            <p>Tell us the problem, what you have so far and the help you need. Every submission is read by a mentor.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => submit()}>Submit Your Idea</button>
        </section>
      </div>
    </div>
  );
}
