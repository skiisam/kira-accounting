import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { get, post } from '../../services/api';
import toast from 'react-hot-toast';
import {
  BanknotesIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface VendorPayment {
  id: number;
  paymentNo: string;
  paymentDate: string;
  paymentAmount: number;
  chequeNo: string | null;
  reference: string | null;
  vendor: {
    id: number;
    code: string;
    name: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
  };
  knockoffs: Array<{
    invoiceNo: string;
    amount: number;
  }>;
}

interface SendResult {
  paymentId: number;
  paymentNo: string;
  vendorCode: string;
  success: boolean;
  error?: string;
  messageId?: string;
}

interface BatchNotifyResponse {
  summary: {
    total: number;
    sent: number;
    failed: number;
  };
  results: SendResult[];
}

export default function BatchPaymentNotifyPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('whatsapp');
  const [sendResults, setSendResults] = useState<BatchNotifyResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch vendor payments
  const { data: payments = [], isLoading, refetch } = useQuery({
    queryKey: ['vendor-payments', dateFrom, dateTo],
    queryFn: () => get<VendorPayment[]>(`/messaging/vendor-payments?dateFrom=${dateFrom}&dateTo=${dateTo}`),
  });

  // Filter payments based on search
  const filteredPayments = useMemo(() => {
    if (!searchQuery) return payments;
    const query = searchQuery.toLowerCase();
    return payments.filter(p => 
      p.paymentNo.toLowerCase().includes(query) || 
      p.vendor.code.toLowerCase().includes(query) ||
      p.vendor.name.toLowerCase().includes(query)
    );
  }, [payments, searchQuery]);

  // Send batch notification mutation
  const sendMutation = useMutation({
    mutationFn: (data: { paymentIds: number[]; channel: string }) =>
      post<BatchNotifyResponse>('/messaging/batch-payment-notify', data),
    onSuccess: (data) => {
      setSendResults(data);
      if (data.summary.sent > 0) {
        toast.success(`Sent ${data.summary.sent} notification(s) successfully`);
      }
      if (data.summary.failed > 0) {
        toast.error(`${data.summary.failed} notification(s) failed to send`);
      }
      setSelectedIds([]);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to send notifications');
    },
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredPayments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPayments.map(p => p.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSend = () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one payment');
      return;
    }
    
    setSendResults(null);
    sendMutation.mutate({
      paymentIds: selectedIds,
      channel,
    });
  };

  const totalSelected = selectedIds.reduce((sum, id) => {
    const payment = payments.find(p => p.id === id);
    return sum + (payment?.paymentAmount || 0);
  }, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BanknotesIcon className="w-6 h-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Notification</h1>
        </div>
        <button
          onClick={() => refetch()}
          className="btn btn-secondary"
          disabled={isLoading}
        >
          <ArrowPathIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Configuration */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-semibold mb-4">Filter Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Date From */}
            <div>
              <label className="label">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input w-full"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="label">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input w-full"
              />
            </div>

            {/* Channel Selection */}
            <div>
              <label className="label">Send via</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setChannel('whatsapp')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    channel === 'whatsapp'
                      ? 'bg-green-500 text-white border-green-500'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                  WhatsApp
                </button>
                <button
                  onClick={() => setChannel('email')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    channel === 'email'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  Email
                </button>
              </div>
            </div>

            {/* Search */}
            <div>
              <label className="label">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Payment no, vendor..."
                className="input w-full"
              />
            </div>

            {/* Send Button */}
            <div className="flex items-end">
              <button
                onClick={handleSend}
                disabled={selectedIds.length === 0 || sendMutation.isPending}
                className="btn btn-primary w-full"
              >
                {sendMutation.isPending ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    {channel === 'whatsapp' ? (
                      <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                    ) : (
                      <EnvelopeIcon className="w-4 h-4 mr-2" />
                    )}
                    Send ({selectedIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-sm opacity-80">Total Payments</p>
                <p className="text-2xl font-bold">{payments.length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-sm opacity-80">Selected</p>
                <p className="text-2xl font-bold">{selectedIds.length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <CurrencyDollarIcon className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-sm opacity-80">Selected Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSelected)}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-amber-500 to-orange-500 text-white">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <CurrencyDollarIcon className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-sm opacity-80">Total Amount</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(payments.reduce((sum, p) => sum + p.paymentAmount, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Send Results */}
      {sendResults && (
        <div className="card border-2 border-primary-200 dark:border-primary-700">
          <div className="card-header bg-primary-50 dark:bg-primary-900/30">
            <h3 className="font-semibold">Send Results</h3>
          </div>
          <div className="card-body">
            <div className="flex gap-6 mb-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircleIcon className="w-5 h-5" />
                <span className="font-medium">{sendResults.summary.sent} Sent</span>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <XCircleIcon className="w-5 h-5" />
                <span className="font-medium">{sendResults.summary.failed} Failed</span>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              <table className="table w-full text-sm">
                <thead>
                  <tr>
                    <th>Payment No</th>
                    <th>Vendor</th>
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {sendResults.results.map((r, idx) => (
                    <tr key={idx}>
                      <td className="font-medium">{r.paymentNo}</td>
                      <td>{r.vendorCode}</td>
                      <td>
                        {r.success ? (
                          <span className="badge badge-success">Sent</span>
                        ) : (
                          <span className="badge badge-error">Failed</span>
                        )}
                      </td>
                      <td className="text-gray-500">{r.error || r.messageId || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payment List */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold">Vendor Payments</h3>
          <button
            onClick={handleSelectAll}
            className="btn btn-secondary btn-sm"
          >
            {selectedIds.length === filteredPayments.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <ArrowPathIcon className="w-8 h-8 mx-auto animate-spin mb-2" />
              Loading payments...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <BanknotesIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No payments found in the selected date range</p>
            </div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredPayments.length && filteredPayments.length > 0}
                      onChange={handleSelectAll}
                      className="checkbox"
                    />
                  </th>
                  <th>Payment No</th>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th>Contact</th>
                  <th className="text-right">Amount</th>
                  <th>Cheque</th>
                  <th>Invoices Paid</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => {
                  const hasContact = channel === 'email' 
                    ? !!payment.vendor.email 
                    : !!(payment.vendor.mobile || payment.vendor.phone);
                  return (
                    <tr 
                      key={payment.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                        !hasContact ? 'opacity-50' : ''
                      }`}
                      onClick={() => hasContact && handleToggleSelect(payment.id)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(payment.id)}
                          onChange={() => handleToggleSelect(payment.id)}
                          disabled={!hasContact}
                          className="checkbox"
                        />
                      </td>
                      <td className="font-medium">{payment.paymentNo}</td>
                      <td>{formatDate(payment.paymentDate)}</td>
                      <td>
                        <div className="font-medium">{payment.vendor.code}</div>
                        <div className="text-sm text-gray-500">{payment.vendor.name}</div>
                      </td>
                      <td>
                        <div className="text-sm">
                          {channel === 'email' ? (
                            payment.vendor.email || <span className="text-red-500 italic">No email</span>
                          ) : (
                            payment.vendor.mobile || payment.vendor.phone || <span className="text-red-500 italic">No phone</span>
                          )}
                        </div>
                      </td>
                      <td className="text-right font-semibold text-primary-600">
                        {formatCurrency(payment.paymentAmount)}
                      </td>
                      <td className="text-sm">
                        {payment.chequeNo || '-'}
                      </td>
                      <td>
                        <div className="text-sm">
                          {payment.knockoffs.length > 0 ? (
                            <div className="max-w-xs">
                              {payment.knockoffs.slice(0, 2).map((k, i) => (
                                <div key={i} className="truncate">
                                  {k.invoiceNo}: {formatCurrency(k.amount)}
                                </div>
                              ))}
                              {payment.knockoffs.length > 2 && (
                                <div className="text-gray-500">
                                  +{payment.knockoffs.length - 2} more
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
