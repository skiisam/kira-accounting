import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../services/api';
import {
  DocumentTextIcon,
  CurrencyDollarIcon,
  CubeIcon,
  UsersIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';

const formatCurrency = (amount: number) => {
  return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface ReportRendererProps {
  reportId: string;
  data: any;
}

function ReportRenderer({ reportId, data }: ReportRendererProps) {
  switch (reportId) {
    case 'trial-balance':
      return <TrialBalanceReport data={data} />;
    case 'profit-loss':
      return <ProfitLossReport data={data} />;
    case 'balance-sheet':
      return <BalanceSheetReport data={data} />;
    case 'stock-balance':
      return <StockBalanceReport data={data} />;
    default:
      return <pre className="text-sm">{JSON.stringify(data, null, 2)}</pre>;
  }
}

function TrialBalanceReport({ data }: { data: any }) {
  const { accounts = [], totals = { debit: 0, credit: 0 } } = data || {};
  
  return (
    <div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account No</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {accounts.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No data available</td>
            </tr>
          ) : (
            accounts.map((acc: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm font-mono">{acc.accountNo}</td>
                <td className="px-4 py-2 text-sm">{acc.accountName}</td>
                <td className="px-4 py-2 text-sm">{acc.category}</td>
                <td className="px-4 py-2 text-sm text-right">{acc.debit > 0 ? formatCurrency(acc.debit) : '-'}</td>
                <td className="px-4 py-2 text-sm text-right">{acc.credit > 0 ? formatCurrency(acc.credit) : '-'}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot className="bg-gray-100 font-semibold">
          <tr>
            <td colSpan={3} className="px-4 py-3 text-sm">Total</td>
            <td className="px-4 py-3 text-sm text-right">{formatCurrency(totals.debit)}</td>
            <td className="px-4 py-3 text-sm text-right">{formatCurrency(totals.credit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ProfitLossReport({ data }: { data: any }) {
  const { revenue = [], expenses = [], totalRevenue = 0, totalExpense = 0, netProfit = 0 } = data || {};
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3 text-green-600">Revenue</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="bg-white divide-y divide-gray-200">
            {revenue.map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="px-4 py-2 text-sm font-mono">{item.accountNo}</td>
                <td className="px-4 py-2 text-sm">{item.accountName}</td>
                <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
            <tr className="bg-green-50 font-semibold">
              <td colSpan={2} className="px-4 py-2 text-sm">Total Revenue</td>
              <td className="px-4 py-2 text-sm text-right text-green-600">{formatCurrency(totalRevenue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-3 text-red-600">Expenses</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="px-4 py-2 text-sm font-mono">{item.accountNo}</td>
                <td className="px-4 py-2 text-sm">{item.accountName}</td>
                <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
            <tr className="bg-red-50 font-semibold">
              <td colSpan={2} className="px-4 py-2 text-sm">Total Expenses</td>
              <td className="px-4 py-2 text-sm text-right text-red-600">{formatCurrency(totalExpense)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className={`p-4 rounded-lg ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">Net Profit / (Loss)</span>
          <span className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(netProfit)}
          </span>
        </div>
      </div>
    </div>
  );
}

function BalanceSheetReport({ data }: { data: any }) {
  const { assets = [], liabilities = [], equity = [], totalAssets = 0, totalLiabilities = 0, totalEquity = 0, totalLiabilitiesAndEquity = 0 } = data || {};
  
  const Section = ({ title, items, total, color }: { title: string; items: any[]; total: number; color: string }) => (
    <div>
      <h3 className={`text-lg font-semibold mb-3 ${color}`}>{title}</h3>
      <table className="min-w-full divide-y divide-gray-200">
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item: any, idx: number) => (
            <tr key={idx}>
              <td className="px-4 py-2 text-sm font-mono">{item.accountNo}</td>
              <td className="px-4 py-2 text-sm">{item.accountName}</td>
              <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.balance)}</td>
            </tr>
          ))}
          <tr className="bg-gray-50 font-semibold">
            <td colSpan={2} className="px-4 py-2 text-sm">Total {title}</td>
            <td className="px-4 py-2 text-sm text-right">{formatCurrency(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
  
  return (
    <div className="space-y-6">
      <Section title="Assets" items={assets} total={totalAssets} color="text-blue-600" />
      <Section title="Liabilities" items={liabilities} total={totalLiabilities} color="text-orange-600" />
      <Section title="Equity" items={equity} total={totalEquity} color="text-purple-600" />
      
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="p-4 bg-blue-100 rounded-lg">
          <div className="text-sm text-blue-600">Total Assets</div>
          <div className="text-xl font-bold text-blue-700">{formatCurrency(totalAssets)}</div>
        </div>
        <div className="p-4 bg-orange-100 rounded-lg">
          <div className="text-sm text-orange-600">Total Liabilities + Equity</div>
          <div className="text-xl font-bold text-orange-700">{formatCurrency(totalLiabilitiesAndEquity)}</div>
        </div>
      </div>
    </div>
  );
}

function StockBalanceReport({ data }: { data: any }) {
  const { items = [], totalValue = 0 } = data || {};
  
  return (
    <div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Code</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No stock data available</td>
            </tr>
          ) : (
            items.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm font-mono">{item.productCode}</td>
                <td className="px-4 py-2 text-sm">{item.description}</td>
                <td className="px-4 py-2 text-sm">{item.location}</td>
                <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.unitCost)}</td>
                <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.totalValue)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot className="bg-gray-100 font-semibold">
          <tr>
            <td colSpan={5} className="px-4 py-3 text-sm">Total Stock Value</td>
            <td className="px-4 py-3 text-sm text-right">{formatCurrency(totalValue)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const reportCategories = [
  {
    name: 'General Ledger',
    icon: DocumentTextIcon,
    reports: [
      { id: 'trial-balance', name: 'Trial Balance', endpoint: '/reports/gl/trial-balance' },
      { id: 'profit-loss', name: 'Profit & Loss', endpoint: '/reports/gl/profit-loss' },
      { id: 'balance-sheet', name: 'Balance Sheet', endpoint: '/reports/gl/balance-sheet' },
      { id: 'ledger-listing', name: 'Ledger Listing', endpoint: '/reports/gl/ledger-listing' },
    ],
  },
  {
    name: 'Accounts Receivable',
    icon: UsersIcon,
    reports: [
      { id: 'customer-aging', name: 'Customer Aging', endpoint: '/reports/ar/customer-aging' },
      { id: 'customer-statement', name: 'Customer Statement', endpoint: '/reports/ar/customer-statement' },
      { id: 'ar-invoice-listing', name: 'Invoice Listing', endpoint: '/reports/ar/invoice-listing' },
    ],
  },
  {
    name: 'Accounts Payable',
    icon: BuildingStorefrontIcon,
    reports: [
      { id: 'vendor-aging', name: 'Vendor Aging', endpoint: '/reports/ap/vendor-aging' },
      { id: 'vendor-statement', name: 'Vendor Statement', endpoint: '/reports/ap/vendor-statement' },
      { id: 'ap-invoice-listing', name: 'Invoice Listing', endpoint: '/reports/ap/invoice-listing' },
    ],
  },
  {
    name: 'Sales',
    icon: CurrencyDollarIcon,
    reports: [
      { id: 'sales-listing', name: 'Sales Listing', endpoint: '/reports/sales/sales-listing' },
      { id: 'sales-by-customer', name: 'Sales by Customer', endpoint: '/reports/sales/sales-by-customer' },
      { id: 'sales-by-product', name: 'Sales by Product', endpoint: '/reports/sales/sales-by-product' },
    ],
  },
  {
    name: 'Stock',
    icon: CubeIcon,
    reports: [
      { id: 'stock-balance', name: 'Stock Balance', endpoint: '/reports/stock/stock-balance' },
      { id: 'stock-card', name: 'Stock Card', endpoint: '/reports/stock/stock-card' },
      { id: 'stock-valuation', name: 'Stock Valuation', endpoint: '/reports/stock/stock-valuation' },
      { id: 'reorder-advisory', name: 'Reorder Advisory', endpoint: '/reports/stock/reorder-advisory' },
    ],
  },
];

export default function ReportsPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Find selected report
  const selectedReport = reportCategories
    .flatMap(c => c.reports)
    .find(r => r.id === reportId);

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['report', reportId, dateFrom, dateTo],
    queryFn: () => get(selectedReport!.endpoint, { dateFrom, dateTo }),
    enabled: !!selectedReport,
  });

  if (!reportId) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportCategories.map((category) => (
            <div key={category.name} className="card">
              <div className="card-header flex items-center gap-3">
                <category.icon className="w-6 h-6 text-primary-600" />
                <h2 className="text-lg font-semibold">{category.name}</h2>
              </div>
              <div className="card-body">
                <ul className="space-y-2">
                  {category.reports.map((report) => (
                    <li key={report.id}>
                      <button
                        onClick={() => navigate(`/reports/${report.id}`)}
                        className="text-primary-600 hover:text-primary-800 hover:underline text-left w-full"
                      >
                        {report.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/reports')} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
            ← Back to Reports
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{selectedReport?.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input w-auto"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input w-auto"
          />
          <button onClick={() => refetch()} className="btn btn-primary">
            Generate
          </button>
          <button className="btn btn-secondary">Export</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : reportData ? (
            <div className="overflow-x-auto">
              <ReportRenderer reportId={reportId} data={reportData} />
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">Select date range and click Generate</p>
          )}
        </div>
      </div>
    </div>
  );
}
