import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { get, post } from '../../services/api';
import toast from 'react-hot-toast';

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
  // const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({ isParent: false });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts-tree'],
    queryFn: () => get<Account[]>('/accounts/tree'),
  });

  const { data: types } = useQuery({
    queryKey: ['account-types'],
    queryFn: () => get<any[]>('/accounts/types/list'),
  });

  const loadTrading = useMutation({
    mutationFn: () => post('/accounts/load-template', { templateId: 'trading' }),
    onSuccess: (res: any) => {
      const created = res?.created ?? 0;
      const existing = res?.existing ?? 0;
      toast.success(`Trading template imported. Added: ${created}${existing ? `, Existing: ${existing}` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['accounts-tree'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Failed to load template'),
  });

  const createAccount = useMutation({
    mutationFn: (payload: any) => post('/accounts', payload),
    onSuccess: () => {
      toast.success('Account created');
      setShowAdd(false);
      setForm({ isParent: false });
      queryClient.invalidateQueries({ queryKey: ['accounts-tree'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Failed to create account'),
  });

  const parentOptions = (() => {
    const list: { id: number; label: string }[] = [];
    const walk = (nodes?: Account[], prefix = '') => {
      nodes?.forEach((n) => {
        list.push({ id: n.id, label: `${prefix}${n.accountNo} - ${n.name}` });
        if (n.children && n.children.length > 0) walk(n.children, `${prefix}— `);
      });
    };
    walk(accounts);
    return list;
  })();

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
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                const preview: any = await post('/accounts/load-template', { templateId: 'trading', dryRun: true });
                const existing = preview?.existing ?? 0;
                const willCreate = preview?.willCreate ?? 0;
                const message = existing > 0
                  ? `Some accounts from this template already exist (${existing}). Importing will add ${willCreate} missing account(s) only and will not change existing ones. Proceed?`
                  : 'Load the Trading template into your chart? New accounts will be added.';
                if (confirm(message)) {
                  loadTrading.mutate();
                }
              } catch (err: any) {
                toast.error(err?.response?.data?.error?.message || 'Failed to check template');
              }
            }}
            className="btn btn-secondary"
            disabled={loadTrading.isPending}
            title="Adds standard Trading accounts if missing"
          >
            Load Trading Template
          </button>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">
            <PlusIcon className="w-5 h-5 mr-2" />
            New Account
          </button>
        </div>
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

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Account</h2>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Close</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Account No *</label>
                <input
                  className="input w-full"
                  value={form.accountNo || ''}
                  onChange={(e) => setForm({ ...form, accountNo: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Name *</label>
                <input
                  className="input w-full"
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Type *</label>
                <select
                  className="input w-full"
                  value={form.typeId || ''}
                  onChange={(e) => setForm({ ...form, typeId: e.target.value ? parseInt(e.target.value) : '' })}
                >
                  <option value="">Select type</option>
                  {(types || []).map((t: any) => (
                    <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Parent (optional)</label>
                <select
                  className="input w-full"
                  value={form.parentId || ''}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value ? parseInt(e.target.value) : undefined })}
                >
                  <option value="">(None)</option>
                  {parentOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isParent"
                  type="checkbox"
                  checked={!!form.isParent}
                  onChange={(e) => setForm({ ...form, isParent: e.target.checked })}
                />
                <label htmlFor="isParent">Is Group (non-postable)</label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!form.accountNo || !form.name || !form.typeId || createAccount.isPending}
                onClick={() => createAccount.mutate(form)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
