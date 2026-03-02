import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../services/api';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

const formatDateTime = (d: string | Date) => new Date(d).toLocaleString('en-MY', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  INSERT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  EDIT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
  VOID: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  PRINT: 'bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300 border-gray-200 dark:border-gray-600',
  LOGIN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
};

const ACTION_DOT_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-500', INSERT: 'bg-emerald-500',
  UPDATE: 'bg-blue-500', EDIT: 'bg-blue-500',
  DELETE: 'bg-red-500',
  VOID: 'bg-orange-500',
  PRINT: 'bg-gray-400',
  LOGIN: 'bg-indigo-500',
};

const MODULE_COLORS: Record<string, string> = {
  SALES: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  PURCHASE: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  ACCOUNTING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  STOCK: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
  SETTINGS: 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300',
  AR: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  AP: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
};

interface AuditEntry {
  id: string;
  auditDate: string;
  userId: number | null;
  userCode: string | null;
  action: string;
  moduleCode: string | null;
  tableName: string | null;
  recordId: number | null;
  documentNo: string | null;
  oldValues: any;
  newValues: any;
  ipAddress: string | null;
  machineName: string | null;
}

interface AuditData {
  trails: AuditEntry[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export default function AuditTrailPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [queryParams, setQueryParams] = useState<Record<string, any> | null>(null);

  const { data: reportData, isLoading, isFetching } = useQuery<AuditData>({
    queryKey: ['audit-trail', queryParams, page],
    queryFn: () => get('/audit-trail', { ...queryParams, page }),
    enabled: !!queryParams,
  });

  const handleGenerate = () => {
    setPage(1);
    const params: Record<string, any> = { dateFrom, dateTo };
    if (moduleFilter) params.module = moduleFilter;
    if (actionFilter) params.action = actionFilter;
    if (search) params.search = search;
    setQueryParams(params);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderJsonDiff = (oldVals: any, newVals: any) => {
    if (!oldVals && !newVals) return <p className="text-sm text-gray-400">No change details recorded.</p>;
    // @ts-ignore
    const _allKeys = new Set([...Object.keys(oldVals || {}), ...Object.keys(newVals || {})]);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
        {oldVals && (
          <div>
            <p className="text-xs font-semibold text-red-500 mb-1 uppercase">Before</p>
            <pre className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg overflow-x-auto text-red-800 dark:text-red-300 whitespace-pre-wrap">
              {JSON.stringify(oldVals, null, 2)}
            </pre>
          </div>
        )}
        {newVals && (
          <div>
            <p className="text-xs font-semibold text-emerald-500 mb-1 uppercase">After</p>
            <pre className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg overflow-x-auto text-emerald-800 dark:text-emerald-300 whitespace-pre-wrap">
              {JSON.stringify(newVals, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const getDescription = (entry: AuditEntry) => {
    const user = entry.userCode || `User #${entry.userId}`;
    const action = entry.action.toLowerCase();
    const table = entry.tableName?.replace(/_/g, ' ') || 'record';
    const doc = entry.documentNo ? ` ${entry.documentNo}` : '';
    return `${user} ${action}${action.endsWith('e') ? 'd' : 'ed'} ${table}${doc}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Trail</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track all changes and actions in the system</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search document no, user..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1 mt-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700">
          <FunnelIcon className="w-4 h-4" /> {showFilters ? 'Hide Filters' : 'More Filters'}
        </button>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Module</label>
              <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
                <option value="">All Modules</option>
                {['SALES', 'PURCHASE', 'ACCOUNTING', 'STOCK', 'AR', 'AP', 'SETTINGS'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
              <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
                <option value="">All Actions</option>
                {['CREATE', 'UPDATE', 'DELETE', 'VOID', 'PRINT', 'INSERT', 'LOGIN'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mt-4">
          <button onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-700 to-gray-800 hover:from-slate-800 hover:to-gray-900 text-white text-sm font-medium rounded-lg transition-all shadow-sm">
            {isFetching ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ShieldCheckIcon className="w-4 h-4" />}
            Load Audit Trail
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
        ) : !reportData ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <ShieldCheckIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
            Set your filters and click <span className="font-semibold text-gray-700 dark:text-gray-300">Load Audit Trail</span> to view system changes.
          </div>
        ) : reportData.trails.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            No audit entries found for the selected criteria.
          </div>
        ) : (
          <div className="p-5">
            {/* Timeline */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700" />

              <div className="space-y-4">
                {reportData.trails.map((entry) => {
                  const isExpanded = expandedIds.has(entry.id);
                  const hasDetails = entry.oldValues || entry.newValues;
                  const actionColor = ACTION_COLORS[entry.action] || ACTION_COLORS.UPDATE;
                  const dotColor = ACTION_DOT_COLORS[entry.action] || 'bg-gray-400';
                  const moduleColor = MODULE_COLORS[entry.moduleCode || ''] || MODULE_COLORS.SETTINGS;

                  return (
                    <div key={entry.id} className="relative pl-12">
                      {/* Timeline dot */}
                      <div className={`absolute left-3.5 top-3 w-3 h-3 rounded-full ring-4 ring-white dark:ring-slate-800 ${dotColor}`} />

                      <div className={`rounded-lg border p-4 transition-all ${isExpanded ? 'border-gray-300 dark:border-slate-600 shadow-sm' : 'border-gray-100 dark:border-slate-700/50 hover:border-gray-200 dark:hover:border-slate-600'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* User avatar */}
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {(entry.userCode || 'S')[0].toUpperCase()}
                              </div>
                              <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border ${actionColor}`}>
                                {entry.action}
                              </span>
                              {entry.moduleCode && (
                                <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${moduleColor}`}>
                                  {entry.moduleCode}
                                </span>
                              )}
                              {entry.documentNo && (
                                <span className="text-sm font-mono font-medium text-primary-600 dark:text-primary-400">{entry.documentNo}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5">{getDescription(entry)}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                              <span>{formatDateTime(entry.auditDate)}</span>
                              {entry.ipAddress && <span>IP: {entry.ipAddress}</span>}
                              {entry.machineName && <span>{entry.machineName}</span>}
                            </div>
                          </div>

                          {hasDetails && (
                            <button onClick={() => toggleExpand(entry.id)}
                              className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 transition-colors">
                              {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                            </button>
                          )}
                        </div>

                        {/* Expanded details */}
                        {isExpanded && hasDetails && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                            {renderJsonDiff(entry.oldValues, entry.newValues)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pagination */}
            {reportData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(page - 1) * reportData.pagination.pageSize + 1}-{Math.min(page * reportData.pagination.pageSize, reportData.pagination.total)} of {reportData.pagination.total}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300">
                    Previous
                  </button>
                  <button onClick={() => setPage(p => Math.min(reportData.pagination.totalPages, p + 1))} disabled={page >= reportData.pagination.totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
