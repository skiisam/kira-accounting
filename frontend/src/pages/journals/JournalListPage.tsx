import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getPaginated } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import { format } from 'date-fns';

interface JournalEntry {
  id: number;
  journalNo: string;
  journalDate: string;
  description?: string;
  totalDebit: number;
  totalCredit: number;
  journalType?: { name: string };
  sourceType?: string;
  isPosted: boolean;
}

export default function JournalListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['journals', page, search],
    queryFn: () => getPaginated<JournalEntry>('/journals', { page, pageSize: 20, search }),
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

  const columns = [
    { key: 'journalNo', header: 'Journal No' },
    { key: 'journalDate', header: 'Date', render: (row: JournalEntry) => format(new Date(row.journalDate), 'dd/MM/yyyy') },
    { key: 'description', header: 'Description' },
    { key: 'journalType', header: 'Type', render: (row: JournalEntry) => row.journalType?.name || '-' },
    { key: 'totalDebit', header: 'Debit', render: (row: JournalEntry) => formatCurrency(row.totalDebit) },
    { key: 'totalCredit', header: 'Credit', render: (row: JournalEntry) => formatCurrency(row.totalCredit) },
    { key: 'sourceType', header: 'Source', render: (row: JournalEntry) => row.sourceType || 'Manual' },
    {
      key: 'isPosted',
      header: 'Status',
      render: (row: JournalEntry) => (
        <span className={`badge ${row.isPosted ? 'badge-success' : 'badge-warning'}`}>
          {row.isPosted ? 'Posted' : 'Draft'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
        <button onClick={() => navigate('/gl/journals/new')} className="btn btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          New Journal
        </button>
      </div>

      <div className="card">
        <div className="card-header flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search journals..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-10"
            />
          </div>
          <input type="date" className="input w-auto" placeholder="From" />
          <input type="date" className="input w-auto" placeholder="To" />
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          onRowClick={(row) => navigate(`/gl/journals/${row.id}`)}
          pagination={data?.pagination ? { ...data.pagination, onPageChange: setPage } : undefined}
        />
      </div>
    </div>
  );
}
