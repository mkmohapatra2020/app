import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout.jsx';
import SocialLogin from './SocialLogin.jsx';
import { TextInput, FormAlert, SubmitButton, isEmail, isPhone } from '../../components/common/Form.jsx';
import useApi from '../../hooks/useApi.js';
import { authService } from '../../services/authService.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: 'Bhubaneswar', password: '', confirm: '', agree: false });
  const [errors, setErrors] = useState({});
  const reg = useApi((a) => authService.register(a));
  const verify = useApi((a) => authService.verifyRegistration(a));
  const [pending, setPending] = useState(null); // { userId, destination, channel, expiresAt } once the OTP is sent
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();
  const { state } = useLocation();
  const { toast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Enter your name.';
    if (!isEmail(form.email)) errs.email = 'Enter a valid email address.';
    if (!isPhone(form.phone)) errs.phone = 'Enter a valid phone number.';
    if (form.password.length < 8) errs.password = 'Use at least 8 characters.';
    if (form.confirm !== form.password) errs.confirm = 'Passwords do not match.';
    if (!form.agree) errs.agree = 'Please accept to continue.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = await reg.execute(form);
    if (!res.success) return;
    if (res.data.userId) { setPending(res.data); setOtp(''); }
    else { toast('Account created. Please sign in.'); navigate('/login', { state }); }
  };
  const submitOtp = async (e) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(otp.trim())) return;
    const res = await verify.execute({ userId: pending.userId, otp });
    // Verified accounts sign in normally — no membership is assumed here.
    if (res.success) { toast('Account verified. Please sign in.'); navigate('/login', { state }); }
  };

  if (pending) {
    return (
      <AuthLayout title="Check your messages" subtitle={`We sent a verification code${pending.channel ? ` by ${pending.channel}` : ''}${pending.destination ? ` to ${pending.destination}` : ''}.`} image="hero-workshop"
        footer={<button type="button" className="link-btn" onClick={() => { setPending(null); verify.reset(); }}>← Change my details</button>}>
        <form onSubmit={submitOtp} noValidate className="auth-form">
          <TextInput label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            hint={pending.expiresAt ? `Expires at ${new Date(pending.expiresAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : undefined} />
          <FormAlert>{verify.error}</FormAlert>
          <SubmitButton loading={verify.loading} loadingText="Verifying…" className="btn-block" disabled={!/^\d{4,8}$/.test(otp)}>Verify and continue</SubmitButton>
        </form>
      </AuthLayout>
    );
  }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <AuthLayout title="Create your account" subtitle="Join workshops, earn badges and plan your weekend spaces." image="hero-workshop"
      footer={<>Already have an account? <Link to="/login" state={state}>Sign in</Link></>}>
      <form onSubmit={submit} noValidate className="auth-form">
        <TextInput label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
        <div className="f-row">
          <TextInput label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
          <TextInput label="Phone / WhatsApp" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
        </div>
        <TextInput label="City" autoComplete="address-level2" value={form.city} onChange={set('city')} optional />
        <div className="f-row">
          <TextInput label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters" />
          <TextInput label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        </div>
        <label className={`f-check ${errors.agree ? 'has-error' : ''}`}>
          <input type="checkbox" checked={form.agree} onChange={set('agree')} />
          <span>I agree to be contacted about my bookings and enquiries.</span>
        </label>
        {errors.agree && <small className="f-error">{errors.agree}</small>}
        <FormAlert>{reg.error}</FormAlert>
        <SubmitButton loading={reg.loading} loadingText="Creating account…" className="btn-block">Create account</SubmitButton>
      </form>
      <SocialLogin onSuccess={() => navigate(state?.from || '/profile', { replace: true })} onError={(m) => toast(m, 'error')} />
    </AuthLayout>
  );
}
