import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  KeyIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { post, isDemoMode } from '../../services/api';

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePasswordPage() {
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordForm>();

  const newPassword = watch('newPassword');

  const onSubmit = async (data: ChangePasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (data.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      if (isDemoMode) {
        // Simulate success in demo mode
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('Password changed successfully! (Demo mode)');
        reset();
      } else {
        await post('/auth/change-password', {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        });
        toast.success('Password changed successfully!');
        reset();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score, label: 'Medium', color: 'bg-yellow-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength(newPassword || '');

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <KeyIcon className="w-5 h-5 text-primary-500" />
          Change Password
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Update your account password. You'll need to enter your current password first.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Current Password */}
        <div>
          <label className="label">Current Password</label>
          <div className="relative">
            <input
              type={showPasswords.current ? 'text' : 'password'}
              className={`input pr-10 ${errors.currentPassword ? 'input-error' : ''}`}
              placeholder="Enter your current password"
              {...register('currentPassword', { required: 'Current password is required' })}
            />
            <button
              type="button"
              onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswords.current ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label className="label">New Password</label>
          <div className="relative">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              className={`input pr-10 ${errors.newPassword ? 'input-error' : ''}`}
              placeholder="Enter new password (min 6 characters)"
              {...register('newPassword', { 
                required: 'New password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' }
              })}
            />
            <button
              type="button"
              onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswords.new ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
          )}
          
          {/* Password Strength Indicator */}
          {newPassword && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${strength.color} transition-all`}
                    style={{ width: `${(strength.score / 5) * 100}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  strength.label === 'Weak' ? 'text-red-500' : 
                  strength.label === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {strength.label}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="label">Confirm New Password</label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              className={`input pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
              placeholder="Confirm your new password"
              {...register('confirmPassword', { 
                required: 'Please confirm your password',
                validate: value => value === newPassword || 'Passwords do not match'
              })}
            />
            <button
              type="button"
              onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswords.confirm ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Password Requirements */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password Requirements:
          </p>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-center gap-2">
              <CheckCircleIcon className={`w-4 h-4 ${newPassword?.length >= 6 ? 'text-green-500' : 'text-gray-300'}`} />
              At least 6 characters
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon className={`w-4 h-4 ${/[A-Z]/.test(newPassword || '') ? 'text-green-500' : 'text-gray-300'}`} />
              One uppercase letter (recommended)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon className={`w-4 h-4 ${/[0-9]/.test(newPassword || '') ? 'text-green-500' : 'text-gray-300'}`} />
              One number (recommended)
            </li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full py-3"
        >
          <ShieldCheckIcon className="w-5 h-5" />
          {loading ? 'Changing Password...' : 'Change Password'}
        </button>
      </form>

      {isDemoMode && (
        <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm">
          <strong>Demo Mode:</strong> Password changes are simulated and won't persist.
        </div>
      )}
    </div>
  );
}
