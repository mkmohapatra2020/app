import { useMemo, useState } from 'react';
import { safetyAreas } from '../data/features.js';
import { requestAssessment, useEnquiry } from '../lib/enquiry.js';

const ALL = safetyAreas.flatMap((a) => a.questions.map(([id, q, fix]) => ({ id, q, fix, area: a.title })));

// Interactive senior safety check: yes/no per item → score out of 100 + fixes.
export default function SafetyScore() {
  const enquiry = useEnquiry();
  const [answers, setAnswers] = useState({});
  const answered = Object.keys(answers).length;
  const complete = answered === ALL.length;
  const { score, fixes } = useMemo(() => {
    const yes = ALL.filter((x) => answers[x.id] === 'yes').length;
    return { score: Math.round((yes / ALL.length) * 100), fixes: ALL.filter((x) => answers[x.id] === 'no') };
  }, [answers]);
  const level = score >= 85 ? 'Great' : score >= 60 ? 'Good, with gaps' : score >= 35 ? 'Needs attention' : 'High risk';
  const report = `Senior Safety Score: ${score}/100 (${level})${fixes.length ? `\nTo improve:\n${fixes.map((f) => `- ${f.fix}`).join('\n')}` : ''}`;

  return (
    <div className="tool-card safety reveal" id="safety-score">
      <div className="tool-head">
        <span className="eyebrow">Senior Safety Score</span>
        <h3>How safe is your parents' home?</h3>
        <p>Answer 12 quick questions. Your answers stay on this device.</p>
      </div>
      <div className="safety-areas">
        {safetyAreas.map((a) => (
          <fieldset key={a.id} className="safety-area">
            <legend>{a.title}</legend>
            {a.questions.map(([id, q]) => (
              <div className="yn" key={id}>
                <span id={`q-${id}`}>{q}</span>
                <div className="yn-btns" role="radiogroup" aria-labelledby={`q-${id}`}>
                  {['yes', 'no'].map((v) => (
                    <button key={v} type="button" role="radio" aria-checked={answers[id] === v}
                      className={`yn-btn yn-${v}${answers[id] === v ? ' sel' : ''}`}
                      onClick={() => setAnswers((s) => ({ ...s, [id]: v }))}>{v === 'yes' ? 'Yes' : 'No'}</button>
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
            <div className="score-ring" style={{ '--p': score }}><strong>{score}</strong><span>/100</span></div>
            <div className="score-text">
              <h4>Result: {level}</h4>
              {fixes.length ? (
                <><p>Recommended improvements:</p><ol>{fixes.map((f) => <li key={f.id}><b>{f.area}:</b> {f.fix}</li>)}</ol></>
              ) : <p>Excellent — this home already covers the essentials.</p>}
              <div className="row-btns">
                <button type="button" className="btn btn-primary" onClick={() => requestAssessment(enquiry, report)}>Book free assessment with this report</button>
                <button type="button" className="btn btn-quiet" onClick={() => setAnswers({})}>Start again</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
