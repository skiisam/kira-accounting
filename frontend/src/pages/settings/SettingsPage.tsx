import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { get, post, put } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import UserGroupsPage from './UserGroupsPage';
import MessagingSettingsPage from './MessagingSettingsPage';
import GlobalChangeCodePage from './GlobalChangeCodePage';
import { usePermissions, MODULES } from '../../hooks/usePermissions';
import { PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';

// Navigation items with permission requirements
const settingsNavItems = [
  { name: 'Company', path: 'company', requiresEdit: false },
  { name: 'Users', path: 'users', requiresManage: true },
  { name: 'User Groups', path: 'user-groups', requiresManage: true },
  { name: 'Currencies', path: 'currencies', requiresEdit: false },
  { name: 'Tax Codes', path: 'tax-codes', requiresEdit: false },
  { name: 'Payment Methods', path: 'payment-methods', requiresEdit: false },
  { name: 'Locations', path: 'locations', requiresEdit: false },
  { name: 'UOM', path: 'uom', requiresEdit: false },
  { name: 'Document Series', path: 'document-series', requiresEdit: false },
  { name: 'Fiscal Years', path: 'fiscal-years', requiresEdit: false },
  { name: 'Change Code', path: 'change-code', requiresEdit: true },
  { name: 'Messaging', path: 'messaging', requiresEdit: false },
];

interface CompanyForm {
  name: string;
  name2?: string;
  registrationNo?: string;
  tinNo?: string;
  taxRegistrationNo?: string;
  salesTaxNo?: string;
  serviceTaxNo?: string;
  natureOfBusiness?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  address4?: string;
  postcode?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  email?: string;
  website?: string;
  contactPerson?: string;
  billingAddress1?: string;
  billingAddress2?: string;
  billingAddress3?: string;
  billingPostcode?: string;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  billingContactPerson?: string;
  billingEmail?: string;
  billingPhone?: string;
  billingMobile?: string;
  billingFax?: string;
  logoPath?: string;
  signaturePath?: string;
  baseCurrency: string;
}

function CompanySettings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'billing' | 'media'>('general');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const { data: companyData, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: () => get('/settings/company'),
  });

  const company = (companyData as any)?.data || companyData;

  const { register, handleSubmit, reset, setValue, watch } = useForm<CompanyForm>({
    defaultValues: {
      name: '',
      baseCurrency: 'MYR',
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (company) {
      reset({
        name: company.name || '',
        name2: company.name2 || '',
        registrationNo: company.registrationNo || '',
        tinNo: company.tinNo || '',
        taxRegistrationNo: company.taxRegistrationNo || '',
        salesTaxNo: company.salesTaxNo || '',
        serviceTaxNo: company.serviceTaxNo || '',
        natureOfBusiness: company.natureOfBusiness || '',
        address1: company.address1 || '',
        address2: company.address2 || '',
        address3: company.address3 || '',
        address4: company.address4 || '',
        postcode: company.postcode || '',
        city: company.city || '',
        state: company.state || '',
        country: company.country || '',
        phone: company.phone || '',
        mobile: company.mobile || '',
        fax: company.fax || '',
        email: company.email || '',
        website: company.website || '',
        contactPerson: company.contactPerson || '',
        billingAddress1: company.billingAddress1 || '',
        billingAddress2: company.billingAddress2 || '',
        billingAddress3: company.billingAddress3 || '',
        billingPostcode: company.billingPostcode || '',
        billingCity: company.billingCity || '',
        billingState: company.billingState || '',
        billingCountry: company.billingCountry || '',
        billingContactPerson: company.billingContactPerson || '',
        billingEmail: company.billingEmail || '',
        billingPhone: company.billingPhone || '',
        billingMobile: company.billingMobile || '',
        billingFax: company.billingFax || '',
        logoPath: company.logoPath || '',
        signaturePath: company.signaturePath || '',
        baseCurrency: company.baseCurrency || 'MYR',
      });
      if (company.logoPath) setLogoPreview(company.logoPath);
      if (company.signaturePath) setSignaturePreview(company.signaturePath);
    }
  }, [company, reset]);

  const mutation = useMutation({
    mutationFn: (data: CompanyForm) => put('/settings/company', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Company information saved');
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to save'),
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // For now, convert to base64 data URL (in production, upload to storage)
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      if (type === 'logo') {
        setLogoPreview(dataUrl);
        setValue('logoPath', dataUrl);
      } else {
        setSignaturePreview(dataUrl);
        setValue('signaturePath', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (type: 'logo' | 'signature') => {
    if (type === 'logo') {
      setLogoPreview(null);
      setValue('logoPath', '');
      if (logoInputRef.current) logoInputRef.current.value = '';
    } else {
      setSignaturePreview(null);
      setValue('signaturePath', '');
      if (signatureInputRef.current) signatureInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const tabs = [
    { id: 'general', label: 'General Info' },
    { id: 'billing', label: 'Billing Info' },
    { id: 'media', label: 'Logo & Signature' },
  ] as const;

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Company Information</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-4 text-sm font-medium border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* General Info Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Company Name *</label>
              <input {...register('name', { required: true })} className="input" placeholder="Company name" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Company Name (Line 2)</label>
              <input {...register('name2')} className="input" placeholder="Trading as / DBA" />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Registration Numbers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Business Registration No (BRN)</label>
                <input {...register('registrationNo')} className="input" placeholder="e.g. 202301012345" />
              </div>
              <div>
                <label className="label">TIN / Tax ID No</label>
                <input {...register('tinNo')} className="input" placeholder="Tax Identification Number" />
              </div>
              <div>
                <label className="label">SST / GST Registration No</label>
                <input {...register('taxRegistrationNo')} className="input" placeholder="e.g. W10-1808-32000123" />
              </div>
              <div>
                <label className="label">Sales Tax Registration No</label>
                <input {...register('salesTaxNo')} className="input" placeholder="Sales Tax No" />
              </div>
              <div>
                <label className="label">Service Tax Registration No</label>
                <input {...register('serviceTaxNo')} className="input" placeholder="Service Tax No" />
              </div>
              <div>
                <label className="label">Nature of Business</label>
                <input {...register('natureOfBusiness')} className="input" placeholder="e.g. IT Services, Retail" />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Address Line 1</label>
                <input {...register('address1')} className="input" placeholder="Street address" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Address Line 2</label>
                <input {...register('address2')} className="input" placeholder="Building, suite, unit" />
              </div>
              <div>
                <label className="label">Address Line 3</label>
                <input {...register('address3')} className="input" />
              </div>
              <div>
                <label className="label">Address Line 4</label>
                <input {...register('address4')} className="input" />
              </div>
              <div>
                <label className="label">Postcode</label>
                <input {...register('postcode')} className="input" placeholder="e.g. 50450" />
              </div>
              <div>
                <label className="label">City</label>
                <input {...register('city')} className="input" placeholder="e.g. Kuala Lumpur" />
              </div>
              <div>
                <label className="label">State</label>
                <input {...register('state')} className="input" placeholder="e.g. Selangor" />
              </div>
              <div>
                <label className="label">Country</label>
                <input {...register('country')} className="input" placeholder="e.g. Malaysia" />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Contact Person</label>
                <input {...register('contactPerson')} className="input" placeholder="Name" />
              </div>
              <div>
                <label className="label">Email</label>
                <input {...register('email')} type="email" className="input" placeholder="company@email.com" />
              </div>
              <div>
                <label className="label">Website</label>
                <input {...register('website')} className="input" placeholder="https://www.company.com" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input {...register('phone')} className="input" placeholder="+60 3-1234 5678" />
              </div>
              <div>
                <label className="label">Mobile</label>
                <input {...register('mobile')} className="input" placeholder="+60 12-345 6789" />
              </div>
              <div>
                <label className="label">Fax</label>
                <input {...register('fax')} className="input" placeholder="+60 3-1234 5679" />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">System Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Base Currency</label>
                <input {...register('baseCurrency')} className="input" placeholder="MYR" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing Info Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Billing information is used for invoice headers when different from company address.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Billing Address Line 1</label>
              <input {...register('billingAddress1')} className="input" placeholder="Street address" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Billing Address Line 2</label>
              <input {...register('billingAddress2')} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Billing Address Line 3</label>
              <input {...register('billingAddress3')} className="input" />
            </div>
            <div>
              <label className="label">Postcode</label>
              <input {...register('billingPostcode')} className="input" />
            </div>
            <div>
              <label className="label">City</label>
              <input {...register('billingCity')} className="input" />
            </div>
            <div>
              <label className="label">State</label>
              <input {...register('billingState')} className="input" />
            </div>
            <div>
              <label className="label">Country</label>
              <input {...register('billingCountry')} className="input" />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Billing Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Contact Person</label>
                <input {...register('billingContactPerson')} className="input" />
              </div>
              <div>
                <label className="label">Email</label>
                <input {...register('billingEmail')} type="email" className="input" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input {...register('billingPhone')} className="input" />
              </div>
              <div>
                <label className="label">Mobile</label>
                <input {...register('billingMobile')} className="input" />
              </div>
              <div>
                <label className="label">Fax</label>
                <input {...register('billingFax')} className="input" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logo & Signature Tab */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div>
              <label className="label">Company Logo</label>
              <div className="mt-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                {logoPreview ? (
                  <div className="relative">
                    <img src={logoPreview} alt="Company Logo" className="max-h-32 mx-auto object-contain" />
                    <button
                      type="button"
                      onClick={() => clearImage('logo')}
                      className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <PhotoIcon className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Upload company logo (PNG, JPG)
                    </p>
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'logo')}
                  className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900 dark:file:text-primary-300"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Recommended: 300x100px or similar aspect ratio</p>
            </div>

            {/* Signature Upload */}
            <div>
              <label className="label">Authorized Signature</label>
              <div className="mt-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                {signaturePreview ? (
                  <div className="relative">
                    <img src={signaturePreview} alt="Signature" className="max-h-32 mx-auto object-contain" />
                    <button
                      type="button"
                      onClick={() => clearImage('signature')}
                      className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <PhotoIcon className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Upload signature image (PNG with transparent bg recommended)
                    </p>
                  </div>
                )}
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'signature')}
                  className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900 dark:file:text-primary-300"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Used for document signatures. Transparent PNG works best.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end border-t pt-4">
        <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

function UsersSettings() {
  const [showModal, setShowModal] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => get('/settings/users'),
  });

  const columns = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'group', header: 'Group', render: (row: any) => row.group?.name },
    { key: 'isAdmin', header: 'Admin', render: (row: any) => row.isAdmin ? 'Yes' : 'No' },
    { key: 'isActive', header: 'Active', render: (row: any) => row.isActive ? 'Yes' : 'No' },
    { key: 'actions', header: 'Actions', render: (row: any) => (
      <button
        className="btn btn-secondary btn-sm"
        onClick={(e) => {
          e.stopPropagation();
          setTargetUser(row);
          setNewPassword('');
          setConfirmPassword('');
          setShowModal(true);
        }}
      >
        Change Password
      </button>
    ) },
  ];

  const submitChange = async () => {
    if (!targetUser) return;
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await post(`/settings/users/${targetUser.id}/change-password`, { newPassword });
      toast.success('Password updated');
      setShowModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Users</h2>
        <button className="btn btn-primary">Add User</button>
      </div>
      <DataTable columns={columns} data={(data as any[]) || []} loading={isLoading} />
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md">
            <div className="card-body space-y-4">
              <h3 className="text-lg font-semibold">Change Password</h3>
              <div className="text-sm text-gray-600">User: {targetUser?.code} - {targetUser?.name}</div>
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  className="btn"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={submitChange}
                  disabled={saving}
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GenericSettings({ endpoint, title, columns, canEdit = false }: { endpoint: string; title: string; columns: any[]; canEdit?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: () => get(`/settings/${endpoint}`),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {canEdit && <button className="btn btn-primary">Add New</button>}
      </div>
      <DataTable columns={columns} data={(data as any[]) || []} loading={isLoading} />
    </div>
  );
}

export default function SettingsPage() {
  const { hasPermission, canView, isAdmin } = usePermissions();
  const canManageUsers = isAdmin || hasPermission(MODULES.USERS, 'manage');
  const canEditSettings = isAdmin || hasPermission(MODULES.SETTINGS, 'edit');
  const canViewSettings = isAdmin || canView(MODULES.SETTINGS);

  // Filter nav items based on permissions
  const settingsNav = settingsNavItems.filter((item) => {
    if (item.requiresManage) return canManageUsers;
    return canViewSettings;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      
      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-48 flex-shrink-0">
          <ul className="space-y-1">
            {settingsNav.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={`/settings/${item.path}`}
                  className={({ isActive }) =>
                    `block px-3 py-2 text-sm rounded-md ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 card">
          <div className="card-body">
            <Routes>
              <Route path="" element={<Navigate to="company" replace />} />
              <Route path="company" element={<CompanySettings />} />
              <Route path="users" element={canManageUsers ? <UsersSettings /> : <NoAccess />} />
              <Route path="user-groups" element={canManageUsers ? <UserGroupsPage /> : <NoAccess />} />
              <Route path="currencies" element={
                <GenericSettings endpoint="currencies" title="Currencies" canEdit={canEditSettings} columns={[
                  { key: 'code', header: 'Code' },
                  { key: 'name', header: 'Name' },
                  { key: 'symbol', header: 'Symbol' },
                  { key: 'exchangeRate', header: 'Rate' },
                ]} />
              } />
              <Route path="tax-codes" element={
                <GenericSettings endpoint="tax-codes" title="Tax Codes" canEdit={canEditSettings} columns={[
                  { key: 'code', header: 'Code' },
                  { key: 'name', header: 'Name' },
                  { key: 'rate', header: 'Rate %' },
                  { key: 'taxType', header: 'Type' },
                ]} />
              } />
              <Route path="payment-methods" element={
                <GenericSettings endpoint="payment-methods" title="Payment Methods" canEdit={canEditSettings} columns={[
                  { key: 'code', header: 'Code' },
                  { key: 'name', header: 'Name' },
                  { key: 'paymentType', header: 'Type' },
                ]} />
              } />
              <Route path="locations" element={
                <GenericSettings endpoint="locations" title="Locations" canEdit={canEditSettings} columns={[
                  { key: 'code', header: 'Code' },
                  { key: 'name', header: 'Name' },
                  { key: 'address', header: 'Address' },
                  { key: 'isDefault', header: 'Default', render: (r: any) => r.isDefault ? 'Yes' : '' },
                ]} />
              } />
              <Route path="uom" element={
                <GenericSettings endpoint="uom" title="Units of Measure" canEdit={canEditSettings} columns={[
                  { key: 'code', header: 'Code' },
                  { key: 'name', header: 'Name' },
                ]} />
              } />
              <Route path="document-series" element={
                <GenericSettings endpoint="document-series" title="Document Series" canEdit={canEditSettings} columns={[
                  { key: 'documentType', header: 'Document Type' },
                  { key: 'seriesCode', header: 'Series' },
                  { key: 'prefix', header: 'Prefix' },
                  { key: 'nextNumber', header: 'Next No' },
                ]} />
              } />
              <Route path="fiscal-years" element={
                <GenericSettings endpoint="fiscal-years" title="Fiscal Years" canEdit={canEditSettings} columns={[
                  { key: 'name', header: 'Name' },
                  { key: 'startDate', header: 'Start Date' },
                  { key: 'endDate', header: 'End Date' },
                  { key: 'isClosed', header: 'Closed', render: (r: any) => r.isClosed ? 'Yes' : 'No' },
                ]} />
              } />
              <Route path="change-code" element={canEditSettings ? <GlobalChangeCodePage /> : <NoAccess />} />
              <Route path="messaging" element={<MessagingSettingsPage />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoAccess() {
  return (
    <div className="text-center py-8 text-gray-500">
      <p className="text-lg">Access Denied</p>
      <p className="text-sm mt-2">You don't have permission to view this page.</p>
    </div>
  );
}
