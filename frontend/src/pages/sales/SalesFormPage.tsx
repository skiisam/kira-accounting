import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api, { get, post, put, del } from '../../services/api';
import { PlusIcon, TrashIcon, MagnifyingGlassIcon, DocumentDuplicateIcon, XCircleIcon } from '@heroicons/react/24/outline';
import TransferDialog from '../../components/sales/TransferDialog';
import { SendMessageButtons } from '../../components/common/SendMessageDialog';
import SearchDialog from '../../components/common/SearchDialog';
import { usePermissions, MODULES } from '../../hooks/usePermissions';

interface SalesDetail {
  productId: number;
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountText?: string;
  discountAmount: number;
  taxCode?: string;
  taxRate: number;
  taxAmount: number;
  subTotal: number;
}

interface SalesForm {
  customerId: number;
  customerCode: string;
  documentDate: string;
  dueDate?: string;
  reference?: string;
  description?: string;
  reason?: string;
  salesAgentId?: number;
  locationId?: number;
  details: SalesDetail[];
}

const typeLabels: Record<string, string> = {
  quotation: 'Quotation',
  order: 'Sales Order',
  do: 'Delivery Order',
  invoice: 'Invoice',
  cash: 'Cash Sale',
  cn: 'Credit Note',
  dn: 'Debit Note',
};

const typeEndpoints: Record<string, string> = {
  quotation: 'quotations',
  order: 'orders',
  do: 'delivery-orders',
  invoice: 'invoices',
  cash: 'cash-sales',
  cn: 'credit-notes',
  dn: 'debit-notes',
};

const transferTargets: Record<string, { label: string; target: string }[]> = {
  quotation: [
    { label: 'Sales Order', target: 'ORDER' },
    { label: 'Invoice', target: 'INVOICE' },
  ],
  order: [
    { label: 'Delivery Order', target: 'DO' },
    { label: 'Invoice', target: 'INVOICE' },
  ],
  do: [
    { label: 'Invoice', target: 'INVOICE' },
  ],
};

export default function SalesFormPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const docType = type || 'invoice';
  const [customerError, setCustomerError] = useState('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<{ target: string; label: string } | null>(null);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState<number | null>(null);
  const { canPost: canPostPerm } = usePermissions();
  const [priceLevel, setPriceLevel] = useState<Record<number, number>>({});
  const [historyModal, setHistoryModal] = useState<{ index: number; items: any[]; stock: { totalQty: number; locations: any[] } | null; loading: boolean } | null>(null);
  const [stockModal, setStockModal] = useState<{ items: any[]; loading: boolean } | null>(null);
  const [vendorSearchOpen, setVendorSearchOpen] = useState(false);
  const [creatingPo, setCreatingPo] = useState(false);
  const [poMatchConfirmed, setPoMatchConfirmed] = useState(false);
  const [poMatchSnapshot, setPoMatchSnapshot] = useState<string | null>(null);
  const [poAttachments, setPoAttachments] = useState<any[] | null>(null);
  const [poUploading, setPoUploading] = useState(false);
  
  // Get transfer data from navigation state
  const transferFrom = (location.state as any)?.transferFrom;

  const { register, control, handleSubmit, watch, setValue, reset } = useForm<SalesForm>({
    defaultValues: {
      customerId: 0,
      customerCode: '',
      documentDate: new Date().toISOString().split('T')[0],
      details: [{ productId: 0, productCode: '', description: '', quantity: 1, unitPrice: 0, discountText: '', discountAmount: 0, taxRate: 6, taxAmount: 0, subTotal: 0 }],
    },
  });

  // Fetch existing document for edit mode
  const { data: existingDoc } = useQuery({
    queryKey: ['sales', docType, id],
    queryFn: () => get<any>(`/sales/${typeEndpoints[docType]}/${id}`),
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
        discountText: d.discountText || (d.discountAmount ? String(d.discountAmount) : ''),
        discountAmount: Number(d.discountAmount) || 0,
        taxRate: Number(d.taxRate) || 6,
        taxAmount: Number(d.taxAmount) || 0,
        subTotal: Number(d.subTotal) || 0,
      }));
      
      reset({
        customerId: existingDoc.customerId || 0,
        customerCode: existingDoc.customer?.code || '',
        documentDate: existingDoc.documentDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        dueDate: existingDoc.dueDate?.split('T')[0] || '',
        reference: existingDoc.reference || '',
        description: existingDoc.description || '',
        reason: existingDoc.reason || '',
        details: details.length > 0 ? details : [{ productId: 0, productCode: '', description: '', quantity: 1, unitPrice: 0, discountText: '', discountAmount: 0, taxRate: 6, taxAmount: 0, subTotal: 0 }],
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
          discountText: d.discountText || (d.discountAmount ? String(d.discountAmount) : ''),
          discountAmount: Number(d.discountAmount) || 0,
          taxRate: Number(d.taxRate) || 6,
          taxAmount: Number(d.taxAmount) || 0,
          subTotal: Number(d.subTotal) || 0,
        }));
      
      if (details.length > 0) {
        reset({
          customerId: transferFrom.customerId || 0,
          customerCode: transferFrom.customer?.code || transferFrom.customerCode || '',
          documentDate: new Date().toISOString().split('T')[0],
          dueDate: '',
          reference: `Transfer from ${transferFrom.documentNo}`,
          description: `Copied from ${transferFrom.documentNo}` + (transferFrom.description ? ` — ${transferFrom.description}` : ''),
          details,
        });
      }
    }
  }, [transferFrom, isEdit, reset]);

  // Look up customer by code
  const lookupCustomer = async (code: string) => {
    if (!code) return;
    try {
      const customers = await get<any[]>('/customers', { search: code });
      const customer = (customers || []).find((c: any) => c.code.toLowerCase() === code.toLowerCase());
      if (customer) {
        setValue('customerId', customer.id);
        setCustomerError('');
      } else {
        setValue('customerId', 0);
        setCustomerError('Customer not found');
      }
    } catch (err) {
      setCustomerError('Error looking up customer');
    }
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
        setValue(`details.${index}.unitPrice`, Number(product.sellingPrice1) || 0);
        updateLine(index);
      }
    } catch (err) {
      console.error('Error looking up product:', err);
    }
  };

  // Handle customer selection from search dialog
  const handleCustomerSelect = (customer: any) => {
    setValue('customerId', customer.id);
    setValue('customerCode', customer.code);
    setCustomerError('');
  };

  // Handle product selection from search dialog
  const handleProductSelect = (product: any, index: number) => {
    setValue(`details.${index}.productId`, product.id);
    setValue(`details.${index}.productCode`, product.code);
    setValue(`details.${index}.description`, product.description);
    setValue(`details.${index}.unitPrice`, Number(product.sellingPrice1) || 0);
    setPriceLevel((prev) => ({ ...prev, [index]: 1 }));
    updateLine(index);
    setProductSearchOpen(null);
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
    let discountAmount = Number(line.discountAmount) || 0;
    const raw = (line.discountText || '').toString().trim();
    if (raw) {
      if (raw.endsWith('%')) {
        const pct = parseFloat(raw.slice(0, -1));
        if (!isNaN(pct)) {
          const base = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
          discountAmount = base * (pct / 100);
        }
      } else {
        const amt = parseFloat(raw.replace(/,/g, ''));
        if (!isNaN(amt)) discountAmount = amt;
      }
    }
    setValue(`details.${index}.discountAmount`, discountAmount);
    const lineSubTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0) - discountAmount;
    const rate = Number(line.taxRate) || 0;
    const taxAmount = lineSubTotal * (rate / 100);
    setValue(`details.${index}.subTotal`, lineSubTotal);
    setValue(`details.${index}.taxAmount`, taxAmount);
  };

  // Load price level from product pricing
  const applyPriceLevel = async (index: number, level: number) => {
    const line = details[index];
    if (!line?.productId) return;
    try {
      const pricing = await get<any>(`/products/${line.productId}/pricing`);
      const priceMap: Record<number, number> = {
        1: Number(pricing.sellingPrice1 || 0),
        2: Number(pricing.sellingPrice2 || 0),
        3: Number(pricing.sellingPrice3 || 0),
        4: Number(pricing.sellingPrice4 || 0),
        5: Number(pricing.sellingPrice5 || 0),
        6: Number(pricing.sellingPrice6 || 0),
      };
      const newPrice = priceMap[level] ?? 0;
      setValue(`details.${index}.unitPrice`, newPrice);
      setPriceLevel((prev) => ({ ...prev, [index]: level }));
      updateLine(index);
    } catch (err) {
      console.error('Failed to load pricing', err);
    }
  };

  // Use last sold price to this customer
  const useLastPrice = async (index: number) => {
    const line = details[index];
    const customerId = watch('customerId');
    if (!line?.productId || !customerId) {
      toast.error('Select customer and product first');
      return;
    }
    try {
      const history = await get<any[]>(`/sales/price-history`, { customerId, productId: line.productId, limit: 1 });
      const last = (history || [])[0];
      if (last) {
        setValue(`details.${index}.unitPrice`, Number(last.unitPrice) || 0);
        updateLine(index);
        toast.success(`Loaded last price from ${new Date(last.date).toLocaleDateString()}`);
      } else {
        toast('No past price found; using current price level', { icon: 'ℹ️' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to load price history');
    }
  };

  // Open price history modal (loads both history and stock)
  const openHistory = async (index: number) => {
    const line = details[index];
    const customerId = watch('customerId');
    if (!line?.productId) {
      toast.error('Select a product first');
      return;
    }
    setHistoryModal({ index, items: [], stock: null, loading: true });
    try {
      const [history, stock] = await Promise.all([
        customerId ? get<any[]>(`/sales/price-history`, { customerId, productId: line.productId, limit: 10 }) : Promise.resolve([]),
        get<any>(`/products/${line.productId}/stock`),
      ]);
      setHistoryModal({ index, items: history || [], stock: stock || { totalQty: 0, locations: [] }, loading: false });
    } catch (err: any) {
      setHistoryModal({ index, items: [], stock: { totalQty: 0, locations: [] }, loading: false });
      toast.error(err.response?.data?.error?.message || 'Failed to load history/stock');
    }
  };

  const mutation = useMutation({
    mutationFn: (data: SalesForm) => {
      const endpoint = `/sales/${typeEndpoints[docType]}`;
      return isEdit ? put(`${endpoint}/${id}`, data) : post(endpoint, data);
    },
    onSuccess: (created: any) => {
      // Invalidate list query to auto-refresh
      queryClient.invalidateQueries({ queryKey: ['sales', docType] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success(isEdit ? 'Document updated' : 'Document created');
      // If a Sales Invoice was created and auto-posted to AR, deep-link to AR Invoice
      if (!isEdit && docType === 'invoice' && created?.arInvoiceId) {
        navigate(`/ar/invoices/${created.arInvoiceId}`);
      } else {
        navigate(-1);
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed'),
  });

  const handleTransferSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['sales', docType, id] });
    navigate(-1);
  };

  const openTransferDialog = (target: { label: string; target: string }) => {
    setSelectedTransfer(target);
    setTransferDialogOpen(true);
  };

  const postMutation = useMutation({
    mutationFn: () => post(`/sales/invoices/${id}/post`),
    onSuccess: () => {
      toast.success('Invoice posted to AR');
      navigate('/ar/invoices');
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Post failed'),
  });

  const voidMutation = useMutation({
    mutationFn: () => post(`/sales/${typeEndpoints[docType]}/${id}/void`),
    onSuccess: () => {
      toast.success('Document voided successfully');
      queryClient.invalidateQueries({ queryKey: ['sales'] });
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

  const deleteMutation = useMutation({
    mutationFn: () => del(`/sales/${typeEndpoints[docType]}/${id}`),
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      navigate(-1);
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to delete document'),
  });

  const handleDelete = () => setDeleteModalOpen(true);
  const confirmDelete = () => deleteMutation.mutate();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

  const handlePrint = async () => {
    if (!id) return;
    try {
      const html = await post<string>(`/sales/${typeEndpoints[docType]}/${id}/print`);
      const win = window.open('', '_blank');
      if (win) {
        win.document.open();
        win.document.write(typeof html === 'string' ? html : String(html));
        win.document.close();
      } else {
        toast.error('Popup blocked. Please allow popups to preview.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to print');
    }
  };
  const rawTargets = transferTargets[docType] || [];
  const filteredTargets = rawTargets.filter(t => {
    if (t.target === 'INVOICE') {
      return canPostPerm(MODULES.SALES);
    }
    return true;
  });
  const canTransfer = isEdit && filteredTargets.length > 0 && existingDoc?.status === 'OPEN';
  const canPost = isEdit && docType === 'invoice' && !existingDoc?.isPosted && existingDoc?.status === 'OPEN';
  const canSendMessage = isEdit && (docType === 'invoice' || docType === 'quotation');
  const canVoid = isEdit && existingDoc?.status !== 'VOID';
  const canDelete = isEdit && existingDoc?.status !== 'VOID';
  const canViewAR = isEdit && existingDoc?.documentType === 'INVOICE' && existingDoc?.arInvoiceId;
  const canStockCheck = isEdit && docType === 'order' && existingDoc?.status === 'OPEN';

  useEffect(() => {
    const loadPoAttachments = async () => {
      if (!id || docType !== 'order') return;
      try {
        const resp = await get<any>(`/files/sales/${id}/po`);
        setPoAttachments(resp || []);
      } catch {
        setPoAttachments([]);
      }
    };
    loadPoAttachments();
  }, [id, docType]);

  const handlePoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const form = new FormData();
    form.append('file', file);
    setPoUploading(true);
    try {
      await api.post(`/files/sales/${id}/po`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const resp = await get<any>(`/files/sales/${id}/po`);
      setPoAttachments(resp || []);
      toast.success('PO attached');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Upload failed');
    } finally {
      setPoUploading(false);
      e.target.value = '';
    }
  };

  const handlePoDelete = async (fileName: string) => {
    if (!id) return;
    try {
      await del(`/files/sales/${id}/po/${encodeURIComponent(fileName)}`);
      const resp = await get<any>(`/files/sales/${id}/po`);
      setPoAttachments(resp || []);
      toast.success('Attachment removed');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Delete failed');
    }
  };

  const currentLinesHash = JSON.stringify(
    ((watch('details') as any[]) || []).map((d: any) => ({
      productId: d.productId || 0,
      qty: Number(d.quantity) || 0,
      price: Number(d.unitPrice) || 0,
    }))
  );
  const linesChangedPostMatch = poMatchConfirmed && poMatchSnapshot && currentLinesHash !== poMatchSnapshot;

  const doStockCheck = async () => {
    if (!id) return;
    setStockModal({ items: [], loading: true });
    try {
      const items = await get<any[]>(`/sales/orders/${id}/stock-check`);
      setStockModal({ items: items || [], loading: false });
    } catch (err: any) {
      setStockModal(null);
      toast.error(err.response?.data?.error?.message || 'Failed to check stock');
    }
  };

  // Create PO for shortfalls: requires vendor selection
  const handleCreatePO = () => {
    if (!stockModal || (stockModal.items || []).every((i: any) => Number(i.shortfallQty) <= 0)) {
      toast('No shortfalls to purchase', { icon: 'ℹ️' });
      return;
    }
    setVendorSearchOpen(true);
  };

  const handleVendorSelect = async (vendor: any) => {
    try {
      setVendorSearchOpen(false);
      if (!stockModal) return;
      const shortfalls = (stockModal.items || []).filter((i: any) => Number(i.shortfallQty) > 0);
      if (shortfalls.length === 0) {
        toast('No shortfalls to purchase', { icon: 'ℹ️' });
        return;
      }
      setCreatingPo(true);
      // Build PO details with cost hints
      const details: any[] = [];
      for (const s of shortfalls) {
        const pricing = await get<any>(`/products/${s.productId}/pricing`);
        const unitCost = Number(pricing?.lastPurchaseCost || pricing?.averageCost || 0);
        details.push({
          productId: s.productId,
          productCode: s.productCode,
          description: s.description,
          quantity: s.shortfallQty,
          unitPrice: unitCost,
          discountAmount: 0,
          taxRate: 0,
          taxAmount: 0,
          subTotal: Number(s.shortfallQty) * unitCost,
        });
      }
      const payload = {
        vendorId: vendor.id,
        documentDate: new Date().toISOString().split('T')[0],
        reference: `Shortfall for SO ${existingDoc?.documentNo || id}`,
        description: 'Auto-generated from stock shortfall',
        details,
      };
      const po = await post<any>('/purchases/orders', payload);
      toast.success('Purchase Order created for shortfalls');
      setStockModal(null);
      setCreatingPo(false);
      navigate(`/purchases/orders/${po.id}`);
    } catch (err: any) {
      setCreatingPo(false);
      toast.error(err.response?.data?.error?.message || 'Failed to create Purchase Order');
    }
  };

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
          {canViewAR && (
            <button
              type="button"
              onClick={() => navigate(`/ar/invoices/${existingDoc.arInvoiceId}`)}
              className="btn btn-secondary"
            >
              View AR Invoice →
            </button>
          )}
          {/* Send Message Buttons */}
          {canSendMessage && existingDoc && (
            <SendMessageButtons
              documentType="INVOICE"
              documentId={parseInt(id || '0')}
              documentNo={existingDoc.documentNo}
              customerId={existingDoc.customerId}
              customerName={existingDoc.customerName}
              customerPhone={existingDoc.customer?.phone || existingDoc.customer?.mobile}
              amount={formatCurrency(existingDoc.netTotal || netTotal)}
              dueDate={existingDoc.dueDate?.split('T')[0]}
            />
          )}
          {isEdit && (
            <button type="button" onClick={handlePrint} className="btn text-sm">
              Print
            </button>
          )}
          {canStockCheck && (
            <button
              type="button"
              onClick={doStockCheck}
              className="btn text-sm"
              title="Check stock availability for this order"
            >
              Stock Check
            </button>
          )}
          {canTransfer && filteredTargets.map((t) => (
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
              {postMutation.isPending ? 'Posting...' : 'Post to AR'}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="btn bg-red-50 hover:bg-red-100 text-red-700 text-sm border border-red-200"
            >
              <TrashIcon className="w-4 h-4 mr-1" />
              Delete
            </button>
          )}
          {canVoid && (
            <button
              type="button"
              onClick={handleVoid}
              className="btn bg-red-600 hover:bg-red-700 text-white text-sm"
            >
              <XCircleIcon className="w-4 h-4 mr-1" />
              Void
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
              <label className="label">Customer Code *</label>
              <div className="flex gap-2">
                <input 
                  {...register('customerCode', { required: true })} 
                  className={`input flex-1 ${customerError ? 'border-red-500' : ''}`}
                  placeholder="Enter code" 
                  onBlur={(e) => lookupCustomer(e.target.value)}
                />
                <input type="hidden" {...register('customerId', { valueAsNumber: true })} />
                <button type="button" onClick={() => setCustomerSearchOpen(true)} className="btn btn-secondary px-3">
                  <MagnifyingGlassIcon className="w-5 h-5" />
                </button>
              </div>
              {customerError && <p className="text-red-500 text-sm mt-1">{customerError}</p>}
            </div>
            <div>
              <label className="label">Document Date *</label>
              <input {...register('documentDate', { required: true })} type="date" className="input" />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input {...register('dueDate')} type="date" className="input" />
            </div>
            {docType === 'order' && (
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <label className="label">Customer PO No</label>
                  <input {...register('reference')} type="text" className="input" placeholder="Enter customer PO number" />
                </div>
                <div className="md:col-span-2 flex items-end">
                  {!poMatchConfirmed ? (
                    <div className="w-full p-3 border rounded-md bg-yellow-50 text-yellow-800 flex items-center justify-between">
                      <span>PO matching not confirmed. Review lines against Customer PO.</span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setPoMatchConfirmed(true);
                          setPoMatchSnapshot(currentLinesHash);
                        }}
                      >
                        Mark as Matched
                      </button>
                    </div>
                  ) : linesChangedPostMatch ? (
                    <div className="w-full p-3 border rounded-md bg-red-50 text-red-700 flex items-center justify-between">
                      <span>Lines changed after PO was marked as matched. Re-validate against PO.</span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setPoMatchSnapshot(currentLinesHash)}
                      >
                        Acknowledge
                      </button>
                    </div>
                  ) : (
                    <div className="w-full p-3 border rounded-md bg-green-50 text-green-800">
                      Customer PO matched and confirmed.
                    </div>
                  )}
                </div>
                <div className="md:col-span-3">
                  <div className="card">
                    <div className="card-header flex items-center justify-between">
                      <h3 className="text-md font-semibold">PO Attachments</h3>
                      <label className="btn btn-secondary text-sm">
                        {poUploading ? 'Uploading...' : 'Attach PO'}
                        <input type="file" className="hidden" onChange={handlePoUpload} disabled={poUploading} />
                      </label>
                    </div>
                    <div className="card-body">
                      {poAttachments && poAttachments.length > 0 ? (
                        <ul className="list-disc ml-5 space-y-1">
                          {poAttachments.map((f: any) => (
                            <li key={f.fileName} className="flex items-center justify-between">
                              <div>
                                <a className="text-blue-600 hover:underline" href={f.url} target="_blank" rel="noreferrer">
                                  {f.fileName}
                                </a>
                                <span className="text-gray-500 ml-2">({new Date(f.uploadedAt).toLocaleString()})</span>
                              </div>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handlePoDelete(f.fileName)}
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-gray-500">No attachments yet.</div>
                      )}
                    </div>
                  </div>
                </div>
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
                  <th className="w-24 text-right">Level</th>
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
                    <div className="flex gap-1 mt-1">
                      <select
                        value={priceLevel[index] || 1}
                        onChange={(e) => applyPriceLevel(index, Number(e.target.value))}
                        className="input py-1 text-xs"
                        title="Pricing Level"
                      >
                        <option value={1}>Price 1</option>
                        <option value={2}>Price 2</option>
                        <option value={3}>Price 3</option>
                        <option value={4}>Price 4</option>
                        <option value={5}>Price 5</option>
                        <option value={6}>Price 6</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => useLastPrice(index)}
                        className="btn btn-secondary px-2 py-1 text-xs"
                        title="Use last sold price"
                      >
                        Last Price
                      </button>
                      <button
                        type="button"
                        onClick={() => openHistory(index)}
                        className="btn px-2 py-1 text-xs"
                        title="View price history and stock"
                      >
                        History
                      </button>
                    </div>
                    </td>
                  <td className="text-right">
                    <span className="text-xs text-gray-500">{priceLevel[index] ? `P${priceLevel[index]}` : 'P1'}</span>
                  </td>
                    <td>
                      <input
                        {...register(`details.${index}.discountText`)}
                        type="text"
                        className="input py-1 text-sm text-right"
                        placeholder="10 or 10%"
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
        <TransferDialog
          isOpen={transferDialogOpen}
          onClose={() => setTransferDialogOpen(false)}
          onSuccess={handleTransferSuccess}
          documentId={parseInt(id || '0')}
          documentType={docType as 'quotation' | 'order' | 'do'}
          targetType={selectedTransfer.target}
          targetLabel={selectedTransfer.label}
          endpoint={typeEndpoints[docType]}
        />
      )}

      {/* Void Confirmation Modal */}
      {voidModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setVoidModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Void {typeLabels[docType]}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to void <strong>{existingDoc?.documentNo}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setVoidModalOpen(false)}
                className="btn btn-secondary"
              >
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete {typeLabels[docType]}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to permanently delete <strong>{existingDoc?.documentNo}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
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

      {/* Customer Search Dialog */}
      <SearchDialog
        isOpen={customerSearchOpen}
        onClose={() => setCustomerSearchOpen(false)}
        onSelect={handleCustomerSelect}
        title="Select Customer"
        endpoint="/customers"
        displayFields={[
          { key: 'name', label: 'Name' },
          { key: 'contactPerson', label: 'Contact' },
        ]}
        valueField="code"
        newPath="/customers/new"
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

      {/* Vendor Search for PO */}
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
        placeholder="Search vendor by code or name..."
      />

      {/* Stock Check Modal */}
      {stockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setStockModal(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-4xl w-full mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stock Availability</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setStockModal(null)}>
                ✕
              </button>
            </div>
            {stockModal.loading ? (
              <div className="text-gray-600 dark:text-gray-300">Checking...</div>
            ) : (
              <>
                <div className="max-h-[60vh] overflow-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/30">
                      <tr>
                        <th className="text-left p-2">Line</th>
                        <th className="text-left p-2">Product</th>
                        <th className="text-right p-2">Outstanding</th>
                        <th className="text-right p-2">Available</th>
                        <th className="text-right p-2">Shortfall</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stockModal.items || []).map((i: any) => (
                        <tr key={i.lineId} className="border-t">
                          <td className="p-2">{i.lineNo}</td>
                          <td className="p-2">{i.productCode} – {i.description}</td>
                          <td className="p-2 text-right">{Number(i.outstandingQty || 0)}</td>
                          <td className="p-2 text-right">{Number(i.availableQty || 0)}</td>
                          <td className="p-2 text-right">{Number(i.shortfallQty || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button className="btn btn-secondary" onClick={() => setStockModal(null)}>Close</button>
                  <button
                    className="btn btn-primary"
                    onClick={handleCreatePO}
                    disabled={creatingPo || (stockModal.items || []).every((i: any) => Number(i.shortfallQty) <= 0)}
                  >
                    {creatingPo ? 'Creating PO...' : 'Create PO for Shortfalls'}
                  </button>
                  <button
                    className="btn"
                    onClick={async () => {
                      if (!stockModal || !id) return;
                      const shortfalls = (stockModal.items || []).filter((i: any) => Number(i.shortfallQty) > 0);
                      if (shortfalls.length === 0) {
                        toast('No shortfalls to purchase', { icon: 'ℹ️' });
                        return;
                      }
                      try {
                        const details = shortfalls.map((s: any) => ({
                          productId: s.productId,
                          productCode: s.productCode,
                          description: s.description,
                          quantity: s.shortfallQty,
                          unitPrice: 0,
                          discountAmount: 0,
                          taxRate: 0,
                          taxAmount: 0,
                          subTotal: 0,
                        }));
                        const pr = await post<any>('/purchases/requests', {
                          reference: `Shortfall for SO ${existingDoc?.documentNo || id}`,
                          description: 'Auto-generated from stock shortfall',
                          details,
                        });
                        toast.success('Purchase Request created for shortfalls');
                        setStockModal(null);
                        navigate(`/purchases/request/${pr.id}`);
                      } catch (err: any) {
                        toast.error(err.response?.data?.error?.message || 'Failed to create Purchase Request');
                      }
                    }}
                    disabled={(stockModal.items || []).every((i: any) => Number(i.shortfallQty) <= 0)}
                  >
                    Create PR for Shortfalls
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Price History Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setHistoryModal(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-3xl w-full mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Price History & Stock</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setHistoryModal(null)}>
                ✕
              </button>
            </div>
            {historyModal.loading ? (
              <div className="text-gray-600 dark:text-gray-300">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Recent Prices</h4>
                  {historyModal.items.length === 0 ? (
                    <div className="text-sm text-gray-500">No past sales found.</div>
                  ) : (
                    <div className="max-h-64 overflow-auto border rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/30">
                          <tr>
                            <th className="text-left p-2">Date</th>
                            <th className="text-left p-2">Doc No</th>
                            <th className="text-right p-2">Unit Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyModal.items.map((h: any, idx: number) => (
                            <tr key={idx} className="border-t">
                              <td className="p-2">{h.date ? new Date(h.date).toLocaleDateString() : '-'}</td>
                              <td className="p-2">{h.documentNo || '-'}</td>
                              <td className="p-2 text-right">{Number(h.unitPrice || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Current Stock</h4>
                  {!historyModal.stock ? (
                    <div className="text-sm text-gray-500">No stock data.</div>
                  ) : (
                    <>
                      <div className="text-sm mb-2">
                        Total on hand: <span className="font-mono">{Number(historyModal.stock.totalQty || 0)}</span>
                      </div>
                      <div className="max-h-64 overflow-auto border rounded-md">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700/30">
                            <tr>
                              <th className="text-left p-2">Location</th>
                              <th className="text-right p-2">Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(historyModal.stock.locations || []).map((loc: any) => (
                              <tr key={loc.locationId} className="border-t">
                                <td className="p-2">{loc.location?.name || loc.locationId}</td>
                                <td className="p-2 text-right">{Number(loc.balanceQty || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button className="btn btn-primary" onClick={() => setHistoryModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
