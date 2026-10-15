import Section from '../components/common/Section.jsx';
import Img from '../components/common/Img.jsx';
import RemoteImage from '../components/common/RemoteImage.jsx';
import useResource from '../hooks/useResource.js';
import { programService } from '../services/programService.js';
import { together as T, withLocalDefaults } from '../data/flagship.js';
import { joinFamilyProgram, useEnquiry } from '../features/enquiry/enquiry.js';

// Homepage: intergenerational programmes + Learn → Build → Share → Preserve.
export default function BuildTogether() {
  const enquiry = useEnquiry();
  const live = useResource('family-programs', (a) => programService.familyList(a), { fallback: [] });
  const programs = withLocalDefaults(live.data, T.programs);
  const ask = (title) => joinFamilyProgram(enquiry, programs, title);
  return (
    <Section id="together" tone="warm" eyebrow={T.eyebrow} title={T.title} intro={T.lede}>
      <ol className="bt-timeline reveal" aria-label="How it works">
        {T.timeline.map(([icon, t, d], i) => (
          <li key={t} style={{ '--i': i }}>
            <span className="bt-dot" aria-hidden="true">{icon}</span>
            <strong>{t}</strong>
            <p>{d}</p>
          </li>
        ))}
      </ol>
      <div className="bt-grid">
        {programs.map((p) => (
          <article key={p.id} className="bt-card reveal">
            {p.remoteImage ? <RemoteImage src={p.remoteImage} fallback={p.image} alt="" /> : <Img name={p.image} alt="" sizes="(max-width: 760px) 100vw, 25vw" />}
            <div className="bt-body">
              {(p.meta || p.date) && <span className="bt-meta">{p.meta || p.date}</span>}
              <h3>{p.title}</h3>
              <p>{p.text}</p>
              <button type="button" className="link-btn" onClick={() => ask(p.title)}>Join this programme →</button>
            </div>
          </article>
        ))}
      </div>
      <div className="center-row"><button type="button" className="btn btn-primary" onClick={() => ask()}>Plan a family build day</button></div>
    </Section>
  );
}
