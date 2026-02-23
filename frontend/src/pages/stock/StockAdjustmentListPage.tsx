import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { getPaginated, del } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';

interface StockAdjustment {
  id: number;
  documentNo: string;
  documentDate: string;
  reference?: string;
  location?: { code: string; name: string };
  reason?: string;
  status: string;
  totalQty: number;
  totalValue: number;
}

export default function StockAdjustmentListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item: StockAdjustment | null }>({
    open: false,
    item: null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['stock-adjustments', page, search],
    queryFn: () =>
      getPaginated<StockAdjustment>('/stock/adjustment', {
        page,
        pageSize: 20,
        search,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/stock/adjustment/${id}`),
    onSuccess: () => {
      toast.success('Stock adjustment deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      setDeleteModal({ open: false, item: null });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete');
    },
  });

  const handleDelete = (item: StockAdjustment, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal({ open: true, item });
  };

  const confirmDelete = () => {
    if (deleteModal.item) {
      deleteMutation.mutate(deleteModal.item.id);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      DRAFT: 'badge-gray',
      POSTED: 'badge-success',
      CANCELLED: 'badge-danger',
    };
    return badges[status] || 'badge-gray';
  };

  const columns = [
    {
      key: 'documentNo',
      header: 'Doc No',
      render: (row: StockAdjustment) => (
        <span className="font-medium text-primary-600 dark:text-primary-400">
          {row.documentNo}
        </span>
      ),
    },
    {
      key: 'documentDate',
      header: 'Date',
      render: (row: StockAdjustment) => formatDate(row.documentDate),
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (row: StockAdjustment) => row.reference || '-',
    },
    {
      key: 'location',
      header: 'Location',
      render: (row: StockAdjustment) => (
        <span className="badge badge-info">{row.location?.name || 'Default'}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row: StockAdjustment) => row.reason || '-',
    },
    {
      key: 'totalQty',
      header: 'Total Qty',
      className: 'text-right font-mono',
      render: (row: StockAdjustment) => Number(row.totalQty || 0).toLocaleString(),
    },
    {
      key: 'totalValue',
      header: 'Total Value',
      className: 'text-right',
      render: (row: StockAdjustment) => formatCurrency(row.totalValue || 0),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: StockAdjustment) => (
        <span className={`badge ${getStatusBadge(row.status)}`}>{row.status}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: StockAdjustment) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/stock/adjustment/${row.id}`);
            }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          {row.status === 'DRAFT' && (
            <button
              onClick={(e) => handleDelete(row, e)}
              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
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
            <span className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
              <AdjustmentsHorizontalIcon className="w-6 h-6" />
            </span>
            Stock Adjustments
          </h1>
          <p className="page-subtitle">Manage stock quantity adjustments</p>
        </div>
        <Link to="/stock/adjustment/new" className="btn btn-primary">
          <PlusIcon className="w-5 h-5" />
          New Adjustment
        </Link>
      </div>

      {/* Filters & Table */}
      <div className="card">
        <div className="card-header">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by doc no, reference..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input pl-10"
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          onRowClick={(row) => navigate(`/stock/adjustment/${row.id}`)}
          pagination={data?.pagination ? { ...data.pagination, onPageChange: setPage } : undefined}
          emptyMessage="No stock adjustments found. Create your first adjustment."
        />
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteModal({ open: false, item: null })}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Stock Adjustment
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete <strong>{deleteModal.item?.documentNo}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, item: null })}
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
