import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { get } from '../../services/api';
import DataTable from '../../components/common/DataTable';

interface StockBalance {
  product: { code: string; description: string };
  location: { code: string; name: string };
  balanceQty: number;
  reservedQty: number;
}

export default function StockBalancePage() {
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('');

  const { data: balances, isLoading } = useQuery({
    queryKey: ['stock-balance', locationId],
    queryFn: () => get<StockBalance[]>('/stock/balance', { locationId: locationId || undefined }),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => get<{ id: number; code: string; name: string }[]>('/stock/locations'),
  });

  const filteredData = search
    ? balances?.filter(b => 
        b.product.code.toLowerCase().includes(search.toLowerCase()) ||
        b.product.description.toLowerCase().includes(search.toLowerCase())
      )
    : balances;

  const columns = [
    { key: 'product.code', header: 'Product Code', render: (row: StockBalance) => row.product.code },
    { key: 'product.description', header: 'Description', render: (row: StockBalance) => row.product.description },
    { key: 'location', header: 'Location', render: (row: StockBalance) => row.location.name },
    { key: 'balanceQty', header: 'Balance', className: 'text-right font-mono', render: (row: StockBalance) => Number(row.balanceQty).toLocaleString() },
    { key: 'reservedQty', header: 'Reserved', className: 'text-right font-mono', render: (row: StockBalance) => Number(row.reservedQty).toLocaleString() },
    { 
      key: 'available', 
      header: 'Available', 
      className: 'text-right font-mono',
      render: (row: StockBalance) => (Number(row.balanceQty) - Number(row.reservedQty)).toLocaleString() 
    },
  ];

  // Calculate totals
  const totalBalance = filteredData?.reduce((sum, b) => sum + Number(b.balanceQty), 0) || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock Balance</h1>
      </div>

      <div className="card">
        <div className="card-header flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="input w-auto"
          >
            <option value="">All Locations</option>
            {locations?.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
        <DataTable
          columns={columns}
          data={filteredData || []}
          loading={isLoading}
          emptyMessage="No stock data available"
        />
        <div className="border-t p-4 flex justify-end">
          <div className="text-sm text-gray-600">
            Total Items: <span className="font-semibold">{filteredData?.length || 0}</span>
            <span className="mx-4">|</span>
            Total Balance: <span className="font-semibold font-mono">{totalBalance.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
