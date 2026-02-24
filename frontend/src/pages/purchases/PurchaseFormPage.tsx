import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { get, post, put } from '../../services/api';
import { PlusIcon, TrashIcon, MagnifyingGlassIcon, DocumentDuplicateIcon, XCircleIcon } from '@heroicons/react/24/outline';
import PurchaseTransferDialog from '../../components/purchases/TransferDialog';
import SearchDialog from '../../components/common/SearchDialog';

interface PurchaseDetail {
  productId: number;
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxCode?: string;
  taxRate: number;
  taxAmount: number;
  subTotal: number;
}

interface PurchaseForm {
  vendorId: number;
  vendorCode: string;
  documentDate: string;
  dueDate?: string;
  supplierInvoiceNo?: string;
  supplierDONo?: string;
  reference?: string;
  description?: string;
  reason?: string;
  locationId?: number;
  details: PurchaseDetail[];
}

const typeLabels: Record<string, string> = {
  order: 'Purchase Order',
  grn: 'Goods Received Note',
  invoice: 'Purchase Invoice',
  cn: 'Supplier Credit Note',
  dn: 'Supplier Debit Note',
};

const typeEndpoints: Record<string, string> = {
  order: 'orders',
  grn: 'grn',
  invoice: 'invoices',
  cn: 'credit-notes',
  dn: 'debit-notes',
};

const transferTargets: Record<string, { label: string; target: string }[]> = {
  order: [
    { label: 'GRN', target: 'GRN' },
    { label: 'Invoice', target: 'PURCHASE_INVOICE' },
  ],
  grn: [
    { label: 'Invoice', target: 'PURCHASE_INVOICE' },
  ],
};

export default function PurchaseFormPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const docType = type || 'order';
  const [vendorError, setVendorError] = useState('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<{ target: string; label: string } | null>(null);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [vendorSearchOpen, setVendorSearchOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState<number | null>(null);
  
  // Get transfer data from navigation state
  const transferFrom = (location.state as any)?.transferFrom;

  const { register, control, handleSubmit, watch, setValue, reset } = useForm<PurchaseForm>({
    defaultValues: {
      vendorId: 0,
      vendorCode: '',
      documentDate: new Date().toISOString().split('T')[0],
      details: [{ productId: 0, productCode: '', description: '', quantity: 1, unitPrice: 0, discountAmount: 0, taxRate: 6, taxAmount: 0, subTotal: 0 }],
    },
  });

  // Fetch existing document for edit mode
  const { data: existingDoc } = useQuery({
    queryKey: ['purchase', docType, id],
    queryFn: () => get<any>(`/purchases/${typeEndpoints[docType]}/${id}`),
    enabled: isEdit,
  });

  // Populate form when data is loaded
  useEffect(() => {
    if (existingDoc) {
      const details = (existingDoc.details || []).map((d: any) => ({
        productId: d.productId || 0,
        productCode: d.product?.code || d.productCode || '',
        description: d.description || '',
        quantity: Number(d.quantity) || 1,
        unitPrice: Number(d.unitPrice) || 0,
        discountAmount: Number(d.discountAmount) || 0,
        taxRate: Number(d.taxRate) || 6,
        taxAmount: Number(d.taxAmount) || 0,
        subTotal: Number(d.subTotal) || 0,
      }));
      
      reset({
        vendorId: existingDoc.vendorId || 0,
        vendorCode: existingDoc.vendor?.code || '',
        documentDate: existingDoc.documentDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        dueDate: existingDoc.dueDate?.split('T')[0] || '',
        supplierInvoiceNo: existingDoc.supplierInvoiceNo || '',
        supplierDONo: existingDoc.supplierDONo || '',
        reference: existingDoc.reference || '',
        description: existingDoc.description || '',
        reason: existingDoc.reason || '',
        details: details.length > 0 ? details : [{ productId: 0, productCode: '', description: '', quantity: 1, unitPrice: 0, discountAmount: 0, taxRate: 6, taxAmount: 0, subTotal: 0 }],
      });
    }
  }, [existingDoc, reset]);

  // Populate form from transfer source
  useEffect(() => {
    if (transferFrom && !isEdit) {
      const details = (transferFrom.details || [])
        .filter((d: any) => Number(d.outstandingQty || d.quantity) > 0)
        .map((d: any) => ({
          productId: d.productId || 0,
          productCode: d.product?.code || d.productCode || '',
          description: d.description || '',
          quantity: Number(d.outstandingQty || d.quantity) || 1,
          unitPrice: Number(d.unitPrice) || 0,
          discountAmount: Number(d.discountAmount) || 0,
          taxRate: Number(d.taxRate) || 6,
          taxAmount: Number(d.taxAmount) || 0,
          subTotal: Number(d.subTotal) || 0,
        }));
      
      if (details.length > 0) {
        reset({
          vendorId: transferFrom.vendorId || 0,
          vendorCode: transferFrom.vendor?.code || transferFrom.vendorCode || '',
          documentDate: new Date().toISOString().split('T')[0],
          dueDate: '',
          supplierInvoiceNo: '',
          supplierDONo: '',
          reference: `Transfer from ${transferFrom.documentNo}`,
          description: transferFrom.description || '',
          details,
        });
      }
    }
  }, [transferFrom, isEdit, reset]);

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

  // Handle vendor selection from search dialog
  const handleVendorSelect = (vendor: any) => {
    setValue('vendorId', vendor.id);
    setValue('vendorCode', vendor.code);
    setVendorError('');
  };

  // Handle product selection from search dialog
  const handleProductSelect = (product: any, index: number) => {
    setValue(`details.${index}.productId`, product.id);
    setValue(`details.${index}.productCode`, product.code);
    setValue(`details.${index}.description`, product.description);
    setValue(`details.${index}.unitPrice`, Number(product.lastPurchaseCost) || Number(product.standardCost) || 0);
    updateLine(index);
    setProductSearchOpen(null);
  };

  // Look up product by code  
  const lookupProduct = async (code: string, index: number) => {
    if (!code) return;
    try {
      const products = await get<any[]>('/products', { search: code });
      const product = (products || []).find((p: any) => p.code.toLowerCase() === code.toLowerCase());
      if (product) {
        setValue(`details.${index}.productId`, product.id);
        setValue(`details.${index}.description`, product.description);
        setValue(`details.${index}.unitPrice`, Number(product.lastPurchaseCost) || Number(product.standardCost) || 0);
        updateLine(index);
      }
    } catch (err) {
      console.error('Error looking up product:', err);
    }
  };

  const { fields, append, remove } = useFieldArray({ control, name: 'details' });
  const details = watch('details');

  // Calculate totals
  const subTotal = details.reduce((sum, d) => sum + (d.quantity * d.unitPrice - d.discountAmount), 0);
  const taxTotal = details.reduce((sum, d) => sum + d.taxAmount, 0);
  const netTotal = subTotal + taxTotal;

  // Update line calculations
  const updateLine = (index: number) => {
    const line = details[index];
    const lineSubTotal = line.quantity * line.unitPrice - line.discountAmount;
    const taxAmount = lineSubTotal * (line.taxRate / 100);
    setValue(`details.${index}.subTotal`, lineSubTotal);
    setValue(`details.${index}.taxAmount`, taxAmount);
  };

  const mutation = useMutation({
    mutationFn: (data: PurchaseForm) => {
      const endpoint = `/purchases/${typeEndpoints[docType]}`;
      return isEdit ? put(`${endpoint}/${id}`, data) : post(endpoint, data);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Document updated' : 'Document created');
      navigate(-1);
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed'),
  });

  const handleTransferSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['purchase', docType, id] });
    navigate(-1);
  };

  const openTransferDialog = (target: { label: string; target: string }) => {
    setSelectedTransfer(target);
    setTransferDialogOpen(true);
  };

  const postMutation = useMutation({
    mutationFn: () => post(`/purchases/${typeEndpoints[docType]}/${id}/post`),
    onSuccess: () => {
      toast.success('Invoice posted to AP');
      navigate('/ap/invoices');
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Post failed'),
  });

  const voidMutation = useMutation({
    mutationFn: () => post(`/purchases/${typeEndpoints[docType]}/${id}/void`),
    onSuccess: () => {
      toast.success('Document voided successfully');
      queryClient.invalidateQueries({ queryKey: ['purchase'] });
      navigate(-1);
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to void document'),
  });

  const handleVoid = () => {
    setVoidModalOpen(true);
  };

  const confirmVoid = () => {
    voidMutation.mutate();
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

  const canTransfer = isEdit && transferTargets[docType] && existingDoc?.status === 'OPEN';
  const canPost = isEdit && docType === 'invoice' && !existingDoc?.isPosted && existingDoc?.status === 'OPEN';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? `Edit ${typeLabels[docType]}` : `New ${typeLabels[docType]}`}
          {isEdit && existingDoc?.documentNo && (
            <span className="text-gray-500 ml-2">#{existingDoc.documentNo}</span>
          )}
        </h1>
        <div className="flex gap-2">
          {canTransfer && transferTargets[docType].map((t) => (
            <button
              key={t.target}
              type="button"
              onClick={() => openTransferDialog(t)}
              className="btn btn-secondary text-sm"
            >
              <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
              To {t.label}
            </button>
          ))}
          {canPost && (
            <button
              type="button"
              onClick={() => postMutation.mutate()}
              disabled={postMutation.isPending}
              className="btn btn-success text-sm"
            >
              {postMutation.isPending ? 'Posting...' : 'Post to AP'}
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        {/* Header */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Document Details</h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="label">Vendor Code *</label>
              <div className="flex gap-2">
                <input 
                  {...register('vendorCode', { required: true })} 
                  className={`input flex-1 ${vendorError ? 'border-red-500' : ''}`}
                  placeholder="Enter code" 
                  onBlur={(e) => lookupVendor(e.target.value)}
                />
                <input type="hidden" {...register('vendorId', { valueAsNumber: true })} />
                <button type="button" onClick={() => setVendorSearchOpen(true)} className="btn btn-secondary px-3">
                  <MagnifyingGlassIcon className="w-5 h-5" />
                </button>
              </div>
              {vendorError && <p className="text-red-500 text-sm mt-1">{vendorError}</p>}
            </div>
            <div>
              <label className="label">Document Date *</label>
              <input {...register('documentDate', { required: true })} type="date" className="input" />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input {...register('dueDate')} type="date" className="input" />
            </div>
            {(docType === 'invoice') && (
              <div>
                <label className="label">Supplier Invoice No</label>
                <input {...register('supplierInvoiceNo')} className="input" />
              </div>
            )}
            {(docType === 'grn') && (
              <div>
                <label className="label">Supplier DO No</label>
                <input {...register('supplierDONo')} className="input" />
              </div>
            )}
            <div>
              <label className="label">Reference</label>
              <input {...register('reference')} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <input {...register('description')} className="input" />
            </div>
            {(docType === 'cn' || docType === 'dn') && (
              <div className="md:col-span-3">
                <label className="label">Reason for {docType === 'cn' ? 'Credit Note' : 'Debit Note'} *</label>
                <textarea 
                  {...register('reason', { required: docType === 'cn' || docType === 'dn' })} 
                  className="input min-h-[80px]" 
                  placeholder={`Enter reason for issuing this ${docType === 'cn' ? 'credit note' : 'debit note'}...`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold">Line Items</h2>
            <button
              type="button"
              onClick={() => append({ productId: 0, productCode: '', description: '', quantity: 1, unitPrice: 0, discountAmount: 0, taxRate: 6, taxAmount: 0, subTotal: 0 })}
              className="btn btn-secondary text-sm"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add Line
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th className="w-32">Code</th>
                  <th>Description</th>
                  <th className="w-24 text-right">Qty</th>
                  <th className="w-32 text-right">Unit Price</th>
                  <th className="w-24 text-right">Disc</th>
                  <th className="w-20 text-right">Tax %</th>
                  <th className="w-28 text-right">Tax Amt</th>
                  <th className="w-32 text-right">SubTotal</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="flex gap-1">
                        <input
                          {...register(`details.${index}.productCode`)}
                          className="input py-1 text-sm flex-1"
                          onBlur={(e) => {
                            lookupProduct(e.target.value, index);
                            updateLine(index);
                          }}
                        />
                        <button 
                          type="button" 
                          onClick={() => setProductSearchOpen(index)}
                          className="btn btn-secondary px-2 py-1"
                        >
                          <MagnifyingGlassIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td>
                      <input {...register(`details.${index}.description`)} className="input py-1 text-sm" />
                    </td>
                    <td>
                      <input
                        {...register(`details.${index}.quantity`, { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        className="input py-1 text-sm text-right"
                        onBlur={() => updateLine(index)}
                      />
                    </td>
                    <td>
                      <input
                        {...register(`details.${index}.unitPrice`, { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        className="input py-1 text-sm text-right"
                        onBlur={() => updateLine(index)}
                      />
                    </td>
                    <td>
                      <input
                        {...register(`details.${index}.discountAmount`, { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        className="input py-1 text-sm text-right"
                        onBlur={() => updateLine(index)}
                      />
                    </td>
                    <td>
                      <input
                        {...register(`details.${index}.taxRate`, { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        className="input py-1 text-sm text-right"
                        onBlur={() => updateLine(index)}
                      />
                    </td>
                    <td className="text-right font-mono text-sm">
                      {formatCurrency(details[index]?.taxAmount || 0)}
                    </td>
                    <td className="text-right font-mono text-sm">
                      {formatCurrency(details[index]?.subTotal || 0)}
                    </td>
                    <td>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t p-4 flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Sub Total:</span>
                <span className="font-mono">{formatCurrency(subTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span className="font-mono">{formatCurrency(taxTotal)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Net Total:</span>
                <span className="font-mono">{formatCurrency(netTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          {id && (
            <button
              type="button"
              onClick={handleVoid}
              className="btn bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircleIcon className="w-4 h-4 mr-1" />
              Void
            </button>
          )}
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
            {mutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>

      {/* Transfer Dialog */}
      {selectedTransfer && (
        <PurchaseTransferDialog
          isOpen={transferDialogOpen}
          onClose={() => setTransferDialogOpen(false)}
          onSuccess={handleTransferSuccess}
          documentId={parseInt(id || '0')}
          documentType={docType as 'order' | 'grn'}
          targetType={selectedTransfer.target}
          targetLabel={selectedTransfer.label}
          endpoint={typeEndpoints[docType]}
        />
      )}

      {/* Void Modal */}
      {voidModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setVoidModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Void {typeLabels[docType]}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to void this document? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setVoidModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={confirmVoid}
                disabled={voidMutation.isPending}
                className="btn bg-red-600 hover:bg-red-700 text-white"
              >
                {voidMutation.isPending ? 'Voiding...' : 'Void Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Search Dialog */}
      <SearchDialog
        isOpen={vendorSearchOpen}
        onClose={() => setVendorSearchOpen(false)}
        onSelect={handleVendorSelect}
        title="Select Vendor"
        endpoint="/vendors"
        displayFields={[
          { key: 'name', label: 'Name' },
          { key: 'contactPerson', label: 'Contact' },
        ]}
        valueField="code"
        newPath="/vendors/new"
        placeholder="Search by code or name..."
      />

      {/* Product Search Dialog */}
      <SearchDialog
        isOpen={productSearchOpen !== null}
        onClose={() => setProductSearchOpen(null)}
        onSelect={(product) => productSearchOpen !== null && handleProductSelect(product, productSearchOpen)}
        title="Select Product"
        endpoint="/products"
        displayFields={[
          { key: 'description', label: 'Description' },
          { key: 'group.name', label: 'Group' },
        ]}
        valueField="code"
        newPath="/products/new"
        placeholder="Search by code or description..."
      />
    </div>
  );
}
