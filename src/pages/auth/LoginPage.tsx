import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../pages/auth/AuthLayout.jsx';
import SocialLogin from '../../pages/auth/SocialLogin.jsx';
import { FormAlert, SubmitButton, TextInput } from '../../components/common/Form.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { isApiError } from '../../api/apiClient.ts';
import { useAuth } from '../../auth/useAuth.ts';

interface LoginState { from?: string; expired?: boolean }
type Field = 'usernameOrEmail' | 'password';

/** Friendly text for each failure kind (never echoes the password or token). */
function errorText(e: unknown): string {
  if (!isApiError(e)) return 'Something went wrong. Please try again.';
  switch (e.kind) {
    case 'unauthorized': return 'Invalid email or password.';
    case 'forbidden': return "Your account can't sign in right now. Please contact us.";
    case 'notFound': return 'Sign-in is unavailable right now. Please try again shortly.';
    case 'network': return "We couldn't reach the server. Check your connection and try again.";
    case 'timeout': return 'The server took too long to answer. Please try again.';
    default: return e.message;
  }
}

export default function LoginPage() {
  const { login, isAuthenticated, isLoading, authExpired, clearAuthExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LoginState;
  const back = state.from && state.from !== '/login' ? state.from : '/profile';
  const { toast } = useToast();

  const [form, setForm] = useState<Record<Field, string>>({ usernameOrEmail: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [alert, setAlert] = useState('');
  const submitting = useRef(false);
  const expired = !!(state.expired || authExpired);

  useEffect(() => () => { submitting.current = false; }, []);

  if (isAuthenticated && !isLoading && !submitting.current) return <Navigate to={back} replace />;

  const welcome = (name?: string) => {
    toast(`Welcome back${name ? `, ${name.split(' ')[0]}` : ''}!`);
    navigate(back, { replace: true });
  };

  const set = (k: Field) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    const errs: Partial<Record<Field, string>> = {};
    if (!form.usernameOrEmail.trim()) errs.usernameOrEmail = 'Enter your email or username.';
    if (!form.password) errs.password = 'Enter your password.';
    setErrors(errs);
    setAlert('');
    if (Object.keys(errs).length) return;

    submitting.current = true;
    try {
      const user = await login(form.usernameOrEmail.trim(), form.password);
      clearAuthExpired();
      welcome(user.name);
    } catch (err) {
      setForm((f) => ({ ...f, password: '' }));
      if (isApiError(err) && Object.keys(err.fieldErrors).length) {
        const fe = err.fieldErrors;
        const pick = (...keys: string[]) => keys.map((k) => fe[k]?.[0]).find(Boolean);
        setErrors({ usernameOrEmail: pick('usernameOrEmail', 'UsernameOrEmail', 'email'), password: pick('password', 'Password') });
      }
      setAlert(errorText(err));
    } finally {
      submitting.current = false;
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to book workshops, track your badges and save your designs."
      footer={<>New to Weekend-Live? <Link to="/register" state={location.state}>Create an account</Link></>}>
      {expired && !alert && <FormAlert tone="info">Your session has expired. Please sign in again.</FormAlert>}
      <form onSubmit={submit} noValidate className="auth-form">
        <TextInput label="Email or username" type="text" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false}
          value={form.usernameOrEmail} onChange={set('usernameOrEmail')} error={errors.usernameOrEmail} />
        <TextInput label="Password" type="password" autoComplete="current-password"
          value={form.password} onChange={set('password')} error={errors.password} />
        <div className="auth-row"><Link to="/forgot-password">Forgot password?</Link></div>
        <FormAlert>{alert}</FormAlert>
        <SubmitButton loading={isLoading} loadingText="Signing in…" className="btn-block">Sign in</SubmitButton>
      </form>
      <SocialLogin onSuccess={(data: { user?: { name?: string } }) => welcome(data?.user?.name)} onError={(m: string) => toast(m, 'error')} />
    </AuthLayout>
  );
}
