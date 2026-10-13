import { useState } from 'react';
import { projectTypes, skillLevels, budgets, times, recommendProjects } from '../../data/features.js';
import { campaigns } from '../../data/site.js';
import { bookWorkshop, generalEnquiry, useEnquiry } from '../enquiry/enquiry.js';

const STEPS = [
  { key: 'type', title: 'Project type', options: projectTypes },
  { key: 'skill', title: 'Skill level', options: skillLevels },
  { key: 'budget', title: 'Budget', options: budgets },
  { key: 'hours', title: 'Time available', options: times },
];

// DIY Project Configurator: 4 quick choices → suitable projects, tools and workshops.
export default function Configurator() {
  const enquiry = useEnquiry();
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState({});
  const done = step >= STEPS.length;
  const results = done ? recommendProjects(pick) : [];

  const choose = (key, value) => { setPick((p) => ({ ...p, [key]: value })); setStep((s) => s + 1); };

  return (
    <div className="tool-card config reveal" id="configurator">
      <div className="tool-head">
        <span className="eyebrow">DIY project configurator</span>
        <h3>What should you build next?</h3>
      </div>
      <ol className="steps" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.key} className={i < step ? 'done' : i === step ? 'now' : ''}>
            <button type="button" disabled={i > step} onClick={() => setStep(i)}>
              <span>{i + 1}</span>{s.title}
            </button>
          </li>
        ))}
      </ol>

      {!done && (
        <fieldset className="config-step">
          <legend>{STEPS[step].title}</legend>
          <div className="option-grid">
            {STEPS[step].options.map(([v, label]) => (
              <button key={label} type="button" className={`option${pick[STEPS[step].key] === v ? ' sel' : ''}`} onClick={() => choose(STEPS[step].key, v)}>{label}</button>
            ))}
          </div>
        </fieldset>
      )}

      {done && (
        <div className="config-results" aria-live="polite">
          <h4>Recommended for you</h4>
          {results.length === 0 && <p>No exact match — tell us what you have in mind and we'll suggest a project.</p>}
          <div className="rec-grid">
            {results.map((p) => {
              const ws = campaigns.find((c) => c.id === p.workshop);
              return (
                <article className="rec" key={p.id}>
                  <h5>{p.name}</h5>
                  <p className="rec-meta">{skillLevels.find(([k]) => k === p.skill)[1]} · about ₹{p.cost.toLocaleString('en-IN')} · ~{p.hours} hrs</p>
                  <p className="rec-label">Tools you'll need</p>
                  <ul>{p.tools.map((t) => <li key={t}>{t}</li>)}</ul>
                  <p className="rec-label">Training</p>
                  {ws
                    ? <button type="button" className="btn btn-small" onClick={() => bookWorkshop(enquiry, ws.id)}>Join: {ws.title}</button>
                    : <button type="button" className="btn btn-small btn-outline" onClick={() => generalEnquiry(enquiry, `I'd like a workshop for: ${p.name}`)}>Ask about a workshop</button>}
                </article>
              );
            })}
          </div>
          <button type="button" className="link-btn" onClick={() => { setPick({}); setStep(0); }}>Start again</button>
        </div>
      )}
    </div>
  );
}
