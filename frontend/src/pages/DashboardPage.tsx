import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { get } from '../services/api';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  BanknotesIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  ScaleIcon,
  BuildingLibraryIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

function PeriodSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none text-xs font-medium bg-white/20 dark:bg-white/10 text-white border border-white/30 rounded-lg px-3 py-1.5 pr-7 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <option value="7d" className="text-gray-900">Last 7 days</option>
        <option value="30d" className="text-gray-900">Last 30 days</option>
        <option value="90d" className="text-gray-900">Last 90 days</option>
        <option value="12m" className="text-gray-900">Last 12 months</option>
      </select>
      <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/70 pointer-events-none" />
    </div>
  );
}

function DashCard({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className={`rounded-2xl shadow-lg dark:shadow-xl overflow-hidden transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`}>
      {children}
    </div>
  );
}

const PIE_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function DashboardPage() {
  const { t } = useTranslation();
  const [salesPeriod, setSalesPeriod] = useState('30d');
  const [plPeriod, setPlPeriod] = useState('30d');

  const { data: companyData } = useQuery({
    queryKey: ['settings:company'],
    queryFn: () => get('/settings/company'),
  });
  const company = (companyData as any)?.data || companyData || {};

  const { data: summaryResp } = useQuery({
    queryKey: ['dashboard:summary'],
    queryFn: () => get('/dashboard/summary'),
  });
  const summary = (summaryResp as any)?.data || summaryResp || {};

  const { data: statsResp } = useQuery({
    queryKey: ['dashboard:stats'],
    queryFn: () => get('/dashboard/stats'),
  });
  const stats = (statsResp as any)?.data || statsResp || {};

  const { data: plResp } = useQuery({
    queryKey: ['reports:pl', plPeriod],
    queryFn: () => get('/reports/gl/profit-loss'),
  });
  const plData = (plResp as any)?.data || plResp || {};

  const { data: bankResp } = useQuery({
    queryKey: ['accounts:bank'],
    queryFn: () => get('/accounts?type=BANK'),
  });
  const bankAccounts = Array.isArray((bankResp as any)?.data) ? (bankResp as any).data : (Array.isArray(bankResp) ? bankResp : []);

  const formatCurrency = (value: number) => {
    const currency = company?.baseCurrency || 'MYR';
    return new Intl.NumberFormat('en-MY', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
  };

  const formatCompact = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value?.toString() || '0';
  };

  const salesChartData = summary?.salesChart || Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return { date: d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short' }), amount: 0 };
  });

  const expenseBreakdown = (plData?.expenseBreakdown || summary?.expenseBreakdown || []).slice(0, 5);

  const invoiceCount = summary?.invoiceCount || 0;
  const totalUnpaid = summary?.totalUnpaid || stats?.arOutstanding || 0;
  const overdueAmount = summary?.overdueAmount || 0;
  const notDueAmount = totalUnpaid - overdueAmount;

  const quotationCount = summary?.quotationCount || 0;
  const quotationTotal = summary?.quotationTotal || 0;
  const quotationPending = summary?.quotationPending || 0;
  const quotationSuccess = summary?.quotationSuccess || 0;
  const quotationLost = summary?.quotationLost || 0;
  const quotationClosed = summary?.quotationClosed || 0;

  const totalIncome = plData?.totalIncome || summary?.totalIncome || 0;
  const totalExpense = plData?.totalExpense || summary?.totalExpense || 0;
  const netIncome = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">{t('dashboard.title')}</h1>
        <p className="page-subtitle">{t('dashboard.welcome')}</p>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Sales */}
        <DashCard delay={0}>
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <BanknotesIcon className="w-5 h-5 text-white/80" />
                <h3 className="text-sm font-semibold text-white/90">Sales</h3>
              </div>
              <PeriodSelector value={salesPeriod} onChange={setSalesPeriod} />
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(summary?.salesTotalAmount || stats?.salesThisMonth || 0)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4">
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={formatCompact} width={40} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashCard>

        {/* Invoices */}
        <DashCard delay={100}>
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-white/80" />
                <h3 className="text-sm font-semibold text-white/90">Invoices</h3>
              </div>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full text-white font-medium">{invoiceCount} total</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalUnpaid)}</p>
            <p className="text-xs text-white/70 mt-0.5">Total Unpaid</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 space-y-3">
            <Link to="/ar/invoices" className="block">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Overdue</span>
                <span className="text-sm font-bold text-red-500">{formatCurrency(overdueAmount)}</span>
              </div>
              <div className="mt-1.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${totalUnpaid ? (overdueAmount / totalUnpaid) * 100 : 0}%` }} />
              </div>
            </Link>
            <Link to="/ar/invoices" className="block">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Not Due</span>
                <span className="text-sm font-bold text-emerald-500">{formatCurrency(notDueAmount)}</span>
              </div>
              <div className="mt-1.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${totalUnpaid ? (notDueAmount / totalUnpaid) * 100 : 0}%` }} />
              </div>
            </Link>
          </div>
        </DashCard>

        {/* Quotations */}
        <DashCard delay={200}>
          <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <ClipboardDocumentListIcon className="w-5 h-5 text-white/80" />
                <h3 className="text-sm font-semibold text-white/90">Quotations</h3>
              </div>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full text-white font-medium">{quotationCount} total</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(quotationTotal)}</p>
            <p className="text-xs text-white/70 mt-0.5">Total Deal Value</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Pending', value: quotationPending, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                { label: 'Success', value: quotationSuccess, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'Lost', value: quotationLost, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                { label: 'Closed', value: quotationClosed, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-700/30' },
              ].map((item) => (
                <Link key={item.label} to="/sales/quotations" className={`${item.bg} rounded-xl p-3 text-center hover:scale-[1.02] transition-transform`}>
                  <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                </Link>
              ))}
            </div>
          </div>
        </DashCard>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* P&L */}
        <DashCard delay={300}>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <ArrowTrendingUpIcon className="w-5 h-5 text-white/80" />
                <h3 className="text-sm font-semibold text-white/90">Profit & Loss</h3>
              </div>
              <PeriodSelector value={plPeriod} onChange={setPlPeriod} />
            </div>
            <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-white' : 'text-red-200'}`}>{formatCurrency(netIncome)}</p>
            <p className="text-xs text-white/70 mt-0.5">Net Income</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={[{ name: 'Income', value: totalIncome }, { name: 'Expenses', value: totalExpense }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={formatCompact} width={40} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between mt-2 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /><span className="text-gray-500 dark:text-gray-400">Income: {formatCurrency(totalIncome)}</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /><span className="text-gray-500 dark:text-gray-400">Expense: {formatCurrency(totalExpense)}</span></span>
            </div>
          </div>
        </DashCard>

        {/* Cost & Expenses */}
        <DashCard delay={400}>
          <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <ScaleIcon className="w-5 h-5 text-white/80" />
                <h3 className="text-sm font-semibold text-white/90">Cost & Expenses</h3>
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalExpense)}</p>
            <p className="text-xs text-white/70 mt-0.5">Total Expenses</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4">
            {expenseBreakdown.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={expenseBreakdown} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={50} innerRadius={25}>
                      {expenseBreakdown.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {expenseBreakdown.map((exp: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-600 dark:text-gray-300 truncate flex-1">{exp.name}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(exp.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[120px] text-gray-400 dark:text-gray-500 text-sm">
                <p>No expense data available</p>
              </div>
            )}
          </div>
        </DashCard>

        {/* Bank Accounts */}
        <DashCard delay={500}>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <BuildingLibraryIcon className="w-5 h-5 text-white/80" />
                <h3 className="text-sm font-semibold text-white/90">Bank Accounts</h3>
              </div>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full text-white font-medium">{bankAccounts.length} accounts</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(bankAccounts.reduce((sum: number, a: any) => sum + (a.balance || 0), 0))}</p>
            <p className="text-xs text-white/70 mt-0.5">Total Balance</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4">
            {bankAccounts.length > 0 ? (
              <div className="space-y-2.5 max-h-[140px] overflow-y-auto">
                {bankAccounts.map((account: any, i: number) => (
                  <Link key={account.id || i} to="/gl/accounts" className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <BuildingLibraryIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[140px]">{account.name || account.accountName}</p>
                        <p className="text-xs text-gray-400">{account.code || account.accountCode}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-bold ${(account.balance || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatCurrency(account.balance || 0)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[120px] text-gray-400 dark:text-gray-500 text-sm">
                <Link to="/bank/settings" className="text-center hover:text-indigo-500 transition-colors">
                  <BuildingLibraryIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No bank accounts configured</p>
                  <p className="text-xs mt-1 text-indigo-400">Click to set up</p>
                </Link>
              </div>
            )}
          </div>
        </DashCard>
      </div>
    </div>
  );
}
