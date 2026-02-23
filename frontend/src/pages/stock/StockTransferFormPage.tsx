import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { get, post, put } from '../../services/api';
import {
  ArrowsRightLeftIcon,
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface TransferDetail {
  productId: number;
  productCode: string;
  description: string;
  quantity: number;
}

interface TransferForm {
  documentDate: string;
  reference?: string;
  fromLocationId: number;
  toLocationId: number;
  notes?: string;
  details: TransferDetail[];
}

interface Product {
  id: number;
  code: string;
  description: string;
}

interface Location {
  id: number;
  code: string;
  name: string;
}

export default function StockTransferFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const [productSearch, setProductSearch] = useState<{ index: number; query: string; results: Product[] } | null>(null);

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<TransferForm>({
    defaultValues: {
      documentDate: new Date().toISOString().split('T')[0],
      fromLocationId: 0,
      toLocationId: 0,
      details: [{ productId: 0, productCode: '', description: '', quantity: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'details' });
  const details = watch('details');
  const fromLocationId = watch('fromLocationId');
  const toLocationId = watch('toLocationId');

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => get<Location[]>('/stock/locations'),
  });

  // Fetch existing transfer for edit
  const { data: existingDoc, isLoading: loadingDoc } = useQuery({
    queryKey: ['stock-transfer', id],
    queryFn: () => get<any>(`/stock/transfer/${id}`),
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
      }));
      reset({
        documentDate: existingDoc.documentDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        reference: existingDoc.reference || '',
        fromLocationId: existingDoc.fromLocationId || 0,
        toLocationId: existingDoc.toLocationId || 0,
        notes: existingDoc.notes || '',
        details: loadedDetails.length > 0 ? loadedDetails : [{ productId: 0, productCode: '', description: '', quantity: 0 }],
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

  // Calculate totals
  const totalQty = details.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: TransferForm) =>
      isEdit ? put(`/stock/transfer/${id}`, data) : post('/stock/transfer', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Stock transfer updated' : 'Stock transfer created');
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      navigate('/stock/transfer');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to save transfer');
    },
  });

  const onSubmit = (data: TransferForm) => {
    // Validate locations
    if (!data.fromLocationId || !data.toLocationId) {
      toast.error('Please select both locations');
      return;
    }
    if (data.fromLocationId === data.toLocationId) {
      toast.error('From and To locations must be different');
      return;
    }
    // Filter out empty lines
    data.details = data.details.filter((d) => d.productId > 0 && d.quantity > 0);
    if (data.details.length === 0) {
      toast.error('Please add at least one product with quantity');
      return;
    }
    saveMutation.mutate(data);
  };

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
          to="/stock/transfer"
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="page-title flex items-center gap-3">
            <span className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
              <ArrowsRightLeftIcon className="w-6 h-6" />
            </span>
            {isEdit ? 'Edit Stock Transfer' : 'New Stock Transfer'}
          </h1>
          <p className="page-subtitle">
            {isEdit ? 'Update transfer details' : 'Transfer stock between locations'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Fields */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Transfer Details
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
              <label className="label">From Location *</label>
              <select
                className={`input ${errors.fromLocationId ? 'input-error' : ''}`}
                {...register('fromLocationId', { required: 'From location is required', valueAsNumber: true })}
              >
                <option value="">Select location</option>
                {locations?.filter(l => l.id !== toLocationId).map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
              {errors.fromLocationId && (
                <p className="mt-1 text-sm text-red-600">{errors.fromLocationId.message}</p>
              )}
            </div>

            <div>
              <label className="label">To Location *</label>
              <select
                className={`input ${errors.toLocationId ? 'input-error' : ''}`}
                {...register('toLocationId', { required: 'To location is required', valueAsNumber: true })}
              >
                <option value="">Select location</option>
                {locations?.filter(l => l.id !== fromLocationId).map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
              {errors.toLocationId && (
                <p className="mt-1 text-sm text-red-600">{errors.toLocationId.message}</p>
              )}
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
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                    Quantity
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
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-700"
                              onClick={() => selectProduct(product, index)}
                            >
                              <div className="font-medium text-gray-900 dark:text-white">
                                {product.code}
                              </div>
                              <div className="text-sm text-gray-500">{product.description}</div>
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
                        min="0"
                        className="input text-sm text-right font-mono"
                        placeholder="0"
                        {...register(`details.${index}.quantity`, { valueAsNumber: true })}
                      />
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
                    Total Quantity:
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{totalQty.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link to="/stock/transfer" className="btn btn-secondary">
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
