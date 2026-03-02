import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../services/api';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PrinterIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

const formatNumber = (n: number) => n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatQty = (n: number) => n.toLocaleString('en-MY', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const formatDate = (d: string | Date) => new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });

const DOC_TYPE_COLORS: Record<string, string> = {
  Sales: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Purchase: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Adjustment: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Transfer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Stock: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

interface Product { id: number; code: string; description: string; }
interface Location { id: number; code: string; name: string; }

interface StockCardData {
  product: { id: number; code: string; description: string; uom: string; currentBalance: number; averageCost: number };
  dateFrom: string;
  dateTo: string;
  openingBalance: number;
  closingBalance: number;
  transactions: Array<{
    date: string;
    documentNo: string;
    documentType: string;
    description: string;
    qtyIn: number;
    qtyOut: number;
    balance: number;
    unitCost: number;
    totalValue: number;
  }>;
}

export default function StockCardPage() {
  const [productId, setProductId] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [locationId, setLocationId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [queryParams, setQueryParams] = useState<Record<string, any> | null>(null);

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products-list'],
    queryFn: () => get('/products', { pageSize: 500 }).then((r: any) => r.items || r),
    staleTime: 60000,
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ['locations-list'],
    queryFn: () => get('/settings/locations').then((r: any) => Array.isArray(r) ? r : r.items || []),
    staleTime: 60000,
  });

  const filteredProducts = useMemo(() => {
    if (!products || !productSearch) return products || [];
    const q = productSearch.toLowerCase();
    return products.filter(p => p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }, [products, productSearch]);

  const selectedProduct = products?.find(p => p.id === productId);

  const { data: reportData, isLoading, isFetching } = useQuery<StockCardData>({
    queryKey: ['stock-card', queryParams],
    queryFn: () => get('/reports/stock/stock-card', queryParams!),
    enabled: !!queryParams,
  });

  const handleGenerate = () => {
    if (!productId) return;
    const params: Record<string, any> = { productId, dateFrom, dateTo };
    if (locationId) params.locationId = locationId;
    setQueryParams(params);
  };

  // Mini sparkline data
  const sparklinePoints = useMemo(() => {
    if (!reportData?.transactions.length) return '';
    const txns = reportData.transactions;
    const maxQty = Math.max(...txns.map(t => t.balance), reportData.openingBalance);
    const minQty = Math.min(...txns.map(t => t.balance), reportData.openingBalance);
    const range = maxQty - minQty || 1;
    const w = 200, h = 40;
    const points: string[] = [];
    const allBalances = [reportData.openingBalance, ...txns.map(t => t.balance)];
    allBalances.forEach((b, i) => {
      const x = (i / (allBalances.length - 1)) * w;
      const y = h - ((b - minQty) / range) * h;
      points.push(`${x},${y}`);
    });
    return points.join(' ');
  }, [reportData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Card</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track product movement history and running balance</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Product Selector */}
          <div className="relative lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search product code or name..."
                value={selectedProduct ? `${selectedProduct.code} - ${selectedProduct.description}` : productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setProductId(null); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            {showProductDropdown && filteredProducts.length > 0 && !productId && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredProducts.slice(0, 20).map(p => (
                  <button key={p.id} onClick={() => { setProductId(p.id); setProductSearch(''); setShowProductDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-900 dark:text-white">
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-2">{p.code}</span>
                    {p.description}
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

        <div className="flex items-center gap-4 mt-4">
          {locations && locations.length > 0 && (
            <div className="w-48">
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
                <option value="">All Locations</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}
          <button onClick={handleGenerate} disabled={!productId}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all shadow-sm">
            {isFetching ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CubeIcon className="w-4 h-4" />}
            Generate
          </button>
          {reportData && (
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
              <PrinterIcon className="w-4 h-4" /> Print
            </button>
          )}
        </div>
      </div>

      {/* Product Info Card */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product Code</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white font-mono mt-1">{reportData.product.code}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 md:col-span-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{reportData.product.description}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">UOM</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{reportData.product.uom}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-sm p-4 text-white">
            <p className="text-xs uppercase tracking-wider opacity-80">Current Balance</p>
            <p className="text-2xl font-bold mt-1">{formatQty(reportData.product.currentBalance)}</p>
          </div>
        </div>
      )}

      {/* Mini Chart */}
      {reportData && sparklinePoints && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Quantity Trend</p>
          <svg viewBox="0 0 200 40" className="w-full h-12" preserveAspectRatio="none">
            <polyline points={sparklinePoints} fill="none" stroke="url(#grad)" strokeWidth="1.5" strokeLinejoin="round" />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#0d9488" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}

      {/* Transaction Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : !reportData ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <CubeIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
            Select a product and click <span className="font-semibold text-emerald-600">Generate</span> to view the stock card.
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
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Qty In</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Qty Out</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Balance</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Unit Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {/* Opening Balance */}
                <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white" colSpan={6}>Opening Balance</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-right text-gray-900 dark:text-white">{formatQty(reportData.openingBalance)}</td>
                  <td className="px-4 py-2.5" colSpan={2}></td>
                </tr>
                {reportData.transactions.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-primary-600 dark:text-primary-400 cursor-pointer hover:underline">{t.documentNo}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${DOC_TYPE_COLORS[t.documentType] || DOC_TYPE_COLORS.Stock}`}>
                        {t.documentType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{t.description}</td>
                    <td className="px-4 py-2.5 text-sm text-right">
                      {t.qtyIn > 0 && <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1"><ArrowTrendingUpIcon className="w-3 h-3" />{formatQty(t.qtyIn)}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right">
                      {t.qtyOut > 0 && <span className="text-red-600 dark:text-red-400 flex items-center justify-end gap-1"><ArrowTrendingDownIcon className="w-3 h-3" />{formatQty(t.qtyOut)}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right font-medium text-gray-900 dark:text-white">{formatQty(t.balance)}</td>
                    <td className="px-4 py-2.5 text-sm text-right text-gray-600 dark:text-gray-300">{formatNumber(t.unitCost)}</td>
                    <td className="px-4 py-2.5 text-sm text-right text-gray-600 dark:text-gray-300">{formatNumber(t.totalValue)}</td>
                  </tr>
                ))}
                {/* Closing Balance */}
                <tr className="bg-emerald-50/50 dark:bg-emerald-900/10 border-t-2 border-emerald-200 dark:border-emerald-800">
                  <td className="px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white" colSpan={6}>Closing Balance</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-right text-emerald-700 dark:text-emerald-300">{formatQty(reportData.closingBalance)}</td>
                  <td className="px-4 py-2.5" colSpan={2}></td>
                </tr>
              </tbody>
            </table>
            {reportData.transactions.length === 0 && (
              <p className="text-center py-8 text-gray-400 text-sm">No transactions found for this period.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
