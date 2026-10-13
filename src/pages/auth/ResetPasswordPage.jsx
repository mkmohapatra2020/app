import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from './AuthLayout.jsx';
import { TextInput, FormAlert, SubmitButton } from '../../components/common/Form.jsx';
import useApi from '../../hooks/useApi.js';
import { authService } from '../../services/authService.js';
import { useToast } from '../../context/ToastContext.jsx';

// Reached from the email link: /reset-password?token=…&email=…
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || params.get('code') || '';
  const email = params.get('email') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const req = useApi((a) => authService.resetPassword(a));
  const navigate = useNavigate();
  const { toast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.password.length < 8) errs.password = 'Use at least 8 characters.';
    if (form.confirm !== form.password) errs.confirm = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = await req.execute({ token, email, password: form.password });
    if (res.success) { toast('Password updated — please sign in.'); navigate('/login'); }
  };

  return (
    <AuthLayout title="Choose a new password" image="pillar-outdoor" footer={<Link to="/login">← Back to sign in</Link>}>
      {!token ? (
        <div className="auth-done"><span aria-hidden="true">🔗</span><p>This reset link is missing its code. Please use the link from your email, or <Link to="/forgot-password">request a new one</Link>.</p></div>
      ) : (
        <form onSubmit={submit} noValidate className="auth-form">
          <TextInput label="New password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} error={errors.password} hint="At least 8 characters" />
          <TextInput label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} error={errors.confirm} />
          <FormAlert>{req.error}</FormAlert>
          <SubmitButton loading={req.loading} loadingText="Updating…" className="btn-block">Update password</SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}
