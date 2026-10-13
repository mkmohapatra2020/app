import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout.jsx';
import SocialLogin from './SocialLogin.jsx';
import { TextInput, FormAlert, SubmitButton, isEmail } from '../../components/common/Form.jsx';
import useApi from '../../hooks/useApi.js';
import useSession from '../../hooks/useSession.js';
import { authService } from '../../services/authService.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const login = useApi((a) => authService.login(a));
  const { isAuthenticated } = useSession();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { toast } = useToast();
  const back = state?.from || '/profile';

  if (isAuthenticated && !login.loading) return <Navigate to={back} replace />;

  const done = (data) => { toast(`Welcome back${data.user?.name ? `, ${data.user.name.split(' ')[0]}` : ''}!`); navigate(back, { replace: true }); };
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!isEmail(form.email)) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Enter your password.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = await login.execute(form);
    if (res.success && res.data.token) done(res.data);
    else if (res.success) login.reset(); // no token in response
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to book workshops, track your badges and save your designs."
      footer={<>New to Weekend-Live? <Link to="/register" state={state}>Create an account</Link></>}>
      <form onSubmit={submit} noValidate className="auth-form">
        <TextInput label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <TextInput label="Password" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />
        <div className="auth-row"><Link to="/forgot-password">Forgot password?</Link></div>
        <FormAlert>{login.error}</FormAlert>
        <SubmitButton loading={login.loading} loadingText="Signing in…" className="btn-block">Sign in</SubmitButton>
      </form>
      <SocialLogin onSuccess={done} onError={(m) => toast(m, 'error')} />
    </AuthLayout>
  );
}
