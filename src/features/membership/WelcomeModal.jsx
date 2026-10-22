import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useResource from '../../hooks/useResource.js';
import useSession from '../../hooks/useSession.js';
import { membershipService } from '../../services/membershipService.js';

const DISMISSED = 'wl:welcome-dismissed';
const USE_CASES = ['Pergola Design', 'Gazebo Concept', 'Deck Design', 'Senior Home Improvement', 'Heritage Restoration', 'DIY Product Concept'];
const dismissed = () => { try { return sessionStorage.getItem(DISMISSED) === '1'; } catch { return false; } };

/**
 * First-login welcome gift. Shown once per browser session while
 * GET /user/onboarding-status says hasReceivedWelcomeBenefit === false.
 */
export default function WelcomeModal() {
  const { isAuthenticated, user } = useSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const ref = useRef(null);
  const skip = !isAuthenticated || dismissed() || ['/login', '/register', '/design-studio'].includes(pathname);
  const status = useResource(skip ? null : `mem:my:onboarding:${user?.id || user?.email}`, (a) => membershipService.onboardingStatus(a), { fallback: null, accept: (d) => d != null });

  const show = !skip && status.data && !status.data.received;
  // Never stack on another pop-up (e.g. Try now): wait until no other dialog is open.
  useEffect(() => {
    if (!show) return undefined;
    const tryOpen = () => {
      if (!ref.current || ref.current.open) return true;
      if ([...document.querySelectorAll('dialog[open]')].some((d) => d !== ref.current)) return false;
      ref.current.showModal();
      return true;
    };
    if (tryOpen()) return undefined;
    const t = setInterval(() => { if (tryOpen()) clearInterval(t); }, 1500);
    return () => clearInterval(t);
  }, [show]);

  const [, setGone] = useState(false);
  const close = () => { try { sessionStorage.setItem(DISMISSED, '1'); } catch { /* ignore */ } ref.current?.close(); setGone(true); };
  // Opening Try now means they are already designing: step aside for this session.
  useEffect(() => {
    const onTry = () => close();
    window.addEventListener('wl:open-try-now', onTry);
    return () => window.removeEventListener('wl:open-try-now', onTry);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!show) return null;
  return (
    <dialog ref={ref} className="welcome-dialog" aria-labelledby="welcome-title" onCancel={close}>
      <div className="welcome-body">
        <span className="welcome-gift" aria-hidden="true">🎁</span>
        <h2 id="welcome-title">Welcome To Weekend-Live Design Studio</h2>
        <p>As a welcome gift you can generate your first design concept free.</p>
        <ul className="welcome-uses">{USE_CASES.map((u) => <li key={u}>{u}</li>)}</ul>
        <div className="row-btns">
          <button type="button" className="btn btn-primary" onClick={() => { close(); navigate('/design-studio'); }}>Generate Free Design</button>
          <button type="button" className="btn btn-quiet" onClick={close}>Maybe Later</button>
        </div>
      </div>
    </dialog>
  );
}
