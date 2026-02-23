import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  BuildingStorefrontIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { getPaginated, del } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';

interface Vendor {
  id: number;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  currencyCode: string;
  creditTermDays: number;
  isActive: boolean;
}

export default function VendorListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; vendor: Vendor | null }>({ open: false, vendor: null });

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', page, search, showInactive],
    queryFn: () => getPaginated<Vendor>('/vendors', { 
      page, 
      pageSize: 20, 
      search,
      isActive: showInactive ? undefined : true,
    }),
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/vendors/${id}`),
    onSuccess: () => {
      toast.success('Vendor deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setDeleteModal({ open: false, vendor: null });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete vendor');
    },
  });

  const handleDelete = (vendor: Vendor, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal({ open: true, vendor });
  };

  const confirmDelete = () => {
    if (deleteModal.vendor) {
      deleteMutation.mutate(deleteModal.vendor.id);
    }
  };

  const columns = [
    { 
      key: 'code', 
      header: 'Code',
      render: (row: Vendor) => (
        <span className="font-medium text-primary-600 dark:text-primary-400">{row.code}</span>
      ),
    },
    { key: 'name', header: 'Name' },
    { key: 'contactPerson', header: 'Contact Person' },
    { key: 'phone', header: 'Phone' },
    { 
      key: 'creditTermDays', 
      header: 'Terms',
      render: (row: Vendor) => (
        <span className="text-gray-600 dark:text-gray-400">{row.creditTermDays} days</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row: Vendor) => (
        <span className={`badge ${row.isActive ? 'badge-success' : 'badge-gray'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Vendor) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/vendors/${row.id}`); }}
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
            <span className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-lg">
              <BuildingStorefrontIcon className="w-6 h-6" />
            </span>
            Vendors
          </h1>
          <p className="page-subtitle">Manage your suppliers and vendors</p>
        </div>
        <Link to="/vendors/new" className="btn btn-primary">
          <PlusIcon className="w-5 h-5" />
          New Vendor
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
                placeholder="Search by code, name, or contact..."
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
          onRowClick={(row) => navigate(`/vendors/${row.id}`)}
          pagination={data?.pagination ? { ...data.pagination, onPageChange: setPage } : undefined}
          emptyMessage="No vendors found. Create your first vendor to get started."
        />
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteModal({ open: false, vendor: null })} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Vendor
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete <strong>{deleteModal.vendor?.name}</strong> ({deleteModal.vendor?.code})?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, vendor: null })}
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
