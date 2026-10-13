import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from './AuthLayout.jsx';
import { TextInput, FormAlert, SubmitButton, isEmail } from '../../components/common/Form.jsx';
import useApi from '../../hooks/useApi.js';
import { authService } from '../../services/authService.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const req = useApi((a) => authService.forgotPassword(a));

  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) { setError('Enter a valid email address.'); return; }
    setError('');
    const res = await req.execute({ email });
    if (res.success) setSent(true);
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to choose a new password." image="pillar-diy"
      footer={<Link to="/login">← Back to sign in</Link>}>
      {sent ? (
        <div className="auth-done">
          <span aria-hidden="true">📬</span>
          <p>If an account exists for <b>{email}</b>, a reset link is on its way. Check your inbox (and spam folder).</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="auth-form">
          <TextInput label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <FormAlert>{req.error}</FormAlert>
          <SubmitButton loading={req.loading} loadingText="Sending…" className="btn-block">Send reset link</SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}
