import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getPaginated } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import NewDocumentDropdown from '../../components/common/NewDocumentDropdown';
import { format } from 'date-fns';
import { usePermissions, MODULES } from '../../hooks/usePermissions';

interface SalesDocument {
  id: number;
  documentNo: string;
  documentDate: string;
  customerCode: string;
  customerName: string;
  netTotal: number;
  status: string;
  currencyCode: string;
}

const typeConfig: Record<string, { title: string; endpoint: string; newPath: string }> = {
  quotation: { title: 'Quotations', endpoint: '/sales/quotations', newPath: '/sales/new/quotation' },
  order: { title: 'Sales Orders', endpoint: '/sales/orders', newPath: '/sales/new/order' },
  do: { title: 'Delivery Orders', endpoint: '/sales/delivery-orders', newPath: '/sales/new/do' },
  invoice: { title: 'Invoices', endpoint: '/sales/invoices', newPath: '/sales/new/invoice' },
  cash: { title: 'Cash Sales', endpoint: '/sales/cash-sales', newPath: '/sales/new/cash' },
  cn: { title: 'Credit Notes', endpoint: '/sales/credit-notes', newPath: '/sales/new/cn' },
  dn: { title: 'Debit Notes', endpoint: '/sales/debit-notes', newPath: '/sales/new/dn' },
};

export default function SalesListPage({ type }: { type: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const config = typeConfig[type] || typeConfig.invoice;
  const { canCreate } = usePermissions();
  const canCreateSales = canCreate(MODULES.SALES);

  const { data, isLoading } = useQuery({
    queryKey: ['sales', type, page, search],
    queryFn: () => getPaginated<SalesDocument>(config.endpoint, { page, pageSize: 20, search }),
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch when returning to page
  });

  const formatCurrency = (val: number, currency: string = 'MYR') =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency }).format(val);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      OPEN: 'badge-info',
      POSTED: 'badge-success',
      PARTIAL: 'badge-warning',
      TRANSFERRED: 'badge-gray',
      VOID: 'badge-danger',
    };
    return badges[status] || 'badge-gray';
  };

  const columns = [
    { key: 'documentNo', header: 'Doc No' },
    { key: 'documentDate', header: 'Date', render: (row: SalesDocument) => format(new Date(row.documentDate), 'dd/MM/yyyy') },
    { key: 'customerCode', header: 'Customer' },
    { key: 'customerName', header: 'Name' },
    { key: 'netTotal', header: 'Total', render: (row: SalesDocument) => formatCurrency(row.netTotal, row.currencyCode) },
    {
      key: 'status',
      header: 'Status',
      render: (row: SalesDocument) => <span className={`badge ${getStatusBadge(row.status)}`}>{row.status}</span>,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
        {canCreateSales && (
          <NewDocumentDropdown
            documentType="sales"
            targetType={type}
            onNewBlank={() => navigate(config.newPath)}
            onTransferFrom={(doc) => navigate(config.newPath, { state: { transferFrom: doc } })}
          />
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4">
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
            <select className="input w-auto">
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="POSTED">Posted</option>
              <option value="PARTIAL">Partial</option>
            </select>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          onRowClick={(row) => navigate(`/sales/${type}/${row.id}`)}
          pagination={data?.pagination ? { ...data.pagination, onPageChange: setPage } : undefined}
        />
      </div>
    </div>
  );
}
