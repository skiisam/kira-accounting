import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPaginated, post } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import { format } from 'date-fns';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

interface EInvoiceDocument {
  id: number;
  documentNo: string;
  documentType: 'invoice' | 'cn' | 'dn';
  documentDate: string;
  customerCode: string;
  customerName: string;
  netTotal: number;
  currencyCode: string;
  einvoiceStatus: 'pending' | 'submitted' | 'valid' | 'invalid' | 'cancelled';
  einvoiceUUID?: string;
  einvoiceSubmittedAt?: string;
  einvoiceValidatedAt?: string;
  einvoiceError?: string;
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'valid', label: 'Valid' },
  { value: 'invalid', label: 'Invalid' },
  { value: 'cancelled', label: 'Cancelled' },
];

const documentTypeLabels: Record<string, string> = {
  invoice: 'Invoice',
  cn: 'Credit Note',
  dn: 'Debit Note',
};

export default function EInvoiceListPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const statusFilter = searchParams.get('status') || '';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['einvoice', 'list', page, search, statusFilter],
    queryFn: () =>
      getPaginated<EInvoiceDocument>('/einvoice/invoices', {
        page,
        pageSize: 20,
        search,
        status: statusFilter || undefined,
      }),
  });

  // Submit single invoice
  const submitMutation = useMutation({
    mutationFn: (invoiceId: number) => post(`/einvoice/submit/${invoiceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einvoice'] });
    },
  });

  // Submit batch
  const submitBatchMutation = useMutation({
    mutationFn: (ids: number[]) => post('/einvoice/submit-batch', { invoiceIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einvoice'] });
    },
  });

  // Check status
  const checkStatusMutation = useMutation({
    mutationFn: (invoiceId: number) => post(`/einvoice/check-status/${invoiceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einvoice'] });
    },
  });

  // Cancel e-invoice
  const cancelMutation = useMutation({
    mutationFn: (invoiceId: number) => post(`/einvoice/cancel/${invoiceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einvoice'] });
    },
  });

  const formatCurrency = (val: number, currency: string = 'MYR') =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency }).format(val);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; icon: any }> = {
      pending: { class: 'badge-warning', icon: ClockIcon },
      submitted: { class: 'badge-info', icon: PaperAirplaneIcon },
      valid: { class: 'badge-success', icon: CheckCircleIcon },
      invalid: { class: 'badge-danger', icon: XCircleIcon },
      cancelled: { class: 'badge-gray', icon: XCircleIcon },
    };
    const badge = badges[status?.toLowerCase()] || badges.pending;
    return (
      <span className={`badge ${badge.class} inline-flex items-center gap-1`}>
        <badge.icon className="w-3.5 h-3.5" />
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const handleStatusFilterChange = (value: string) => {
    if (value) {
      setSearchParams({ status: value });
    } else {
      setSearchParams({});
    }
    setPage(1);
  };

  const pendingCount = data?.data?.filter((d) => d.einvoiceStatus === 'pending').length || 0;

  const columns = [
    { key: 'documentNo', header: 'Doc No' },
    {
      key: 'documentType',
      header: 'Type',
      render: (row: EInvoiceDocument) => (
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
          {documentTypeLabels[row.documentType] || row.documentType}
        </span>
      ),
    },
    {
      key: 'documentDate',
      header: 'Date',
      render: (row: EInvoiceDocument) => format(new Date(row.documentDate), 'dd/MM/yyyy'),
    },
    { key: 'customerCode', header: 'Customer' },
    { key: 'customerName', header: 'Name' },
    {
      key: 'netTotal',
      header: 'Total',
      render: (row: EInvoiceDocument) => formatCurrency(row.netTotal, row.currencyCode),
    },
    {
      key: 'einvoiceStatus',
      header: 'E-Invoice Status',
      render: (row: EInvoiceDocument) => getStatusBadge(row.einvoiceStatus),
    },
    {
      key: 'einvoiceUUID',
      header: 'UUID',
      render: (row: EInvoiceDocument) =>
        row.einvoiceUUID ? (
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
              {row.einvoiceUUID}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(row.einvoiceUUID!);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
              title="Copy UUID"
            >
              <DocumentDuplicateIcon className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: 'einvoiceSubmittedAt',
      header: 'Submitted',
      render: (row: EInvoiceDocument) =>
        row.einvoiceSubmittedAt ? (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {format(new Date(row.einvoiceSubmittedAt), 'dd/MM/yyyy HH:mm')}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: EInvoiceDocument) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {row.einvoiceStatus === 'pending' && (
            <button
              onClick={() => submitMutation.mutate(row.id)}
              disabled={submitMutation.isPending}
              className="p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              title="Submit to LHDN"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          )}
          {row.einvoiceStatus === 'submitted' && (
            <button
              onClick={() => checkStatusMutation.mutate(row.id)}
              disabled={checkStatusMutation.isPending}
              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Check Status"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          )}
          {(row.einvoiceStatus === 'valid' || row.einvoiceStatus === 'submitted') && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to cancel this e-invoice?')) {
                  cancelMutation.mutate(row.id);
                }
              }}
              disabled={cancelMutation.isPending}
              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Cancel E-Invoice"
            >
              <XCircleIcon className="w-4 h-4" />
            </button>
          )}
          {row.einvoiceStatus === 'invalid' && row.einvoiceError && (
            <button
              onClick={() => alert(`Error: ${row.einvoiceError}`)}
              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
              title="View Error"
            >
              <ExclamationTriangleIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">E-Invoice List</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage and track your e-invoice submissions to LHDN MyInvois
          </p>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={() => {
              const pendingIds = data?.data?.filter((d) => d.einvoiceStatus === 'pending').map((d) => d.id) || [];
              submitBatchMutation.mutate(pendingIds);
            }}
            disabled={submitBatchMutation.isPending}
            className="btn btn-primary flex items-center gap-2"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            Submit All Pending ({pendingCount})
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by document no, customer..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="input pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="input w-auto"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => refetch()}
                className="btn btn-secondary flex items-center gap-2"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          pagination={
            data?.pagination
              ? { ...data.pagination, onPageChange: setPage }
              : undefined
          }
          emptyMessage="No e-invoices found"
        />
      </div>

      {/* Legend */}
      <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Status Legend</h3>
        <div className="flex flex-wrap gap-4">
          {statusOptions.slice(1).map((status) => (
            <div key={status.value} className="flex items-center gap-2">
              {getStatusBadge(status.value)}
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {status.value === 'pending' && '- Ready to submit'}
                {status.value === 'submitted' && '- Awaiting validation'}
                {status.value === 'valid' && '- Accepted by LHDN'}
                {status.value === 'invalid' && '- Rejected by LHDN'}
                {status.value === 'cancelled' && '- Cancelled'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
