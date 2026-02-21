import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { get, post, put } from '../../services/api';
import {
  BuildingStorefrontIcon,
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  MapPinIcon,
  PhoneIcon,
  CreditCardIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface VendorForm {
  code: string;
  name: string;
  companyName?: string;
  registrationNo?: string;
  taxNo?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  contactPerson?: string;
  creditTermDays: number;
  creditLimit?: number;
  currencyCode: string;
  paymentMethodId?: number;
  controlAccountId: number;
  taxCodeId?: number;
  notes?: string;
  isActive: boolean;
}

export default function VendorFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [taxCodes, setTaxCodes] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const isEdit = Boolean(id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VendorForm>({
    defaultValues: {
      creditTermDays: 30,
      currencyCode: 'MYR',
      isActive: true,
    },
  });

  useEffect(() => {
    loadLookups();
    if (isEdit) {
      loadVendor();
    }
  }, [id]);

  const loadLookups = async () => {
    try {
      const [accountsRes, currenciesRes, taxCodesRes, paymentMethodsRes] = await Promise.all([
        get<any>('/accounts?typeCode=CL&limit=100'),
        get<any>('/settings/currencies'),
        get<any>('/settings/tax-codes'),
        get<any>('/settings/payment-methods'),
      ]);
      setAccounts(accountsRes.data || []);
      setCurrencies(currenciesRes.data || []);
      setTaxCodes(taxCodesRes.data || []);
      setPaymentMethods(paymentMethodsRes.data || []);
    } catch (error) {
      console.error('Failed to load lookups', error);
    }
  };

  const loadVendor = async () => {
    setLoading(true);
    try {
      const response = await get<any>(`/vendors/${id}`);
      reset(response);
    } catch (error) {
      toast.error('Failed to load vendor');
      navigate('/vendors');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: VendorForm) => {
    setSaving(true);
    try {
      if (isEdit) {
        await put(`/vendors/${id}`, data);
        toast.success('Vendor updated successfully');
      } else {
        await post('/vendors', data);
        toast.success('Vendor created successfully');
      }
      navigate('/vendors');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
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
            to="/vendors"
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="page-title flex items-center gap-3">
              <span className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 text-white">
                <BuildingStorefrontIcon className="w-6 h-6" />
              </span>
              {isEdit ? 'Edit Vendor' : 'New Vendor'}
            </h1>
            <p className="page-subtitle">
              {isEdit ? 'Update vendor information' : 'Add a new vendor/supplier'}
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
              <BuildingStorefrontIcon className="w-5 h-5 text-amber-500" />
              Basic Information
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="label">Vendor Code *</label>
              <input
                type="text"
                className={`input ${errors.code ? 'input-error' : ''}`}
                placeholder="V001"
                {...register('code', { required: 'Vendor code is required' })}
              />
              {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="label">Vendor Name *</label>
              <input
                type="text"
                className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder="ABC Supplies Sdn Bhd"
                {...register('name', { required: 'Vendor name is required' })}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">Company Name</label>
              <input
                type="text"
                className="input"
                placeholder="Legal company name"
                {...register('companyName')}
              />
            </div>

            <div>
              <label className="label">Registration No.</label>
              <input
                type="text"
                className="input"
                placeholder="Company registration number"
                {...register('registrationNo')}
              />
            </div>

            <div>
              <label className="label">Tax No. (SST/GST)</label>
              <input
                type="text"
                className="input"
                placeholder="Tax registration number"
                {...register('taxNo')}
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <PhoneIcon className="w-5 h-5 text-blue-500" />
              Contact Information
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="label">Contact Person</label>
              <input
                type="text"
                className="input"
                placeholder="Primary contact name"
                {...register('contactPerson')}
              />
            </div>

            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                className="input"
                placeholder="03-12345678"
                {...register('phone')}
              />
            </div>

            <div>
              <label className="label">Fax</label>
              <input
                type="tel"
                className="input"
                placeholder="03-12345679"
                {...register('fax')}
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="supplier@example.com"
                {...register('email')}
              />
            </div>

            <div>
              <label className="label">Website</label>
              <input
                type="url"
                className="input"
                placeholder="https://example.com"
                {...register('website')}
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPinIcon className="w-5 h-5 text-emerald-500" />
              Address
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="label">Address Line 1</label>
              <input
                type="text"
                className="input"
                placeholder="Street address"
                {...register('address1')}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">Address Line 2</label>
              <input
                type="text"
                className="input"
                placeholder="Building, floor, etc."
                {...register('address2')}
              />
            </div>

            <div>
              <label className="label">City</label>
              <input
                type="text"
                className="input"
                placeholder="City"
                {...register('city')}
              />
            </div>

            <div>
              <label className="label">State</label>
              <input
                type="text"
                className="input"
                placeholder="State/Province"
                {...register('state')}
              />
            </div>

            <div>
              <label className="label">Postal Code</label>
              <input
                type="text"
                className="input"
                placeholder="40000"
                {...register('postalCode')}
              />
            </div>

            <div>
              <label className="label">Country</label>
              <input
                type="text"
                className="input"
                placeholder="Malaysia"
                defaultValue="Malaysia"
                {...register('country')}
              />
            </div>
          </div>
        </div>

        {/* Financial Settings */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5 text-purple-500" />
              Financial Settings
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="label">Control Account *</label>
              <select
                className={`input ${errors.controlAccountId ? 'input-error' : ''}`}
                {...register('controlAccountId', { required: 'Control account is required', valueAsNumber: true })}
              >
                <option value="">Select account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNo} - {acc.name}
                  </option>
                ))}
              </select>
              {errors.controlAccountId && (
                <p className="mt-1 text-sm text-red-600">{errors.controlAccountId.message}</p>
              )}
            </div>

            <div>
              <label className="label">Currency</label>
              <select className="input" {...register('currencyCode')}>
                {currencies.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.code} - {curr.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Credit Term (Days)</label>
              <input
                type="number"
                className="input"
                {...register('creditTermDays', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="label">Credit Limit</label>
              <input
                type="number"
                step="0.01"
                className="input"
                placeholder="0.00"
                {...register('creditLimit', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="label">Default Tax Code</label>
              <select className="input" {...register('taxCodeId', { valueAsNumber: true })}>
                <option value="">None</option>
                {taxCodes.map((tax) => (
                  <option key={tax.id} value={tax.id}>
                    {tax.code} - {tax.name} ({tax.rate}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Payment Method</label>
              <select className="input" {...register('paymentMethodId', { valueAsNumber: true })}>
                <option value="">None</option>
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-gray-500" />
              Additional Information
            </h2>
          </div>
          <div className="card-body">
            <div>
              <label className="label">Notes</label>
              <textarea
                rows={3}
                className="input"
                placeholder="Additional notes about this vendor..."
                {...register('notes')}
              />
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  {...register('isActive')}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active vendor
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link to="/vendors" className="btn btn-secondary">
            <XMarkIcon className="w-5 h-5" />
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="btn btn-primary">
            <CheckIcon className="w-5 h-5" />
            {saving ? 'Saving...' : isEdit ? 'Update Vendor' : 'Create Vendor'}
          </button>
        </div>
      </form>
    </div>
  );
}
