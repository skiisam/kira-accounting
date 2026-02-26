import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../services/api';
import { 
  ArrowLeftIcon, 
  DocumentTextIcon,
  BanknotesIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface ARInvoice {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  currencyCode: string;
  subTotal: number;
  taxTotal: number;
  netTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  reference?: string;
  description?: string;
  sourceType?: string;
  sourceId?: number;
  sourceNo?: string;
  details?: Array<{
    id: number;
    productCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    taxAmount: number;
    subTotal: number;
  }>;
  knockoffs?: Array<{
    id: number;
    paymentNo: string;
    paymentDate: string;
    knockoffAmount: number;
  }>;
}

export default function ARInvoiceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['ar-invoice', id],
    queryFn: () => get<ARInvoice>(`/ar/invoices/${id}`),
    enabled: !!id,
  });

  const formatCurrency = (val: number, currency: string = 'MYR') =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency }).format(val || 0);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM/yyyy');
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      OPEN: 'badge-info',
      PARTIAL: 'badge-warning',
      PAID: 'badge-success',
      VOID: 'badge-danger',
    };
    return badges[status] || 'badge-gray';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load AR Invoice</p>
        <button onClick={() => navigate('/ar/invoices')} className="btn btn-secondary mt-4">
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/ar/invoices')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="page-title flex items-center gap-3">
              <span className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                <DocumentTextIcon className="w-6 h-6" />
              </span>
              AR Invoice: {invoice.invoiceNo}
            </h1>
            <p className="page-subtitle">
              {invoice.customerCode} - {invoice.customerName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${getStatusBadge(invoice.status)}`}>{invoice.status}</span>
          {invoice.status !== 'PAID' && (
            <button
              onClick={() => navigate('/ar/payments/new', { state: { customerId: invoice.customerId, customerCode: invoice.customerCode } })}
              className="btn btn-primary"
            >
              <BanknotesIcon className="w-5 h-5 mr-2" />
              Receive Payment
            </button>
          )}
          <button className="btn btn-secondary">
            <PrinterIcon className="w-5 h-5 mr-2" />
            Print
          </button>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Invoice Information</h2>
            </div>
            <div className="card-body grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-500">Invoice No</label>
                <p className="font-mono font-semibold">{invoice.invoiceNo}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Invoice Date</label>
                <p>{formatDate(invoice.invoiceDate)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Due Date</label>
                <p>{formatDate(invoice.dueDate)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Currency</label>
                <p>{invoice.currencyCode}</p>
              </div>
              {invoice.reference && (
                <div className="col-span-2">
                  <label className="text-sm text-gray-500">Reference</label>
                  <p>{invoice.reference}</p>
                </div>
              )}
              {invoice.sourceId && invoice.sourceType === 'SALES_INVOICE' && (
                <div className="col-span-2">
                  <label className="text-sm text-gray-500">Source Document</label>
                  <button
                    onClick={() => navigate(`/sales/invoices/${invoice.sourceId}`)}
                    className="text-primary-600 hover:underline font-mono"
                  >
                    {invoice.sourceType}: {invoice.sourceNo || invoice.sourceId}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          {invoice.details && invoice.details.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Line Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Code</th>
                      <th>Description</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Unit Price</th>
                      <th className="text-right">Discount</th>
                      <th className="text-right">Tax</th>
                      <th className="text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.details.map((line, idx) => (
                      <tr key={line.id}>
                        <td>{idx + 1}</td>
                        <td className="font-mono">{line.productCode}</td>
                        <td>{line.description}</td>
                        <td className="text-right">{line.quantity}</td>
                        <td className="text-right font-mono">{formatCurrency(line.unitPrice, invoice.currencyCode)}</td>
                        <td className="text-right font-mono">{formatCurrency(line.discountAmount, invoice.currencyCode)}</td>
                        <td className="text-right font-mono">{formatCurrency(line.taxAmount, invoice.currencyCode)}</td>
                        <td className="text-right font-mono">{formatCurrency(line.subTotal, invoice.currencyCode)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payment History */}
          {invoice.knockoffs && invoice.knockoffs.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Payment History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Receipt No</th>
                      <th>Date</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.knockoffs.map((ko) => (
                      <tr key={ko.id}>
                        <td className="font-mono">{ko.paymentNo}</td>
                        <td>{formatDate(ko.paymentDate)}</td>
                        <td className="text-right font-mono text-green-600">{formatCurrency(ko.knockoffAmount, invoice.currencyCode)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Summary</h2>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-mono">{formatCurrency(invoice.subTotal, invoice.currencyCode)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span className="font-mono">{formatCurrency(invoice.taxTotal, invoice.currencyCode)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Total</span>
                <span className="font-mono">{formatCurrency(invoice.netTotal, invoice.currencyCode)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Paid</span>
                <span className="font-mono">- {formatCurrency(invoice.paidAmount, invoice.currencyCode)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t pt-3">
                <span>Outstanding</span>
                <span className={`font-mono ${invoice.outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(invoice.outstandingAmount, invoice.currencyCode)}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Card */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Customer</h2>
            </div>
            <div className="card-body">
              <p className="font-semibold">{invoice.customerName}</p>
              <p className="text-sm text-gray-500 font-mono">{invoice.customerCode}</p>
              <button
                onClick={() => navigate(`/customers/${invoice.customerId}`)}
                className="mt-3 text-sm text-primary-600 hover:underline"
              >
                View Customer →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
