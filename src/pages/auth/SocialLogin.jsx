import { useEffect, useRef, useState } from 'react';
import { authService } from '../../services/authService.js';

const GOOGLE_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FACEBOOK_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

const loadScript = (src, id) => new Promise((resolve, reject) => {
  if (document.getElementById(id)) { resolve(); return; }
  const s = document.createElement('script');
  s.src = src; s.id = id; s.async = true; s.defer = true;
  s.onload = resolve; s.onerror = () => reject(new Error('Could not load sign-in'));
  document.head.appendChild(s);
});

/**
 * Google (Identity Services ID token → POST /auth/google) and Facebook
 * (access token → POST /auth/facebook). Each button only appears when its
 * app id is configured (VITE_GOOGLE_CLIENT_ID / VITE_FACEBOOK_APP_ID).
 */
export default function SocialLogin({ onSuccess, onError }) {
  const googleBox = useRef(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (!GOOGLE_ID) return;
    loadScript('https://accounts.google.com/gsi/client', 'gsi').then(() => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_ID,
        callback: async ({ credential }) => {
          setBusy('google');
          const res = await authService.google({ idToken: credential });
          setBusy('');
          if (res.success && res.data.token) onSuccess(res.data); else onError(res.error || 'Google sign-in failed.');
        },
      });
      window.google?.accounts.id.renderButton(googleBox.current, { theme: 'outline', size: 'large', shape: 'pill', width: 280, text: 'continue_with' });
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const facebook = async () => {
    try {
      setBusy('facebook');
      await loadScript('https://connect.facebook.net/en_US/sdk.js', 'fbsdk');
      window.FB.init({ appId: FACEBOOK_ID, version: 'v19.0', cookie: false, xfbml: false });
      window.FB.login(async (resp) => {
        const token = resp?.authResponse?.accessToken;
        if (!token) { setBusy(''); return; }
        const res = await authService.facebook({ accessToken: token });
        setBusy('');
        if (res.success && res.data.token) onSuccess(res.data); else onError(res.error || 'Facebook sign-in failed.');
      }, { scope: 'email,public_profile' });
    } catch { setBusy(''); onError('Facebook sign-in is unavailable right now.'); }
  };

  if (!GOOGLE_ID && !FACEBOOK_ID) return null;
  return (
    <div className="social-login">
      <div className="divider"><span>or</span></div>
      {GOOGLE_ID && <div ref={googleBox} className="google-btn" aria-busy={busy === 'google'} />}
      {FACEBOOK_ID && (
        <button type="button" className="btn btn-facebook" onClick={facebook} disabled={!!busy}>
          <span aria-hidden="true">f</span> {busy === 'facebook' ? 'Connecting…' : 'Continue with Facebook'}
        </button>
      )}
    </div>
  );
}
