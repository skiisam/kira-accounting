import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { get, post } from '../../services/api';
import { MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Knockoff {
  documentId: number;
  documentType: string;
  documentNo: string;
  documentDate: string;
  documentAmount: number;
  outstandingBefore: number;
  knockoffAmount: number;
}

interface PaymentForm {
  vendorId: number;
  vendorCode: string;
  paymentDate: string;
  paymentMethodId: number;
  bankAccountId?: number;
  chequeNo?: string;
  chequeDate?: string;
  reference?: string;
  description?: string;
  paymentAmount: number;
  knockoffs: Knockoff[];
}

interface OutstandingInvoice {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  netTotal: number;
  outstandingAmount: number;
}

export default function APPaymentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [vendorError, setVendorError] = useState('');
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([]);

  const { register, control, handleSubmit, watch, setValue } = useForm<PaymentForm>({
    defaultValues: {
      vendorId: 0,
      vendorCode: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethodId: 1,
      paymentAmount: 0,
      knockoffs: [],
    },
  });

  const { fields, replace } = useFieldArray({ control, name: 'knockoffs' });
  const knockoffs = watch('knockoffs');
  const vendorId = watch('vendorId');

  // Fetch payment methods
  const { data: paymentMethods } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => get<any[]>('/settings/payment-methods'),
  });

  // Fetch outstanding invoices when vendor changes
  useEffect(() => {
    if (vendorId > 0) {
      get<OutstandingInvoice[]>(`/ap/outstanding/${vendorId}`)
        .then(invoices => {
          setOutstandingInvoices(invoices || []);
          // Reset knockoffs with new invoices
          const newKnockoffs = (invoices || []).map(inv => ({
            documentId: inv.id,
            documentType: 'INVOICE',
            documentNo: inv.invoiceNo,
            documentDate: inv.invoiceDate,
            documentAmount: Number(inv.netTotal),
            outstandingBefore: Number(inv.outstandingAmount),
            knockoffAmount: 0,
          }));
          replace(newKnockoffs);
        })
        .catch(err => console.error('Error fetching outstanding invoices:', err));
    }
  }, [vendorId, replace]);

  // Look up vendor by code
  const lookupVendor = async (code: string) => {
    if (!code) return;
    try {
      const vendors = await get<any[]>('/vendors', { search: code });
      const vendor = (vendors || []).find((v: any) => v.code.toLowerCase() === code.toLowerCase());
      if (vendor) {
        setValue('vendorId', vendor.id);
        setVendorError('');
      } else {
        setValue('vendorId', 0);
        setVendorError('Vendor not found');
      }
    } catch (err) {
      setVendorError('Error looking up vendor');
    }
  };

  // Calculate total knockoff amount
  const totalKnockoff = knockoffs.reduce((sum, k) => sum + (Number(k.knockoffAmount) || 0), 0);

  // Auto-distribute payment amount
  const autoDistribute = () => {
    let remaining = Number(watch('paymentAmount')) || 0;
    const newKnockoffs = knockoffs.map(k => {
      const maxAmount = k.outstandingBefore;
      const allocate = Math.min(remaining, maxAmount);
      remaining -= allocate;
      return { ...k, knockoffAmount: allocate };
    });
    replace(newKnockoffs);
  };

  const mutation = useMutation({
    mutationFn: (data: PaymentForm) => {
      const validKnockoffs = data.knockoffs.filter(k => k.knockoffAmount > 0);
      return post('/ap/payments', { ...data, knockoffs: validKnockoffs });
    },
    onSuccess: () => {
      toast.success('Payment created successfully');
      navigate('/ap/payments');
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to create payment'),
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-MY');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit AP Payment' : 'New AP Payment (Payment Voucher)'}
        </h1>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        {/* Header */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Payment Details</h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="label">Vendor Code *</label>
              <div className="flex gap-2">
                <input 
                  {...register('vendorCode', { required: true })} 
                  className={`input flex-1 ${vendorError ? 'border-red-500' : ''}`}
                  placeholder="Enter vendor code" 
                  onBlur={(e) => lookupVendor(e.target.value)}
                />
                <input type="hidden" {...register('vendorId', { valueAsNumber: true })} />
                <button type="button" className="btn btn-secondary px-3">
                  <MagnifyingGlassIcon className="w-5 h-5" />
                </button>
              </div>
              {vendorError && <p className="text-red-500 text-sm mt-1">{vendorError}</p>}
            </div>
            <div>
              <label className="label">Payment Date *</label>
              <input {...register('paymentDate', { required: true })} type="date" className="input" />
            </div>
            <div>
              <label className="label">Payment Method *</label>
              <select {...register('paymentMethodId', { valueAsNumber: true })} className="input">
                {(paymentMethods || []).map((pm: any) => (
                  <option key={pm.id} value={pm.id}>{pm.name}</option>
                ))}
                {(!paymentMethods || paymentMethods.length === 0) && (
                  <>
                    <option value={1}>Cash</option>
                    <option value={2}>Cheque</option>
                    <option value={3}>Bank Transfer</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="label">Cheque No</label>
              <input {...register('chequeNo')} className="input" />
            </div>
            <div>
              <label className="label">Cheque Date</label>
              <input {...register('chequeDate')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Reference</label>
              <input {...register('reference')} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <input {...register('description')} className="input" />
            </div>
            <div>
              <label className="label">Payment Amount *</label>
              <input 
                {...register('paymentAmount', { valueAsNumber: true, required: true })} 
                type="number" 
                step="0.01" 
                className="input text-right font-mono text-lg"
              />
            </div>
          </div>
        </div>

        {/* Invoice Knockoff */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold">Invoice Knockoff</h2>
            <button
              type="button"
              onClick={autoDistribute}
              className="btn btn-secondary text-sm"
            >
              <CheckIcon className="w-4 h-4 mr-1" />
              Auto Distribute
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th className="text-right">Invoice Amount</th>
                  <th className="text-right">Outstanding</th>
                  <th className="text-right w-40">Knockoff Amount</th>
                </tr>
              </thead>
              <tbody>
                {fields.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500 py-8">
                      {vendorId > 0 
                        ? 'No outstanding invoices found' 
                        : 'Enter a vendor code to load outstanding invoices'}
                    </td>
                  </tr>
                ) : (
                  fields.map((field, index) => (
                    <tr key={field.id}>
                      <td className="font-mono">{field.documentNo}</td>
                      <td>{formatDate(field.documentDate)}</td>
                      <td>{formatDate(outstandingInvoices[index]?.dueDate || '')}</td>
                      <td className="text-right font-mono">{formatCurrency(field.documentAmount)}</td>
                      <td className="text-right font-mono">{formatCurrency(field.outstandingBefore)}</td>
                      <td>
                        <input
                          {...register(`knockoffs.${index}.knockoffAmount`, { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          min="0"
                          max={field.outstandingBefore}
                          className="input py-1 text-sm text-right font-mono"
                        />
                        <input type="hidden" {...register(`knockoffs.${index}.documentId`, { valueAsNumber: true })} />
                        <input type="hidden" {...register(`knockoffs.${index}.documentType`)} />
                        <input type="hidden" {...register(`knockoffs.${index}.documentNo`)} />
                        <input type="hidden" {...register(`knockoffs.${index}.documentDate`)} />
                        <input type="hidden" {...register(`knockoffs.${index}.documentAmount`, { valueAsNumber: true })} />
                        <input type="hidden" {...register(`knockoffs.${index}.outstandingBefore`, { valueAsNumber: true })} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={5} className="text-right">Total Knockoff:</td>
                  <td className="text-right font-mono">{formatCurrency(totalKnockoff)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Summary */}
          <div className="border-t p-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Payment Amount:</span>
                  <span className="font-mono">{formatCurrency(watch('paymentAmount') || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Knockoff:</span>
                  <span className="font-mono">{formatCurrency(totalKnockoff)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Unapplied:</span>
                  <span className={`font-mono ${(watch('paymentAmount') || 0) - totalKnockoff < 0 ? 'text-red-500' : ''}`}>
                    {formatCurrency((watch('paymentAmount') || 0) - totalKnockoff)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={mutation.isPending || totalKnockoff === 0}
            className="btn btn-primary"
          >
            {mutation.isPending ? 'Saving...' : 'Save Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}
