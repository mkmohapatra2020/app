import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectTypes, skillLevels, budgets, times, recommendProjects } from '../../data/features.js';
import { fallbackCampaigns } from '../../data/fallbacks.js';
import { bookWorkshop, generalEnquiry, useEnquiry } from '../enquiry/enquiry.js';
import { aiService } from '../../services/aiService.js';
import useApi from '../../hooks/useApi.js';
import { peek } from '../../hooks/useResource.js';

const STEPS = [
  { key: 'type', title: 'Project type', options: projectTypes },
  { key: 'skill', title: 'Skill level', options: skillLevels },
  { key: 'budget', title: 'Budget', options: budgets },
  { key: 'hours', title: 'Time available', options: times },
];

const SKILL_QUIZ = [
  ['measure', 'Have you measured and cut wood with a hand saw?', ['Never', 'A few times', 'Often']],
  ['tools', 'Have you used a cordless drill or screwdriver?', ['Never', 'With help', 'On my own']],
  ['project', 'Have you finished a DIY project (shelf, stool, planter)?', ['Not yet', 'One or two', 'Several']],
];

/**
 * DIY Project Configurator: 4 quick choices → suitable projects, tools and
 * workshops. Uses POST /ai/recommend-projects + /ai/recommend-workshop, with
 * the built-in recommender as a fallback. "Not sure?" runs /ai/skill-assessment.
 */
export default function Configurator() {
  const enquiry = useEnquiry();
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState({});
  const [quiz, setQuiz] = useState(null); // null | { answers }
  const ai = useApi((a) => aiService.recommendProjects(a));
  const wsAi = useApi((a) => aiService.recommendWorkshop(a));
  const skillAi = useApi((a) => aiService.skillAssessment(a));
  const done = step >= STEPS.length;

  useEffect(() => {
    if (!done) return;
    const typeLabel = projectTypes.find(([k]) => k === pick.type)?.[1];
    ai.execute({ type: typeLabel, skill: pick.skill, budget: pick.budget, hours: pick.hours });
    wsAi.execute({ interests: [typeLabel], skill: pick.skill });
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const local = done ? recommendProjects(pick) : [];
  const fromAi = ai.data?.length ? ai.data.slice(0, 3) : null;
  const campaigns = peek('campaigns') || fallbackCampaigns;
  const aiWorkshop = wsAi.data?.[0];

  const choose = (key, value) => { setPick((p) => ({ ...p, [key]: value })); setStep((s) => s + 1); setQuiz(null); };

  const runQuiz = async () => {
    const answers = SKILL_QUIZ.map(([id, q, opts]) => ({ id, question: q, answer: opts[quiz.answers[id]], score: quiz.answers[id] }));
    const res = await skillAi.execute({ answers });
    const total = answers.reduce((n, a) => n + a.score, 0);
    const localLevel = total <= 1 ? 'beginner' : total <= 4 ? 'intermediate' : 'advanced';
    const level = res.success && ['beginner', 'intermediate', 'advanced'].find((l) => res.data.level.includes(l)) ? ['beginner', 'intermediate', 'advanced'].find((l) => res.data.level.includes(l)) : localLevel;
    setQuiz((q) => ({ ...q, result: level, summary: res.success ? res.data.summary : '' }));
  };

  return (
    <div className="tool-card config reveal" id="configurator">
      <div className="tool-head">
        <span className="eyebrow">DIY project configurator</span>
        <h3>What should you build next?</h3>
      </div>
      <ol className="steps" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.key} className={i < step ? 'done' : i === step ? 'now' : ''}>
            <button type="button" disabled={i > step} onClick={() => setStep(i)}><span>{i + 1}</span>{s.title}</button>
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
          {STEPS[step].key === 'skill' && !quiz && <button type="button" className="link-btn" onClick={() => setQuiz({ answers: {} })}>Not sure? Take a 3-question skill check</button>}
          {STEPS[step].key === 'skill' && quiz && (
            <div className="skill-quiz">
              {SKILL_QUIZ.map(([id, q, opts]) => (
                <div key={id} className="yn">
                  <span>{q}</span>
                  <div className="yn-btns" role="radiogroup" aria-label={q}>
                    {opts.map((o, i) => <button key={o} type="button" role="radio" aria-checked={quiz.answers[id] === i} className={`yn-btn${quiz.answers[id] === i ? ' sel yn-yes' : ''}`} onClick={() => setQuiz((z) => ({ ...z, answers: { ...z.answers, [id]: i }, result: undefined }))}>{o}</button>)}
                  </div>
                </div>
              ))}
              {quiz.result ? (
                <p className="quiz-result">Suggested level: <b>{skillLevels.find(([k]) => k === quiz.result)[1]}</b>{quiz.summary ? ` — ${quiz.summary}` : ''} <button type="button" className="btn btn-primary btn-small" onClick={() => choose('skill', quiz.result)}>Use this level</button></p>
              ) : (
                <button type="button" className="btn btn-outline btn-small" disabled={Object.keys(quiz.answers).length < SKILL_QUIZ.length || skillAi.loading} onClick={runQuiz}>{skillAi.loading ? 'Checking…' : 'Check my level'}</button>
              )}
            </div>
          )}
        </fieldset>
      )}

      {done && (
        <div className="config-results" aria-live="polite">
          <h4>{fromAi ? '✨ AI picks for you' : 'Recommended for you'}</h4>
          {ai.loading && <p className="muted"><span className="try-btn-spinner" aria-hidden="true" /> Asking our AI for personalised picks…</p>}
          <div className="rec-grid">
            {(fromAi || local).map((p) => {
              const wsId = p.workshopId || p.workshop;
              const ws = campaigns.find((c) => c.id === wsId);
              return (
                <article className="rec" key={p.id || p.name}>
                  <h5>{p.name}</h5>
                  <p className="rec-meta">{[p.skill && (skillLevels.find(([k]) => k === p.skill)?.[1] || p.skill), Number.isFinite(p.cost) && `about ₹${p.cost.toLocaleString('en-IN')}`, Number.isFinite(p.hours) && `~${p.hours} hrs`].filter(Boolean).join(' · ')}</p>
                  {p.reason && <p className="rec-reason">{p.reason}</p>}
                  {p.tools?.length > 0 && <><p className="rec-label">Tools you'll need</p><ul>{p.tools.map((t) => <li key={t}>{t}</li>)}</ul></>}
                  <p className="rec-label">Training</p>
                  {ws ? <button type="button" className="btn btn-small" onClick={() => bookWorkshop(enquiry, ws.id)}>Join: {ws.title}</button>
                    : p.workshopTitle ? <Link className="btn btn-small" to="/workshops">Find: {p.workshopTitle}</Link>
                      : <button type="button" className="btn btn-small btn-outline" onClick={() => generalEnquiry(enquiry, `I'd like a workshop for: ${p.name}`)}>Ask about a workshop</button>}
                </article>
              );
            })}
          </div>
          {aiWorkshop && <p className="ai-workshop">🎯 Recommended workshop: <b>{aiWorkshop.name}</b>{aiWorkshop.reason ? ` — ${aiWorkshop.reason}` : ''} <Link to={aiWorkshop.id ? `/workshops/${encodeURIComponent(aiWorkshop.id)}` : '/workshops'}>View</Link></p>}
          <button type="button" className="link-btn" onClick={() => { setPick({}); setStep(0); ai.reset(); wsAi.reset(); }}>Start again</button>
        </div>
      )}
    </div>
  );
}
