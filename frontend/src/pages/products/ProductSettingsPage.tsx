import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { get, post, put, del } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';
import {
  CubeIcon,
  ArrowLeftIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface SettingsConfig {
  endpoint: string;
  title: string;
  columns: { key: string; header: string }[];
}

const settingsConfig: Record<string, SettingsConfig> = {
  groups: {
    endpoint: 'product-groups',
    title: 'Product Groups',
    columns: [
      { key: 'code', header: 'Code' },
      { key: 'name', header: 'Name' },
      { key: 'salesAccountId', header: 'Sales Account' },
      { key: 'purchaseAccountId', header: 'Purchase Account' },
      { key: 'stockAccountId', header: 'Stock Account' },
      { key: 'cogsAccountId', header: 'COGS Account' },
    ],
  },
  types: {
    endpoint: 'product-types',
    title: 'Product Types',
    columns: [
      { key: 'code', header: 'Code' },
      { key: 'name', header: 'Name' },
    ],
  },
  uom: {
    endpoint: 'uom',
    title: 'Units of Measure',
    columns: [
      { key: 'code', header: 'Code' },
      { key: 'name', header: 'Name' },
    ],
  },
};

export default function ProductSettingsPage() {
  const location = useLocation();
  // Extract type from path: /products/groups -> groups
  const type = location.pathname.split('/').pop();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const config = settingsConfig[type || 'groups'];
  
  if (!config) {
    return <div>Invalid settings type</div>;
  }

  const { data, isLoading } = useQuery({
    queryKey: [config.endpoint],
    queryFn: () => get(`/settings/${config.endpoint}`),
  });

  const items = Array.isArray(data) ? data : [];

  // Accounts for dropdowns/labels (only needed for product groups)
  const { data: accountsResp } = useQuery({
    queryKey: ['gl-accounts-all'],
    queryFn: () => get('/accounts', { pageSize: 1000 }),
    enabled: (type || 'groups') === 'groups',
  });
  const accounts: any[] = Array.isArray((accountsResp as any)?.data) ? (accountsResp as any).data : (Array.isArray(accountsResp) ? accountsResp : []);
  const accountById = new Map<number, any>(accounts.map((a) => [a.id, a]));
  const labelFor = (id?: number) => {
    if (!id) return '';
    const a = accountById.get(id);
    return a ? `${a.accountNo} - ${a.name}` : String(id);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingItem?.id) {
        return put(`/settings/${config.endpoint}/${editingItem.id}`, data);
      } else {
        return post(`/settings/${config.endpoint}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.endpoint] });
      toast.success(editingItem ? 'Updated successfully' : 'Created successfully');
      setShowModal(false);
      setEditingItem(null);
      setFormData({});
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to save');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => del(`/settings/${config.endpoint}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.endpoint] });
      toast.success('Deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete');
    }
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({});
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData(item);
    setShowModal(true);
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteMutation.mutate(id);
    }
  };

  const displayColumns = [
    ...config.columns.map(col => ({
      ...col,
      render: (row: any) => {
        if (type === 'groups' && ['salesAccountId','purchaseAccountId','stockAccountId','cogsAccountId'].includes(col.key)) {
          return <span className="text-sm text-gray-700 dark:text-gray-300">{labelFor(row[col.key]) || '-'}</span>;
        }
        return row[col.key];
      }
    })),
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-2">
          <button 
            onClick={() => handleEdit(row)} 
            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            title="Edit"
          >
            <PencilSquareIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDelete(row.id)} 
            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/products"
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="p-2 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-500 text-white">
                <CubeIcon className="w-6 h-6" />
              </span>
              {config.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage {config.title.toLowerCase()}
            </p>
          </div>
        </div>
        <button onClick={handleAdd} className="btn btn-primary">
          <PlusIcon className="w-5 h-5" />
          Add New
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <DataTable columns={displayColumns} data={items} loading={isLoading} />
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {editingItem ? 'Edit' : 'Add New'} {config.title.replace(/s$/, '')}
            </h3>
            <div className="space-y-4">
              {config.columns.map(col => {
                const isAcct = type === 'groups' && ['salesAccountId','purchaseAccountId','stockAccountId','cogsAccountId'].includes(col.key);
                if (!isAcct) {
                  return (
                    <div key={col.key}>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        {col.header}
                      </label>
                      <input
                        type="text"
                        className="input w-full"
                        value={formData[col.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })}
                        placeholder={`Enter ${col.header.toLowerCase()}`}
                      />
                    </div>
                  );
                }
                // Account select
                const filterBy = (key: string) => {
                  if (key === 'salesAccountId') return (a: any) => a.type?.category === 'REVENUE';
                  if (key === 'cogsAccountId') return (a: any) => a.type?.name?.toUpperCase()?.includes('COST') || a.type?.category === 'COGS';
                  if (key === 'stockAccountId') return (a: any) => a.name?.toLowerCase().includes('inventory') || a.specialType === 'STOCK' || a.type?.category === 'ASSET';
                  if (key === 'purchaseAccountId') return (a: any) => a.type?.category === 'COGS' || a.type?.category === 'EXPENSE';
                  return () => true;
                };
                const options = accounts.filter(filterBy(col.key));
                return (
                  <div key={col.key}>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        {col.header}
                      </label>
                    </div>
                    <select
                      className="input w-full"
                      value={formData[col.key] ?? ''}
                      onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value ? parseInt(e.target.value) : null })}
                    >
                      <option value="">-- Select Account --</option>
                      {options.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.accountNo} - {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
              {type === 'groups' && (
                <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800"
                    onClick={() => setShowAdvanced(v => !v)}
                  >
                    {showAdvanced ? 'Hide' : 'Show'} Advanced (Optional)
                  </button>
                  {showAdvanced && (
                    <div className="space-y-4 mt-3">
                      {[
                        { key: 'cashSalesAccountId', header: 'Cash Sales Account' },
                        { key: 'salesReturnAccountId', header: 'Sales Return Account' },
                        { key: 'salesDiscountAccountId', header: 'Sales Discount Account' },
                        { key: 'cashPurchaseAccountId', header: 'Cash Purchase Account' },
                        { key: 'purchaseReturnAccountId', header: 'Purchase Return Account' },
                        { key: 'purchaseDiscountAccountId', header: 'Purchase Discount Account' },
                        { key: 'balanceStockAccountId', header: 'Balance Stock Account' },
                      ].map((field) => {
                        const filterByAdvanced = (key: string) => {
                          if (key === 'cashSalesAccountId' || key === 'cashPurchaseAccountId') return (a: any) =>
                            a.specialType === 'BANK' || /cash|bank/i.test(a.name);
                          if (key === 'salesReturnAccountId') return (a: any) =>
                            (a.type?.category === 'REVENUE' && /return inwards|sales return/i.test(a.name));
                          if (key === 'salesDiscountAccountId') return (a: any) =>
                            (a.type?.category === 'EXPENSE' && /discount allowed/i.test(a.name));
                          if (key === 'purchaseReturnAccountId') return (a: any) =>
                            (/return outwards|purchase return/i.test(a.name) && (a.type?.category === 'COGS' || a.type?.category === 'REVENUE' || a.type?.category === 'EXPENSE'));
                          if (key === 'purchaseDiscountAccountId') return (a: any) =>
                            (a.type?.category === 'REVENUE' && /discount received/i.test(a.name));
                          if (key === 'balanceStockAccountId') return (a: any) =>
                            (/stock at end|balance stock/i.test(a.name) && a.type?.category === 'COGS');
                          return () => true;
                        };
                        const options = accounts.filter(filterByAdvanced(field.key));
                        return (
                          <div key={field.key}>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                              {field.header}
                            </label>
                            <select
                              className="input w-full"
                              value={formData[field.key] ?? ''}
                              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value ? parseInt(e.target.value) : null })}
                            >
                              <option value="">-- Select Account (Optional) --</option>
                              {options.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.accountNo} - {a.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Note: Discount accounts are used when line discount posts to a separate account. Balance stock is used when live stock balance is enabled.
                      </div>
                    </div>
                  )}
                </div>
              )}
              {type === 'groups' && (
                <div className="pt-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      // Load default accounts heuristically
                      const pick = (predicate: (a: any) => boolean) => {
                        const found = accounts.find(predicate);
                        return found?.id || '';
                      };
                      setFormData({
                        ...formData,
                        salesAccountId: pick(a => a.type?.category === 'REVENUE' && /sales|revenue/i.test(a.name)),
                        cogsAccountId: pick(a => (a.type?.category === 'COGS' && /cost of sales|cost of goods/i.test(a.name)) || /cost of sales|cogs/i.test(a.name)),
                        stockAccountId: pick(a => /inventory|stock/i.test(a.name) && a.type?.category === 'ASSET'),
                        purchaseAccountId: pick(a => a.type?.category === 'COGS' || (a.type?.category === 'EXPENSE' && /purchase|raw material|carriage inwards/i.test(a.name))),
                        cashSalesAccountId: pick(a => a.specialType === 'BANK' || /cash|bank/i.test(a.name)),
                        salesReturnAccountId: pick(a => a.type?.category === 'REVENUE' && /return inwards|sales return/i.test(a.name)),
                        salesDiscountAccountId: pick(a => a.type?.category === 'EXPENSE' && /discount allowed/i.test(a.name)),
                        cashPurchaseAccountId: pick(a => a.specialType === 'BANK' || /cash|bank/i.test(a.name)),
                        purchaseReturnAccountId: pick(a => /return outwards|purchase return/i.test(a.name)),
                        purchaseDiscountAccountId: pick(a => a.type?.category === 'REVENUE' && /discount received/i.test(a.name)),
                        balanceStockAccountId: pick(a => /stock at end|balance stock/i.test(a.name) && a.type?.category === 'COGS'),
                      });
                    }}
                  >
                    Load Default Accounts
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowModal(false)} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                disabled={saveMutation.isPending} 
                className="btn btn-primary"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
