import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { get } from '../../services/api';

interface Account {
  id: number;
  accountNo: string;
  name: string;
  type: { name: string; category: string };
  specialType?: string;
  isParent: boolean;
  children?: Account[];
}

function AccountRow({ account, level = 0 }: { account: Account; level?: number }) {
  const [expanded, setExpanded] = useState(level < 2);
  const navigate = useNavigate();
  const hasChildren = account.children && account.children.length > 0;
  const indent = level * 24;

  return (
    <>
      <tr 
        className={`hover:bg-gray-50 ${account.isParent ? 'font-medium bg-gray-50' : ''}`}
        onClick={() => !account.isParent && navigate(`/gl/accounts/${account.id}`)}
      >
        <td style={{ paddingLeft: `${indent + 16}px` }} className="flex items-center gap-2">
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="p-1">
              {expanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-6" />
          )}
          <span className="font-mono">{account.accountNo}</span>
        </td>
        <td>{account.name}</td>
        <td>
          <span className={`badge ${
            account.type.category === 'ASSET' ? 'badge-info' :
            account.type.category === 'LIABILITY' ? 'badge-warning' :
            account.type.category === 'EQUITY' ? 'badge-success' :
            account.type.category === 'REVENUE' ? 'badge-success' :
            'badge-danger'
          }`}>
            {account.type.category}
          </span>
        </td>
        <td>{account.specialType || '-'}</td>
      </tr>
      {expanded && account.children?.map((child) => (
        <AccountRow key={child.id} account={child} level={level + 1} />
      ))}
    </>
  );
}

export default function AccountListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts-tree'],
    queryFn: () => get<Account[]>('/accounts/tree'),
  });

  const filteredAccounts = search
    ? accounts?.filter(a => 
        a.accountNo.toLowerCase().includes(search.toLowerCase()) ||
        a.name.toLowerCase().includes(search.toLowerCase())
      )
    : accounts;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
        <button onClick={() => navigate('/gl/accounts/new')} className="btn btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          New Account
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account No</th>
                <th>Name</th>
                <th>Category</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
              ) : filteredAccounts?.map((account) => (
                <AccountRow key={account.id} account={account} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
