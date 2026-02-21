import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getPaginated } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import { format } from 'date-fns';

interface ARDocument {
  id: number;
  invoiceNo?: string;
  paymentNo?: string;
  invoiceDate?: string;
  paymentDate?: string;
  customerCode: string;
  customerName: string;
  netTotal?: number;
  paymentAmount?: number;
  outstandingAmount?: number;
  status: string;
}

export default function ARInvoiceListPage({ type = 'invoice' }: { type?: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const isPayment = type === 'payment';

  const endpoint = isPayment ? '/ar/payments' : '/ar/invoices';
  const title = isPayment ? 'AR Payments (Official Receipts)' : 'AR Invoices';

  const { data, isLoading } = useQuery({
    queryKey: ['ar', type, page, search],
    queryFn: () => getPaginated<ARDocument>(endpoint, { page, pageSize: 20, search }),
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

  const columns = isPayment
    ? [
        { key: 'paymentNo', header: 'Receipt No' },
        { key: 'paymentDate', header: 'Date', render: (row: ARDocument) => format(new Date(row.paymentDate!), 'dd/MM/yyyy') },
        { key: 'customerCode', header: 'Customer' },
        { key: 'customerName', header: 'Name' },
        { key: 'paymentAmount', header: 'Amount', render: (row: ARDocument) => formatCurrency(row.paymentAmount!) },
      ]
    : [
        { key: 'invoiceNo', header: 'Invoice No' },
        { key: 'invoiceDate', header: 'Date', render: (row: ARDocument) => format(new Date(row.invoiceDate!), 'dd/MM/yyyy') },
        { key: 'customerCode', header: 'Customer' },
        { key: 'customerName', header: 'Name' },
        { key: 'netTotal', header: 'Total', render: (row: ARDocument) => formatCurrency(row.netTotal!) },
        { key: 'outstandingAmount', header: 'Outstanding', render: (row: ARDocument) => formatCurrency(row.outstandingAmount!) },
        {
          key: 'status',
          header: 'Status',
          render: (row: ARDocument) => {
            const badges: Record<string, string> = { OPEN: 'badge-info', PARTIAL: 'badge-warning', PAID: 'badge-success', VOID: 'badge-danger' };
            return <span className={`badge ${badges[row.status] || 'badge-gray'}`}>{row.status}</span>;
          },
        },
      ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <button onClick={() => navigate(`/ar/${type}s/new`)} className="btn btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          New
        </button>
      </div>

      <div className="card">
        <div className="card-header flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-10"
            />
          </div>
          {!isPayment && (
            <select className="input w-auto">
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </select>
          )}
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          onRowClick={(row) => navigate(`/ar/${type}s/${row.id}`)}
          pagination={data?.pagination ? { ...data.pagination, onPageChange: setPage } : undefined}
        />
      </div>
    </div>
  );
}
