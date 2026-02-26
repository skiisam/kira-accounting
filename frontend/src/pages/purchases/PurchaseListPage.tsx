import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { get, getPaginated } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import NewDocumentDropdown from '../../components/common/NewDocumentDropdown';
import { format } from 'date-fns';
import { usePermissions, MODULES } from '../../hooks/usePermissions';

interface PurchaseDocument {
  id: number;
  documentNo: string;
  documentDate: string;
  vendorCode?: string;
  vendorName?: string;
  netTotal: number;
  status: string;
}

const typeConfig: Record<string, { title: string; endpoint: string; newPath: string }> = {
  request: { title: 'Purchase Requests', endpoint: '/purchases/requests', newPath: '/purchases/new/request' },
  order: { title: 'Purchase Orders', endpoint: '/purchases/orders', newPath: '/purchases/new/order' },
  grn: { title: 'Goods Received Notes', endpoint: '/purchases/grn', newPath: '/purchases/new/grn' },
  invoice: { title: 'Purchase Invoices', endpoint: '/purchases/invoices', newPath: '/purchases/new/invoice' },
  cn: { title: 'Supplier Credit Notes', endpoint: '/purchases/credit-notes', newPath: '/purchases/new/cn' },
  dn: { title: 'Supplier Debit Notes', endpoint: '/purchases/debit-notes', newPath: '/purchases/new/dn' },
};

export default function PurchaseListPage({ type }: { type: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const config = typeConfig[type] || typeConfig.order;
  const { canCreate } = usePermissions();
  const canCreatePurchase = canCreate(MODULES.PURCHASE);

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', type, page, search],
    queryFn: () => getPaginated<PurchaseDocument>(config.endpoint, { page, pageSize: 20, search }),
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

  const columns = [
    { key: 'documentNo', header: 'Doc No' },
    { key: 'documentDate', header: 'Date', render: (row: PurchaseDocument) => format(new Date(row.documentDate), 'dd/MM/yyyy') },
    { key: 'vendorCode', header: 'Vendor' },
    { key: 'vendorName', header: 'Name' },
    { key: 'netTotal', header: 'Total', render: (row: PurchaseDocument) => formatCurrency(row.netTotal) },
    {
      key: 'status',
      header: 'Status',
      render: (row: PurchaseDocument) => (
        <span className={`badge ${row.status === 'OPEN' ? 'badge-info' : row.status === 'POSTED' ? 'badge-success' : 'badge-gray'}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: PurchaseDocument) => (
        <button
          title="Copy"
          className="btn btn-ghost btn-xs"
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const doc = await get<any>(`${typeConfig[type].endpoint}/${row.id}`);
              navigate(typeConfig[type].newPath, { state: { transferFrom: doc } });
            } catch {
              // ignore
            }
          }}
        >
          <DocumentDuplicateIcon className="w-5 h-5" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
        {canCreatePurchase && (
          <NewDocumentDropdown
            documentType="purchases"
            targetType={type}
            onNewBlank={() => navigate(config.newPath)}
            onTransferFrom={(doc) => navigate(config.newPath, { state: { transferFrom: doc } })}
          />
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-10"
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          onRowClick={(row) => navigate(`/purchases/${type}/${row.id}`)}
          pagination={data?.pagination ? { ...data.pagination, onPageChange: setPage } : undefined}
        />
      </div>
    </div>
  );
}
