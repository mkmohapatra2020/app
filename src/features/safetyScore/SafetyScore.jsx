import { useMemo, useState } from 'react';
import { requestAssessment, useEnquiry } from '../enquiry/enquiry.js';
import useResource from '../../hooks/useResource.js';
import useApi from '../../hooks/useApi.js';
import { assessmentService } from '../../services/assessmentService.js';
import { fallbackSafety } from '../../data/fallbacks.js';

// Interactive senior safety check. Questions come from
// /elderly-assessment/questions (built-in set as fallback); the completed
// assessment is saved via POST /elderly-assessment, and the visit is booked
// through /elderly-assessment/visit.
export default function SafetyScore() {
  const enquiry = useEnquiry();
  const q = useResource('assessment:questions', (a) => assessmentService.questions(a), { fallback: fallbackSafety });
  const areas = q.data || fallbackSafety;
  const ALL = useMemo(() => areas.flatMap((a) => a.questions.map(([id, text, fix]) => ({ id, q: text, fix, area: a.title }))), [areas]);
  const [answers, setAnswers] = useState({});
  const submit = useApi((a) => assessmentService.submit(a));
  const [server, setServer] = useState(null);
  const answered = ALL.filter((x) => answers[x.id]).length;
  const complete = ALL.length > 0 && answered === ALL.length;
  const { score, fixes } = useMemo(() => {
    const yes = ALL.filter((x) => answers[x.id] === 'yes').length;
    return { score: Math.round((yes / Math.max(1, ALL.length)) * 100), fixes: ALL.filter((x) => answers[x.id] === 'no') };
  }, [answers, ALL]);

  const shownScore = Number.isFinite(server?.score) ? Math.round(server.score) : score;
  const level = server?.level || (shownScore >= 85 ? 'Great' : shownScore >= 60 ? 'Good, with gaps' : shownScore >= 35 ? 'Needs attention' : 'High risk');
  const recs = server?.recommendations?.length ? server.recommendations : fixes.map((f) => `${f.area}: ${f.fix}`);
  const report = `Senior Safety Score: ${shownScore}/100 (${level})${recs.length ? `\nTo improve:\n${recs.map((r) => `- ${r}`).join('\n')}` : ''}`;

  const answer = async (id, v) => {
    const next = { ...answers, [id]: v };
    setAnswers(next);
    if (ALL.every((x) => next[x.id])) {
      const yes = ALL.filter((x) => next[x.id] === 'yes').length;
      const res = await submit.execute({ answers: next, score: Math.round((yes / ALL.length) * 100) });
      setServer(res.success ? res.data : null);
    }
  };
  const restart = () => { setAnswers({}); setServer(null); submit.reset(); };

  return (
    <div className="tool-card safety reveal" id="safety-score">
      <div className="tool-head">
        <span className="eyebrow">Senior Safety Score</span>
        <h3>How safe is your parents' home?</h3>
        <p>Answer {ALL.length} quick questions to get a score and a list of simple fixes.</p>
      </div>
      <div className="safety-areas">
        {areas.map((a) => (
          <fieldset key={a.id} className="safety-area">
            <legend>{a.title}</legend>
            {a.questions.map(([id, text]) => (
              <div className="yn" key={id}>
                <span id={`q-${id}`}>{text}</span>
                <div className="yn-btns" role="radiogroup" aria-labelledby={`q-${id}`}>
                  {['yes', 'no'].map((v) => (
                    <button key={v} type="button" role="radio" aria-checked={answers[id] === v}
                      className={`yn-btn yn-${v}${answers[id] === v ? ' sel' : ''}`}
                      onClick={() => answer(id, v)}>{v === 'yes' ? 'Yes' : 'No'}</button>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
        ))}
      </div>
      <div className="safety-result" aria-live="polite">
        {!complete ? (
          <p className="progress-note">{answered} of {ALL.length} answered</p>
        ) : (
          <>
            <div className="score-ring" style={{ '--p': shownScore }}><strong>{shownScore}</strong><span>/100</span></div>
            <div className="score-text">
              <h4>Result: {level}</h4>
              {submit.loading && <p className="muted">Saving your assessment…</p>}
              {recs.length ? (
                <><p>Recommended improvements:</p><ol>{recs.map((r) => <li key={r}>{r}</li>)}</ol></>
              ) : <p>Excellent — this home already covers the essentials.</p>}
              <div className="row-btns">
                <button type="button" className="btn btn-primary" onClick={() => requestAssessment(enquiry, report, server?.id)}>Book free assessment with this report</button>
                <button type="button" className="btn btn-quiet" onClick={restart}>Start again</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
