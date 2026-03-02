import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../services/api';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  XCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

const fmt = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type FilterType = 'all' | 'PAYMENT_VOUCHER' | 'OTHER_RECEIPT';

interface CashBookItem {
  id: number;
  documentNo: string;
  documentDate: string;
  transactionType: string;
  description: string | null;
  customerName: string | null;
  vendorName: string | null;
  amount: number;
  currencyCode: string;
  isVoid: boolean;
  isPosted: boolean;
  paymentMethod: { name: string };
}

export default function CashBookEntryPage() {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const queryParams: Record<string, string> = { page: String(page), pageSize: '20' };
  if (filterType !== 'all') queryParams.type = filterType;
  if (search.trim()) queryParams.search = search.trim();
  if (dateFrom) queryParams.dateFrom = dateFrom;
  if (dateTo) queryParams.dateTo = dateTo;

  const { data, isLoading } = useQuery<{ items: CashBookItem[]; total: number; page: number; pageSize: number }>({
    queryKey: ['cashbook', queryParams],
    queryFn: () => get('/cashbook', queryParams),
  });

  const items: CashBookItem[] = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const getTypeLabel = (t: string) => {
    switch (t) {
      case 'PAYMENT_VOUCHER': return 'PV';
      case 'OTHER_RECEIPT': return 'RV';
      case 'AR_RECEIPT': return 'RV';
      case 'AP_PAYMENT': return 'PV';
      default: return t;
    }
  };

  const getTypeBadge = (t: string) => {
    const isPV = t === 'PAYMENT_VOUCHER' || t === 'AP_PAYMENT';
    return isPV
      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
  };

  const getStatusBadge = (item: CashBookItem) => {
    if (item.isVoid) return { label: 'Void', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' };
    if (item.isPosted) return { label: 'Posted', cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' };
    return { label: 'Draft', cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' };
  };

  // Summary stats
  const pvCount = items.filter((i) => i.transactionType === 'PAYMENT_VOUCHER' || i.transactionType === 'AP_PAYMENT').length;
  const rvCount = items.filter((i) => i.transactionType === 'OTHER_RECEIPT' || i.transactionType === 'AR_RECEIPT').length;
  const totalAmount = items.reduce((s, i) => s + i.amount, 0);
  const voidCount = items.filter((i) => i.isVoid).length;

  const summaryCards = [
    { label: 'Payment Vouchers', value: pvCount, icon: ArrowUpTrayIcon, color: 'from-red-500 to-rose-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Receipt Vouchers', value: rvCount, icon: ArrowDownTrayIcon, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Total Amount', value: fmt(totalAmount), icon: BanknotesIcon, color: 'from-indigo-500 to-purple-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'Void', value: voidCount, icon: XCircleIcon, color: 'from-gray-400 to-gray-500', bg: 'bg-gray-50 dark:bg-gray-800' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cash Book Entry</h1>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-indigo-500/25">
          <PlusIcon className="w-4 h-4" /> New Entry
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4 border border-gray-200/50 dark:border-slate-700/50`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color} text-white shadow-lg`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-300 dark:border-slate-600 overflow-hidden">
            {(['all', 'PAYMENT_VOUCHER', 'OTHER_RECEIPT'] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => { setFilterType(type); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filterType === type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'
                }`}
              >
                {type === 'all' ? 'All' : type === 'PAYMENT_VOUCHER' ? 'Payment Voucher' : 'Receipt Voucher'}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search doc no, description..."
              className="w-full pl-9 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500" />
          </div>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From"
            className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To"
            className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            No cash book entries found. Click <span className="font-semibold text-indigo-600">New Entry</span> to create one.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Doc No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-16">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Pay To / Receive From</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-36">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-20">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {items.map((item) => {
                    const status = getStatusBadge(item);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-2.5 text-sm font-mono font-medium text-indigo-600 dark:text-indigo-400">{item.documentNo}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400">{new Date(item.documentDate).toLocaleDateString('en-MY')}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getTypeBadge(item.transactionType)}`}>
                            {getTypeLabel(item.transactionType)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-white">{item.customerName || item.vendorName || '-'}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{item.description || '-'}</td>
                        <td className="px-4 py-2.5 text-sm text-right font-semibold text-gray-900 dark:text-white">{fmt(item.amount)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.cls}`}>{status.label}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Page {page} of {totalPages} ({total} entries)
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300">
                    Prev
                  </button>
                  <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
