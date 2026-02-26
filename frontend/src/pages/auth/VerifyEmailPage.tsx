import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { post } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface LocationState {
  token?: string;
  email?: string;
  userCode?: string;
}

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const state = (location.state as LocationState) || {};
  const [token, setToken] = useState(state.token || '');
  const [email] = useState(state.email || '');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || code.length < 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setSubmitting(true);
    try {
      const resp = await post<any>('/auth/verify-email', { token, code });
      login(resp.user, resp.accessToken, resp.refreshToken);
      toast.success('Email verified. Welcome!');
      navigate('/setup');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (!token) {
      toast.error('Missing verification token');
      return;
    }
    setResending(true);
    try {
      const resp = await post<any>('/auth/resend-verification', { token });
      setToken(resp.verificationToken);
      toast.success('Verification code resent');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/60 backdrop-blur shadow-xl rounded-2xl p-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Verify your email</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          We sent a 6-digit code to {email || 'your email address'}.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\\D/g, '').slice(0, 6))}
            placeholder="Enter 6-digit code"
            className="input w-full text-center tracking-widest text-lg"
          />
          <button type="submit" disabled={submitting} className="btn btn-primary w-full">
            {submitting ? 'Verifying...' : 'Verify'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button type="button" disabled={resending} onClick={resend} className="text-primary-600 hover:underline">
            {resending ? 'Resending...' : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  );
}

