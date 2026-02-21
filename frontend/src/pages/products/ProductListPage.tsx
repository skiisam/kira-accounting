import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  CubeIcon,
} from '@heroicons/react/24/outline';
import { getPaginated } from '../../services/api';
import DataTable from '../../components/common/DataTable';

interface Product {
  id: number;
  code: string;
  description: string;
  group?: { name: string };
  baseUOM?: { code: string };
  sellingPrice1: number;
  sellingPrice2?: number;
  sellingPrice3?: number;
  standardCost: number;
  isActive: boolean;
  isSellable: boolean;
  isPurchasable: boolean;
}

export default function ProductListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, showInactive],
    queryFn: () => getPaginated<Product>('/products', { 
      page, 
      pageSize: 20, 
      search,
      isActive: showInactive ? undefined : true,
    }),
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

  const columns = [
    { 
      key: 'code', 
      header: 'Code',
      render: (row: Product) => (
        <span className="font-medium text-primary-600 dark:text-primary-400">{row.code}</span>
      ),
    },
    { key: 'description', header: 'Description' },
    { 
      key: 'group', 
      header: 'Group', 
      render: (row: Product) => (
        <span className="badge badge-info">{row.group?.name || 'No Group'}</span>
      ),
    },
    { 
      key: 'baseUOM', 
      header: 'UOM', 
      render: (row: Product) => (
        <span className="text-gray-600 dark:text-gray-400">{row.baseUOM?.code || '-'}</span>
      ),
    },
    { 
      key: 'standardCost', 
      header: 'Cost', 
      render: (row: Product) => (
        <span className="text-gray-600 dark:text-gray-400">{formatCurrency(row.standardCost)}</span>
      ),
    },
    { 
      key: 'prices', 
      header: 'Selling Prices', 
      render: (row: Product) => (
        <div className="space-y-0.5">
          <div className="font-medium text-emerald-600 dark:text-emerald-400">
            {formatCurrency(row.sellingPrice1)}
          </div>
          {(row.sellingPrice2 || row.sellingPrice3) && (
            <div className="text-xs text-gray-500">
              {row.sellingPrice2 ? formatCurrency(row.sellingPrice2) : ''} 
              {row.sellingPrice2 && row.sellingPrice3 ? ' / ' : ''}
              {row.sellingPrice3 ? formatCurrency(row.sellingPrice3) : ''}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'flags',
      header: 'Type',
      render: (row: Product) => (
        <div className="flex gap-1">
          {row.isSellable && (
            <span className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs" title="Sellable">
              S
            </span>
          )}
          {row.isPurchasable && (
            <span className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs" title="Purchasable">
              P
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row: Product) => (
        <span className={`badge ${row.isActive ? 'badge-success' : 'badge-gray'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <span className="p-2 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-500 text-white shadow-lg">
              <CubeIcon className="w-6 h-6" />
            </span>
            Products
          </h1>
          <p className="page-subtitle">Manage your products and services</p>
        </div>
        <Link to="/products/new" className="btn btn-primary">
          <PlusIcon className="w-5 h-5" />
          New Product
        </Link>
      </div>

      {/* Filters & Table */}
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by code, description, or barcode..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input pl-10"
              />
            </div>

            {/* Filter toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => { setShowInactive(e.target.checked); setPage(1); }}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Show inactive</span>
            </label>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          onRowClick={(row) => navigate(`/products/${row.id}`)}
          pagination={data?.pagination ? { ...data.pagination, onPageChange: setPage } : undefined}
          emptyMessage="No products found. Create your first product to get started."
        />
      </div>
    </div>
  );
}
