import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BanknotesIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  LinkIcon,
  SparklesIcon,
  PrinterIcon,
  DocumentCheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowsRightLeftIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
// import { get, post } from '../../services/api';
import toast from 'react-hot-toast';

// ====================
// Types
// ====================

interface BankAccount {
  id: number;
  accountNo: string;
  name: string;
  currency: string;
  currentBalance: number;
}

interface BankStatementTransaction {
  id: number;
  date: string;
  description: string;
  reference: string;
  debit: number | null;
  credit: number | null;
  balance: number;
  status: 'pending' | 'matched' | 'excluded';
  matchedBookTransactionId?: number;
}

interface BookTransaction {
  id: number;
  date: string;
  description: string;
  reference: string;
  debit: number | null;
  credit: number | null;
  balance: number;
  status: 'pending' | 'matched';
  matchedBankTransactionId?: number;
  journalId?: number;
}

interface ReconciliationSummary {
  openingBalance: number;
  statementBalance: number;
  bookBalance: number;
  difference: number;
  unmatchedBankCount: number;
  unmatchedBookCount: number;
}

interface ReconciliationHistory {
  id: number;
  startDate: string;
  endDate: string;
  statementBalance: number;
  bookBalance: number;
  difference: number;
  status: 'completed' | 'in_progress' | 'abandoned';
  completedAt?: string;
  completedBy?: string;
}

interface MatchSuggestion {
  bankTransactionId: number;
  bookTransactionId: number;
  confidence: number;
  reason: string;
}

// ====================
// Mock Data Generator
// ====================

function generateMockBankAccounts(): BankAccount[] {
  return [
    { id: 1, accountNo: '300-001', name: 'Maybank Current Account', currency: 'MYR', currentBalance: 125430.50 },
    { id: 2, accountNo: '300-002', name: 'CIMB Fixed Deposit', currency: 'MYR', currentBalance: 50000.00 },
    { id: 3, accountNo: '300-003', name: 'Hong Leong USD Account', currency: 'USD', currentBalance: 8500.00 },
  ];
}

function generateMockBankTransactions(): BankStatementTransaction[] {
  return [
    { id: 1, date: '2026-02-01', description: 'Customer Payment - ABC Trading', reference: 'TRF-001', debit: null, credit: 5000, balance: 120000, status: 'matched', matchedBookTransactionId: 101 },
    { id: 2, date: '2026-02-03', description: 'Supplier Payment - XYZ Supplies', reference: 'CHQ-123', debit: 2500, credit: null, balance: 117500, status: 'matched', matchedBookTransactionId: 102 },
    { id: 3, date: '2026-02-05', description: 'Bank Charges', reference: 'BC-FEB', debit: 35, credit: null, balance: 117465, status: 'pending' },
    { id: 4, date: '2026-02-07', description: 'Interest Income', reference: 'INT-002', debit: null, credit: 125.50, balance: 117590.50, status: 'pending' },
    { id: 5, date: '2026-02-10', description: 'Customer Payment - Global Tech', reference: 'TRF-002', debit: null, credit: 12000, balance: 129590.50, status: 'pending' },
    { id: 6, date: '2026-02-12', description: 'Rent Payment', reference: 'GIRO-001', debit: 3500, credit: null, balance: 126090.50, status: 'pending' },
    { id: 7, date: '2026-02-15', description: 'Utility Payment - TNB', reference: 'DD-TNB', debit: 850, credit: null, balance: 125240.50, status: 'excluded' },
    { id: 8, date: '2026-02-18', description: 'Customer Payment - Premier Industries', reference: 'TRF-003', debit: null, credit: 8900, balance: 134140.50, status: 'pending' },
    { id: 9, date: '2026-02-20', description: 'Petty Cash Withdrawal', reference: 'ATM-001', debit: 500, credit: null, balance: 133640.50, status: 'pending' },
    { id: 10, date: '2026-02-25', description: 'Supplier Payment - Quality Co', reference: 'CHQ-124', debit: 8210, credit: null, balance: 125430.50, status: 'pending' },
  ];
}

function generateMockBookTransactions(): BookTransaction[] {
  return [
    { id: 101, date: '2026-02-01', description: 'Payment from ABC Trading - INV-001', reference: 'REC-001', debit: null, credit: 5000, balance: 120000, status: 'matched', matchedBankTransactionId: 1, journalId: 1001 },
    { id: 102, date: '2026-02-03', description: 'Payment to XYZ Supplies - PI-001', reference: 'PAY-001', debit: 2500, credit: null, balance: 117500, status: 'matched', matchedBankTransactionId: 2, journalId: 1002 },
    { id: 103, date: '2026-02-05', description: 'Bank Charges - Feb 2026', reference: 'JV-BC-001', debit: 35, credit: null, balance: 117465, status: 'pending', journalId: 1003 },
    { id: 104, date: '2026-02-10', description: 'Payment from Global Tech - INV-002', reference: 'REC-002', debit: null, credit: 12000, balance: 129465, status: 'pending', journalId: 1004 },
    { id: 105, date: '2026-02-12', description: 'Rent Payment - Feb 2026', reference: 'PAY-002', debit: 3500, credit: null, balance: 125965, status: 'pending', journalId: 1005 },
    { id: 106, date: '2026-02-18', description: 'Payment from Premier - INV-003', reference: 'REC-003', debit: null, credit: 8900, balance: 134865, status: 'pending', journalId: 1006 },
    { id: 107, date: '2026-02-20', description: 'Petty Cash Top Up', reference: 'JV-PC-001', debit: 500, credit: null, balance: 134365, status: 'pending', journalId: 1007 },
    { id: 108, date: '2026-02-22', description: 'Payment to Quality Co - PI-002', reference: 'PAY-003', debit: 8200, credit: null, balance: 126165, status: 'pending', journalId: 1008 },
    { id: 109, date: '2026-02-25', description: 'Additional Payment to Quality Co', reference: 'PAY-004', debit: 10, credit: null, balance: 126155, status: 'pending', journalId: 1009 },
  ];
}

function generateMockHistory(): ReconciliationHistory[] {
  return [
    { id: 1, startDate: '2026-01-01', endDate: '2026-01-31', statementBalance: 115000, bookBalance: 115000, difference: 0, status: 'completed', completedAt: '2026-02-05', completedBy: 'John Doe' },
    { id: 2, startDate: '2025-12-01', endDate: '2025-12-31', statementBalance: 110500, bookBalance: 110500, difference: 0, status: 'completed', completedAt: '2026-01-08', completedBy: 'Jane Smith' },
    { id: 3, startDate: '2025-11-01', endDate: '2025-11-30', statementBalance: 95200, bookBalance: 95200, difference: 0, status: 'completed', completedAt: '2025-12-10', completedBy: 'John Doe' },
  ];
}

// ====================
// Utility Functions
// ====================

function formatCurrency(value: number | null | undefined, currency = 'MYR'): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'matched':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircleIcon className="w-3 h-3" />
          Matched
        </span>
      );
    case 'excluded':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <XCircleIcon className="w-3 h-3" />
          Excluded
        </span>
      );
    case 'pending':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          <ClockIcon className="w-3 h-3" />
          Pending
        </span>
      );
  }
}

function getReconciliationStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircleIcon className="w-3 h-3" />
          Completed
        </span>
      );
    case 'in_progress':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <ArrowPathIcon className="w-3 h-3" />
          In Progress
        </span>
      );
    case 'abandoned':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          <XCircleIcon className="w-3 h-3" />
          Abandoned
        </span>
      );
    default:
      return null;
  }
}

// ====================
// Summary Card Component
// ====================

interface SummaryCardProps {
  title: string;
  value: number;
  currency?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  subtitle?: string;
}

function SummaryCard({ title, value, currency = 'MYR', icon, variant = 'default', subtitle }: SummaryCardProps) {
  const variantClasses = {
    default: 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };

  const valueClasses = {
    default: 'text-gray-900 dark:text-white',
    success: 'text-green-700 dark:text-green-400',
    warning: 'text-amber-700 dark:text-amber-400',
    danger: 'text-red-700 dark:text-red-400',
  };

  return (
    <div className={`rounded-xl border p-4 ${variantClasses[variant]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</span>
        <span className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-700">{icon}</span>
      </div>
      <p className={`text-xl font-bold font-mono ${valueClasses[variant]}`}>
        {formatCurrency(value, currency)}
      </p>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

// ====================
// Transaction Row Component
// ====================

interface TransactionRowProps {
  transaction: BankStatementTransaction | BookTransaction;
  type: 'bank' | 'book';
  isSelected: boolean;
  onSelect: () => void;
  onMatch: () => void;
  onExclude?: () => void;
  onView: () => void;
  hasSuggestion?: boolean;
  isDragTarget?: boolean;
}

function TransactionRow({
  transaction,
  type,
  isSelected,
  onSelect,
  onMatch,
  onExclude,
  onView,
  hasSuggestion,
  isDragTarget,
}: TransactionRowProps) {
  const isMatchable = transaction.status === 'pending';

  return (
    <tr
      className={`
        transition-all cursor-pointer
        ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-inset ring-primary-500' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}
        ${isDragTarget ? 'bg-green-50 dark:bg-green-900/20 ring-2 ring-inset ring-green-500' : ''}
        ${transaction.status === 'matched' ? 'opacity-60' : ''}
        ${transaction.status === 'excluded' ? 'opacity-40 line-through' : ''}
      `}
      onClick={onSelect}
      draggable={type === 'bank' && isMatchable}
      onDragStart={(e) => {
        e.dataTransfer.setData('bankTransactionId', transaction.id.toString());
        e.dataTransfer.effectAllowed = 'link';
      }}
    >
      {/* Checkbox */}
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          disabled={!isMatchable}
          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
        />
      </td>

      {/* Date */}
      <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {formatDate(transaction.date)}
      </td>

      {/* Description */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-900 dark:text-white truncate max-w-[200px]">
            {transaction.description}
          </span>
          {hasSuggestion && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
              <SparklesIcon className="w-3 h-3" />
              AI
            </span>
          )}
        </div>
      </td>

      {/* Reference */}
      <td className="px-3 py-2 text-sm font-mono text-gray-500 dark:text-gray-400">
        {transaction.reference}
      </td>

      {/* Debit */}
      <td className="px-3 py-2 text-right font-mono text-sm text-red-600 dark:text-red-400">
        {transaction.debit ? formatCurrency(transaction.debit) : '-'}
      </td>

      {/* Credit */}
      <td className="px-3 py-2 text-right font-mono text-sm text-green-600 dark:text-green-400">
        {transaction.credit ? formatCurrency(transaction.credit) : '-'}
      </td>

      {/* Balance */}
      <td className="px-3 py-2 text-right font-mono text-sm text-gray-700 dark:text-gray-300">
        {formatCurrency(transaction.balance)}
      </td>

      {/* Status */}
      <td className="px-3 py-2">{getStatusBadge(transaction.status)}</td>

      {/* Actions */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          {isMatchable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMatch();
              }}
              className="p-1.5 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors text-primary-600 dark:text-primary-400"
              title="Match"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
          )}
          {type === 'bank' && onExclude && isMatchable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExclude();
              }}
              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-600 dark:text-red-400"
              title="Exclude"
            >
              <XCircleIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
            title="View"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ====================
// Main Component
// ====================

export default function BankReconciliationPage() {
  const queryClient = useQueryClient();

  // State
  const [selectedBankAccount, setSelectedBankAccount] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState({ start: '2026-02-01', end: '2026-02-28' });
  const [statementBalance, setStatementBalance] = useState<string>('125430.50');
  const [selectedBankTransactions, setSelectedBankTransactions] = useState<Set<number>>(new Set());
  const [selectedBookTransactions, setSelectedBookTransactions] = useState<Set<number>>(new Set());
  const [bankSearch, setBankSearch] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [bankStatusFilter, setBankStatusFilter] = useState<'all' | 'pending' | 'matched' | 'excluded'>('all');
  const [bookStatusFilter, setBookStatusFilter] = useState<'all' | 'pending' | 'matched'>('all');
  const [showHistory, setShowHistory] = useState(false);
  const [dragTargetId, setDragTargetId] = useState<number | null>(null);

  // Queries (using mock data for now)
  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      // In production: return get<BankAccount[]>('/accounts?specialType=BANK');
      return generateMockBankAccounts();
    },
  });

  const { data: bankTransactions, isLoading: bankLoading } = useQuery({
    queryKey: ['bank-transactions', selectedBankAccount, dateRange],
    queryFn: async () => {
      // In production: return get<BankStatementTransaction[]>('/banking/statements', { accountId: selectedBankAccount, ...dateRange });
      return generateMockBankTransactions();
    },
    enabled: !!selectedBankAccount,
  });

  const { data: bookTransactions, isLoading: bookLoading } = useQuery({
    queryKey: ['book-transactions', selectedBankAccount, dateRange],
    queryFn: async () => {
      // In production: return get<BookTransaction[]>('/banking/book-entries', { accountId: selectedBankAccount, ...dateRange });
      return generateMockBookTransactions();
    },
    enabled: !!selectedBankAccount,
  });

  const { data: history } = useQuery({
    queryKey: ['reconciliation-history', selectedBankAccount],
    queryFn: async () => {
      // In production: return get<ReconciliationHistory[]>('/banking/reconciliation/history', { accountId: selectedBankAccount });
      return generateMockHistory();
    },
    enabled: !!selectedBankAccount,
  });

  // Calculate summary
  const summary = useMemo<ReconciliationSummary>(() => {
    const openingBalance = 115000; // From last reconciliation
    const statementBal = parseFloat(statementBalance) || 0;
    const pendingBookCredits = bookTransactions?.filter(t => t.status === 'pending' && t.credit).reduce((sum, t) => sum + (t.credit || 0), 0) || 0;
    const pendingBookDebits = bookTransactions?.filter(t => t.status === 'pending' && t.debit).reduce((sum, t) => sum + (t.debit || 0), 0) || 0;

    const adjustedBookBal = openingBalance + pendingBookCredits - pendingBookDebits + 
      (bankTransactions?.filter(t => t.status === 'matched').reduce((sum, t) => sum + (t.credit || 0) - (t.debit || 0), 0) || 0);

    return {
      openingBalance,
      statementBalance: statementBal,
      bookBalance: adjustedBookBal,
      difference: statementBal - adjustedBookBal,
      unmatchedBankCount: bankTransactions?.filter(t => t.status === 'pending').length || 0,
      unmatchedBookCount: bookTransactions?.filter(t => t.status === 'pending').length || 0,
    };
  }, [statementBalance, bankTransactions, bookTransactions]);

  // Filter transactions
  const filteredBankTransactions = useMemo(() => {
    let filtered = bankTransactions || [];
    if (bankSearch) {
      const search = bankSearch.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(search) ||
        t.reference.toLowerCase().includes(search)
      );
    }
    if (bankStatusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === bankStatusFilter);
    }
    return filtered;
  }, [bankTransactions, bankSearch, bankStatusFilter]);

  const filteredBookTransactions = useMemo(() => {
    let filtered = bookTransactions || [];
    if (bookSearch) {
      const search = bookSearch.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(search) ||
        t.reference.toLowerCase().includes(search)
      );
    }
    if (bookStatusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === bookStatusFilter);
    }
    return filtered;
  }, [bookTransactions, bookSearch, bookStatusFilter]);

  // AI Match Suggestions
  const suggestions = useMemo<MatchSuggestion[]>(() => {
    if (!bankTransactions || !bookTransactions) return [];
    const pending = bankTransactions.filter(t => t.status === 'pending');
    const pendingBook = bookTransactions.filter(t => t.status === 'pending');
    
    const suggestions: MatchSuggestion[] = [];
    for (const bank of pending) {
      const bankAmount = (bank.credit || 0) - (bank.debit || 0);
      for (const book of pendingBook) {
        const bookAmount = (book.credit || 0) - (book.debit || 0);
        if (Math.abs(bankAmount - bookAmount) < 0.01) {
          // Amount match
          const dateDiff = Math.abs(new Date(bank.date).getTime() - new Date(book.date).getTime()) / (1000 * 60 * 60 * 24);
          const confidence = dateDiff <= 3 ? 0.95 : dateDiff <= 7 ? 0.8 : 0.6;
          suggestions.push({
            bankTransactionId: bank.id,
            bookTransactionId: book.id,
            confidence,
            reason: `Amount match${dateDiff <= 3 ? ', similar date' : ''}`,
          });
        }
      }
    }
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }, [bankTransactions, bookTransactions]);

  // Mutations
  const matchMutation = useMutation({
    mutationFn: async (_payload: { bankIds: number[]; bookIds: number[] }) => {
      // In production: return post('/banking/reconciliation/match', { bankIds, bookIds });
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Transactions matched successfully');
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['book-transactions'] });
      setSelectedBankTransactions(new Set());
      setSelectedBookTransactions(new Set());
    },
    onError: () => toast.error('Failed to match transactions'),
  });

  const excludeMutation = useMutation({
    mutationFn: async (_transactionId: number) => {
      // In production: return post(`/banking/statements/${transactionId}/exclude`);
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Transaction excluded');
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
    },
    onError: () => toast.error('Failed to exclude transaction'),
  });

  const autoMatchMutation = useMutation({
    mutationFn: async () => {
      // In production: return post('/banking/reconciliation/auto-match', { accountId: selectedBankAccount, ...dateRange });
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { matched: 4 };
    },
    onSuccess: (data: any) => {
      toast.success(`Auto-matched ${data.matched} transactions`);
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['book-transactions'] });
    },
    onError: () => toast.error('Auto-match failed'),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      // In production: return post('/banking/reconciliation/complete', { accountId: selectedBankAccount, statementBalance, ...dateRange });
      await new Promise(resolve => setTimeout(resolve, 800));
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Reconciliation completed!');
      queryClient.invalidateQueries({ queryKey: ['reconciliation-history'] });
    },
    onError: () => toast.error('Failed to complete reconciliation'),
  });

  // Handlers
  const handleMatch = useCallback(() => {
    if (selectedBankTransactions.size === 0 || selectedBookTransactions.size === 0) {
      toast.error('Select at least one transaction from each side');
      return;
    }
    matchMutation.mutate({
      bankIds: Array.from(selectedBankTransactions),
      bookIds: Array.from(selectedBookTransactions),
    });
  }, [selectedBankTransactions, selectedBookTransactions, matchMutation]);

  const handleDrop = useCallback((bookTransactionId: number, bankTransactionId: number) => {
    matchMutation.mutate({
      bankIds: [bankTransactionId],
      bookIds: [bookTransactionId],
    });
    setDragTargetId(null);
  }, [matchMutation]);

  const toggleBankSelection = (id: number) => {
    setSelectedBankTransactions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBookSelection = (id: number) => {
    setSelectedBookTransactions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedAccount = bankAccounts?.find(a => a.id === selectedBankAccount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <span className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
              <BanknotesIcon className="w-6 h-6" />
            </span>
            Bank Reconciliation
          </h1>
          <p className="page-subtitle">Match bank statements with book entries</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Bank Account Selector */}
          <select
            value={selectedBankAccount || ''}
            onChange={(e) => setSelectedBankAccount(e.target.value ? parseInt(e.target.value) : null)}
            className="input w-auto min-w-[200px]"
          >
            <option value="">Select Bank Account</option>
            {bankAccounts?.map(account => (
              <option key={account.id} value={account.id}>
                {account.accountNo} - {account.name}
              </option>
            ))}
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="input w-auto"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="input w-auto"
            />
          </div>

          <button className="btn btn-primary">
            <PlusIcon className="w-5 h-5" />
            New Reconciliation
          </button>
        </div>
      </div>

      {!selectedBankAccount ? (
        <div className="card">
          <div className="text-center py-16">
            <BanknotesIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Select a bank account to start reconciliation</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Opening Balance"
              value={summary.openingBalance}
              currency={selectedAccount?.currency}
              icon={<BanknotesIcon className="w-5 h-5 text-gray-500" />}
              subtitle="From last reconciliation"
            />
            <div className="rounded-xl border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Statement Balance</span>
                <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <DocumentCheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
                className="input w-full font-mono text-lg font-bold"
                placeholder="Enter statement balance"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From bank statement</p>
            </div>
            <SummaryCard
              title="Book Balance"
              value={summary.bookBalance}
              currency={selectedAccount?.currency}
              icon={<ArrowsRightLeftIcon className="w-5 h-5 text-gray-500" />}
              subtitle="Calculated from GL"
            />
            <SummaryCard
              title="Difference"
              value={summary.difference}
              currency={selectedAccount?.currency}
              icon={
                summary.difference === 0 ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                ) : (
                  <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
                )
              }
              variant={summary.difference === 0 ? 'success' : Math.abs(summary.difference) < 100 ? 'warning' : 'danger'}
              subtitle={summary.difference === 0 ? 'Balanced!' : 'Needs attention'}
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left Column: Bank Statement */}
            <div className="card">
              <div className="card-header border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <BanknotesIcon className="w-5 h-5 text-emerald-500" />
                    Bank Statement
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-full">
                      {filteredBankTransactions.length}
                    </span>
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      className="input pl-9 py-1.5 text-sm"
                    />
                  </div>
                  <select
                    value={bankStatusFilter}
                    onChange={(e) => setBankStatusFilter(e.target.value as any)}
                    className="input py-1.5 text-sm w-auto"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="matched">Matched</option>
                    <option value="excluded">Excluded</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-primary-600"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBankTransactions(new Set(filteredBankTransactions.filter(t => t.status === 'pending').map(t => t.id)));
                            } else {
                              setSelectedBankTransactions(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Description</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Ref</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Debit</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Credit</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Balance</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {bankLoading ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                        </td>
                      </tr>
                    ) : filteredBankTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-gray-500">No transactions found</td>
                      </tr>
                    ) : (
                      filteredBankTransactions.map(transaction => (
                        <TransactionRow
                          key={transaction.id}
                          transaction={transaction}
                          type="bank"
                          isSelected={selectedBankTransactions.has(transaction.id)}
                          onSelect={() => toggleBankSelection(transaction.id)}
                          onMatch={() => {
                            setSelectedBankTransactions(new Set([transaction.id]));
                            toast('Select a book transaction to match', { icon: '👉' });
                          }}
                          onExclude={() => excludeMutation.mutate(transaction.id)}
                          onView={() => toast('View transaction details', { icon: '👁' })}
                          hasSuggestion={suggestions.some(s => s.bankTransactionId === transaction.id)}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Book Transactions */}
            <div className="card">
              <div className="card-header border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <ArrowsRightLeftIcon className="w-5 h-5 text-blue-500" />
                    Book Transactions
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-full">
                      {filteredBookTransactions.length}
                    </span>
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                      className="input pl-9 py-1.5 text-sm"
                    />
                  </div>
                  <select
                    value={bookStatusFilter}
                    onChange={(e) => setBookStatusFilter(e.target.value as any)}
                    className="input py-1.5 text-sm w-auto"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="matched">Matched</option>
                  </select>
                </div>
              </div>

              <div 
                className="overflow-x-auto max-h-[500px] overflow-y-auto"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'link';
                }}
              >
                <table className="min-w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-primary-600"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBookTransactions(new Set(filteredBookTransactions.filter(t => t.status === 'pending').map(t => t.id)));
                            } else {
                              setSelectedBookTransactions(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Description</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Ref</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Debit</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Credit</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Balance</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {bookLoading ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                        </td>
                      </tr>
                    ) : filteredBookTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-gray-500">No transactions found</td>
                      </tr>
                    ) : (
                      filteredBookTransactions.map(transaction => (
                        <tr
                          key={transaction.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (transaction.status === 'pending') {
                              setDragTargetId(transaction.id);
                            }
                          }}
                          onDragLeave={() => setDragTargetId(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            const bankId = parseInt(e.dataTransfer.getData('bankTransactionId'));
                            if (bankId && transaction.status === 'pending') {
                              handleDrop(transaction.id, bankId);
                            }
                          }}
                        >
                          <TransactionRow
                            transaction={transaction}
                            type="book"
                            isSelected={selectedBookTransactions.has(transaction.id)}
                            onSelect={() => toggleBookSelection(transaction.id)}
                            onMatch={() => {
                              setSelectedBookTransactions(new Set([transaction.id]));
                              toast('Select a bank transaction to match', { icon: '👈' });
                            }}
                            onView={() => toast('View journal entry', { icon: '👁' })}
                            isDragTarget={dragTargetId === transaction.id}
                            hasSuggestion={suggestions.some(s => s.bookTransactionId === transaction.id)}
                          />
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5 text-purple-500" />
                  Smart Match Suggestions
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                    AI
                  </span>
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {suggestions.slice(0, 6).map((suggestion, idx) => {
                    const bankTx = bankTransactions?.find(t => t.id === suggestion.bankTransactionId);
                    const bookTx = bookTransactions?.find(t => t.id === suggestion.bookTransactionId);
                    if (!bankTx || !bookTx) return null;

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-purple-700 dark:text-purple-400">
                            {Math.round(suggestion.confidence * 100)}% confidence
                          </span>
                          <button
                            onClick={() => {
                              matchMutation.mutate({
                                bankIds: [suggestion.bankTransactionId],
                                bookIds: [suggestion.bookTransactionId],
                              });
                            }}
                            className="btn btn-sm bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <LinkIcon className="w-3 h-3" />
                            Match
                          </button>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          <p><strong>Bank:</strong> {bankTx.description.substring(0, 30)}...</p>
                          <p><strong>Book:</strong> {bookTx.description.substring(0, 30)}...</p>
                          <p className="text-purple-600 dark:text-purple-400">{suggestion.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="card">
            <div className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => autoMatchMutation.mutate()}
                  disabled={autoMatchMutation.isPending}
                  className="btn btn-secondary"
                >
                  <SparklesIcon className="w-5 h-5" />
                  {autoMatchMutation.isPending ? 'Auto-Matching...' : 'Auto-Match'}
                </button>
                <button
                  onClick={handleMatch}
                  disabled={selectedBankTransactions.size === 0 || selectedBookTransactions.size === 0 || matchMutation.isPending}
                  className="btn btn-primary"
                >
                  <LinkIcon className="w-5 h-5" />
                  Match Selected ({selectedBankTransactions.size} ↔ {selectedBookTransactions.size})
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button className="btn btn-secondary">
                  <PrinterIcon className="w-5 h-5" />
                  Print Report
                </button>
                <button className="btn btn-secondary">
                  Save Progress
                </button>
                <button
                  onClick={() => completeMutation.mutate()}
                  disabled={summary.difference !== 0 || completeMutation.isPending}
                  className={`btn ${summary.difference === 0 ? 'btn-success' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  {completeMutation.isPending ? 'Completing...' : 'Complete Reconciliation'}
                </button>
              </div>
            </div>
            {summary.difference !== 0 && (
              <div className="px-4 pb-4">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <ExclamationCircleIcon className="w-4 h-4" />
                  Reconciliation cannot be completed until the difference is zero. Current difference: {formatCurrency(summary.difference)}
                </p>
              </div>
            )}
          </div>

          {/* Reconciliation History */}
          <div className="card">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-gray-500" />
                Reconciliation History
              </h3>
              {showHistory ? (
                <ChevronDownIcon className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRightIcon className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {showHistory && (
              <div className="border-t border-gray-200 dark:border-slate-700">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Period</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Statement Balance</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Book Balance</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Difference</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Completed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                      {history?.map(rec => (
                        <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {formatDate(rec.startDate)} - {formatDate(rec.endDate)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-gray-700 dark:text-gray-300">
                            {formatCurrency(rec.statementBalance)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-gray-700 dark:text-gray-300">
                            {formatCurrency(rec.bookBalance)}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono text-sm ${rec.difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(rec.difference)}
                          </td>
                          <td className="px-4 py-3">{getReconciliationStatusBadge(rec.status)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {rec.completedAt ? (
                              <span>{formatDate(rec.completedAt)} by {rec.completedBy}</span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
