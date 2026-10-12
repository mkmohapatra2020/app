import { useEffect, useState } from 'react';
import { passportStamps } from '../data/features.js';

const KEY = 'wl-kids-passport';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };

// Kids DIY Passport: enter the stamp code from each workshop to earn a badge,
// tick off the home challenge and unlock the next project. Saved on this device only.
export default function KidsPassport() {
  const [state, setState] = useState(() => ({ name: '', stamps: {}, challenges: {}, ...load() }));
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } }, [state]);

  const earned = passportStamps.filter((s) => state.stamps[s.id]).length;
  const nextIdx = passportStamps.findIndex((s) => !state.stamps[s.id]);

  const redeem = (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    const stamp = passportStamps.find((s) => s.code === c);
    if (!stamp) { setMsg({ bad: true, text: 'That code does not match a workshop stamp. Check the card from your workshop.' }); return; }
    if (state.stamps[stamp.id]) { setMsg({ text: `You already have the ${stamp.name} badge!` }); return; }
    setState((s) => ({ ...s, stamps: { ...s.stamps, [stamp.id]: new Date().toISOString().slice(0, 10) } }));
    setMsg({ text: `${stamp.icon} Badge earned: ${stamp.name}! New project unlocked: ${stamp.unlocks}.` });
    setCode('');
  };

  return (
    <div className="tool-card passport reveal" id="passport">
      <div className="tool-head">
        <span className="eyebrow">Kids DIY passport</span>
        <h3>Collect a badge at every workshop</h3>
        <p>Earn a badge, complete the challenge at home, and unlock a new project. Progress is saved on this device only.</p>
      </div>
      <div className="passport-top">
        <label className="enq-field">
          <span>Young builder's first name</span>
          <input value={state.name} maxLength={20} onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Aarav" />
        </label>
        <form className="passport-code" onSubmit={redeem}>
          <label className="enq-field">
            <span>Workshop stamp code</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="From your workshop card" autoCapitalize="characters" />
          </label>
          <button type="submit" className="btn btn-primary">Add stamp</button>
        </form>
      </div>
      {msg && <p className={`passport-msg${msg.bad ? ' bad' : ''}`} role="status">{msg.text}</p>}
      <p className="passport-progress"><b>{state.name ? `${state.name}'s` : 'Your'} passport:</b> {earned} of {passportStamps.length} badges</p>
      <div className="stamp-grid">
        {passportStamps.map((s, i) => {
          const got = !!state.stamps[s.id];
          const locked = !got && i !== nextIdx;
          return (
            <div key={s.id} className={`stamp${got ? ' got' : ''}${locked ? ' locked' : ''}`}>
              <span className="stamp-icon" aria-hidden="true">{locked ? '🔒' : s.icon}</span>
              <strong>{s.name}</strong>
              {got ? (
                <label className="stamp-challenge">
                  <input type="checkbox" checked={!!state.challenges[s.id]} onChange={(e) => setState((st) => ({ ...st, challenges: { ...st.challenges, [s.id]: e.target.checked } }))} />
                  <span>Challenge: {s.challenge}</span>
                </label>
              ) : <span className="stamp-hint">{locked ? 'Earn the previous badge first' : 'Next up — join this workshop'}</span>}
              {got && <span className="stamp-unlock">Unlocked: {s.unlocks}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
