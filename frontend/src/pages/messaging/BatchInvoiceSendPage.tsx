import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getPaginated, post } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  PaperAirplaneIcon,
  FunnelIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface Invoice {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string | null;
  customerId: number;
  customerCode: string;
  customerName: string;
  netTotal: number;
  outstandingAmount: number;
  status: string;
  currencyCode: string;
  customer?: {
    id: number;
    code: string;
    name: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
  };
}

interface SendResult {
  invoiceId: number;
  invoiceNo: string;
  customerName: string;
  status: 'sent' | 'failed';
  error?: string;
  messageId?: string;
}

interface BatchSendResponse {
  results: SendResult[];
  summary: {
    total: number;
    sent: number;
    failed: number;
  };
}

const statusBadges: Record<string, string> = {
  OPEN: 'badge-info',
  PARTIAL: 'badge-warning',
  PAID: 'badge-success',
  VOID: 'badge-danger',
};

export default function BatchInvoiceSendPage() {
  // Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Send dialog
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [customMessage, setCustomMessage] = useState('');
  const [sendResults, setSendResults] = useState<BatchSendResponse | null>(null);

  // Fetch invoices
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['batch-invoices', page, search, statusFilter, fromDate, toDate],
    queryFn: () =>
      getPaginated<Invoice>('/messaging/invoices', {
        page,
        pageSize: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
  });

  const invoices = data?.data || [];
  const pagination = data?.pagination;

  // Batch send mutation
  const sendMutation = useMutation({
    mutationFn: (payload: { invoiceIds: number[]; channel: string; message?: string }) =>
      post<BatchSendResponse>('/messaging/batch-invoices', payload),
    onSuccess: (response) => {
      setSendResults(response);
      if (response.summary.sent > 0) {
        toast.success(`Sent ${response.summary.sent} of ${response.summary.total} invoices`);
      }
      if (response.summary.failed > 0) {
        toast.error(`Failed to send ${response.summary.failed} invoices`);
      }
      setSelectedIds(new Set());
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to send invoices');
    },
  });

  // Format currency
  const formatCurrency = (val: number, currency: string = 'MYR') =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency }).format(val);

  // Check if customer has contact for channel
  const hasContact = (invoice: Invoice, ch: 'email' | 'whatsapp'): boolean => {
    if (ch === 'email') {
      return !!invoice.customer?.email;
    }
    return !!(invoice.customer?.mobile || invoice.customer?.phone);
  };

  // Calculate selected invoices info
  const selectedInvoices = useMemo(() => {
    return invoices.filter((inv) => selectedIds.has(inv.id));
  }, [invoices, selectedIds]);

  const selectedTotal = useMemo(() => {
    return selectedInvoices.reduce((sum, inv) => sum + Number(inv.netTotal), 0);
  }, [selectedInvoices]);

  // Toggle selection
  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Select all on current page
  const selectAllOnPage = () => {
    setSelectedIds(new Set(invoices.map((inv) => inv.id)));
  };

  // Handle send
  const handleSend = () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one invoice');
      return;
    }
    sendMutation.mutate({
      invoiceIds: Array.from(selectedIds),
      channel,
      message: customMessage || undefined,
    });
  };

  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const columns = [
    {
      key: 'select',
      header: '✓',
      render: (row: Invoice) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelection(row.id)}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    { key: 'invoiceNo', header: 'Invoice No' },
    {
      key: 'invoiceDate',
      header: 'Date',
      render: (row: Invoice) => format(new Date(row.invoiceDate), 'dd/MM/yyyy'),
    },
    { key: 'customerCode', header: 'Customer' },
    { key: 'customerName', header: 'Name' },
    {
      key: 'netTotal',
      header: 'Total',
      render: (row: Invoice) => formatCurrency(row.netTotal, row.currencyCode),
    },
    {
      key: 'outstandingAmount',
      header: 'Outstanding',
      render: (row: Invoice) => formatCurrency(row.outstandingAmount, row.currencyCode),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Invoice) => (
        <span className={`badge ${statusBadges[row.status] || 'badge-gray'}`}>{row.status}</span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (row: Invoice) => (
        <div className="flex gap-1">
          <span
            title={row.customer?.email || 'No email'}
            className={row.customer?.email ? 'text-green-600' : 'text-gray-300'}
          >
            <EnvelopeIcon className="w-4 h-4" />
          </span>
          <span
            title={row.customer?.mobile || row.customer?.phone || 'No phone'}
            className={row.customer?.mobile || row.customer?.phone ? 'text-green-600' : 'text-gray-300'}
          >
            <ChatBubbleLeftIcon className="w-4 h-4" />
          </span>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DocumentTextIcon className="w-6 h-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Batch Invoice Send</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-secondary ${showFilters ? 'bg-primary-100' : ''}`}
          >
            <FunnelIcon className="w-5 h-5 mr-1" />
            Filters
          </button>
          <button
            onClick={() => setShowSendDialog(true)}
            disabled={selectedIds.size === 0}
            className="btn btn-primary"
          >
            <PaperAirplaneIcon className="w-5 h-5 mr-1" />
            Send Selected ({selectedIds.size})
          </button>
        </div>
      </div>

      {/* Selection Summary */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium text-primary-800 dark:text-primary-200">
                {selectedIds.size} invoice(s) selected
              </span>
              <span className="text-primary-600 dark:text-primary-300">
                Total: {formatCurrency(selectedTotal)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAllOnPage}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                Select all on page
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                Clear selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="label">Search</label>
              <input
                type="text"
                placeholder="Invoice no, customer..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="input"
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="input"
              >
                <option value="">All Status</option>
                <option value="OPEN">Open</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
            <div>
              <label className="label">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="input"
              />
            </div>
            <div>
              <label className="label">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="input"
              />
            </div>
            <div className="flex items-end">
              <button onClick={clearFilters} className="btn btn-secondary">
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice List */}
      <div className="card">
        <DataTable
          columns={columns}
          data={invoices}
          loading={isLoading}
          onRowClick={(row) => toggleSelection(row.id)}
          pagination={pagination ? { ...pagination, onPageChange: setPage } : undefined}
        />
      </div>

      {/* Send Dialog */}
      {showSendDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-lg font-semibold">Send Invoices</h3>
              <button
                onClick={() => {
                  setShowSendDialog(false);
                  setSendResults(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="card-body space-y-4">
              {!sendResults ? (
                <>
                  {/* Summary */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      Sending {selectedIds.size} invoice(s)
                    </div>
                    <div className="text-lg font-semibold">{formatCurrency(selectedTotal)}</div>
                  </div>

                  {/* Channel Selection */}
                  <div>
                    <label className="label">Send via</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setChannel('email')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                          channel === 'email'
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <EnvelopeIcon className="w-5 h-5" />
                        <span className="font-medium">Email</span>
                      </button>
                      <button
                        onClick={() => setChannel('whatsapp')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                          channel === 'whatsapp'
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <ChatBubbleLeftIcon className="w-5 h-5" />
                        <span className="font-medium">WhatsApp</span>
                      </button>
                    </div>
                  </div>

                  {/* Contact Availability Warning */}
                  {selectedInvoices.some((inv) => !hasContact(inv, channel)) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                      <strong>Warning:</strong> Some customers don&apos;t have{' '}
                      {channel === 'email' ? 'an email address' : 'a phone number'}. They will be
                      skipped.
                    </div>
                  )}

                  {/* Custom Message */}
                  <div>
                    <label className="label">
                      Custom Message <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      className="input min-h-[100px]"
                      placeholder="Leave empty to use default template..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Available variables: {'{'}
                      {'{'}customerName{'}'}
                      {'}'}, {'{'}
                      {'{'}documentNo{'}'}
                      {'}'}, {'{'}
                      {'{'}amount{'}'}
                      {'}'}, {'{'}
                      {'{'}dueDate{'}'}
                      {'}'}
                    </p>
                  </div>

                  {/* Message Preview */}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-700 mb-1">Message Preview:</p>
                    <p className="text-sm text-blue-800">
                      {customMessage || (
                        <>
                          Dear Customer,
                          <br />
                          <br />
                          Your invoice INV-XXXX for MYR X,XXX.XX is ready.
                          <br />
                          Due Date: DD/MM/YYYY
                          <br />
                          <br />
                          Thank you for your business.
                        </>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <button
                      onClick={() => setShowSendDialog(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={sendMutation.isPending}
                      className="btn btn-primary"
                    >
                      {sendMutation.isPending ? (
                        'Sending...'
                      ) : (
                        <>
                          <PaperAirplaneIcon className="w-4 h-4 mr-1" />
                          Send {selectedIds.size} Invoice(s)
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Results Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">{sendResults.summary.total}</div>
                      <div className="text-sm text-gray-500">Total</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{sendResults.summary.sent}</div>
                      <div className="text-sm text-green-600">Sent</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{sendResults.summary.failed}</div>
                      <div className="text-sm text-red-600">Failed</div>
                    </div>
                  </div>

                  {/* Results List */}
                  <div className="max-h-[300px] overflow-y-auto border rounded-lg divide-y">
                    {sendResults.results.map((result) => (
                      <div
                        key={result.invoiceId}
                        className="p-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">{result.invoiceNo}</div>
                          <div className="text-sm text-gray-500">{result.customerName}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.status === 'sent' ? (
                            <span className="flex items-center text-green-600">
                              <CheckCircleIcon className="w-5 h-5 mr-1" />
                              Sent
                            </span>
                          ) : (
                            <span className="flex items-center text-red-600" title={result.error}>
                              <XCircleIcon className="w-5 h-5 mr-1" />
                              Failed
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Close Button */}
                  <div className="flex justify-end pt-4 border-t">
                    <button
                      onClick={() => {
                        setShowSendDialog(false);
                        setSendResults(null);
                      }}
                      className="btn btn-primary"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
