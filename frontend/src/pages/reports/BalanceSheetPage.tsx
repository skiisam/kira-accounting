import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../services/api';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

const formatCurrency = (amount: number) => {
  if (amount < 0) return `(RM ${Math.abs(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
  return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface AccountNode {
  id: number;
  accountNo: string;
  accountName: string;
  category: string;
  specialType: string | null;
  isParent: boolean;
  balance: number;
  children: AccountNode[];
  depth: number;
}

interface BalanceSheetData {
  asOfDate: string;
  level: number;
  assets: AccountNode[];
  liabilities: AccountNode[];
  equity: AccountNode[];
  currentYearEarnings: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

type ReportFormat = 'this-month' | 'this-quarter' | 'this-year' | 'custom';

function getAsAtDate(format: ReportFormat, customDate: string): string {
  const now = new Date();
  switch (format) {
    case 'this-month':
      return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    case 'this-quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3 + 3;
      return new Date(now.getFullYear(), qMonth, 0).toISOString().split('T')[0];
    }
    case 'this-year':
      return new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
    case 'custom':
      return customDate;
  }
}

function AccountRow({
  node,
  level,
  maxLevel,
  collapsed,
  onToggle,
  withPercent,
  categoryTotal,
  showAmountInParent,
}: {
  node: AccountNode;
  level: number;
  maxLevel: number;
  collapsed: Set<number>;
  onToggle: (id: number) => void;
  withPercent: boolean;
  categoryTotal: number;
  showAmountInParent: boolean;
}) {
  const isCollapsed = collapsed.has(node.id);
  const hasChildren = node.children.length > 0;
  const showChildren = hasChildren && !isCollapsed && level < maxLevel;
  const isNegative = node.balance < 0;
  const percent = categoryTotal !== 0 ? ((node.balance / categoryTotal) * 100).toFixed(1) : '0.0';

  return (
    <>
      <tr
        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
          node.isParent ? 'font-semibold' : ''
        }`}
      >
        <td className="px-4 py-2 text-sm dark:text-gray-200" style={{ paddingLeft: `${level * 24 + 16}px` }}>
          <span className="flex items-center gap-1">
            {hasChildren ? (
              <button
                onClick={() => onToggle(node.id)}
                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {isCollapsed ? (
                  <ChevronRightIcon className="w-4 h-4" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-2">
              {node.accountNo}
            </span>
            {node.accountName}
          </span>
        </td>
        <td
          className={`px-4 py-2 text-sm text-right ${
            isNegative ? 'text-red-600 dark:text-red-400' : 'dark:text-gray-200'
          }`}
        >
          {(!node.isParent || showAmountInParent || !showChildren) && formatCurrency(node.balance)}
        </td>
        {withPercent && (
          <td className="px-4 py-2 text-sm text-right text-gray-500 dark:text-gray-400">
            {(!node.isParent || showAmountInParent || !showChildren) && `${percent}%`}
          </td>
        )}
      </tr>
      {showChildren &&
        node.children.map((child) => (
          <AccountRow
            key={child.id}
            node={child}
            level={level + 1}
            maxLevel={maxLevel}
            collapsed={collapsed}
            onToggle={onToggle}
            withPercent={withPercent}
            categoryTotal={categoryTotal}
            showAmountInParent={showAmountInParent}
          />
        ))}
    </>
  );
}

function CategorySection({
  title,
  nodes,
  total,
  color,
  bgColor,
  maxLevel,
  collapsed,
  onToggle,
  withPercent,
  showAmountInParent,
}: {
  title: string;
  nodes: AccountNode[];
  total: number;
  color: string;
  bgColor: string;
  maxLevel: number;
  collapsed: Set<number>;
  onToggle: (id: number) => void;
  withPercent: boolean;
  showAmountInParent: boolean;
}) {
  const isNegative = total < 0;

  return (
    <>
      <tr className={bgColor}>
        <td
          colSpan={withPercent ? 3 : 2}
          className={`px-4 py-3 text-sm font-bold uppercase tracking-wide ${color}`}
        >
          {title}
        </td>
      </tr>
      {nodes.map((node) => (
        <AccountRow
          key={node.id}
          node={node}
          level={0}
          maxLevel={maxLevel}
          collapsed={collapsed}
          onToggle={onToggle}
          withPercent={withPercent}
          categoryTotal={total}
          showAmountInParent={showAmountInParent}
        />
      ))}
      <tr className={`${bgColor} font-bold border-t border-gray-300 dark:border-gray-600`}>
        <td className={`px-4 py-2 text-sm ${color}`}>Total {title}</td>
        <td
          className={`px-4 py-2 text-sm text-right ${
            isNegative ? 'text-red-600 dark:text-red-400' : color
          }`}
        >
          {formatCurrency(total)}
        </td>
        {withPercent && (
          <td className={`px-4 py-2 text-sm text-right ${color}`}>100.0%</td>
        )}
      </tr>
    </>
  );
}

export default function BalanceSheetPage() {
  const [reportFormat, setReportFormat] = useState<ReportFormat>('this-month');
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showLevel, setShowLevel] = useState(2);
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [withPercent, setWithPercent] = useState(false);
  const [showAmountInParent, setShowAmountInParent] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [generateParams, setGenerateParams] = useState<{
    asAtDate: string;
    level: number;
    showZeroBalance: boolean;
  } | null>(null);

  const asAtDate = useMemo(
    () => getAsAtDate(reportFormat, customDate),
    [reportFormat, customDate]
  );

  const { data, isLoading, isFetching } = useQuery<BalanceSheetData>({
    queryKey: ['balance-sheet', generateParams],
    queryFn: () =>
      get('/reports/gl/balance-sheet', {
        asOfDate: generateParams!.asAtDate,
        level: generateParams!.level,
        showZeroBalance: generateParams!.showZeroBalance,
      }),
    enabled: !!generateParams,
  });

  const handleGenerate = () => {
    setCollapsed(new Set());
    setGenerateParams({ asAtDate, level: showLevel, showZeroBalance });
  };

  const handleToggle = (id: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePrint = () => window.print();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Balance Sheet</h1>

      {/* Filter Section */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Report Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Report Format
              </label>
              <select
                value={reportFormat}
                onChange={(e) => setReportFormat(e.target.value as ReportFormat)}
                className="input w-full"
              >
                <option value="this-month">This Month</option>
                <option value="this-quarter">This Quarter</option>
                <option value="this-year">This Year</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* As At Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                As At Date
              </label>
              <input
                type="date"
                value={reportFormat === 'custom' ? customDate : asAtDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setReportFormat('custom');
                }}
                className="input w-full"
              />
            </div>

            {/* Show Up To Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Show Up To Level
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={showLevel}
                onChange={(e) => setShowLevel(parseInt(e.target.value) || 2)}
                className="input w-full"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-6 mb-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showZeroBalance}
                onChange={(e) => setShowZeroBalance(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Show Zero Balance
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={withPercent}
                onChange={(e) => setWithPercent(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              With Percent
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showAmountInParent}
                onChange={(e) => setShowAmountInParent(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Show Amount In Parent Account
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button onClick={handleGenerate} className="btn btn-primary" disabled={isFetching}>
              {isFetching ? 'Generating...' : 'Generate'}
            </button>
            <button onClick={handlePrint} className="btn btn-secondary" disabled={!data}>
              <PrinterIcon className="w-4 h-4 mr-1 inline" />
              Print
            </button>
            <button className="btn btn-secondary" disabled={!data}>
              <ArrowDownTrayIcon className="w-4 h-4 mr-1 inline" />
              Excel
            </button>
            <button className="btn btn-secondary" disabled={!data}>
              <ArrowDownTrayIcon className="w-4 h-4 mr-1 inline" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Report Display */}
      <div className="card">
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : data ? (
            <div className="overflow-x-auto">
              {/* Report Header */}
              <div className="text-center mb-6 print:mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Balance Sheet</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  As at {new Date(data.asOfDate).toLocaleDateString('en-MY', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {/* Balance verification warning */}
              {!data.isBalanced && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  ⚠️ Balance Sheet is not balanced. Assets ({formatCurrency(data.totalAssets)}) ≠
                  Liabilities + Equity ({formatCurrency(data.totalLiabilitiesAndEquity)})
                </div>
              )}

              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Account
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-40">
                      Amount (RM)
                    </th>
                    {withPercent && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">
                        %
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {/* ASSETS */}
                  <CategorySection
                    title="Assets"
                    nodes={data.assets}
                    total={data.totalAssets}
                    color="text-blue-600 dark:text-blue-400"
                    bgColor="bg-blue-50 dark:bg-blue-900/20"
                    maxLevel={showLevel}
                    collapsed={collapsed}
                    onToggle={handleToggle}
                    withPercent={withPercent}
                    showAmountInParent={showAmountInParent}
                  />

                  {/* Spacer */}
                  <tr>
                    <td colSpan={withPercent ? 3 : 2} className="py-2" />
                  </tr>

                  {/* LIABILITIES */}
                  <CategorySection
                    title="Liabilities"
                    nodes={data.liabilities}
                    total={data.totalLiabilities}
                    color="text-orange-600 dark:text-orange-400"
                    bgColor="bg-orange-50 dark:bg-orange-900/20"
                    maxLevel={showLevel}
                    collapsed={collapsed}
                    onToggle={handleToggle}
                    withPercent={withPercent}
                    showAmountInParent={showAmountInParent}
                  />

                  {/* Spacer */}
                  <tr>
                    <td colSpan={withPercent ? 3 : 2} className="py-2" />
                  </tr>

                  {/* EQUITY */}
                  <CategorySection
                    title="Equity"
                    nodes={data.equity}
                    total={data.totalEquity - data.currentYearEarnings}
                    color="text-purple-600 dark:text-purple-400"
                    bgColor="bg-purple-50 dark:bg-purple-900/20"
                    maxLevel={showLevel}
                    collapsed={collapsed}
                    onToggle={handleToggle}
                    withPercent={withPercent}
                    showAmountInParent={showAmountInParent}
                  />

                  {/* Current Year Earnings */}
                  <tr className="bg-purple-50 dark:bg-purple-900/20">
                    <td className="px-4 py-2 text-sm font-semibold text-purple-600 dark:text-purple-400" style={{ paddingLeft: '40px' }}>
                      Current Year Earnings
                    </td>
                    <td
                      className={`px-4 py-2 text-sm text-right font-semibold ${
                        data.currentYearEarnings < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-purple-600 dark:text-purple-400'
                      }`}
                    >
                      {formatCurrency(data.currentYearEarnings)}
                    </td>
                    {withPercent && <td className="px-4 py-2 text-sm text-right text-gray-500">-</td>}
                  </tr>

                  {/* Total Equity (including current year earnings) */}
                  <tr className="bg-purple-50 dark:bg-purple-900/20 font-bold border-t border-gray-300 dark:border-gray-600">
                    <td className="px-4 py-2 text-sm text-purple-600 dark:text-purple-400">
                      Total Equity
                    </td>
                    <td className={`px-4 py-2 text-sm text-right ${
                      data.totalEquity < 0 ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'
                    }`}>
                      {formatCurrency(data.totalEquity)}
                    </td>
                    {withPercent && <td />}
                  </tr>
                </tbody>
              </table>

              {/* Grand Totals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Total Assets
                  </div>
                  <div className={`text-xl font-bold ${
                    data.totalAssets < 0 ? 'text-red-600' : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    {formatCurrency(data.totalAssets)}
                  </div>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                    Total Liabilities + Equity
                  </div>
                  <div className={`text-xl font-bold ${
                    data.totalLiabilitiesAndEquity < 0
                      ? 'text-red-600'
                      : 'text-orange-700 dark:text-orange-300'
                  }`}>
                    {formatCurrency(data.totalLiabilitiesAndEquity)}
                  </div>
                </div>
              </div>

              {data.isBalanced && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm text-center">
                  ✓ Balance Sheet is balanced: Assets = Liabilities + Equity
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-12">
              Select report parameters and click Generate
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
