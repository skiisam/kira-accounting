import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { post, isDemoMode } from '../../services/api';
import {
  CurrencyDollarIcon,
  UserIcon,
  LockClosedIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';

interface LoginForm {
  userCode: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: number;
    code: string;
    name: string;
    email?: string;
    isAdmin: boolean;
    group: string;
    company?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { isDark, setMode } = useThemeStore();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const body = needsMfa ? { ...data, totpCode } : data;
      const response = await post<LoginResponse>('/auth/login', body);
      login(response.user, response.accessToken, response.refreshToken);
      toast.success(`Welcome, ${response.user.name}!`);
      navigate('/company/select');
    } catch (error: any) {
      const err = error.response?.data?.error;
      if (err?.code === 'MFA_REQUIRED') {
        setNeedsMfa(true);
        toast.error('Two-factor code required');
      } else if (err?.code === 'MFA_INVALID') {
        toast.error('Invalid two-factor code');
      } else {
        toast.error(err?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-purple-400/30 to-pink-500/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-teal-400/20 to-emerald-500/20 rounded-full blur-3xl" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-2xl shadow-blue-500/30">
              <CurrencyDollarIcon className="w-12 h-12 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">KIRA</h1>
              <p className="text-lg text-white/60">Accounting System</p>
            </div>
          </div>
          
          <div className="space-y-6 max-w-md">
            <h2 className="text-3xl font-semibold text-white">
              Manage your finances with confidence
            </h2>
            <p className="text-white/70 text-lg leading-relaxed">
              Complete accounting solution for sales, purchases, inventory, and financial reporting. Built for modern businesses.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mt-8">
              {[
                { label: 'Sales & AR', color: 'from-emerald-400 to-teal-500' },
                { label: 'Purchases & AP', color: 'from-orange-400 to-amber-500' },
                { label: 'Inventory', color: 'from-blue-400 to-indigo-500' },
                { label: 'Reports', color: 'from-purple-400 to-pink-500' },
              ].map((feature) => (
                <div 
                  key={feature.label}
                  className={`p-4 rounded-xl bg-gradient-to-br ${feature.color} text-white font-medium shadow-lg`}
                >
                  {feature.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="w-full max-w-md">
          {/* Theme toggle */}
          <div className="flex justify-end mb-8">
            <button
              onClick={() => setMode(isDark ? 'light' : 'dark')}
              className="p-2 rounded-lg bg-white dark:bg-slate-700 shadow-lg hover:shadow-xl transition-all text-gray-600 dark:text-gray-300"
            >
              {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-blue-500/30">
                <CurrencyDollarIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">KIRA</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Accounting System</p>
              </div>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20 dark:border-slate-700/50">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="userCode" className="label">User Code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="userCode"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your user code"
                    className={`input pl-10 ${errors.userCode ? 'input-error' : ''}`}
                    {...register('userCode', { required: 'User code is required' })}
                  />
                </div>
                {errors.userCode && (
                  <p className="mt-1 text-sm text-red-600">{errors.userCode.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="label">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={`input pl-10 ${errors.password ? 'input-error' : ''}`}
                    {...register('password', { required: 'Password is required' })}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
              
              {needsMfa && (
                <div>
                  <label htmlFor="totpCode" className="label">Two-Factor Code</label>
                  <input
                    id="totpCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3 text-base"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Links */}
            <div className="mt-4 text-center space-y-2">
              <Link
                to="/forgot-password"
                className="block text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
              >
                Forgot password or username?
              </Link>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                >
                  Register here
                </Link>
              </p>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700/50 dark:to-slate-600/50">
              {isDemoMode && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-medium">
                    DEMO MODE
                  </span>
                </div>
              )}
              <p className="text-center text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Login:</span> ADMIN / admin {isDemoMode && 'or DEMO / demo'}
              </p>
            </div>
          </div>
          
          {/* Footer */}
          <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            © 2026 KIRA Accounting. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
