import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../services/api';
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

const fmt = (n: number) => n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = new Date();
const fy1 = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
const todayStr = today.toISOString().split('T')[0];
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });

export default function LedgerPage() {
  const { t } = useTranslation();
  const [accountId, setAccountId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState(fy1);
  const [dateTo, setDateTo] = useState(todayStr);
  const [shouldFetch, setShouldFetch] = useState(false);

  // Load accounts for selector
  const { data: accountsData } = useQuery({
    queryKey: ['accounts-list'],
    queryFn: () => get<any>('/accounts', { pageSize: 9999, isActive: true }),
  });
  const accountsList: any[] = Array.isArray(accountsData) ? accountsData : (accountsData?.data || accountsData || []);

  const { data, isLoading } = useQuery({
    queryKey: ['ledger', accountId, dateFrom, dateTo],
    queryFn: () => get<any>('/reports/gl/ledger-listing', { accountId, dateFrom, dateTo }),
    enabled: shouldFetch && !!accountId,
  });

  const account = data?.account;
  const transactions: any[] = data?.transactions || [];
  const openingBalance = data?.openingBalance ?? 0;
  const closingBalance = data?.closingBalance ?? 0;

  const handleGenerate = () => {
    if (accountId) setShouldFetch(true);
  };

  const exportCSV = () => {
    if (!transactions.length) return;
    const hdr = ['Date', 'Document No', 'Description', 'Debit', 'Credit', 'Balance'];
    const rows = transactions.map((tx: any) => [fmtDate(tx.date), tx.documentNo, tx.description || '', tx.debit, tx.credit, tx.balance]);
    const csv = [hdr, ...rows].map((r) => r.map((c: any) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `ledger-${account?.accountNo || 'report'}-${dateTo}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">General Ledger</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View transaction history for an account</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} disabled={!transactions.length} className="btn btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"><ArrowDownTrayIcon className="w-4 h-4" /> Export</button>
          <button onClick={() => window.print()} className="btn btn-secondary text-sm flex items-center gap-1.5"><PrinterIcon className="w-4 h-4" /> Print</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[250px]">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Account</label>
            <select
              value={accountId ?? ''}
              onChange={e => { setAccountId(e.target.value ? Number(e.target.value) : null); setShouldFetch(false); }}
              className="input text-sm w-full"
            >
              <option value="">-- Select Account --</option>
              {(Array.isArray(accountsList) ? accountsList : []).map((a: any) => (
                <option key={a.id} value={a.id}>{a.accountNo} - {a.name}</option>
              ))}
            </select>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date From</label><input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setShouldFetch(false); }} className="input text-sm" /></div>
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date To</label><input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setShouldFetch(false); }} className="input text-sm" /></div>
          <button onClick={handleGenerate} disabled={!accountId} className="btn btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"><ArrowPathIcon className="w-4 h-4" /> Generate</button>
        </div>
      </div>

      {/* Account Info + Table */}
      {shouldFetch && accountId && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
          ) : (
            <>
              {/* Account Header */}
              {account && (
                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div><span className="text-gray-500 dark:text-gray-400">Account No:</span> <span className="font-mono font-semibold text-gray-900 dark:text-white">{account.accountNo}</span></div>
                    <div><span className="text-gray-500 dark:text-gray-400">Name:</span> <span className="font-semibold text-gray-900 dark:text-white">{account.name}</span></div>
                    <div><span className="text-gray-500 dark:text-gray-400">Type:</span> <span className="text-gray-700 dark:text-gray-300">{account.typeName} ({account.category})</span></div>
                  </div>
                </div>
              )}

              {/* Opening Balance */}
              <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700/50 bg-blue-50/50 dark:bg-blue-900/10">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Opening Balance</span>
                  <span className="font-semibold tabular-nums text-gray-900 dark:text-white">RM {fmt(openingBalance)}</span>
                </div>
              </div>

              {/* Transactions */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Document No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Debit (RM)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Credit (RM)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Balance (RM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {transactions.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No transactions in this period</td></tr>
                    ) : transactions.map((tx: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtDate(tx.date)}</td>
                        <td className="px-4 py-2.5 text-sm font-mono text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">{tx.documentNo}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">{tx.description || '-'}</td>
                        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700 dark:text-gray-300">{tx.debit > 0 ? fmt(tx.debit) : '-'}</td>
                        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700 dark:text-gray-300">{tx.credit > 0 ? fmt(tx.credit) : '-'}</td>
                        <td className="px-4 py-2.5 text-sm text-right tabular-nums font-medium text-gray-900 dark:text-white">{fmt(tx.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Closing Balance */}
              <div className="px-4 py-2 border-t border-gray-200 dark:border-slate-700 bg-blue-50/50 dark:bg-blue-900/10">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Closing Balance</span>
                  <span className="font-bold tabular-nums text-gray-900 dark:text-white">RM {fmt(closingBalance)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
