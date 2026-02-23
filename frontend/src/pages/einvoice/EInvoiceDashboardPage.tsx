import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../../services/api';
import { format } from 'date-fns';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';

interface EInvoiceConfig {
  isConfigured: boolean;
  environment: 'sandbox' | 'production';
  clientId?: string;
  taxpayerTin?: string;
  lastTokenRefresh?: string;
  certificateExpiry?: string;
}

interface EInvoicePendingStats {
  total: number;
  invoices: number;
  creditNotes: number;
  debitNotes: number;
}

interface RecentSubmission {
  id: number;
  documentNo: string;
  documentType: string;
  customerName: string;
  netTotal: number;
  einvoiceStatus: string;
  einvoiceUUID?: string;
  submittedAt?: string;
  validatedAt?: string;
}

export default function EInvoiceDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Fetch config status
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['einvoice', 'config'],
    queryFn: () => get<EInvoiceConfig>('/einvoice/config'),
  });

  // Fetch pending stats
  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ['einvoice', 'pending'],
    queryFn: () => get<EInvoicePendingStats>('/einvoice/pending'),
  });

  // Fetch recent submissions
  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ['einvoice', 'recent'],
    queryFn: () => get<RecentSubmission[]>('/einvoice/recent'),
  });

  // Submit batch mutation
  const submitBatchMutation = useMutation({
    mutationFn: () => post('/einvoice/submit-batch', { invoiceIds: selectedIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einvoice'] });
      setSelectedIds([]);
    },
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; icon: any; label: string }> = {
      pending: { class: 'badge-warning', icon: ClockIcon, label: 'Pending' },
      submitted: { class: 'badge-info', icon: PaperAirplaneIcon, label: 'Submitted' },
      valid: { class: 'badge-success', icon: CheckCircleIcon, label: 'Valid' },
      invalid: { class: 'badge-danger', icon: XCircleIcon, label: 'Invalid' },
      cancelled: { class: 'badge-gray', icon: XCircleIcon, label: 'Cancelled' },
    };
    const badge = badges[status?.toLowerCase()] || badges.pending;
    return (
      <span className={`badge ${badge.class} inline-flex items-center gap-1`}>
        <badge.icon className="w-3.5 h-3.5" />
        {badge.label}
      </span>
    );
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

  const stats = [
    {
      name: 'Pending Submission',
      value: pending?.total || 0,
      icon: ClockIcon,
      gradient: 'from-amber-500 to-orange-500',
      shadowColor: 'shadow-orange-500/30',
    },
    {
      name: 'Invoices',
      value: pending?.invoices || 0,
      icon: DocumentTextIcon,
      gradient: 'from-blue-500 to-indigo-500',
      shadowColor: 'shadow-blue-500/30',
    },
    {
      name: 'Credit Notes',
      value: pending?.creditNotes || 0,
      icon: DocumentTextIcon,
      gradient: 'from-emerald-500 to-teal-500',
      shadowColor: 'shadow-emerald-500/30',
    },
    {
      name: 'Debit Notes',
      value: pending?.debitNotes || 0,
      icon: DocumentTextIcon,
      gradient: 'from-purple-500 to-pink-500',
      shadowColor: 'shadow-purple-500/30',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">E-Invoice Dashboard</h1>
        <p className="page-subtitle">Malaysia LHDN MyInvois integration status and quick actions</p>
      </div>

      {/* Configuration Status Card */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Cog6ToothIcon className="w-5 h-5 text-primary-500" />
            Configuration Status
          </h2>
          <Link
            to="/settings/einvoice"
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
          >
            Configure →
          </Link>
        </div>
        <div className="card-body">
          {configLoading ? (
            <div className="flex items-center justify-center py-8">
              <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : config?.isConfigured ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500 text-white">
                    <CheckCircleIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Connected</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 capitalize">
                      {config.environment} Environment
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Taxpayer TIN</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{config.taxpayerTin || '-'}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Certificate Expiry</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {config.certificateExpiry
                    ? format(new Date(config.certificateExpiry), 'dd MMM yyyy')
                    : '-'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="p-2 rounded-lg bg-amber-500 text-white">
                <ExclamationTriangleIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  E-Invoice Not Configured
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Configure your LHDN MyInvois credentials to start submitting e-invoices
                </p>
              </div>
              <Link
                to="/settings/einvoice"
                className="btn btn-primary btn-sm"
              >
                Configure Now
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={stat.name}
            className={`stat-card bg-gradient-to-br ${stat.gradient} shadow-xl ${stat.shadowColor} transform hover:scale-[1.02] transition-all duration-300`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="absolute inset-0 bg-white/5 rounded-xl" />
            <stat.icon className="stat-card-icon" />
            <div className="relative">
              <p className="text-sm font-medium text-white/80 mb-1">{stat.name}</p>
              <p className="text-3xl font-bold text-white">
                {pendingLoading ? '-' : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <PaperAirplaneIcon className="w-5 h-5 text-primary-500" />
              Quick Actions
            </h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/einvoice/list?status=pending"
                className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              >
                <ClockIcon className="w-5 h-5" />
                <span className="text-sm">View Pending</span>
              </Link>
              <Link
                to="/einvoice/list"
                className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              >
                <DocumentTextIcon className="w-5 h-5" />
                <span className="text-sm">All E-Invoices</span>
              </Link>
              <button
                onClick={() => submitBatchMutation.mutate()}
                disabled={!config?.isConfigured || submitBatchMutation.isPending}
                className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
                <span className="text-sm">Submit All Pending</span>
              </button>
              <Link
                to="/einvoice/list?status=submitted"
                className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
                <span className="text-sm">Check Status</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DocumentCheckIcon className="w-5 h-5 text-primary-500" />
              Recent Submissions
            </h2>
            <Link
              to="/einvoice/list"
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="card-body">
            {recentLoading ? (
              <div className="flex items-center justify-center py-8">
                <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : recent && recent.length > 0 ? (
              <div className="space-y-3">
                {recent.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary-500 to-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.documentNo}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.customerName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(item.einvoiceStatus)}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatCurrency(item.netTotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DocumentTextIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent submissions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
