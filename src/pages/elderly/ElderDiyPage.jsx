import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Img from '../../components/common/Img.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import useResource from '../../hooks/useResource.js';
import { programService } from '../../services/programService.js';
import { elderDiy as E, withLocalDefaults } from '../../data/flagship.js';
import { contact } from '../../data/site.js';
import { joinElderProgram, useEnquiry } from '../../features/enquiry/enquiry.js';

const FILTERS = [[0, 'All activities'], [1, 'Very easy'], [2, 'Easy'], [3, 'Moderate']];

// /elderly-diy — larger type, high contrast, big touch targets, calm layout.
export default function ElderDiyPage() {
  const enquiry = useEnquiry();
  const [level, setLevel] = useState(0);
  const [big, setBig] = useState(() => { try { return localStorage.getItem('wl-elder-big') === '1'; } catch { return false; } });
  useEffect(() => { document.title = 'Elderly DIY Programs · Weekend-Live'; }, []);
  useEffect(() => { try { localStorage.setItem('wl-elder-big', big ? '1' : '0'); } catch { /* storage unavailable */ } }, [big]);

  const live = useResource('elderly-diy:list', (a) => programService.elderlyList(a), { fallback: [] });
  const activities = withLocalDefaults(live.data, E.activities);
  const join = (preset) => joinElderProgram(enquiry, { activities, ...E.join }, preset);
  const shown = level ? activities.filter((a) => a.difficulty === level) : activities;

  return (
    <div className={`page elder${big ? ' elder-big' : ''}`}>
      <header className="elder-hero">
        <div className="wrap">
          <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link> / Elderly DIY Programs</nav>
          <div className="elder-hero-grid">
            <div>
              <span className="eyebrow">{E.eyebrow}</span>
              <h1>{E.title}</h1>
              <p className="elder-lede">{E.lede}</p>
              <div className="elder-actions">
                <button type="button" className="btn btn-primary btn-xl" onClick={() => join()}>Join Elder DIY Program</button>
                <button type="button" className="btn btn-outline btn-xl elder-textsize" aria-pressed={big} onClick={() => setBig((b) => !b)}>
                  <span aria-hidden="true">A<span className="big-a">A</span></span> {big ? 'Normal text' : 'Larger text'}
                </button>
              </div>
            </div>
            <div className="elder-hero-img"><Img name="hero-family" alt="Grandparents building a wooden birdhouse with their family" eager sizes="(max-width: 900px) 100vw, 45vw" /></div>
          </div>
        </div>
      </header>

      <div className="wrap page-body">
        <ul className="elder-promises">
          {E.promises.map(([icon, t, d]) => <li key={t}><span aria-hidden="true">{icon}</span><div><strong>{t}</strong><p>{d}</p></div></li>)}
        </ul>

        <section aria-labelledby="elder-acts">
          <div className="elder-acts-head">
            <h2 id="elder-acts">Choose an activity</h2>
            <div className="elder-filter" role="group" aria-label="Filter by difficulty">
              {FILTERS.map(([v, label]) => <button key={v} type="button" aria-pressed={level === v} className={level === v ? 'sel' : ''} onClick={() => setLevel(v)}>{label}</button>)}
            </div>
          </div>
          <div className="elder-grid">
            {shown.map((a) => (
              <article key={a.id} className="elder-card">
                {a.remoteImage ? <RemoteImage src={a.remoteImage} fallback={a.image} alt="" /> : <Img name={a.image} alt="" sizes="(max-width: 760px) 100vw, 33vw" />}
                <div className="elder-card-body">
                  <h3>{a.title}</h3>
                  <p>{a.text}</p>
                  <dl className="elder-facts">
                    <div>
                      <dt>Difficulty</dt>
                      <dd>{a.difficulty ? <><span className="elder-level" aria-hidden="true">{[1, 2, 3].map((n) => <i key={n} className={n <= a.difficulty ? 'on' : ''} />)}</span>{E.difficultyLabels[a.difficulty]}</> : 'Ask us'}</dd>
                    </div>
                    <div><dt>Duration</dt><dd>{a.duration || 'Ask us'}</dd></div>
                    <div><dt>Assistance</dt><dd>{a.assistance || 'A helper is always at your table'}</dd></div>
                  </dl>
                  <button type="button" className="btn btn-primary btn-xl" onClick={() => join(a.title)}>Join this activity</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="elder-cta" aria-labelledby="elder-cta-title">
          <div>
            <h2 id="elder-cta-title">Signing up a parent or grandparent?</h2>
            <p>That’s how most people join. Tell us about them and we will call to plan a first session they will enjoy. Family members are always welcome to come along.</p>
            <p className="elder-phone">Prefer to talk? Call <a href={contact.phoneHref}>{contact.phone}</a></p>
          </div>
          <button type="button" className="btn btn-primary btn-xl" onClick={() => join()}>Join Elder DIY Program</button>
        </section>
        <p className="elder-more">Looking for safety upgrades at home instead? See our <Link to="/#seniors">senior-friendly home improvements</Link>.</p>
      </div>
    </div>
  );
}
