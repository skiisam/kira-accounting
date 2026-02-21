import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  UsersIcon,
} from '@heroicons/react/24/outline';
import { getPaginated } from '../../services/api';
import DataTable from '../../components/common/DataTable';

interface Customer {
  id: number;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  creditLimit: number;
  creditTermDays: number;
  currencyCode: string;
  isActive: boolean;
}

export default function CustomerListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search, showInactive],
    queryFn: () => getPaginated<Customer>('/customers', { 
      page, 
      pageSize, 
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
      render: (row: Customer) => (
        <span className="font-medium text-primary-600 dark:text-primary-400">{row.code}</span>
      ),
    },
    { key: 'name', header: 'Name' },
    { key: 'contactPerson', header: 'Contact Person' },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email' },
    {
      key: 'creditLimit',
      header: 'Credit Limit',
      render: (row: Customer) => (
        <span className="font-mono text-emerald-600 dark:text-emerald-400">
          {formatCurrency(row.creditLimit)}
        </span>
      ),
    },
    {
      key: 'creditTermDays',
      header: 'Terms',
      render: (row: Customer) => (
        <span className="text-gray-600 dark:text-gray-400">{row.creditTermDays} days</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row: Customer) => (
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
            <span className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <UsersIcon className="w-6 h-6" />
            </span>
            Customers
          </h1>
          <p className="page-subtitle">Manage your customer accounts</p>
        </div>
        <Link to="/customers/new" className="btn btn-primary">
          <PlusIcon className="w-5 h-5" />
          New Customer
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
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
          onRowClick={(row) => navigate(`/customers/${row.id}`)}
          pagination={
            data?.pagination
              ? {
                  page: data.pagination.page,
                  pageSize: data.pagination.pageSize,
                  total: data.pagination.total,
                  onPageChange: setPage,
                }
              : undefined
          }
          emptyMessage="No customers found. Create your first customer to get started."
        />
      </div>
    </div>
  );
}
