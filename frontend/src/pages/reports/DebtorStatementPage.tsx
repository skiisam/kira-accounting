import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../services/api';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

const formatCurrency = (amount: number) =>
  amount < 0
    ? `(RM ${Math.abs(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
    : `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (d: string | Date) => new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });

const DOC_TYPE_COLORS: Record<string, string> = {
  Invoice: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Credit Note': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Debit Note': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Payment: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

interface Customer { id: number; code: string; name: string; }

interface StatementData {
  customer: { id: number; code: string; name: string; creditLimit: number; outstandingBalance: number };
  dateFrom: string;
  dateTo: string;
  openingBalance: number;
  closingBalance: number;
  transactions: Array<{
    date: string;
    documentNo: string;
    documentType: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  aging: { current: number; days30: number; days60: number; days90: number; over90: number };
}

export default function DebtorStatementPage() {
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [includePaid, setIncludePaid] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [queryParams, setQueryParams] = useState<Record<string, any> | null>(null);

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers-list'],
    queryFn: () => get('/customers', { pageSize: 500 }).then((r: any) => r.items || r),
    staleTime: 60000,
  });

  const filteredCustomers = useMemo(() => {
    if (!customers || !customerSearch) return customers || [];
    const q = customerSearch.toLowerCase();
    return customers.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  }, [customers, customerSearch]);

  const selectedCustomer = customers?.find(c => c.id === customerId);

  const { data: reportData, isLoading, isFetching } = useQuery<StatementData>({
    queryKey: ['debtor-statement', queryParams],
    queryFn: () => get('/reports/ar/debtor-statement', queryParams!),
    enabled: !!queryParams,
  });

  const handleGenerate = () => {
    if (!customerId) return;
    setQueryParams({ customerId, dateFrom, dateTo, includePaid: includePaid.toString() });
  };

  const agingTotal = reportData ? Object.values(reportData.aging).reduce((s, v) => s + v, 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Debtor Statement</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Customer account statement with aging summary</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search customer..."
                value={selectedCustomer ? `${selectedCustomer.code} - ${selectedCustomer.name}` : customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setCustomerId(null); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500" />
            </div>
            {showDropdown && filteredCustomers.length > 0 && !customerId && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredCustomers.slice(0, 20).map(c => (
                  <button key={c.id} onClick={() => { setCustomerId(c.id); setCustomerSearch(''); setShowDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-900 dark:text-white">
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-2">{c.code}</span>{c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={includePaid} onChange={(e) => setIncludePaid(e.target.checked)}
              className="rounded border-gray-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500" />
            Include Paid Items
          </label>
          <button onClick={handleGenerate} disabled={!customerId}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all shadow-sm">
            {isFetching ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <UserIcon className="w-4 h-4" />}
            Generate
          </button>
          {reportData && (
            <>
              <button onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                <PrinterIcon className="w-4 h-4" /> Print
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                <ArrowDownTrayIcon className="w-4 h-4" /> Export
              </button>
            </>
          )}
        </div>
      </div>

      {/* Customer Info */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer Code</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white font-mono mt-1">{reportData.customer.code}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer Name</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{reportData.customer.name}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credit Limit</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(reportData.customer.creditLimit)}</p>
          </div>
          <div className={`rounded-xl shadow-sm p-4 text-white ${reportData.customer.outstandingBalance > 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
            <p className="text-xs uppercase tracking-wider opacity-80">Outstanding Balance</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(reportData.customer.outstandingBalance)}</p>
          </div>
        </div>
      )}

      {/* Statement Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
        ) : !reportData ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
            Select a customer and click <span className="font-semibold text-blue-600">Generate</span> to view the statement.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Doc No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Debit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Credit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white" colSpan={6}>Opening Balance</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-right text-gray-900 dark:text-white">{formatCurrency(reportData.openingBalance)}</td>
                </tr>
                {reportData.transactions.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-primary-600 dark:text-primary-400 cursor-pointer hover:underline">{t.documentNo}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${DOC_TYPE_COLORS[t.documentType] || 'bg-gray-100 text-gray-700'}`}>
                        {t.documentType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{t.description}</td>
                    <td className="px-4 py-2.5 text-sm text-right text-gray-900 dark:text-white">{t.debit > 0 ? formatCurrency(t.debit) : ''}</td>
                    <td className="px-4 py-2.5 text-sm text-right text-emerald-600 dark:text-emerald-400">{t.credit > 0 ? formatCurrency(t.credit) : ''}</td>
                    <td className="px-4 py-2.5 text-sm text-right font-medium text-gray-900 dark:text-white">{formatCurrency(t.balance)}</td>
                  </tr>
                ))}
                <tr className="bg-indigo-50/50 dark:bg-indigo-900/10 border-t-2 border-indigo-200 dark:border-indigo-800">
                  <td className="px-4 py-2.5 text-sm font-bold text-indigo-900 dark:text-indigo-200" colSpan={6}>Closing Balance</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-right text-indigo-900 dark:text-indigo-200">{formatCurrency(reportData.closingBalance)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aging Summary */}
      {reportData && agingTotal > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Aging Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Current', value: reportData.aging.current, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
              { label: '1-30 Days', value: reportData.aging.days30, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
              { label: '31-60 Days', value: reportData.aging.days60, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
              { label: '61-90 Days', value: reportData.aging.days90, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
              { label: 'Over 90 Days', value: reportData.aging.over90, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-lg p-3 ${color}`}>
                <p className="text-xs font-medium opacity-70">{label}</p>
                <p className="text-lg font-bold mt-1">{formatCurrency(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
