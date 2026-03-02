import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../services/api';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PrinterIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

const formatCurrency = (amount: number) =>
  amount < 0
    ? `(RM ${Math.abs(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
    : `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface JournalDetail {
  lineNo: number;
  accountNo: string;
  accountName: string;
  description: string | null;
  debit: number;
  credit: number;
}

interface JournalItem {
  id: number;
  journalNo: string;
  journalDate: string;
  description: string | null;
  reference: string | null;
  sourceType: string | null;
  sourceNo: string | null;
  journalType: { code: string; name: string } | null;
  totalDebit: number;
  totalCredit: number;
  details: JournalDetail[];
}

interface JournalData {
  dateFrom: string;
  dateTo: string;
  journalTypes: { code: string; name: string }[];
  journals: JournalItem[];
}

export default function JournalTransactionPage() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(now.toISOString().slice(0, 10));
  const [journalType, setJournalType] = useState('all');
  const [search, setSearch] = useState('');
  const [queryParams, setQueryParams] = useState<Record<string, string> | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const { data: reportData, isLoading, isFetching } = useQuery<JournalData>({
    queryKey: ['journal-transactions', queryParams],
    queryFn: () => get('/reports/gl/journal-listing', queryParams!),
    enabled: !!queryParams,
  });

  const handleGenerate = () => {
    const params: Record<string, string> = { dateFrom, dateTo };
    if (journalType !== 'all') params.type = journalType;
    if (search.trim()) params.search = search.trim();
    setQueryParams(params);
  };

  const toggleCollapse = (id: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const journals = reportData?.journals || [];
  const grandTotalDebit = useMemo(() => journals.reduce((s, j) => s + j.totalDebit, 0), [journals]);
  const grandTotalCredit = useMemo(() => journals.reduce((s, j) => s + j.totalCredit, 0), [journals]);

  return (
    <div className="space-y-6 print:space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journal of Transaction</h1>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Journal Type</label>
            <select value={journalType} onChange={(e) => setJournalType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500">
              <option value="all">All Types</option>
              {(reportData?.journalTypes || []).map((jt) => (
                <option key={jt.code} value={jt.code}>{jt.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Journal No, Description..."
                className="w-full pl-9 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-indigo-500/25">
            {isFetching ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
            Generate
          </button>
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            <PrinterIcon className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Report */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
        ) : !reportData ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            Click <span className="font-semibold text-indigo-600">Generate</span> to view journal transactions.
          </div>
        ) : journals.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No journal entries found for the selected criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Journal of Transaction</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(reportData.dateFrom).toLocaleDateString('en-MY')} – {new Date(reportData.dateTo).toLocaleDateString('en-MY')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{journals.length} journal entries</p>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {journals.map((j) => {
                const isCollapsed = collapsed.has(j.id);
                return (
                  <div key={j.id} className="group">
                    {/* Journal header */}
                    <div
                      className="flex items-center gap-4 px-6 py-3 cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors"
                      onClick={() => toggleCollapse(j.id)}
                    >
                      {isCollapsed ? <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">{j.journalNo}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(j.journalDate).toLocaleDateString('en-MY')}</span>
                          {j.journalType && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium">
                              {j.journalType.name}
                            </span>
                          )}
                          {j.sourceNo && <span className="text-xs text-gray-400">Ref: {j.sourceNo}</span>}
                        </div>
                        {j.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">{j.description}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(j.totalDebit)}</p>
                      </div>
                    </div>

                    {/* Journal details */}
                    {!isCollapsed && (
                      <div className="bg-gray-50/50 dark:bg-slate-700/20 px-6 pb-3">
                        <table className="min-w-full">
                          <thead>
                            <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              <th className="py-2 text-left pl-8 w-28">Acc. No</th>
                              <th className="py-2 text-left">Account Name</th>
                              <th className="py-2 text-left">Description</th>
                              <th className="py-2 text-right w-36">Debit (RM)</th>
                              <th className="py-2 text-right w-36 pr-2">Credit (RM)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-slate-700/30">
                            {j.details.map((d, i) => (
                              <tr key={i} className="hover:bg-white/50 dark:hover:bg-slate-700/30">
                                <td className="py-1.5 pl-8 text-sm font-mono text-gray-500 dark:text-gray-400">{d.accountNo}</td>
                                <td className="py-1.5 text-sm text-gray-700 dark:text-gray-300">{d.accountName}</td>
                                <td className="py-1.5 text-sm text-gray-500 dark:text-gray-400">{d.description || '-'}</td>
                                <td className="py-1.5 text-right text-sm text-gray-900 dark:text-gray-100">{d.debit ? formatCurrency(d.debit) : '-'}</td>
                                <td className="py-1.5 text-right text-sm text-gray-900 dark:text-gray-100 pr-2">{d.credit ? formatCurrency(d.credit) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-gray-200 dark:border-slate-600 font-semibold text-sm">
                              <td colSpan={3} className="py-2 pl-8 text-gray-700 dark:text-gray-300">Subtotal</td>
                              <td className="py-2 text-right text-gray-900 dark:text-white">{formatCurrency(j.totalDebit)}</td>
                              <td className="py-2 text-right text-gray-900 dark:text-white pr-2">{formatCurrency(j.totalCredit)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grand Total */}
            <div className="border-t-2 border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-6 py-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-indigo-900 dark:text-indigo-200">Grand Total</span>
                <div className="flex gap-12">
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Debit</p>
                    <p className="text-base font-bold text-indigo-900 dark:text-indigo-200">{formatCurrency(grandTotalDebit)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Credit</p>
                    <p className="text-base font-bold text-indigo-900 dark:text-indigo-200">{formatCurrency(grandTotalCredit)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
