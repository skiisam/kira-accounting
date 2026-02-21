import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { post, isDemoMode } from '../../services/api';
import {
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  LockClosedIcon,
  PhoneIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';

interface RegisterForm {
  companyName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

interface RegisterResponse {
  user: {
    id: number;
    code: string;
    name: string;
    email?: string;
    isAdmin: boolean;
    group: string;
    company?: string;
  };
  company: {
    id: number;
    code: string;
    name: string;
    setupComplete: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { isDark, setMode } = useThemeStore();
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();
  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await post<RegisterResponse>('/auth/register', {
        companyName: data.companyName,
        email: data.email,
        password: data.password,
        phone: data.phone,
      });
      
      login(response.user, response.accessToken, response.refreshToken);
      toast.success('Registration successful! Let\'s set up your company.');
      navigate('/setup');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-emerald-400/30 to-teal-500/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-teal-400/20 to-emerald-500/20 rounded-full blur-3xl" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl shadow-teal-500/30">
              <CurrencyDollarIcon className="w-12 h-12 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">KIRA</h1>
              <p className="text-lg text-white/60">Accounting System</p>
            </div>
          </div>
          
          <div className="space-y-6 max-w-md">
            <h2 className="text-3xl font-semibold text-white">
              Start managing your business today
            </h2>
            <p className="text-white/70 text-lg leading-relaxed">
              Create your company account in minutes and get access to powerful accounting tools.
            </p>
            
            <div className="space-y-4 mt-8">
              {[
                '✓ Multi-company support',
                '✓ Full chart of accounts',
                '✓ Sales & purchasing',
                '✓ Financial reports',
                '✓ Inventory management',
              ].map((feature) => (
                <div key={feature} className="text-white/80 text-lg">
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Registration form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
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
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-teal-500/30">
                <CurrencyDollarIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">KIRA</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Accounting System</p>
              </div>
            </div>
          </div>

          {/* Registration Card */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20 dark:border-slate-700/50">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Register your company</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label htmlFor="companyName" className="label">Company Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="companyName"
                    type="text"
                    placeholder="Your Company Name"
                    className={`input pl-10 ${errors.companyName ? 'input-error' : ''}`}
                    {...register('companyName', { required: 'Company name is required' })}
                  />
                </div>
                {errors.companyName && (
                  <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="label">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="label">Phone (Optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+60 12-345 6789"
                    className="input pl-10"
                    {...register('phone')}
                  />
                </div>
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
                    autoComplete="new-password"
                    placeholder="Min. 6 characters"
                    className={`input pl-10 ${errors.password ? 'input-error' : ''}`}
                    {...register('password', { 
                      required: 'Password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' }
                    })}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="label">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    className={`input pl-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                    {...register('confirmPassword', { 
                      required: 'Please confirm your password',
                      validate: value => value === password || 'Passwords do not match'
                    })}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3 text-base bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>

            {isDemoMode && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-center">
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-medium">
                  DEMO MODE
                </span>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Registration will simulate a new company setup
                </p>
              </div>
            )}
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
