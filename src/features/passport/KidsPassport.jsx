import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { passportStamps } from '../../data/features.js';
import useSession from '../../hooks/useSession.js';
import useResource, { invalidate } from '../../hooks/useResource.js';
import useApi from '../../hooks/useApi.js';
import { passportService } from '../../services/passportService.js';

const KEY = 'wl-kids-passport';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };

// Kids DIY Passport: enter the stamp code from each workshop to earn a badge,
// tick off the home challenge and unlock the next project.
// Signed in → POST /passport/badges + GET /passport/user-badges (saved to the account).
// Guests → saved on this device.
export default function KidsPassport() {
  const [state, setState] = useState(() => ({ name: '', stamps: {}, challenges: {}, ...load() }));
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } }, [state]);
  const { isAuthenticated } = useSession();
  const remote = useResource(isAuthenticated ? 'passport-badges' : null, (a) => passportService.badges(a), { fallback: [] });
  const earnApi = useApi((a) => passportService.earn(a));
  // Badges already on the account light up their stamps.
  useEffect(() => {
    if (!remote.fromApi || !remote.data?.length) return;
    const match = (b) => passportStamps.find((st) => [st.id, st.name.toLowerCase(), st.code.toLowerCase()].includes(String(b.id).toLowerCase()) || st.name.toLowerCase() === b.name.toLowerCase());
    setState((s) => {
      const stamps = { ...s.stamps };
      remote.data.forEach((b) => { const st = match(b); if (st && !stamps[st.id]) stamps[st.id] = b.earnedAt || new Date().toISOString().slice(0, 10); });
      return { ...s, stamps };
    });
  }, [remote.data, remote.fromApi]);

  const earned = passportStamps.filter((s) => state.stamps[s.id]).length;
  const nextIdx = passportStamps.findIndex((s) => !state.stamps[s.id]);

  const redeem = async (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    let stamp = passportStamps.find((s) => s.code === c);
    if (isAuthenticated) {
      const res = await earnApi.execute({ code: c, badgeId: stamp?.id, childName: state.name });
      if (!res.success) { setMsg({ bad: true, text: res.error || 'That code could not be redeemed.' }); return; }
      invalidate('passport');
      if (!stamp) {
        const b = res.data;
        stamp = passportStamps.find((s) => s.name.toLowerCase() === (b.name || '').toLowerCase()) || { id: b.id || c, name: b.name || 'New badge', icon: b.icon, unlocks: 'your next project' };
      }
    }
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
        <p>Earn a badge, complete the challenge at home, and unlock a new project. {isAuthenticated ? 'Badges are saved to your account.' : <>Progress is saved on this device — <Link to="/login">sign in</Link> to keep badges on every device.</>}</p>
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
          <button type="submit" className="btn btn-primary" disabled={earnApi.loading}>{earnApi.loading ? 'Checking…' : 'Add stamp'}</button>
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
