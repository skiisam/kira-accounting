import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  CubeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { getPaginated, del } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';

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
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, showInactive],
    queryFn: () => getPaginated<Product>('/products', { 
      page, 
      pageSize: 20, 
      search,
      isActive: showInactive ? undefined : true,
    }),
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/products/${id}`),
    onSuccess: () => {
      toast.success('Product deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteModal({ open: false, product: null });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete product');
    },
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

  const handleDelete = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal({ open: true, product });
  };

  const confirmDelete = () => {
    if (deleteModal.product) {
      deleteMutation.mutate(deleteModal.product.id);
    }
  };

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
      header: 'Selling Price', 
      render: (row: Product) => (
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          {formatCurrency(row.sellingPrice1)}
        </span>
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
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Product) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/products/${row.id}`); }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => handleDelete(row, e)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
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

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteModal({ open: false, product: null })} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Product
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete <strong>{deleteModal.product?.description}</strong> ({deleteModal.product?.code})?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, product: null })}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="btn bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
