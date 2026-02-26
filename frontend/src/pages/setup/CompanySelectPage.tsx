import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { get, post } from '../../services/api';
import toast from 'react-hot-toast';
import { BuildingOfficeIcon, PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';

interface Company {
  id: number;
  code: string;
  name: string;
  country?: string | null;
  baseCurrency?: string | null;
}

export default function CompanySelectPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [creating, setCreating] = useState(false);
  const [newCompany, setNewCompany] = useState<{ code: string; name: string; country?: string; baseCurrency?: string }>({
    code: '',
    name: '',
    country: 'MY',
    baseCurrency: 'MYR',
  });

  const { data: companies = [], refetch, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => get<Company[]>('/settings/companies'),
  });

  const { data: currenciesData } = useQuery({
    queryKey: ['currencies:list'],
    queryFn: () => get('/settings/currencies'),
  });
  const currencies = Array.isArray((currenciesData as any)?.data)
    ? (currenciesData as any).data
    : (Array.isArray(currenciesData) ? (currenciesData as any) : []);
  const currencyOptions = currencies.map((c: any) => ({ code: c.code, name: c.name, symbol: c.symbol }));
  const countryOptions = [
    { code: 'MY', name: 'Malaysia' },
    { code: 'SG', name: 'Singapore' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'TH', name: 'Thailand' },
    { code: 'PH', name: 'Philippines' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'MM', name: 'Myanmar' },
    { code: 'KH', name: 'Cambodia' },
    { code: 'BN', name: 'Brunei' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'IN', name: 'India' },
    { code: 'CN', name: 'China' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'TW', name: 'Taiwan' },
  ];
  const selectMutation = useMutation({
    mutationFn: (companyId: number) => post('/settings/select-company', { companyId }),
    onSuccess: async () => {
      // Check setup status and route accordingly
      try {
        const status = await get<{ setupRequired: boolean }>('/settings/setup-status');
        if (status?.setupRequired) {
          navigate('/setup');
        } else {
          navigate('/dashboard');
        }
      } catch {
        navigate('/dashboard');
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to select company');
    },
  });

  const createMutation = useMutation<Company>({
    mutationFn: () => post<Company>('/settings/companies', newCompany),
    onSuccess: async (created) => {
      toast.success('Company created');
      setCreating(false);
      setNewCompany({ code: '', name: '', country: 'MY', baseCurrency: 'MYR' });
      await refetch();
      selectMutation.mutate(created.id);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to create company');
    },
  });

  useEffect(() => {
    document.title = 'Select Company - KIRA';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl shadow-2xl p-8 border border-white/20 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg">
              <BuildingOfficeIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Select Company</h2>
              <p className="text-gray-600 dark:text-gray-400">Welcome{user ? `, ${user.name}` : ''}. Choose a company or create a new one.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Existing companies */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Existing Companies</h3>
              <div className="space-y-3">
                {isLoading && <div className="text-gray-500 dark:text-gray-400">Loading companies...</div>}
                {!isLoading && companies.length === 0 && (
                  <div className="text-gray-500 dark:text-gray-400">No companies yet. Create your first company.</div>
                )}
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectMutation.mutate(c.id)}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all text-left flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{c.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{c.code} • {c.country || 'N/A'} • {c.baseCurrency || 'Unspecified'}</div>
                    </div>
                    <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                  </button>
                ))}
              </div>
            </div>

            {/* Create new company */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Create New Company</h3>
              {!creating ? (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300"
                >
                  <PlusIcon className="w-5 h-5" /> New Company
                </button>
              ) : (
                <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-slate-700 space-y-3">
                  <div>
                    <label className="label">Company Name *</label>
                    <input
                      value={newCompany.name}
                      onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                      className="input w-full"
                      placeholder="e.g., Acme Sdn Bhd"
                    />
                  </div>
                  <div>
                    <label className="label">Company Code *</label>
                    <input
                      value={newCompany.code}
                      onChange={(e) => setNewCompany({ ...newCompany, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) })}
                      className="input w-full font-mono"
                      placeholder="e.g., ACME"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Country</label>
                      <select
                        value={newCompany.country || ''}
                        onChange={(e) => setNewCompany({ ...newCompany, country: e.target.value })}
                        className="input w-full"
                      >
                        <option value="">— Select —</option>
                        {countryOptions.map((co) => (
                          <option key={co.code} value={co.code}>{co.code} — {co.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Base Currency</label>
                      <select
                        value={newCompany.baseCurrency || ''}
                        onChange={(e) => setNewCompany({ ...newCompany, baseCurrency: e.target.value })}
                        className="input w-full"
                      >
                        <option value="">— Select —</option>
                        {currencyOptions.map((cur: any) => (
                          <option key={cur.code} value={cur.code}>
                            {cur.code} {cur.symbol ? `(${cur.symbol})` : ''} — {cur.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => createMutation.mutate()}
                      className="btn btn-primary"
                      disabled={!newCompany.code || !newCompany.name || createMutation.isPending}
                    >
                      Create
                    </button>
                    <button className="btn" onClick={() => setCreating(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
