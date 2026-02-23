import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { get, post } from '../../services/api';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface CustomerWithBalance {
  id: number;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  totalOutstanding: number;
  invoiceCount: number;
  aging: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    over90: number;
  };
}

interface SendResult {
  customerId: number;
  customerCode: string;
  success: boolean;
  error?: string;
  messageId?: string;
}

interface BatchSOAResponse {
  summary: {
    total: number;
    sent: number;
    failed: number;
  };
  results: SendResult[];
}

export default function BatchSOASendPage() {
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('whatsapp');
  const [includeAging, setIncludeAging] = useState(true);
  const [sendResults, setSendResults] = useState<BatchSOAResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch customers with balance
  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['customers-with-balance', asOfDate],
    queryFn: () => get<CustomerWithBalance[]>(`/messaging/customers-with-balance?asOfDate=${asOfDate}`),
  });

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.code.toLowerCase().includes(query) || 
      c.name.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  // Send batch SOA mutation
  const sendMutation = useMutation({
    mutationFn: (data: { customerIds: number[]; asOfDate: string; channel: string; includeAging: boolean }) =>
      post<BatchSOAResponse>('/messaging/batch-soa', data),
    onSuccess: (data) => {
      setSendResults(data);
      if (data.summary.sent > 0) {
        toast.success(`Sent ${data.summary.sent} statement(s) successfully`);
      }
      if (data.summary.failed > 0) {
        toast.error(`${data.summary.failed} statement(s) failed to send`);
      }
      setSelectedIds([]);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to send statements');
    },
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map(c => c.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSend = () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one customer');
      return;
    }
    
    setSendResults(null);
    sendMutation.mutate({
      customerIds: selectedIds,
      asOfDate,
      channel,
      includeAging,
    });
  };

  const totalSelected = selectedIds.reduce((sum, id) => {
    const customer = customers.find(c => c.id === id);
    return sum + (customer?.totalOutstanding || 0);
  }, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DocumentTextIcon className="w-6 h-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Batch SOA Sending</h1>
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
          <h3 className="text-lg font-semibold mb-4">Statement Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* As of Date */}
            <div>
              <label className="label">Statement As of Date</label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
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

            {/* Include Aging */}
            <div>
              <label className="label">Options</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAging}
                  onChange={(e) => setIncludeAging(e.target.checked)}
                  className="checkbox"
                />
                <span>Include Aging Analysis</span>
              </label>
            </div>

            {/* Search */}
            <div>
              <label className="label">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by code or name..."
                className="input w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <UserGroupIcon className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-sm opacity-80">Customers with Balance</p>
                <p className="text-2xl font-bold">{customers.length}</p>
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
                <p className="text-sm opacity-80">Selected Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSelected)}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center justify-center">
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
                  Send Selected ({selectedIds.length})
                </>
              )}
            </button>
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
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {sendResults.results.map((r, idx) => (
                    <tr key={idx}>
                      <td className="font-medium">{r.customerCode}</td>
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

      {/* Customer List */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold">Customers with Outstanding Balance</h3>
          <button
            onClick={handleSelectAll}
            className="btn btn-secondary btn-sm"
          >
            {selectedIds.length === filteredCustomers.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <ArrowPathIcon className="w-8 h-8 mx-auto animate-spin mb-2" />
              Loading customers...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <UserGroupIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No customers with outstanding balance</p>
            </div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0}
                      onChange={handleSelectAll}
                      className="checkbox"
                    />
                  </th>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th className="text-right">Outstanding</th>
                  <th className="text-center">Invoices</th>
                  <th className="text-right">Current</th>
                  <th className="text-right">1-30</th>
                  <th className="text-right">31-60</th>
                  <th className="text-right">61-90</th>
                  <th className="text-right">&gt;90</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const hasContact = channel === 'email' ? !!customer.email : !!(customer.mobile || customer.phone);
                  return (
                    <tr 
                      key={customer.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                        !hasContact ? 'opacity-50' : ''
                      }`}
                      onClick={() => hasContact && handleToggleSelect(customer.id)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(customer.id)}
                          onChange={() => handleToggleSelect(customer.id)}
                          disabled={!hasContact}
                          className="checkbox"
                        />
                      </td>
                      <td>
                        <div className="font-medium">{customer.code}</div>
                        <div className="text-sm text-gray-500">{customer.name}</div>
                      </td>
                      <td>
                        <div className="text-sm">
                          {channel === 'email' ? (
                            customer.email || <span className="text-red-500 italic">No email</span>
                          ) : (
                            customer.mobile || customer.phone || <span className="text-red-500 italic">No phone</span>
                          )}
                        </div>
                      </td>
                      <td className="text-right font-semibold text-primary-600">
                        {formatCurrency(customer.totalOutstanding)}
                      </td>
                      <td className="text-center">
                        <span className="badge badge-info">{customer.invoiceCount}</span>
                      </td>
                      <td className="text-right text-sm">
                        {customer.aging.current > 0 ? formatCurrency(customer.aging.current) : '-'}
                      </td>
                      <td className="text-right text-sm">
                        {customer.aging.days1to30 > 0 ? formatCurrency(customer.aging.days1to30) : '-'}
                      </td>
                      <td className="text-right text-sm text-yellow-600">
                        {customer.aging.days31to60 > 0 ? formatCurrency(customer.aging.days31to60) : '-'}
                      </td>
                      <td className="text-right text-sm text-orange-600">
                        {customer.aging.days61to90 > 0 ? formatCurrency(customer.aging.days61to90) : '-'}
                      </td>
                      <td className="text-right text-sm text-red-600 font-medium">
                        {customer.aging.over90 > 0 ? formatCurrency(customer.aging.over90) : '-'}
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
