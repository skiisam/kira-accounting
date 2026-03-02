import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  EllipsisVerticalIcon,
  Bars2Icon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { get, post } from '../../services/api';
import toast from 'react-hot-toast';

// ====================
// Types
// ====================

interface Account {
  id: number;
  accountNo: string;
  name: string;
  type: { id: number; name: string; category: string; code?: string };
  specialType?: string;
  isParent: boolean;
  parentId?: number | null;
  currency?: string;
  currentBalance?: number;
  children?: Account[];
  level?: number;
}

interface AccountGroup {
  code: string;
  name: string;
  category: string;
  prefix: string;
  accounts: Account[];
  totalBalance: number;
  expanded: boolean;
}

// ====================
// Group Configuration
// ====================

const ACCOUNT_GROUPS: { code: string; name: string; prefix: string; category: string; bgColor: string }[] = [
  { code: 'CAPITAL', name: 'CAPITAL', prefix: '100', category: 'EQUITY', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
  { code: 'RETAINED', name: 'RETAINED EARNING', prefix: '150', category: 'EQUITY', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
  { code: 'FIXED_ASSETS', name: 'FIXED ASSETS', prefix: '200', category: 'ASSET', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  { code: 'OTHER_ASSETS', name: 'OTHER ASSETS', prefix: '210', category: 'ASSET', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  { code: 'CURRENT_ASSETS', name: 'CURRENT ASSETS', prefix: '300', category: 'ASSET', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  { code: 'LIABILITIES', name: 'LIABILITIES', prefix: '400', category: 'LIABILITY', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  { code: 'EQUITY', name: 'EQUITY', prefix: '500', category: 'EQUITY', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
  { code: 'REVENUE', name: 'REVENUE', prefix: '600', category: 'REVENUE', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  { code: 'EXPENSES', name: 'EXPENSES', prefix: '700', category: 'EXPENSE', bgColor: 'bg-red-50 dark:bg-red-900/20' },
];

// ====================
// Utility Functions
// ====================

function getGroupForAccount(account: Account): string {
  const accountNo = account.accountNo || '';
  const numPart = parseInt(accountNo.replace(/[^0-9]/g, ''), 10);
  
  if (numPart >= 100 && numPart < 150) return 'CAPITAL';
  if (numPart >= 150 && numPart < 200) return 'RETAINED';
  if (numPart >= 200 && numPart < 210) return 'FIXED_ASSETS';
  if (numPart >= 210 && numPart < 300) return 'OTHER_ASSETS';
  if (numPart >= 300 && numPart < 400) return 'CURRENT_ASSETS';
  if (numPart >= 400 && numPart < 500) return 'LIABILITIES';
  if (numPart >= 500 && numPart < 600) return 'EQUITY';
  if (numPart >= 600 && numPart < 700) return 'REVENUE';
  if (numPart >= 700) return 'EXPENSES';
  
  // Fallback based on category
  const cat = account.type?.category?.toUpperCase() || '';
  if (cat === 'ASSET') return 'CURRENT_ASSETS';
  if (cat === 'LIABILITY') return 'LIABILITIES';
  if (cat === 'EQUITY') return 'EQUITY';
  if (cat === 'REVENUE') return 'REVENUE';
  if (cat === 'EXPENSE') return 'EXPENSES';
  
  return 'OTHER_ASSETS';
}

function flattenTree(accounts: Account[], level = 0): Account[] {
  const result: Account[] = [];
  for (const account of accounts) {
    result.push({ ...account, level });
    if (account.children && account.children.length > 0) {
      result.push(...flattenTree(account.children, level + 1));
    }
  }
  return result;
}

function buildGroupedAccounts(
  accounts: Account[],
  expandedGroups: Set<string>
): AccountGroup[] {
  const groupMap: Record<string, Account[]> = {};
  
  // Initialize groups
  ACCOUNT_GROUPS.forEach(g => {
    groupMap[g.code] = [];
  });
  
  // Flatten and assign to groups
  const flatAccounts = flattenTree(accounts);
  
  flatAccounts.forEach(account => {
    const groupCode = getGroupForAccount(account);
    if (groupMap[groupCode]) {
      groupMap[groupCode].push(account);
    }
  });
  
  return ACCOUNT_GROUPS.map(group => ({
    code: group.code,
    name: group.name,
    category: group.category,
    prefix: group.prefix,
    accounts: groupMap[group.code] || [],
    totalBalance: (groupMap[group.code] || []).reduce((sum, a) => sum + (a.currentBalance || 0), 0),
    expanded: expandedGroups.has(group.code),
  }));
}

function formatCurrency(value: number | undefined, currency = 'MYR'): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function getSpecialTypeBadgeColor(specialType: string): string {
  const type = specialType?.toUpperCase() || '';
  switch (type) {
    case 'RETAINED_EARNING':
    case 'RETAINEDEARNING':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'CASH':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'BANK':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'AR':
    case 'ACCOUNTS_RECEIVABLE':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'AP':
    case 'ACCOUNTS_PAYABLE':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    case 'STOCK':
    case 'INVENTORY':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
    case 'TAX':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
}

function getCategoryBadgeColor(category: string): string {
  const cat = category?.toUpperCase() || '';
  switch (cat) {
    case 'ASSET':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'LIABILITY':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'EQUITY':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'REVENUE':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'EXPENSE':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
}

// ====================
// Account Row Component
// ====================

interface AccountRowProps {
  account: Account;
  onEdit: (account: Account) => void;
  expandedAccounts: Set<number>;
  toggleAccountExpand: (id: number) => void;
}

function AccountRow({ account, onEdit, expandedAccounts, toggleAccountExpand }: AccountRowProps) {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const hasChildren = account.children && account.children.length > 0;
  const isExpanded = expandedAccounts.has(account.id);
  const indent = (account.level || 0) * 20;
  const balance = account.currentBalance || 0;
  const isPositive = balance >= 0;

  return (
    <tr
      className={`
        hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors
        ${account.isParent ? 'font-medium' : ''}
      `}
    >
      {/* Drag Handle */}
      <td className="w-10 px-2 text-gray-400 cursor-grab">
        <Bars2Icon className="w-4 h-4" />
      </td>
      
      {/* Description (Name) with indent */}
      <td className="py-2" style={{ paddingLeft: `${indent + 8}px` }}>
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleAccountExpand(account.id);
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <span
            className={`cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 ${
              account.isParent ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
            }`}
            onClick={() => navigate(`/gl/accounts/${account.id}`)}
          >
            {account.name}
          </span>
        </div>
      </td>
      
      {/* Account No */}
      <td className="px-4 py-2 font-mono text-sm text-gray-600 dark:text-gray-400">
        {account.accountNo}
      </td>
      
      {/* Account Type (Category) */}
      <td className="px-4 py-2">
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryBadgeColor(account.type?.category)}`}>
          {account.type?.category || '-'}
        </span>
      </td>
      
      {/* Special Account Type */}
      <td className="px-4 py-2">
        {account.specialType ? (
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getSpecialTypeBadgeColor(account.specialType)}`}>
            {account.specialType.replace(/_/g, ' ')}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )}
      </td>
      
      {/* Currency */}
      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
        {account.currency || 'MYR'}
      </td>
      
      {/* Current Balance */}
      <td className={`px-4 py-2 text-right font-mono text-sm ${
        isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      }`}>
        {formatCurrency(balance, account.currency)}
      </td>
      
      {/* Actions */}
      <td className="px-4 py-2 relative">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            <EllipsisVerticalIcon className="w-4 h-4 text-gray-500" />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-20 py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(account);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  Edit Account
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/gl/accounts/${account.id}`);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  View Details
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(account.accountNo);
                    toast.success('Account No. copied');
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  Copy Account No.
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ====================
// Group Header Component
// ====================

interface GroupHeaderProps {
  group: AccountGroup;
  groupConfig: typeof ACCOUNT_GROUPS[0];
  onToggle: () => void;
  onAddAccount: (groupCode: string) => void;
}

function GroupHeader({ group, groupConfig, onToggle, onAddAccount }: GroupHeaderProps) {
  return (
    <tr
      className={`${groupConfig.bgColor} cursor-pointer hover:brightness-95 transition-all`}
      onClick={onToggle}
    >
      {/* Drag Handle (empty for groups) */}
      <td className="w-10 px-2">
        <span className="w-4" />
      </td>
      
      {/* Group Name */}
      <td className="py-3 px-4 font-bold text-gray-800 dark:text-gray-200" colSpan={2}>
        <div className="flex items-center gap-2">
          {group.expanded ? (
            <ChevronDownIcon className="w-5 h-5" />
          ) : (
            <ChevronRightIcon className="w-5 h-5" />
          )}
          <span>{group.name}</span>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ({group.prefix}-xxx)
          </span>
          <span className="ml-2 px-2 py-0.5 text-xs bg-white/60 dark:bg-slate-800/60 rounded-full font-medium text-gray-600 dark:text-gray-400">
            {group.accounts.length} accounts
          </span>
        </div>
      </td>
      
      {/* Category */}
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryBadgeColor(group.category)}`}>
          {group.category}
        </span>
      </td>
      
      {/* Special Type (empty for groups) */}
      <td className="px-4 py-3">-</td>
      
      {/* Currency */}
      <td className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">MYR</td>
      
      {/* Total Balance */}
      <td className={`px-4 py-3 text-right font-mono font-bold ${
        group.totalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      }`}>
        {formatCurrency(group.totalBalance)}
      </td>
      
      {/* Add Account Button */}
      <td className="px-4 py-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddAccount(group.code);
          }}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Account
        </button>
      </td>
    </tr>
  );
}

// ====================
// Main Component
// ====================

export default function AccountListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({ isParent: false });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(ACCOUNT_GROUPS.map(g => g.code)) // Expand all by default
  );
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());

  // Fetch accounts tree
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts-tree'],
    queryFn: () => get<Account[]>('/accounts/tree'),
  });

  // Fetch account types for form
  const { data: types } = useQuery({
    queryKey: ['account-types'],
    queryFn: () => get<any[]>('/accounts/types/list'),
  });

  // Load trading template mutation
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

  // Create account mutation
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

  // Build parent options for form
  const parentOptions = useMemo(() => {
    const list: { id: number; label: string }[] = [];
    const walk = (nodes?: Account[], prefix = '') => {
      nodes?.forEach((n) => {
        list.push({ id: n.id, label: `${prefix}${n.accountNo} - ${n.name}` });
        if (n.children && n.children.length > 0) walk(n.children, `${prefix}— `);
      });
    };
    walk(accounts);
    return list;
  }, [accounts]);

  // Filter accounts by search
  const filteredAccounts = useMemo(() => {
    if (!search || !accounts) return accounts;
    
    const searchLower = search.toLowerCase();
    
    const filterTree = (nodes: Account[]): Account[] => {
      return nodes.reduce<Account[]>((acc, node) => {
        const matches =
          node.accountNo.toLowerCase().includes(searchLower) ||
          node.name.toLowerCase().includes(searchLower) ||
          (node.type?.category || '').toLowerCase().includes(searchLower) ||
          (node.specialType || '').toLowerCase().includes(searchLower);
        
        const filteredChildren = node.children ? filterTree(node.children) : [];
        
        if (matches || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children,
          });
        }
        
        return acc;
      }, []);
    };
    
    return filterTree(accounts);
  }, [accounts, search]);

  // Build grouped accounts
  const groupedAccounts = useMemo(() => {
    return buildGroupedAccounts(filteredAccounts || [], expandedGroups);
  }, [filteredAccounts, expandedGroups]);

  // Toggle group expand/collapse
  const toggleGroup = (code: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // Toggle account expand/collapse
  const toggleAccountExpand = (id: number) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Handle export to Excel
  const handleExport = () => {
    toast.success('Exporting to Excel...');
    // TODO: Implement actual export
  };

  // Handle print report
  const handlePrint = () => {
    window.print();
  };

  // Handle add account to specific group
  const handleAddToGroup = (groupCode: string) => {
    const group = ACCOUNT_GROUPS.find(g => g.code === groupCode);
    if (group) {
      setForm({
        isParent: false,
        accountNo: `${group.prefix}-`,
      });
      setShowAdd(true);
    }
  };

  // Handle edit account
  const handleEdit = (account: Account) => {
    navigate(`/gl/accounts/${account.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <span className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
              <BookOpenIcon className="w-6 h-6" />
            </span>
            Chart of Accounts
          </h1>
          <p className="page-subtitle">Manage your general ledger accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="btn btn-secondary"
            title="Print Report"
          >
            <PrinterIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={handleExport}
            className="btn btn-secondary"
            title="Export to Excel"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={async () => {
              try {
                const preview: any = await post('/accounts/load-template', { templateId: 'trading', dryRun: true });
                const existing = preview?.existing ?? 0;
                const willCreate = preview?.willCreate ?? 0;
                const message = existing > 0
                  ? `Some accounts already exist (${existing}). Import will add ${willCreate} missing account(s). Proceed?`
                  : 'Load the Trading template? New accounts will be added.';
                if (confirm(message)) {
                  loadTrading.mutate();
                }
              } catch (err: any) {
                toast.error(err?.response?.data?.error?.message || 'Failed to check template');
              }
            }}
            className="btn btn-secondary"
            disabled={loadTrading.isPending}
            title="Load Trading Template"
          >
            Load Template
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="btn btn-success"
          >
            <PlusIcon className="w-5 h-5" />
            New
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="card">
        {/* Search Bar */}
        <div className="card-header">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by account no, name, type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total: {(accounts || []).length} accounts
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                <th className="w-10 px-2 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Account No.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Account Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Special Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Currency
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Current Balance
                </th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="inline-flex flex-col items-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-3" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">Loading accounts...</span>
                    </div>
                  </td>
                </tr>
              ) : groupedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="inline-flex flex-col items-center">
                      <BookOpenIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                      <span className="text-gray-500 dark:text-gray-400">No accounts found</span>
                      <button
                        onClick={() => setShowAdd(true)}
                        className="mt-3 btn btn-primary"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Create First Account
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedAccounts.map(group => {
                  const groupConfig = ACCOUNT_GROUPS.find(g => g.code === group.code)!;
                  // Only show groups that have accounts or when not searching
                  if (group.accounts.length === 0 && search) return null;
                  
                  return (
                    <React.Fragment key={group.code}>
                      <GroupHeader
                        group={group}
                        groupConfig={groupConfig}
                        onToggle={() => toggleGroup(group.code)}
                        onAddAccount={handleAddToGroup}
                      />
                      {group.expanded && group.accounts.map(account => (
                        <AccountRow
                          key={account.id}
                          account={account}
                          onEdit={handleEdit}
                          expandedAccounts={expandedAccounts}
                          toggleAccountExpand={toggleAccountExpand}
                        />
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add New Account
              </h2>
              <button
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                onClick={() => setShowAdd(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Account No. *</label>
                  <input
                    className="input w-full font-mono"
                    placeholder="e.g., 300-001"
                    value={form.accountNo || ''}
                    onChange={(e) => setForm({ ...form, accountNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Name *</label>
                  <input
                    className="input w-full"
                    placeholder="Account name"
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
                      <option key={t.id} value={t.id}>
                        {t.code} - {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Parent Account (optional)</label>
                  <select
                    className="input w-full"
                    value={form.parentId || ''}
                    onChange={(e) => setForm({ ...form, parentId: e.target.value ? parseInt(e.target.value) : undefined })}
                  >
                    <option value="">(None - Top Level)</option>
                    {parentOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select
                    className="input w-full"
                    value={form.currency || 'MYR'}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  >
                    <option value="MYR">MYR - Malaysian Ringgit</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="SGD">SGD - Singapore Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>
                <div>
                  <label className="label">Special Type</label>
                  <select
                    className="input w-full"
                    value={form.specialType || ''}
                    onChange={(e) => setForm({ ...form, specialType: e.target.value || undefined })}
                  >
                    <option value="">(None)</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    <option value="AR">Accounts Receivable</option>
                    <option value="AP">Accounts Payable</option>
                    <option value="RETAINED_EARNING">Retained Earning</option>
                    <option value="STOCK">Stock/Inventory</option>
                    <option value="TAX">Tax</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <input
                  id="isParent"
                  type="checkbox"
                  checked={!!form.isParent}
                  onChange={(e) => setForm({ ...form, isParent: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isParent" className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Group Account</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">(non-postable, for organizing)</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!form.accountNo || !form.name || !form.typeId || createAccount.isPending}
                onClick={() => createAccount.mutate(form)}
              >
                {createAccount.isPending ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
