import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../services/api';
import { ArrowPathIcon, PrinterIcon } from '@heroicons/react/24/outline';

const fmt = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface AgingRow {
  customerCode: string;
  customerName: string;
  current: number;
  period1: number;
  period2: number;
  period3: number;
  over: number;
  total: number;
}

interface AgingData {
  asAtDate: string;
  period: number;
  rows: AgingRow[];
  totals: { current: number; period1: number; period2: number; period3: number; over: number; total: number };
}

export default function DebtorAgingPage() {
  const [asAtDate, setAsAtDate] = useState(new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState(30);
  const [queryParams, setQueryParams] = useState<Record<string, string> | null>(null);

  const { data, isLoading, isFetching } = useQuery<AgingData>({
    queryKey: ['debtor-aging', queryParams],
    queryFn: () => get('/reports/ar/customer-aging', queryParams!),
    enabled: !!queryParams,
  });

  const handleGenerate = () => setQueryParams({ asAtDate, period: String(period) });

  const chartData = useMemo(() => {
    if (!data) return null;
    const { totals: t } = data;
    const max = Math.max(t.current, t.period1, t.period2, t.period3, t.over, 1);
    return [
      { label: 'Current', value: t.current, color: 'bg-emerald-500', pct: (t.current / max) * 100 },
      { label: `1-${period}`, value: t.period1, color: 'bg-yellow-500', pct: (t.period1 / max) * 100 },
      { label: `${period + 1}-${period * 2}`, value: t.period2, color: 'bg-orange-500', pct: (t.period2 / max) * 100 },
      { label: `${period * 2 + 1}-${period * 3}`, value: t.period3, color: 'bg-red-500', pct: (t.period3 / max) * 100 },
      { label: `>${period * 3}`, value: t.over, color: 'bg-red-700', pct: (t.over / max) * 100 },
    ];
  }, [data, period]);

  const agingColor = (days: number) => {
    if (days === 0) return '';
    if (days <= 1) return 'text-yellow-600 dark:text-yellow-400';
    if (days <= 2) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-6 print:space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Debtor Aging</h1>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">As At Date</label>
            <input type="date" value={asAtDate} onChange={(e) => setAsAtDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aging Period (Days)</label>
            <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500">
              <option value={30}>30 Days</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days</option>
              <option value={120}>120 Days</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <button onClick={handleGenerate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-indigo-500/25">
              {isFetching ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null} Generate
            </button>
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
              <PrinterIcon className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Aging Distribution</h3>
          <div className="flex items-end gap-3 h-32">
            {chartData.map((bar) => (
              <div key={bar.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{fmt(bar.value)}</span>
                <div className="w-full rounded-t-lg transition-all duration-500" style={{ height: `${Math.max(bar.pct, 4)}%` }}>
                  <div className={`w-full h-full ${bar.color} rounded-t-lg opacity-80`} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
        ) : !data ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">Click <span className="font-semibold text-indigo-600">Generate</span> to view debtor aging.</div>
        ) : data.rows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No outstanding debtor balances found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-28">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Customer Name</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-32">Current</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-32">1-{period}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-32">{period+1}-{period*2}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-32">{period*2+1}-{period*3}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-32">Over {period*3}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-36">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {data.rows.map((row) => (
                  <tr key={row.customerCode} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2 text-sm font-mono text-gray-600 dark:text-gray-400">{row.customerCode}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{row.customerName}</td>
                    <td className="px-4 py-2 text-sm text-right text-emerald-600 dark:text-emerald-400">{row.current ? fmt(row.current) : '-'}</td>
                    <td className={`px-4 py-2 text-sm text-right ${agingColor(1)}`}>{row.period1 ? fmt(row.period1) : '-'}</td>
                    <td className={`px-4 py-2 text-sm text-right ${agingColor(2)}`}>{row.period2 ? fmt(row.period2) : '-'}</td>
                    <td className={`px-4 py-2 text-sm text-right ${agingColor(3)}`}>{row.period3 ? fmt(row.period3) : '-'}</td>
                    <td className={`px-4 py-2 text-sm text-right ${agingColor(4)}`}>{row.over ? fmt(row.over) : '-'}</td>
                    <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900 dark:text-white">{fmt(row.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 font-bold text-sm">
                  <td colSpan={2} className="px-4 py-3 text-indigo-900 dark:text-indigo-200">Total</td>
                  <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-300">{fmt(data.totals.current)}</td>
                  <td className="px-4 py-3 text-right text-yellow-700 dark:text-yellow-300">{fmt(data.totals.period1)}</td>
                  <td className="px-4 py-3 text-right text-orange-700 dark:text-orange-300">{fmt(data.totals.period2)}</td>
                  <td className="px-4 py-3 text-right text-red-700 dark:text-red-300">{fmt(data.totals.period3)}</td>
                  <td className="px-4 py-3 text-right text-red-800 dark:text-red-200">{fmt(data.totals.over)}</td>
                  <td className="px-4 py-3 text-right text-indigo-900 dark:text-indigo-200">{fmt(data.totals.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
