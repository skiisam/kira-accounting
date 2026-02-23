import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get, post } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import { useState } from 'react';
import toast from 'react-hot-toast';
import UserGroupsPage from './UserGroupsPage';
import MessagingSettingsPage from './MessagingSettingsPage';
import GlobalChangeCodePage from './GlobalChangeCodePage';
import { usePermissions, MODULES } from '../../hooks/usePermissions';

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

function CompanySettings() {
  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: () => get('/settings/company'),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Company Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="label">Company Name</label>
          <input className="input" defaultValue={(company as any)?.name || ''} />
        </div>
        <div>
          <label className="label">Registration No</label>
          <input className="input" defaultValue={(company as any)?.registrationNo || ''} />
        </div>
        <div>
          <label className="label">Tax Registration No</label>
          <input className="input" defaultValue={(company as any)?.taxRegistrationNo || ''} />
        </div>
        <div>
          <label className="label">Base Currency</label>
          <input className="input" defaultValue={(company as any)?.baseCurrency || 'MYR'} />
        </div>
      </div>
      <div className="flex justify-end">
        <button className="btn btn-primary">Save Changes</button>
      </div>
    </div>
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
