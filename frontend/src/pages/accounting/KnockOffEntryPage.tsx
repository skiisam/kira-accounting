import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '../../services/api';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const fmt = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface OutstandingDoc {
  documentType: string;
  documentId: number;
  documentNo: string;
  documentDate: string;
  documentAmount: number;
  outstandingAmount: number;
  selected?: boolean;
  knockOffAmount?: number;
}

interface KnockOffItem {
  id: number;
  entryNo: string;
  entryDate: string;
  entryType: string;
  customerId: number | null;
  vendorId: number | null;
  description: string | null;
  totalAmount: number;
  status: string;
  details: any[];
}

export default function KnockOffEntryPage() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<'all' | 'AR' | 'AP'>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formType, setFormType] = useState<'AR' | 'AP'>('AR');
  const [entityId, setEntityId] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [debitItems, setDebitItems] = useState<OutstandingDoc[]>([]);
  const [creditItems, setCreditItems] = useState<OutstandingDoc[]>([]);

  const queryParams: Record<string, string> = { page: String(page), pageSize: '20' };
  if (filterType !== 'all') queryParams.entryType = filterType;
  if (search.trim()) queryParams.search = search.trim();
  if (dateFrom) queryParams.dateFrom = dateFrom;
  if (dateTo) queryParams.dateTo = dateTo;

  const { data, isLoading } = useQuery<{ items: KnockOffItem[]; total: number }>({
    queryKey: ['knockoff', queryParams],
    queryFn: () => get('/knockoff', queryParams),
  });

  // Customers/Vendors for selection
  const { data: customers } = useQuery<any>({
    queryKey: ['customers-list'],
    queryFn: () => get('/customers', { pageSize: '500' }),
    enabled: showForm && formType === 'AR',
  });
  const { data: vendors } = useQuery<any>({
    queryKey: ['vendors-list'],
    queryFn: () => get('/vendors', { pageSize: '500' }),
    enabled: showForm && formType === 'AP',
  });

  // Fetch outstanding when entity selected
  const { refetch: fetchOutstanding } = useQuery<{ debitItems: OutstandingDoc[]; creditItems: OutstandingDoc[] }>({
    queryKey: ['knockoff-outstanding', formType, entityId],
    queryFn: () => get('/knockoff/outstanding', { entryType: formType, entityId }),
    enabled: false,
  });

  useEffect(() => {
    if (entityId) {
      fetchOutstanding().then(result => {
        if (result.data) {
          setDebitItems(result.data.debitItems.map(d => ({ ...d, selected: false, knockOffAmount: 0 })));
          setCreditItems(result.data.creditItems.map(d => ({ ...d, selected: false, knockOffAmount: 0 })));
        }
      });
    }
  }, [entityId, formType]);

  const totalDebit = useMemo(() => debitItems.filter(d => d.selected).reduce((s, d) => s + (d.knockOffAmount || 0), 0), [debitItems]);
  const totalCredit = useMemo(() => creditItems.filter(d => d.selected).reduce((s, d) => s + (d.knockOffAmount || 0), 0), [creditItems]);
  const difference = totalDebit - totalCredit;

  const createMutation = useMutation({
    mutationFn: (data: any) => post('/knockoff', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knockoff'] });
      setShowForm(false);
      resetForm();
    },
  });

  const voidMutation = useMutation({
    mutationFn: (id: number) => put(`/knockoff/${id}/void`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['knockoff'] }),
  });

  const resetForm = () => {
    setEntityId('');
    setFormDesc('');
    setDebitItems([]);
    setCreditItems([]);
  };

  const handleSubmit = () => {
    if (Math.abs(difference) > 0.01) return;
    const details = [
      ...debitItems.filter(d => d.selected && (d.knockOffAmount || 0) > 0).map(d => ({
        side: 'DEBIT', documentType: d.documentType, documentId: d.documentId,
        documentNo: d.documentNo, documentDate: d.documentDate,
        documentAmount: d.documentAmount, outstandingBefore: d.outstandingAmount,
        knockOffAmount: d.knockOffAmount,
      })),
      ...creditItems.filter(d => d.selected && (d.knockOffAmount || 0) > 0).map(d => ({
        side: 'CREDIT', documentType: d.documentType, documentId: d.documentId,
        documentNo: d.documentNo, documentDate: d.documentDate,
        documentAmount: d.documentAmount, outstandingBefore: d.outstandingAmount,
        knockOffAmount: d.knockOffAmount,
      })),
    ];
    createMutation.mutate({
      entryType: formType,
      customerId: formType === 'AR' ? parseInt(entityId) : null,
      vendorId: formType === 'AP' ? parseInt(entityId) : null,
      description: formDesc,
      details,
    });
  };

  const toggleItem = (side: 'debit' | 'credit', idx: number) => {
    const setter = side === 'debit' ? setDebitItems : setCreditItems;
    setter(prev => prev.map((item, i) => i === idx ? {
      ...item,
      selected: !item.selected,
      knockOffAmount: !item.selected ? item.outstandingAmount : 0,
    } : item));
  };

  const updateAmount = (side: 'debit' | 'credit', idx: number, amount: number) => {
    const setter = side === 'debit' ? setDebitItems : setCreditItems;
    setter(prev => prev.map((item, i) => i === idx ? { ...item, knockOffAmount: Math.min(amount, item.outstandingAmount) } : item));
  };

  const items = data?.items || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            Knock Off Entry
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Match debit and credit documents</p>
        </div>
        <button
          onClick={() => { setShowForm(true); resetForm(); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
        >
          <PlusIcon className="w-5 h-5" />
          New Knock Off
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            {(['all', 'AR', 'AP'] as const).map(t => (
              <button key={t} onClick={() => { setFilterType(t); setPage(1); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filterType === t ? 'bg-white dark:bg-gray-600 shadow-sm text-violet-600 dark:text-violet-400' : 'text-gray-500'}`}>
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-sm focus:ring-2 focus:ring-violet-500" />
          </div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-sm" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {['Doc No', 'Date', 'Type', 'Description', 'Total Amount', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                <ArrowsRightLeftIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                No knock-off entries found
              </td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-violet-600 dark:text-violet-400">{item.entryNo}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(item.entryDate).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${item.entryType === 'AR' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                    {item.entryType}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.description || '-'}</td>
                <td className="px-4 py-3 text-sm font-medium">{fmt(Number(item.totalAmount))}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700'}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {item.status !== 'VOID' && (
                    <button onClick={() => { if (confirm('Void this entry?')) voidMutation.mutate(item.id); }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium">Void</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500">{total} entries</span>
            <div className="flex gap-1">
              {Array.from({ length: Math.ceil(total / 20) }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`px-3 py-1 rounded-lg text-sm ${page === i + 1 ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Knock Off Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Knock Off Entry</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Type & Entity Selection */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select value={formType} onChange={e => { setFormType(e.target.value as 'AR' | 'AP'); setEntityId(''); resetForm(); }}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-sm focus:ring-2 focus:ring-violet-500">
                    <option value="AR">AR (Receivables)</option>
                    <option value="AP">AP (Payables)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {formType === 'AR' ? 'Customer' : 'Vendor'}
                  </label>
                  <select value={entityId} onChange={e => setEntityId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-sm focus:ring-2 focus:ring-violet-500">
                    <option value="">Select...</option>
                    {formType === 'AR'
                      ? (customers?.items || []).map((c: any) => <option key={c.id} value={c.id}>{c.code} - {c.companyName}</option>)
                      : (vendors?.items || []).map((v: any) => <option key={v.id} value={v.id}>{v.code} - {v.companyName}</option>)
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-sm focus:ring-2 focus:ring-violet-500"
                    placeholder="Optional description" />
                </div>
              </div>

              {entityId && (
                <>
                  {/* Two Column Layout */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Debit Items */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Debit Items ({formType === 'AR' ? 'Invoices' : 'AP Invoices'})
                      </h3>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {debitItems.length === 0 ? (
                          <p className="text-sm text-gray-400 py-4 text-center">No outstanding debit items</p>
                        ) : debitItems.map((item, idx) => (
                          <div key={idx} className={`p-3 rounded-xl border transition-all cursor-pointer ${item.selected ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                            onClick={() => toggleItem('debit', idx)}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{item.documentNo}</span>
                              <input type="checkbox" checked={item.selected || false} readOnly
                                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>{new Date(item.documentDate).toLocaleDateString()}</span>
                              <span>Outstanding: {fmt(item.outstandingAmount)}</span>
                            </div>
                            {item.selected && (
                              <div className="mt-2">
                                <input type="number" value={item.knockOffAmount || 0}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => updateAmount('debit', idx, parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-right"
                                  max={item.outstandingAmount} min={0} step="0.01" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Credit Items */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Credit Items ({formType === 'AR' ? 'Credit Notes / Payments' : 'Debit Notes / Payments'})
                      </h3>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {creditItems.length === 0 ? (
                          <p className="text-sm text-gray-400 py-4 text-center">No outstanding credit items</p>
                        ) : creditItems.map((item, idx) => (
                          <div key={idx} className={`p-3 rounded-xl border transition-all cursor-pointer ${item.selected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                            onClick={() => toggleItem('credit', idx)}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{item.documentNo}</span>
                              <input type="checkbox" checked={item.selected || false} readOnly
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>{new Date(item.documentDate).toLocaleDateString()}</span>
                              <span>Outstanding: {fmt(item.outstandingAmount)}</span>
                            </div>
                            {item.selected && (
                              <div className="mt-2">
                                <input type="number" value={item.knockOffAmount || 0}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => updateAmount('credit', idx, parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-right"
                                  max={item.outstandingAmount} min={0} step="0.01" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Debit</p>
                        <p className="text-lg font-bold text-red-600">{fmt(totalDebit)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Difference</p>
                        <p className={`text-lg font-bold ${Math.abs(difference) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {fmt(difference)}
                        </p>
                        {Math.abs(difference) < 0.01 ? (
                          <CheckCircleIcon className="w-5 h-5 text-emerald-500 mx-auto mt-1" />
                        ) : (
                          <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 mx-auto mt-1" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Credit</p>
                        <p className="text-lg font-bold text-emerald-600">{fmt(totalCredit)}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
                Cancel
              </button>
              <button onClick={handleSubmit}
                disabled={Math.abs(difference) > 0.01 || totalDebit === 0 || createMutation.isPending}
                className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
                {createMutation.isPending ? 'Saving...' : 'Save Knock Off'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
