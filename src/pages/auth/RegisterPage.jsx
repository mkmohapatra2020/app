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
    if (res.data.token) { toast('Account created — welcome to Weekend-Live!'); navigate(state?.from || '/profile', { replace: true }); }
    else { toast('Account created. Please sign in.'); navigate('/login', { state }); }
  };
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
