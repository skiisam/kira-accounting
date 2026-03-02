import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../services/api';
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const fmt = (n: number) => n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = new Date();
const fy1 = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
const todayStr = today.toISOString().split('T')[0];

export default function TrialBalancePage() {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState(fy1);
  const [dateTo, setDateTo] = useState(todayStr);
  const [showZero, setShowZero] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trial-balance', dateFrom, dateTo, showZero],
    queryFn: () => get<any>('/reports/gl/trial-balance', { dateFrom, dateTo, showZeroBalance: String(showZero) }),
  });

  const accounts: any[] = data?.accounts || [];
  const totals = data?.totals || { debit: 0, credit: 0 };
  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  const grouped = accounts.reduce<Record<string, any[]>>((acc, row) => {
    const k = row.category || 'OTHER';
    (acc[k] ??= []).push(row);
    return acc;
  }, {});
  const cats = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].filter((c) => grouped[c]);

  const exportCSV = () => {
    const hdr = ['Account No', 'Account Name', 'Type', 'Debit', 'Credit'];
    const rows = accounts.map((a: any) => [a.accountNo, a.accountName, a.accountType, a.debit, a.credit]);
    rows.push(['', '', 'TOTAL', totals.debit, totals.credit]);
    const csv = [hdr, ...rows].map((r) => r.map((c: any) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `trial-balance-${dateTo}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trial Balance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View account balances for the selected period</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn btn-secondary text-sm flex items-center gap-1.5"><ArrowDownTrayIcon className="w-4 h-4" /> Export</button>
          <button onClick={() => window.print()} className="btn btn-secondary text-sm flex items-center gap-1.5"><PrinterIcon className="w-4 h-4" /> Print</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date From</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input text-sm" /></div>
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date To</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input text-sm" /></div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={showZero} onChange={e => setShowZero(e.target.checked)} className="rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500" />
            Show Zero Balance
          </label>
          <button onClick={() => refetch()} className="btn btn-primary text-sm flex items-center gap-1.5"><ArrowPathIcon className="w-4 h-4" /> Generate</button>
        </div>
      </div>

      {!isLoading && accounts.length > 0 && !isBalanced && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400">Trial Balance Out of Balance!</p>
            <p className="text-sm text-red-600 dark:text-red-300">Difference: RM {fmt(Math.abs(totals.debit - totals.credit))}</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">{t('common.noData')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Account No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Account Name</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Debit (RM)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Credit (RM)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {cats.map((cat) => {
                  const items = grouped[cat];
                  const cd = items.reduce((s: number, r: any) => s + r.debit, 0);
                  const cc = items.reduce((s: number, r: any) => s + r.credit, 0);
                  return (
                    <Fragment key={cat}>
                      <tr className="bg-gray-100/50 dark:bg-slate-700/30"><td colSpan={4} className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{cat}</td></tr>
                      {items.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="px-4 py-2.5 text-sm font-mono text-gray-700 dark:text-gray-300">{row.accountNo}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-white">{row.accountName}</td>
                          <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700 dark:text-gray-300">{row.debit > 0 ? fmt(row.debit) : '-'}</td>
                          <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700 dark:text-gray-300">{row.credit > 0 ? fmt(row.credit) : '-'}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 dark:bg-slate-700/20">
                        <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-right">Subtotal - {cat}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-right tabular-nums text-gray-800 dark:text-gray-200">{cd > 0 ? fmt(cd) : '-'}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-right tabular-nums text-gray-800 dark:text-gray-200">{cc > 0 ? fmt(cc) : '-'}</td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={`font-bold text-base ${isBalanced ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  <td colSpan={2} className="px-4 py-3 text-right text-gray-900 dark:text-white">Grand Total</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-white">{fmt(totals.debit)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-white">{fmt(totals.credit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
