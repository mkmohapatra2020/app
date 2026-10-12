import { useState } from 'react';
import Section, { SampleTag } from './Section.jsx';
import { communityPlaces, SHOW_SAMPLE_TAGS } from '../data/site.js';
import { MAP_W, MAP_H, districts, cityPoints, insetState, insetFocus } from '../data/odishaMap.js';

const FOCUS = ['Khordha', 'Cuttack', 'Puri'];

export default function CommunityMap() {
  const [active, setActive] = useState(communityPlaces[0].id);
  const place = communityPlaces.find((p) => p.id === active);

  return (
    <Section id="community" tone="teal" eyebrow="Interactive community map" title="DIY projects across Odisha"
      intro="Tap a place to see the projects, participants and stories from our community.">
      <div className="map-layout">
        <div className="map-frame reveal">
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label="Map of Bhubaneswar, Cuttack, Puri and Khordha in Odisha">
            <defs><clipPath id="map-clip"><rect width={MAP_W} height={MAP_H} rx="18" /></clipPath></defs>
            <g clipPath="url(#map-clip)">
              <rect width={MAP_W} height={MAP_H} className="map-sea" />
              {districts.map((d) => <path key={d.name} d={d.d} className={`map-dist${FOCUS.includes(d.name) ? ' is-focus' : ''}`} />)}
              {districts.filter((d) => !FOCUS.includes(d.name) && d.c[0] > 30 && d.c[0] < MAP_W - 30 && d.c[1] > 30 && d.c[1] < MAP_H - 30).map((d) => (
                <text key={d.name} x={d.c[0]} y={d.c[1] + (d.name === 'Khordha' ? 38 : 0)} className="map-dname">{d.name}</text>
              ))}
              <text x={MAP_W - 70} y={MAP_H - 60} className="map-sea-label">Bay of Bengal</text>
            </g>
            {cityPoints.map((c) => (
              <g key={c.id} className={`map-pin${c.id === active ? ' is-active' : ''}`} transform={`translate(${c.x} ${c.y})`}
                tabIndex={0} role="button" aria-pressed={c.id === active} aria-label={`Show projects in ${c.name}`}
                onClick={() => setActive(c.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(c.id); } }}>
                <circle r="34" className="map-pin-hit" />
                <circle r="13" className="map-pin-ring" />
                <circle r="7" className="map-pin-dot" />
                <text x={c.id === 'khordha' ? -16 : 16} y={c.id === 'khordha' ? 22 : -12} className={`map-pin-label${c.id === 'khordha' ? ' left' : ''}`}>{c.name}</text>
              </g>
            ))}
          </svg>
          <svg className="map-inset" viewBox="0 0 120 120" aria-hidden="true">
            <path d={insetState} className="inset-state" /><path d={insetFocus} className="inset-focus" />
          </svg>
          <p className="map-credit">Boundaries: <a href="https://github.com/datameet/maps" target="_blank" rel="noopener">DataMeet</a> (CC BY 4.0)</p>
        </div>
        <div className="map-panel reveal" aria-live="polite">
          <div className="map-tabs" role="tablist" aria-label="Places">
            {communityPlaces.map((p) => (
              <button key={p.id} type="button" role="tab" aria-selected={p.id === active} className={`chip${p.id === active ? ' sel' : ''}`} onClick={() => setActive(p.id)}>● {p.name}</button>
            ))}
          </div>
          <h3>{place.name} <SampleTag show={SHOW_SAMPLE_TAGS && place.sample} /></h3>
          <h4>Projects</h4>
          <ul className="ticks">{place.projects.map((p) => <li key={p}>{p}</li>)}</ul>
          <h4>Participants</h4>
          <p>{place.participants}</p>
          <h4>Story</h4>
          <blockquote>{place.story}</blockquote>
        </div>
      </div>
    </Section>
  );
}
