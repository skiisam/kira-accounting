import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../services/api';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PrinterIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const formatCurrency = (amount: number) =>
  amount < 0
    ? `(RM ${Math.abs(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
    : `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatPercent = (amount: number, totalRevenue: number) => {
  if (totalRevenue === 0) return '-';
  return `${((amount / totalRevenue) * 100).toFixed(1)}%`;
};

type ReportFormat = 'thisMonth' | 'thisQuarter' | 'thisYear' | 'lastMonth' | 'lastQuarter' | 'lastYear' | 'custom';

const reportFormatLabels: Record<ReportFormat, string> = {
  thisMonth: 'This Month',
  thisQuarter: 'This Quarter',
  thisYear: 'This Year',
  lastMonth: 'Last Month',
  lastQuarter: 'Last Quarter',
  lastYear: 'Last Year',
  custom: 'Custom Range',
};

function getDateRange(format: ReportFormat, customFrom: string, customTo: string): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3);

  switch (format) {
    case 'thisMonth':
      return { dateFrom: new Date(year, month, 1).toISOString().slice(0, 10), dateTo: new Date(year, month + 1, 0).toISOString().slice(0, 10) };
    case 'lastMonth':
      return { dateFrom: new Date(year, month - 1, 1).toISOString().slice(0, 10), dateTo: new Date(year, month, 0).toISOString().slice(0, 10) };
    case 'thisQuarter':
      return { dateFrom: new Date(year, quarter * 3, 1).toISOString().slice(0, 10), dateTo: new Date(year, quarter * 3 + 3, 0).toISOString().slice(0, 10) };
    case 'lastQuarter':
      return { dateFrom: new Date(year, (quarter - 1) * 3, 1).toISOString().slice(0, 10), dateTo: new Date(year, (quarter - 1) * 3 + 3, 0).toISOString().slice(0, 10) };
    case 'thisYear':
      return { dateFrom: new Date(year, 0, 1).toISOString().slice(0, 10), dateTo: new Date(year, 11, 31).toISOString().slice(0, 10) };
    case 'lastYear':
      return { dateFrom: new Date(year - 1, 0, 1).toISOString().slice(0, 10), dateTo: new Date(year - 1, 11, 31).toISOString().slice(0, 10) };
    case 'custom':
      return { dateFrom: customFrom, dateTo: customTo };
  }
}

interface PnLAccount {
  accountNo: string;
  accountName: string;
  category: string;
  amount: number;
}

interface PnLData {
  dateFrom: string;
  dateTo: string;
  revenue: PnLAccount[];
  expenses: PnLAccount[];
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
}

interface GroupRow {
  label: string;
  accounts: PnLAccount[];
  total: number;
  type: 'section';
}

interface SummaryRow {
  label: string;
  amount: number;
  type: 'subtotal' | 'grandtotal';
}

type ReportRow = GroupRow | SummaryRow;

export default function ProfitAndLossPage() {
  const [reportFormat, setReportFormat] = useState<ReportFormat>('thisYear');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [withPercent, setWithPercent] = useState(false);
  const [_showParentAmount, setShowParentAmount] = useState(false);
  const [level, setLevel] = useState(2);
  const [queryParams, setQueryParams] = useState<{ dateFrom: string; dateTo: string } | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const { data: reportData, isLoading, isFetching } = useQuery<PnLData>({
    queryKey: ['profit-loss', queryParams],
    queryFn: () => get('/reports/gl/profit-loss', queryParams!),
    enabled: !!queryParams,
  });

  const handleGenerate = () => {
    const range = getDateRange(reportFormat, customFrom, customTo);
    setQueryParams(range);
  };

  const handlePrint = () => window.print();

  const toggleSection = (label: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const rows = useMemo((): ReportRow[] => {
    if (!reportData) return [];
    const { revenue, expenses, totalRevenue, netProfit } = reportData;

    const filterZero = (accs: PnLAccount[]) =>
      showZeroBalance ? accs : accs.filter((a) => a.amount !== 0);

    const cogs = filterZero(expenses.filter((e) => e.accountNo.startsWith('5')));
    const opex = filterZero(expenses.filter((e) => !e.accountNo.startsWith('5')));
    const cogsTotal = cogs.reduce((s, a) => s + a.amount, 0);
    const opexTotal = opex.reduce((s, a) => s + a.amount, 0);
    const grossProfit = totalRevenue - cogsTotal;

    const result: ReportRow[] = [
      { label: 'REVENUE', accounts: filterZero(revenue), total: totalRevenue, type: 'section' },
      { label: 'Total Revenue', amount: totalRevenue, type: 'subtotal' },
    ];

    if (cogs.length > 0) {
      result.push(
        { label: 'COST OF SALES', accounts: cogs, total: cogsTotal, type: 'section' },
        { label: 'Total Cost of Sales', amount: cogsTotal, type: 'subtotal' },
        { label: 'GROSS PROFIT', amount: grossProfit, type: 'subtotal' },
      );
    }

    if (opex.length > 0) {
      result.push(
        { label: 'OPERATING EXPENSES', accounts: opex, total: opexTotal, type: 'section' },
        { label: 'Total Operating Expenses', amount: opexTotal, type: 'subtotal' },
      );
    }

    result.push({ label: 'NET PROFIT / (LOSS)', amount: netProfit, type: 'grandtotal' });
    return result;
  }, [reportData, showZeroBalance]);

  const totalRevenue = reportData?.totalRevenue ?? 0;

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profit &amp; Loss Statement</h1>
      </div>

      {/* Filter Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report Format</label>
            <select
              value={reportFormat}
              onChange={(e) => setReportFormat(e.target.value as ReportFormat)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {Object.entries(reportFormatLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {reportFormat === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Show Up To Level</label>
            <input
              type="number"
              min={1}
              max={5}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={showZeroBalance} onChange={(e) => setShowZeroBalance(e.target.checked)} className="rounded border-gray-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500" />
            Show Zero Balance
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={withPercent} onChange={(e) => setWithPercent(e.target.checked)} className="rounded border-gray-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500" />
            With Percent
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={_showParentAmount} onChange={(e) => setShowParentAmount(e.target.checked)} className="rounded border-gray-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500" />
            Show Amount In Parent Account
          </label>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handleGenerate}
            disabled={reportFormat === 'custom' && (!customFrom || !customTo)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isFetching ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
            Generate
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <PrinterIcon className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : !reportData ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            Select a report format and click <span className="font-semibold text-green-600">Generate</span> to view the Profit &amp; Loss statement.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 print:text-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Profit &amp; Loss Statement</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {reportData.dateFrom && reportData.dateTo
                  ? `${new Date(reportData.dateFrom).toLocaleDateString('en-MY')} – ${new Date(reportData.dateTo).toLocaleDateString('en-MY')}`
                  : ''}
              </p>
            </div>

            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8"></th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Acc. No.</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-44">Amount (RM)</th>
                  {withPercent && (
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">%</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {rows.map((row, idx) => {
                  if (row.type === 'section') {
                    const group = row as GroupRow;
                    const isCollapsed = collapsedSections.has(group.label);
                    return (
                      <SectionBlock
                        key={idx}
                        group={group}
                        isCollapsed={isCollapsed}
                        onToggle={() => toggleSection(group.label)}
                        withPercent={withPercent}
                        totalRevenue={totalRevenue}
                      />
                    );
                  }
                  const summary = row as SummaryRow;
                  const isGrand = summary.type === 'grandtotal';
                  return (
                    <tr
                      key={idx}
                      className={
                        isGrand
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-t-2 border-indigo-200 dark:border-indigo-700'
                          : 'bg-gray-50 dark:bg-slate-700/30'
                      }
                    >
                      <td className="px-6 py-2" />
                      <td
                        colSpan={2}
                        className={`px-2 py-2 text-sm font-bold ${
                          isGrand ? 'text-indigo-900 dark:text-indigo-200 text-base' : 'text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {summary.label}
                      </td>
                      <td
                        className={`px-6 py-2 text-right text-sm font-bold ${
                          summary.amount < 0 ? 'text-red-600 dark:text-red-400' : isGrand ? 'text-indigo-900 dark:text-indigo-200 text-base' : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {formatCurrency(summary.amount)}
                      </td>
                      {withPercent && (
                        <td className="px-6 py-2 text-right text-sm font-bold text-gray-600 dark:text-gray-400">
                          {formatPercent(summary.amount, totalRevenue)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionBlock({
  group,
  isCollapsed,
  onToggle,
  withPercent,
  totalRevenue,
}: {
  group: GroupRow;
  isCollapsed: boolean;
  onToggle: () => void;
  withPercent: boolean;
  totalRevenue: number;
}) {
  return (
    <>
      <tr
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 select-none"
        onClick={onToggle}
      >
        <td className="px-6 py-2 text-gray-500 dark:text-gray-400">
          {isCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </td>
        <td colSpan={2} className="px-2 py-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
          {group.label}
        </td>
        <td className="px-6 py-2 text-right text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(group.total)}
        </td>
        {withPercent && (
          <td className="px-6 py-2 text-right text-sm font-semibold text-gray-600 dark:text-gray-400">
            {formatPercent(group.total, totalRevenue)}
          </td>
        )}
      </tr>
      {!isCollapsed &&
        group.accounts.map((acc, i) => (
          <tr key={`${group.label}-${i}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
            <td className="px-6 py-1.5" />
            <td className="px-2 py-1.5 pl-8 text-sm text-gray-700 dark:text-gray-300">{acc.accountName}</td>
            <td className="px-4 py-1.5 text-sm font-mono text-gray-500 dark:text-gray-400">{acc.accountNo}</td>
            <td className={`px-6 py-1.5 text-right text-sm ${acc.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {formatCurrency(acc.amount)}
            </td>
            {withPercent && (
              <td className="px-6 py-1.5 text-right text-sm text-gray-500 dark:text-gray-400">
                {formatPercent(acc.amount, totalRevenue)}
              </td>
            )}
          </tr>
        ))}
    </>
  );
}
