import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { get, post, put } from '../../services/api';
import {
  CubeIcon,
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
  DocumentTextIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';

interface ProductForm {
  code: string;
  description: string;
  description2?: string;
  groupId?: number;
  typeId?: number;
  brandId?: number;
  categoryId?: number;
  baseUOMId: number;
  costingMethod: string;
  standardCost: number;
  sellingPrice1: number;
  sellingPrice2?: number;
  sellingPrice3?: number;
  sellingPrice4?: number;
  sellingPrice5?: number;
  minSellingPrice?: number;
  barcode?: string;
  sku?: string;
  reorderLevel?: number;
  reorderQty?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  leadTimeDays?: number;
  weight?: number;
  weightUOM?: string;
  volume?: number;
  volumeUOM?: string;
  notes?: string;
  isActive: boolean;
  isSellable: boolean;
  isPurchasable: boolean;
  isStockItem: boolean;
}

const costingMethods = [
  { value: 'WEIGHTED_AVG', label: 'Weighted Average' },
  { value: 'FIFO', label: 'FIFO (First In First Out)' },
  { value: 'FIXED', label: 'Fixed Cost' },
  { value: 'STANDARD', label: 'Standard Cost' },
];

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);

  const isEdit = Boolean(id);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductForm>({
    defaultValues: {
      costingMethod: 'WEIGHTED_AVG',
      standardCost: 0,
      sellingPrice1: 0,
      isActive: true,
      isSellable: true,
      isPurchasable: true,
      isStockItem: true,
    },
  });

  const watchStandardCost = watch('standardCost');
  const watchSellingPrice1 = watch('sellingPrice1');

  useEffect(() => {
    loadLookups();
    if (isEdit) {
      loadProduct();
    }
  }, [id]);

  const loadLookups = async () => {
    console.log('loadLookups() called');
    // Check auth state
    const authStore = (await import('../../store/authStore')).useAuthStore.getState();
    console.log('Auth state:', { hasToken: !!authStore.accessToken, tokenPreview: authStore.accessToken?.substring(0, 20) + '...' });
    try {
      console.log('Fetching lookups from API...');
      const [groupsRes, typesRes, uomsRes] = await Promise.all([
        get<any>('/settings/product-groups'),
        get<any>('/settings/product-types'),
        get<any>('/settings/uom'),
      ]);
      // get() already extracts .data.data, so result is the array directly
      console.log('API responses:', { 
        groups: { type: typeof groupsRes, isArray: Array.isArray(groupsRes), length: groupsRes?.length, data: groupsRes },
        types: { type: typeof typesRes, isArray: Array.isArray(typesRes), length: typesRes?.length },
        uoms: { type: typeof uomsRes, isArray: Array.isArray(uomsRes), length: uomsRes?.length }
      });
      setGroups(Array.isArray(groupsRes) ? groupsRes : []);
      setTypes(Array.isArray(typesRes) ? typesRes : []);
      setUoms(Array.isArray(uomsRes) ? uomsRes : []);
      console.log('State updated');
    } catch (error) {
      console.error('loadLookups error:', error);
      toast.error('Failed to load dropdown data');
    }
  };

  const loadProduct = async () => {
    setLoading(true);
    try {
      const response = await get<any>(`/products/${id}`);
      reset(response);
    } catch (error) {
      toast.error('Failed to load product');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ProductForm) => {
    setSaving(true);
    try {
      if (isEdit) {
        await put(`/products/${id}`, data);
        toast.success('Product updated successfully');
      } else {
        await post('/products', data);
        toast.success('Product created successfully');
      }
      // Invalidate products list to auto-refresh
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const calculateMargin = () => {
    if (watchStandardCost && watchSellingPrice1 && watchSellingPrice1 > 0) {
      const margin = ((watchSellingPrice1 - watchStandardCost) / watchSellingPrice1) * 100;
      return margin.toFixed(1);
    }
    return '0.0';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/products"
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="page-title flex items-center gap-3">
              <span className="p-2 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-500 text-white">
                <CubeIcon className="w-6 h-6" />
              </span>
              {isEdit ? 'Edit Product' : 'New Product'}
            </h1>
            <p className="page-subtitle">
              {isEdit ? 'Update product information' : 'Add a new product or service'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CubeIcon className="w-5 h-5 text-purple-500" />
              Basic Information
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="label">Product Code *</label>
              <input
                type="text"
                className={`input ${errors.code ? 'input-error' : ''}`}
                placeholder="FG-001"
                {...register('code', { required: 'Product code is required' })}
              />
              {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="label">Description *</label>
              <input
                type="text"
                className={`input ${errors.description ? 'input-error' : ''}`}
                placeholder="Product description"
                {...register('description', { required: 'Description is required' })}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="md:col-span-3">
              <label className="label">Description 2</label>
              <input
                type="text"
                className="input"
                placeholder="Additional description"
                {...register('description2')}
              />
            </div>

            <div>
              <label className="label">Product Group</label>
              <select className="input" {...register('groupId', { valueAsNumber: true })}>
                <option value="">Select group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} - {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Product Type</label>
              <select className="input" {...register('typeId', { valueAsNumber: true })}>
                <option value="">Select type</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} - {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Base UOM *</label>
              <select
                className={`input ${errors.baseUOMId ? 'input-error' : ''}`}
                {...register('baseUOMId', { required: 'Base UOM is required', valueAsNumber: true })}
              >
                <option value="">Select UOM</option>
                {uoms.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.code} - {u.name}
                  </option>
                ))}
              </select>
              {errors.baseUOMId && (
                <p className="mt-1 text-sm text-red-600">{errors.baseUOMId.message}</p>
              )}
            </div>

            <div>
              <label className="label">Barcode</label>
              <input
                type="text"
                className="input"
                placeholder="Product barcode"
                {...register('barcode')}
              />
            </div>

            <div>
              <label className="label">SKU</label>
              <input
                type="text"
                className="input"
                placeholder="Stock keeping unit"
                {...register('sku')}
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CurrencyDollarIcon className="w-5 h-5 text-emerald-500" />
              Pricing
            </h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="label">Costing Method</label>
                <select className="input" {...register('costingMethod')}>
                  {costingMethods.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Standard Cost</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="0.00"
                  {...register('standardCost', { valueAsNumber: true })}
                />
              </div>

              <div>
                <label className="label">Selling Price 1 *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="0.00"
                  {...register('sellingPrice1', { valueAsNumber: true })}
                />
              </div>

              <div>
                <label className="label">Margin</label>
                <div className="input bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                  {calculateMargin()}%
                </div>
              </div>
            </div>

            {/* Additional price levels */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Additional Price Levels
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="label text-xs">Price 2</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="0.00"
                    {...register('sellingPrice2', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Price 3</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="0.00"
                    {...register('sellingPrice3', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Price 4</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="0.00"
                    {...register('sellingPrice4', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Price 5</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="0.00"
                    {...register('sellingPrice5', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="label">Minimum Selling Price</label>
              <input
                type="number"
                step="0.01"
                className="input max-w-xs"
                placeholder="0.00"
                {...register('minSellingPrice', { valueAsNumber: true })}
              />
              <p className="mt-1 text-xs text-gray-500">
                System will warn if selling below this price
              </p>
            </div>
          </div>
        </div>

        {/* Stock Control */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ArchiveBoxIcon className="w-5 h-5 text-blue-500" />
              Stock Control
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="label">Reorder Level</label>
              <input
                type="number"
                className="input"
                placeholder="100"
                {...register('reorderLevel', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="label">Reorder Qty</label>
              <input
                type="number"
                className="input"
                placeholder="500"
                {...register('reorderQty', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="label">Min Stock Level</label>
              <input
                type="number"
                className="input"
                placeholder="50"
                {...register('minStockLevel', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="label">Max Stock Level</label>
              <input
                type="number"
                className="input"
                placeholder="1000"
                {...register('maxStockLevel', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="label">Lead Time (Days)</label>
              <input
                type="number"
                className="input"
                placeholder="7"
                {...register('leadTimeDays', { valueAsNumber: true })}
              />
            </div>
          </div>
        </div>

        {/* Physical Properties */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ScaleIcon className="w-5 h-5 text-orange-500" />
              Physical Properties
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="label">Weight</label>
              <input
                type="number"
                step="0.001"
                className="input"
                placeholder="0.000"
                {...register('weight', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="label">Weight UOM</label>
              <select className="input" {...register('weightUOM')}>
                <option value="">Select</option>
                <option value="KG">KG</option>
                <option value="G">G</option>
                <option value="LB">LB</option>
              </select>
            </div>

            <div>
              <label className="label">Volume</label>
              <input
                type="number"
                step="0.001"
                className="input"
                placeholder="0.000"
                {...register('volume', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="label">Volume UOM</label>
              <select className="input" {...register('volumeUOM')}>
                <option value="">Select</option>
                <option value="M3">M³</option>
                <option value="L">L</option>
                <option value="ML">ML</option>
              </select>
            </div>
          </div>
        </div>

        {/* Settings & Notes */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-gray-500" />
              Settings & Notes
            </h2>
          </div>
          <div className="card-body space-y-6">
            {/* Checkboxes */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  {...register('isActive')}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  {...register('isSellable')}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sellable</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  {...register('isPurchasable')}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Purchasable</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  {...register('isStockItem')}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stock Item</span>
              </label>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                rows={3}
                className="input"
                placeholder="Additional notes about this product..."
                {...register('notes')}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link to="/products" className="btn btn-secondary">
            <XMarkIcon className="w-5 h-5" />
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="btn btn-primary">
            <CheckIcon className="w-5 h-5" />
            {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
