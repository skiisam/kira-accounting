import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../../services/api';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function TwoFAPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [setupData, setSetupData] = useState<any>(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [message, setMessage] = useState('');

  const { data: statusResp } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: () => get('/2fa/status'),
  });
  const isEnabled = (statusResp as any)?.data?.enabled;

  const setupMutation = useMutation({
    mutationFn: () => post('/2fa/setup', {}),
    onSuccess: (data: any) => setSetupData(data?.data || data),
  });

  const verifyMutation = useMutation({
    mutationFn: () => post('/2fa/verify', { code }),
    onSuccess: () => {
      setMessage('2FA enabled successfully!');
      setSetupData(null);
      setCode('');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
    },
    onError: () => setMessage('Invalid code. Please try again.'),
  });

  const disableMutation = useMutation({
    mutationFn: () => post('/2fa/disable', { code: disableCode }),
    onSuccess: () => {
      setMessage('2FA disabled successfully.');
      setDisableCode('');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
    },
    onError: () => setMessage('Invalid code.'),
  });

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <ShieldCheckIcon className="w-6 h-6" />
          Two-Factor Authentication
        </h1>
        <p className="page-subtitle">Protect your account with an authenticator app</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('successfully') ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
          {message}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Status</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEnabled ? '2FA is currently enabled' : '2FA is not enabled'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${isEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
            {isEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {!isEnabled && !setupData && (
          <button
            onClick={() => { setMessage(''); setupMutation.mutate(); }}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Set Up 2FA
          </button>
        )}

        {setupData && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Scan this QR code with your authenticator app:</p>
              <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="mx-auto rounded-lg" />
              <p className="text-xs text-gray-400 mt-2 font-mono break-all">Secret: {setupData.secret}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enter verification code:</label>
              <input
                type="text" value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="000000" maxLength={6}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-center text-lg tracking-widest"
              />
            </div>
            <button
              onClick={() => verifyMutation.mutate()}
              disabled={code.length !== 6}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            >
              Verify & Enable
            </button>
          </div>
        )}

        {isEnabled && (
          <div className="space-y-3 mt-4 pt-4 border-t dark:border-slate-700">
            <p className="text-sm text-gray-600 dark:text-gray-300">Enter your authenticator code to disable 2FA:</p>
            <input
              type="text" value={disableCode} onChange={(e) => setDisableCode(e.target.value)}
              placeholder="000000" maxLength={6}
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-center text-lg tracking-widest"
            />
            <button
              onClick={() => disableMutation.mutate()}
              disabled={disableCode.length !== 6}
              className="w-full py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
            >
              Disable 2FA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
