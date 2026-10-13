import { useEffect, useRef, useState } from 'react';
import Img from '../../components/common/Img.jsx';
import { campaigns } from '../../data/site.js';
import { formatDate } from '../../utils/contact.js';
import { bookWorkshop, joinMembership, useEnquiry } from '../enquiry/enquiry.js';
import { scrollToTarget as scrollTo } from '../../utils/scrollTo.js';

const FIRST_DELAY = 25000;   // first nudge after 25 s
const GAP = 75000;           // then at most every 75 s
const MAX_PER_VISIT = 3;
const SNOOZE_DAYS = 7;       // "Don't show again"
const AUTO_HIDE = 18000;     // closes itself if ignored
const KEY = 'wl-nudge';

const store = {
  get(k, fallback) { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  sget(k, fallback) { try { return JSON.parse(sessionStorage.getItem(k)) ?? fallback; } catch { return fallback; } },
  sset(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};


function buildNudges(enquiry) {
  const next = campaigns.filter((c) => new Date(c.date) >= new Date(new Date().toDateString())).sort((a, b) => a.date.localeCompare(b.date))[0];
  return [
    next && {
      id: 'workshop', image: next.image, icon: '🔨', tone: 'gold',
      kicker: `Only ${next.seatsLeft} seats left`,
      title: next.title,
      text: `${formatDate(next.date, { weekday: 'long', day: 'numeric', month: 'long' })} · Age ${next.age}. Build something real together this weekend.`,
      cta: 'Book my seat', act: () => bookWorkshop(enquiry, next.id),
    },
    {
      id: 'visualizer', image: 'show-roofgarden', icon: '📷', tone: 'teal',
      kicker: 'Free AI preview',
      title: 'See your terrace transformed',
      text: 'Upload a photo and get a pergola, deck and garden concept for your own space in about a minute.',
      cta: 'Try the visualizer', act: () => scrollTo('#visualizer'),
    },
    {
      id: 'safety', image: 'senior-hub', icon: '🛡️', tone: 'teal',
      kicker: '2-minute check',
      title: "How safe is your parents' home?",
      text: 'Answer 12 quick questions to get a Senior Safety Score and a list of simple fixes.',
      cta: 'Get my safety score', act: () => scrollTo('#safety-score'),
    },
    {
      id: 'trynow', image: 'pillar-outdoor', icon: '✦', tone: 'gold',
      kicker: 'Design in seconds',
      title: 'Plan your pergola to the exact foot',
      text: 'Upload a photo with “Change My Space” and see a pergola added at your exact length, width and height.',
      cta: 'Design mine now', act: () => window.dispatchEvent(new CustomEvent('wl:open-try-now', { detail: { mode: 'photo' } })),
    },
    {
      id: 'club', image: 'hero-workshop', icon: '⭐', tone: 'dark',
      kicker: 'Weekend-Live Club',
      title: 'Get priority booking for every workshop',
      text: 'Gold members get workshop discounts, priority booking and special events all year.',
      cta: 'Become a member', act: () => joinMembership(enquiry, 'Gold'),
    },
  ].filter(Boolean);
}

// A timed, animated nudge. Polite by design: never over another dialog or
// while typing, capped per visit, and can be switched off for a week.
export default function NudgeModal() {
  const enquiry = useEnquiry();
  const dlg = useRef(null);
  const [nudge, setNudge] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const hideTimer = useRef(null);

  useEffect(() => {
    const snoozedUntil = store.get(`${KEY}-off`, 0);
    if (Date.now() < snoozedUntil) return undefined;
    const nudges = buildNudges(enquiry);
    let timer;

    const busy = () => document.hidden
      || document.querySelector('dialog[open]')
      || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

    const attempt = () => {
      const seen = store.sget(KEY, { count: 0, idx: 0 });
      if (seen.count >= MAX_PER_VISIT) return;
      if (busy()) { timer = setTimeout(attempt, 8000); return; }
      setNudge(nudges[seen.idx % nudges.length]);
      store.sset(KEY, { count: seen.count + 1, idx: seen.idx + 1 });
      timer = setTimeout(attempt, GAP);
    };
    timer = setTimeout(attempt, FIRST_DELAY);
    return () => clearTimeout(timer);
  }, [enquiry]);

  useEffect(() => {
    if (!nudge) return undefined;
    setLeaving(false);
    if (!dlg.current.open) dlg.current.showModal();
    hideTimer.current = setTimeout(() => close(), AUTO_HIDE);
    return () => clearTimeout(hideTimer.current);
  }, [nudge]);

  const close = () => {
    clearTimeout(hideTimer.current);
    setLeaving(true);
    setTimeout(() => { dlg.current?.close(); setNudge(null); setLeaving(false); }, 260);
  };
  const act = () => { const fn = nudge.act; close(); setTimeout(fn, 300); };
  const snooze = () => { store.set(`${KEY}-off`, Date.now() + SNOOZE_DAYS * 864e5); close(); };

  return (
    <dialog
      ref={dlg} className={`nudge${leaving ? ' is-leaving' : ''}${nudge ? ` tone-${nudge.tone}` : ''}`}
      aria-labelledby="nudge-title" onCancel={(e) => { e.preventDefault(); close(); }}
      onClick={(e) => { if (e.target === dlg.current) close(); }}
      onMouseEnter={() => clearTimeout(hideTimer.current)} onFocus={() => clearTimeout(hideTimer.current)}
    >
      {nudge && (
        <div className="nudge-card" key={nudge.id}>
          <div className="nudge-media">
            <Img name={nudge.image} alt="" sizes="(max-width: 560px) 100vw, 480px" eager />
            <span className="nudge-icon" aria-hidden="true">{nudge.icon}</span>
            <button type="button" className="nudge-close" aria-label="Close" onClick={close}>×</button>
          </div>
          <div className="nudge-body">
            <span className="nudge-kicker">{nudge.kicker}</span>
            <h2 id="nudge-title">{nudge.title}</h2>
            <p>{nudge.text}</p>
            <div className="nudge-actions">
              <button type="button" className="btn btn-primary nudge-cta" onClick={act} autoFocus>{nudge.cta} <span aria-hidden="true">→</span></button>
              <button type="button" className="link-btn" onClick={close}>Maybe later</button>
            </div>
            <button type="button" className="nudge-off" onClick={snooze}>Don't show these again</button>
          </div>
          <span className="nudge-timer" style={{ animationDuration: `${AUTO_HIDE}ms` }} aria-hidden="true" />
        </div>
      )}
    </dialog>
  );
}
