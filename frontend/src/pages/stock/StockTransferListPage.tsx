import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowsRightLeftIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { getPaginated, del } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';

interface StockTransfer {
  id: number;
  documentNo: string;
  documentDate: string;
  reference?: string;
  fromLocation?: { code: string; name: string };
  toLocation?: { code: string; name: string };
  status: string;
  totalQty: number;
}

export default function StockTransferListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item: StockTransfer | null }>({
    open: false,
    item: null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['stock-transfers', page, search],
    queryFn: () =>
      getPaginated<StockTransfer>('/stock/transfer', {
        page,
        pageSize: 20,
        search,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/stock/transfer/${id}`),
    onSuccess: () => {
      toast.success('Stock transfer deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      setDeleteModal({ open: false, item: null });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete');
    },
  });

  const handleDelete = (item: StockTransfer, e: React.MouseEvent) => {
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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      DRAFT: 'badge-gray',
      IN_TRANSIT: 'badge-warning',
      COMPLETED: 'badge-success',
      CANCELLED: 'badge-danger',
    };
    return badges[status] || 'badge-gray';
  };

  const columns = [
    {
      key: 'documentNo',
      header: 'Doc No',
      render: (row: StockTransfer) => (
        <span className="font-medium text-primary-600 dark:text-primary-400">
          {row.documentNo}
        </span>
      ),
    },
    {
      key: 'documentDate',
      header: 'Date',
      render: (row: StockTransfer) => formatDate(row.documentDate),
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (row: StockTransfer) => row.reference || '-',
    },
    {
      key: 'fromLocation',
      header: 'From Location',
      render: (row: StockTransfer) => (
        <span className="badge badge-info">{row.fromLocation?.name || 'N/A'}</span>
      ),
    },
    {
      key: 'toLocation',
      header: 'To Location',
      render: (row: StockTransfer) => (
        <span className="badge badge-success">{row.toLocation?.name || 'N/A'}</span>
      ),
    },
    {
      key: 'totalQty',
      header: 'Total Qty',
      className: 'text-right font-mono',
      render: (row: StockTransfer) => Number(row.totalQty || 0).toLocaleString(),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: StockTransfer) => (
        <span className={`badge ${getStatusBadge(row.status)}`}>
          {row.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: StockTransfer) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/stock/transfer/${row.id}`);
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
            <span className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg">
              <ArrowsRightLeftIcon className="w-6 h-6" />
            </span>
            Stock Transfers
          </h1>
          <p className="page-subtitle">Transfer stock between locations</p>
        </div>
        <Link to="/stock/transfer/new" className="btn btn-primary">
          <PlusIcon className="w-5 h-5" />
          New Transfer
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
          onRowClick={(row) => navigate(`/stock/transfer/${row.id}`)}
          pagination={data?.pagination ? { ...data.pagination, onPageChange: setPage } : undefined}
          emptyMessage="No stock transfers found. Create your first transfer."
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
              Delete Stock Transfer
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
