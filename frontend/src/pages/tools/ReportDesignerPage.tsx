import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { get, post, del } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';

interface ReportTemplate {
  id: string;
  name: string;
  reportType: string; // normalized from backend "type"
  type?: string; // original backend field (for safety)
  category: string;
  paperSize: string;
  isSystem: boolean;
  updatedAt: string;
  createdAt: string;
}

const REPORT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'QUOTATION', label: 'Quotation' },
  { value: 'DO', label: 'Delivery Order' },
  { value: 'PO', label: 'Purchase Order' },
  { value: 'RECEIPT', label: 'Receipt' },
  { value: 'STATEMENT', label: 'Statement' },
  { value: 'BALANCE_SHEET', label: 'Balance Sheet' },
  { value: 'PL', label: 'Profit & Loss' },
  { value: 'AGING', label: 'Aging Report' },
  { value: 'CUSTOM', label: 'Custom' },
];

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'SALES', label: 'Sales' },
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'ACCOUNTING', label: 'Accounting' },
  { value: 'STOCK', label: 'Stock' },
  { value: 'CUSTOM', label: 'Custom' },
];

const REPORT_TYPE_COLORS: Record<string, string> = {
  INVOICE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  QUOTATION: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  DO: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  PO: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  RECEIPT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  STATEMENT: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  BALANCE_SHEET: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  PL: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  AGING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  CUSTOM: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
};

export default function ReportDesignerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'system' | 'user'>('system');
  const [search, setSearch] = useState('');
  const [reportType, setReportType] = useState('');
  const [category, setCategory] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; template: ReportTemplate | null }>({
    open: false,
    template: null,
  });

  const isSystem = activeTab === 'system';

  const { data, isLoading } = useQuery({
    queryKey: ['report-templates', isSystem, search, reportType, category],
    queryFn: () =>
      get<any[]>('/report-templates', {
        isSystem,
        search: search || undefined,
        type: reportType ? reportType.toLowerCase() : undefined,
        category: category ? category.toLowerCase() : undefined,
      }),
  });

  // Normalize backend items (which use "type") to include "reportType" for UI
  const templates: ReportTemplate[] = (Array.isArray(data) ? data : []).map((t: any) => ({
    ...t,
    reportType: t.reportType || t.type || '',
  }));

  // Filter templates based on search (client-side as backup)
  const filteredTemplates = templates.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (reportType && t.reportType !== reportType) {
      return false;
    }
    if (category && t.category !== category) {
      return false;
    }
    return true;
  });

  const cloneMutation = useMutation({
    mutationFn: (templateId: string) =>
      post<ReportTemplate>(`/report-templates/${templateId}/clone`),
    onSuccess: (cloned) => {
      toast.success(`Template cloned as "${cloned.name}"`);
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      // Switch to user tab to show the cloned template
      setActiveTab('user');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to clone template');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/report-templates/${id}`),
    onSuccess: () => {
      toast.success('Template deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      setDeleteModal({ open: false, template: null });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete template');
    },
  });

  const handleClone = (template: ReportTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    cloneMutation.mutate(template.id);
  };

  const handleDelete = (template: ReportTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal({ open: true, template });
  };

  const confirmDelete = () => {
    if (deleteModal.template) {
      deleteMutation.mutate(deleteModal.template.id);
    }
  };

  const handleDesign = (template: ReportTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/tools/report-designer/${template.id}/edit`);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getReportTypeLabel = (type: string) => {
    return REPORT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getCategoryLabel = (cat: string) => {
    return CATEGORIES.find((c) => c.value === cat)?.label || cat;
  };

  const columns = [
    {
      key: 'name',
      header: 'Report Name',
      render: (row: ReportTemplate) => (
        <span className="font-medium text-gray-900 dark:text-white">{row.name}</span>
      ),
    },
    {
      key: 'reportType',
      header: 'Report Type',
      render: (row: ReportTemplate) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            REPORT_TYPE_COLORS[row.reportType] || REPORT_TYPE_COLORS.CUSTOM
          }`}
        >
          {getReportTypeLabel(row.reportType)}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row: ReportTemplate) => (
        <span className="text-gray-600 dark:text-gray-400">{getCategoryLabel(row.category)}</span>
      ),
    },
    {
      key: 'paperSize',
      header: 'Paper Size',
      render: (row: ReportTemplate) => (
        <span className="text-gray-600 dark:text-gray-400">{row.paperSize || 'A4'}</span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Modified',
      render: (row: ReportTemplate) => (
        <span className="text-gray-500 dark:text-gray-500 text-sm">
          {formatDate(row.updatedAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: ReportTemplate) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => handleDesign(row, e)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            title="Design"
          >
            <PencilSquareIcon className="w-4 h-4" />
            Design
          </button>
          <button
            onClick={(e) => handleClone(row, e)}
            disabled={cloneMutation.isPending}
            className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-primary-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Clone as user template"
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
          </button>
          {!row.isSystem && (
            <button
              onClick={(e) => handleDelete(row, e)}
              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <span className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
              <DocumentTextIcon className="w-6 h-6" />
            </span>
            Report Builder
          </h1>
          <p className="page-subtitle">Build and customize report templates</p>
        </div>
        <button
          onClick={() => navigate('/tools/report-designer/new/edit')}
          className="btn btn-primary"
        >
          <PlusIcon className="w-5 h-5" />
          New Template
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('system')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'system'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            System Reports
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              Built-in
            </span>
          </button>
          <button
            onClick={() => setActiveTab('user')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'user'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            User Reports
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              Custom
            </span>
          </button>
        </nav>
      </div>

      {/* Filters & Table */}
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="input min-w-[150px]"
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input min-w-[150px]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredTemplates}
          loading={isLoading}
          onRowClick={(row) => navigate(`/tools/report-designer/${row.id}`)}
          emptyMessage={
            activeTab === 'user' ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No custom templates yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Create your first custom report template or clone a system template to get started.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => navigate('/tools/report-designer/new')}
                    className="btn btn-primary"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Create Template
                  </button>
                  <button
                    onClick={() => setActiveTab('system')}
                    className="btn btn-secondary"
                  >
                    Browse System Templates
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No system templates yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Load the built-in Invoice, Purchase Order and Proforma templates for your company.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={async () => {
                      await post('/report-templates/seed-system');
                      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
                    }}
                    className="btn btn-primary"
                  >
                    Load System Templates
                  </button>
                </div>
              </div>
            )
          }
        />
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteModal({ open: false, template: null })}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Template
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete <strong>{deleteModal.template?.name}</strong>? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, template: null })}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="btn bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
