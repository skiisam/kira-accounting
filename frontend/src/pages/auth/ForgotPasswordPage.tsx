import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useThemeStore } from '../../store/themeStore';
import { post } from '../../services/api';
import {
  CurrencyDollarIcon,
  EnvelopeIcon,
  UserIcon,
  KeyIcon,
  ArrowLeftIcon,
  SunIcon,
  MoonIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

type TabType = 'forgot-password' | 'forgot-username' | 'reset-password';

interface ForgotPasswordForm {
  identifier: string;
}

interface ForgotUsernameForm {
  email: string;
}

interface ResetPasswordForm {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ForgotPasswordPage() {
  const [activeTab, setActiveTab] = useState<TabType>('forgot-password');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<{ userCode: string; userName?: string } | null>(null);
  const { isDark, setMode } = useThemeStore();
  const navigate = useNavigate();

  const forgotPasswordForm = useForm<ForgotPasswordForm>();
  const forgotUsernameForm = useForm<ForgotUsernameForm>();
  const resetPasswordForm = useForm<ResetPasswordForm>();

  const handleForgotPassword = async (data: ForgotPasswordForm) => {
    setLoading(true);
    try {
      const response = await post<any>('/auth/forgot-password', data);
      setResetToken(response.resetToken);
      setFoundUser({ userCode: response.userCode });
      toast.success('Reset token generated! You can now reset your password.');
      setActiveTab('reset-password');
      resetPasswordForm.setValue('token', response.resetToken);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotUsername = async (data: ForgotUsernameForm) => {
    setLoading(true);
    try {
      const response = await post<any>('/auth/lookup-username', data);
      setFoundUser({ userCode: response.userCode, userName: response.userName });
      toast.success('Username found!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to find username');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (data: ResetPasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await post('/auth/reset-password', {
        token: data.token,
        newPassword: data.newPassword,
      });
      toast.success('Password reset successfully! Please login with your new password.');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'forgot-password' as TabType, label: 'Reset Password', icon: KeyIcon },
    { id: 'forgot-username' as TabType, label: 'Find Username', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Theme toggle */}
        <div className="flex justify-between items-center mb-8">
          <Link
            to="/login"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Login
          </Link>
          <button
            onClick={() => setMode(isDark ? 'light' : 'dark')}
            className="p-2 rounded-lg bg-white dark:bg-slate-700 shadow-lg hover:shadow-xl transition-all text-gray-600 dark:text-gray-300"
          >
            {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-blue-500/30">
              <CurrencyDollarIcon className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">KIRA</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Account Recovery</p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20 dark:border-slate-700/50">
          {/* Tabs */}
          {activeTab !== 'reset-password' && (
            <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-slate-700 rounded-xl">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setFoundUser(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Forgot Password Tab */}
          {activeTab === 'forgot-password' && (
            <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Reset Your Password</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                  Enter your user code or email address
                </p>
              </div>

              <div>
                <label className="label">User Code or Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="ADMIN or admin@example.com"
                    className="input pl-10"
                    {...forgotPasswordForm.register('identifier', { required: true })}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
                {loading ? 'Processing...' : 'Get Reset Token'}
              </button>
            </form>
          )}

          {/* Forgot Username Tab */}
          {activeTab === 'forgot-username' && (
            <form onSubmit={forgotUsernameForm.handleSubmit(handleForgotUsername)} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Find Your Username</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                  Enter your email to retrieve your user code
                </p>
              </div>

              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    placeholder="admin@example.com"
                    className="input pl-10"
                    {...forgotUsernameForm.register('email', { required: true })}
                  />
                </div>
              </div>

              {foundUser && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-emerald-800 dark:text-emerald-300">Username Found!</p>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                        Your user code is: <span className="font-bold">{foundUser.userCode}</span>
                      </p>
                      {foundUser.userName && (
                        <p className="text-sm text-emerald-600 dark:text-emerald-500">
                          Name: {foundUser.userName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
                {loading ? 'Searching...' : 'Find Username'}
              </button>
            </form>
          )}

          {/* Reset Password Tab */}
          {activeTab === 'reset-password' && (
            <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Set New Password</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                  {foundUser ? `Resetting password for ${foundUser.userCode}` : 'Enter your reset token and new password'}
                </p>
              </div>

              {!resetToken && (
                <div>
                  <label className="label">Reset Token</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Paste your reset token"
                      className="input pl-10 font-mono text-xs"
                      {...resetPasswordForm.register('token', { required: true })}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    className="input pl-10"
                    {...resetPasswordForm.register('newPassword', { required: true, minLength: 6 })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="input pl-10"
                    {...resetPasswordForm.register('confirmPassword', { required: true })}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('forgot-password');
                    setResetToken(null);
                    setFoundUser(null);
                  }}
                  className="btn btn-secondary flex-1 py-3"
                >
                  Back
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1 py-3">
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}

          {/* Info box */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300">Note</p>
                <p className="text-amber-700 dark:text-amber-400 mt-1">
                  Username is case-sensitive. Make sure to enter it exactly as registered (e.g., <strong>ADMIN</strong>).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Remember your password?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
