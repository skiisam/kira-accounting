import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { get, post, put } from '../../services/api';
import {
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface AdjustmentDetail {
  productId: number;
  productCode: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface AdjustmentForm {
  documentDate: string;
  reference?: string;
  locationId?: number;
  reason?: string;
  notes?: string;
  details: AdjustmentDetail[];
}

interface Product {
  id: number;
  code: string;
  description: string;
  standardCost: number;
}

interface Location {
  id: number;
  code: string;
  name: string;
}

export default function StockAdjustmentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const [productSearch, setProductSearch] = useState<{ index: number; query: string; results: Product[] } | null>(null);

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<AdjustmentForm>({
    defaultValues: {
      documentDate: new Date().toISOString().split('T')[0],
      details: [{ productId: 0, productCode: '', description: '', quantity: 0, unitCost: 0, totalCost: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'details' });
  const details = watch('details');

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => get<Location[]>('/stock/locations'),
  });

  // Fetch existing adjustment for edit
  const { data: existingDoc, isLoading: loadingDoc } = useQuery({
    queryKey: ['stock-adjustment', id],
    queryFn: () => get<any>(`/stock/adjustment/${id}`),
    enabled: isEdit,
  });

  // Load existing document
  useEffect(() => {
    if (existingDoc) {
      const loadedDetails = (existingDoc.details || []).map((d: any) => ({
        productId: d.productId || 0,
        productCode: d.product?.code || d.productCode || '',
        description: d.description || d.product?.description || '',
        quantity: Number(d.quantity) || 0,
        unitCost: Number(d.unitCost) || 0,
        totalCost: Number(d.totalCost) || 0,
      }));
      reset({
        documentDate: existingDoc.documentDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        reference: existingDoc.reference || '',
        locationId: existingDoc.locationId || undefined,
        reason: existingDoc.reason || '',
        notes: existingDoc.notes || '',
        details: loadedDetails.length > 0 ? loadedDetails : [{ productId: 0, productCode: '', description: '', quantity: 0, unitCost: 0, totalCost: 0 }],
      });
    }
  }, [existingDoc, reset]);

  // Product search
  const searchProducts = async (query: string, index: number) => {
    if (query.length < 2) {
      setProductSearch(null);
      return;
    }
    try {
      const products = await get<Product[]>('/products', { search: query });
      setProductSearch({ index, query, results: products || [] });
    } catch (err) {
      console.error('Error searching products:', err);
    }
  };

  // Select product from search
  const selectProduct = (product: Product, index: number) => {
    setValue(`details.${index}.productId`, product.id);
    setValue(`details.${index}.productCode`, product.code);
    setValue(`details.${index}.description`, product.description);
    setValue(`details.${index}.unitCost`, product.standardCost || 0);
    updateLineTotal(index);
    setProductSearch(null);
  };

  // Lookup product by code (blur event)
  const lookupProduct = async (code: string, index: number) => {
    if (!code) return;
    try {
      const products = await get<Product[]>('/products', { search: code });
      const product = (products || []).find((p) => p.code.toLowerCase() === code.toLowerCase());
      if (product) {
        selectProduct(product, index);
      }
    } catch (err) {
      console.error('Error looking up product:', err);
    }
  };

  // Update line total
  const updateLineTotal = (index: number) => {
    const qty = Number(details[index]?.quantity) || 0;
    const cost = Number(details[index]?.unitCost) || 0;
    setValue(`details.${index}.totalCost`, qty * cost);
  };

  // Calculate totals
  const totalQty = details.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
  const totalValue = details.reduce((sum, d) => sum + (Number(d.totalCost) || 0), 0);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: AdjustmentForm) =>
      isEdit ? put(`/stock/adjustment/${id}`, data) : post('/stock/adjustment', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Stock adjustment updated' : 'Stock adjustment created');
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      navigate('/stock/adjustment');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to save adjustment');
    },
  });

  const onSubmit = (data: AdjustmentForm) => {
    // Filter out empty lines
    data.details = data.details.filter((d) => d.productId > 0 && d.quantity !== 0);
    if (data.details.length === 0) {
      toast.error('Please add at least one product');
      return;
    }
    saveMutation.mutate(data);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

  if (isEdit && loadingDoc) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/stock/adjustment"
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="page-title flex items-center gap-3">
            <span className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <AdjustmentsHorizontalIcon className="w-6 h-6" />
            </span>
            {isEdit ? 'Edit Stock Adjustment' : 'New Stock Adjustment'}
          </h1>
          <p className="page-subtitle">
            {isEdit ? 'Update adjustment details' : 'Create a new stock adjustment'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Fields */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Adjustment Details
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                className={`input ${errors.documentDate ? 'input-error' : ''}`}
                {...register('documentDate', { required: 'Date is required' })}
              />
              {errors.documentDate && (
                <p className="mt-1 text-sm text-red-600">{errors.documentDate.message}</p>
              )}
            </div>

            <div>
              <label className="label">Reference</label>
              <input
                type="text"
                className="input"
                placeholder="Reference number"
                {...register('reference')}
              />
            </div>

            <div>
              <label className="label">Location</label>
              <select className="input" {...register('locationId', { valueAsNumber: true })}>
                <option value="">Select location</option>
                {locations?.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Reason</label>
              <select className="input" {...register('reason')}>
                <option value="">Select reason</option>
                <option value="Physical Count">Physical Count</option>
                <option value="Damage">Damage</option>
                <option value="Theft">Theft</option>
                <option value="Expired">Expired</option>
                <option value="Write-off">Write-off</option>
                <option value="Found Stock">Found Stock</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-4">
              <label className="label">Notes</label>
              <textarea
                rows={2}
                className="input"
                placeholder="Additional notes..."
                {...register('notes')}
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items</h2>
            <button
              type="button"
              onClick={() =>
                append({
                  productId: 0,
                  productCode: '',
                  description: '',
                  quantity: 0,
                  unitCost: 0,
                  totalCost: 0,
                })
              }
              className="btn btn-secondary btn-sm"
            >
              <PlusIcon className="w-4 h-4" />
              Add Line
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-40">
                    Product Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-28">
                    Qty (+/-)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                    Unit Cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                    Total Cost
                  </th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {fields.map((field, index) => (
                  <tr key={field.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-2 relative">
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          className="input pl-8 text-sm"
                          placeholder="Search..."
                          {...register(`details.${index}.productCode`)}
                          onChange={(e) => {
                            register(`details.${index}.productCode`).onChange(e);
                            searchProducts(e.target.value, index);
                          }}
                          onBlur={(e) => lookupProduct(e.target.value, index)}
                        />
                      </div>
                      {/* Product search dropdown */}
                      {productSearch?.index === index && productSearch.results.length > 0 && (
                        <div className="absolute z-10 mt-1 w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {productSearch.results.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between items-center"
                              onClick={() => selectProduct(product, index)}
                            >
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {product.code}
                                </div>
                                <div className="text-sm text-gray-500">{product.description}</div>
                              </div>
                              <span className="text-sm text-gray-400">
                                {formatCurrency(product.standardCost)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        className="input text-sm"
                        placeholder="Description"
                        {...register(`details.${index}.description`)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        className="input text-sm text-right font-mono"
                        placeholder="0"
                        {...register(`details.${index}.quantity`, { valueAsNumber: true })}
                        onChange={(e) => {
                          register(`details.${index}.quantity`).onChange(e);
                          setTimeout(() => updateLineTotal(index), 0);
                        }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        className="input text-sm text-right font-mono"
                        placeholder="0.00"
                        {...register(`details.${index}.unitCost`, { valueAsNumber: true })}
                        onChange={(e) => {
                          register(`details.${index}.unitCost`).onChange(e);
                          setTimeout(() => updateLineTotal(index), 0);
                        }}
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-sm">
                      {formatCurrency(details[index]?.totalCost || 0)}
                    </td>
                    <td className="px-4 py-2">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-slate-800 font-semibold">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-right">
                    Totals:
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{totalQty.toLocaleString()}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalValue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link to="/stock/adjustment" className="btn btn-secondary">
            <XMarkIcon className="w-5 h-5" />
            Cancel
          </Link>
          <button type="submit" disabled={saveMutation.isPending} className="btn btn-primary">
            <CheckIcon className="w-5 h-5" />
            {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
